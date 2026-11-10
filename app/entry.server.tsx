import type { AppLoadContext } from '@shopify/remix-oxygen';
import { ServerRouter } from 'react-router';
import { isbot } from 'isbot';
import { renderToReadableStream } from 'react-dom/server';
import { createContentSecurityPolicy } from '@shopify/hydrogen';
import type { EntryContext } from 'react-router';
import { normalizeCheckoutDomain } from '~/lib/checkoutDomain';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: AppLoadContext,
) {
  const { nonce, header, NonceProvider } = createContentSecurityPolicy({
    shop: {
      checkoutDomain:
        normalizeCheckoutDomain(context.env.PUBLIC_CHECKOUT_DOMAIN) ||
        normalizeCheckoutDomain(context.env.PUBLIC_STORE_DOMAIN),
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    // Extend defaults to allow Meta Pixel assets and other required domains
    scriptSrc: [
      "'self'",
      'https://cdn.shopify.com',
      'https://shopify.com',
      'https://*.shopify.com',
      'https://connect.facebook.net',
      'https://*.facebook.net',
      'https://www.facebook.com',
      'https://*.facebook.com',
      'http://localhost:*',
    ],
    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      'http://localhost:*',
      'https://cdn.shopify.com',
      'https://*.shopifycdn.com',
      'https://shopify.com',
      'https://connect.facebook.net',
      'https://*.facebook.net',
      'https://www.facebook.com',
      'https://*.facebook.com',
      'https://*.fbcdn.net',
    ],
    connectSrc: [
      "'self'",
      'https://cdn.shopify.com',
      'https://*.shopifycdn.com',
      'https://shopify.com',
      'https://*.shopify.com',
      'https://monorail-edge.shopifysvc.com',
      'https://*.shopifysvc.com',
      'https://otlp-http-production.shopifysvc.com',
      'https://connect.facebook.net',
      'https://*.facebook.net',
      'https://graph.facebook.com',
      'https://www.facebook.com',
      'https://*.facebook.com',
      'https://*.fbcdn.net',
      'https://*.run.app',
      'https://*.on.aws',
    ],
    // Meta Pixel falls back to a form POST inside an iframe when the event
    // payload is too large for an image GET. Without frame-src the iframe
    // navigation to facebook.com is blocked and events are silently dropped.
    frameSrc: [
      "'self'",
      'https://cdn.shopify.com',
      'https://shopify.com',
      'https://*.shopify.com',
      'https://www.facebook.com',
      'https://*.facebook.com',
      'https://connect.facebook.net',
    ],
    mediaSrc: [
      "'self'",
      'data:',
      'blob:',
      'https://cdn.shopify.com',
      // Allow video files served from the store domain (e.g. https://<store>.myshopify.com)
      `https://${context.env.PUBLIC_STORE_DOMAIN}`,
    ],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    styleSrc: [
      "'self'",
      'https://fonts.googleapis.com',
      'https://cdn.shopify.com',
    ],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
