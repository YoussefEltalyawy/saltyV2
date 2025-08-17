import { type LoaderFunctionArgs } from 'react-router';
import { toMetaContentId } from '~/lib/meta';

function verifyShopifyWebhook(request: Request, secret: string) {
  // Minimal check: in production, verify HMAC. Placeholder for brevity.
  // You can extend using @shopify/shopify-api if needed.
  const topic = request.headers.get('x-shopify-topic');
  const domain = request.headers.get('x-shopify-shop-domain');
  return Boolean(topic && domain && secret);
}

export async function action({ request, context }: LoaderFunctionArgs) {
  const secret = (context.env as any).SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return new Response('Missing secret', { status: 500 });
  if (!verifyShopifyWebhook(request, secret)) {
    return new Response('Unauthorized', { status: 401 });
  }
  const topic = request.headers.get('x-shopify-topic');
  const bodyText = await request.text();
  try {
    const body = JSON.parse(bodyText);
    if (topic === 'orders/paid' || topic === 'orders/create') {
      const order = body;
      const currency = order?.total_price_set?.shop_money?.currency_code || order?.currency || 'USD';
      const value = Number(order?.total_price || order?.total_price_set?.shop_money?.amount || 0);
      const contents = (order?.line_items || [])
        .map((l: any) => {
          const rawId = l?.variant_id
            ? `gid://shopify/ProductVariant/${l.variant_id}`
            : l?.product_id
              ? `gid://shopify/Product/${l.product_id}`
              : undefined;
          const mapped = toMetaContentId(rawId);
          if (!mapped) return null;
          return {
            id: mapped,
            quantity: Number(l?.quantity || 1),
            item_price: Number(l?.price || 0),
          };
        })
        .filter(Boolean);
      const content_ids = (contents as any[]).map((c: any) => c.id);
      const event_id = crypto.randomUUID?.() || String(Date.now());
      const origin = new URL(request.url).origin;
      await fetch(`${origin}/api.meta-capi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: 'Purchase',
          event_id,
          user_data: {
            em: order?.email || order?.customer?.email,
          },
          custom_data: {
            value,
            currency,
            content_type: 'product',
            content_ids,
            contents,
            num_items: contents.reduce((s: number, c: any) => s + (c.quantity || 0), 0),
          },
        }),
      });
    }
  } catch { }
  return new Response('OK');
}

export function loader() {
  return new Response('Not Found', { status: 404 });
}


