import {LoaderFunctionArgs} from 'react-router';
import {normalizeCheckoutDomain} from '~/lib/checkoutDomain';

export async function loader({request}: LoaderFunctionArgs) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type, X-Shopify-Storefront-Access-Token, x-shopify-storefront-access-token',
      },
    });
  }
  return new Response('Method not allowed', {status: 405});
}

export async function action({params, context, request}: LoaderFunctionArgs) {
  const checkoutDomain =
    normalizeCheckoutDomain(context.env.PUBLIC_CHECKOUT_DOMAIN) ||
    normalizeCheckoutDomain(context.env.PUBLIC_STORE_DOMAIN);

  // Build clean headers — strip Cloudflare and proxy headers that trigger Error 1000
  const forwardHeaders = new Headers();
  const allowedHeaders = [
    'content-type',
    'x-shopify-storefront-access-token',
    'shopify-storefront-private-token',
    'accept',
    'accept-language',
    'user-agent',
    'x-shopify-uniquetoken',
    'x-shopify-visittoken',
    'x-shopify-buyer-ip',
  ];

  for (const [key, val] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (
      allowedHeaders.includes(lower) ||
      lower.startsWith('x-shopify-')
    ) {
      if (!lower.startsWith('cf-') && !lower.startsWith('x-forwarded-') && lower !== 'host') {
        forwardHeaders.set(key, val);
      }
    }
  }

  // Ensure storefront token is present if client didn't supply it
  if (
    !forwardHeaders.has('x-shopify-storefront-access-token') &&
    context.env.PUBLIC_STOREFRONT_API_TOKEN
  ) {
    forwardHeaders.set(
      'x-shopify-storefront-access-token',
      context.env.PUBLIC_STOREFRONT_API_TOKEN,
    );
  }

  const response = await fetch(
    `https://${checkoutDomain}/api/${params.version}/graphql.json`,
    {
      method: 'POST',
      body: request.body,
      headers: forwardHeaders,
    },
  );

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', '*');

  // Handle Set-Cookie domain rewrite so cookies match storefront host
  const rawSetCookies =
    typeof (response.headers as any).getSetCookie === 'function'
      ? (response.headers as any).getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);

  if (rawSetCookies.length > 0) {
    responseHeaders.delete('set-cookie');
    for (const cookie of rawSetCookies) {
      // Strip domain attribute so cookie is scoped to current store domain
      const rewritten = cookie.replace(/Domain=[^;]+;?\s*/gi, '');
      responseHeaders.append('set-cookie', rewritten);
    }
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
