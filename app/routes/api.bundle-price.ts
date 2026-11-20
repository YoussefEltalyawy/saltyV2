import type { ActionFunctionArgs } from '@shopify/remix-oxygen';

/**
 * Price a bundle with Shopify itself.
 *
 * Bundle discounts can be plain percentages, Buy X Get Y, free gifts or
 * automatic discounts. The storefront can't know which one applies just from
 * a discount code, so we create a short-lived cart with the selected variants
 * and the code, then read Shopify's own cost back. The cart is never stored in
 * a cookie or shown to the customer.
 */

type Quote = {
  original: number;
  discounted: number;
  currency: string;
};

const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 300;
const cache = new Map<string, { at: number; value: Quote }>();
const inFlight = new Map<string, Promise<Quote>>();

function amount(value: unknown): number {
  const number = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(number) ? number : 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function quote(context: any, lines: any[], codes: string[]): Promise<Quote> {
  const result = await context.cart.create({
    lines: lines.map((line) => ({
      merchandiseId: line.merchandiseId,
      quantity: 1,
    })),
    discountCodes: codes,
  });

  const cart = result?.cart;
  const total = cart?.cost?.totalAmount;
  if (!total) throw new Error('Shopify returned no cart cost');

  // Shopify's `subtotalAmount` is already AFTER discounts. The strikethrough
  // price must be the sum of the variant prices before any discount, which is
  // what the product pickers show as well.
  const original = (cart.lines?.nodes ?? []).reduce(
    (sum: number, line: any) =>
      sum + amount(line?.merchandise?.price?.amount) * Number(line?.quantity ?? 0),
    0,
  );

  return {
    original,
    discounted: amount(total.amount),
    currency: total.currencyCode ?? 'EGP',
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const lines: Array<{ merchandiseId: string; quantity: number }> = Array.isArray(body?.lines)
    ? body.lines
        .filter((line: any) => typeof line?.merchandiseId === 'string')
        .slice(0, 20)
        .map((line: any) => ({ merchandiseId: line.merchandiseId, quantity: 1 }))
    : [];

  if (!lines.length) return json({ error: 'No lines to price' }, 400);

  const codes = Array.isArray(body?.discountCodes)
    ? body.discountCodes.filter((code: any) => typeof code === 'string' && code.trim())
    : typeof body?.discountCode === 'string' && body.discountCode.trim()
      ? [body.discountCode.trim()]
      : [];

  const key = JSON.stringify([lines.map((line) => line.merchandiseId), codes]);

  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) return json(cached.value);

  let pending = inFlight.get(key);
  if (!pending) {
    pending = quote(context, lines, codes)
      .then((value) => {
        cache.set(key, { at: Date.now(), value });
        if (cache.size > MAX_ENTRIES) {
          const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
          if (oldest) cache.delete(oldest[0]);
        }
        return value;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }

  try {
    return json(await pending);
  } catch (error) {
    console.error('[bundle-price] Shopify quote failed:', error);
    return json({ error: 'Could not price bundle' }, 502);
  }
}
