import { type MetaFunction, useLoaderData } from 'react-router';
import type { CartQueryDataReturn } from '@shopify/hydrogen';
import { CartForm } from '@shopify/hydrogen';
import {
  data,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  type HeadersFunction,
} from '@shopify/remix-oxygen';
import { CartMain } from '~/components/CartMain';
import { Analytics } from '@shopify/hydrogen';
import { toMetaContentId } from '~/lib/meta';

export const meta: MetaFunction = () => {
  return [{ title: `SALTY | Cart` }];
};

export const headers: HeadersFunction = ({ actionHeaders }) => actionHeaders;

// Helper function to update bundle discount codes based on cart contents
async function updateBundleDiscountCodes(cart: any, cartResult: any) {
  if (!cartResult.cart || !cartResult.cart.lines || cartResult.cart.lines.nodes.length === 0) {
    // Cart is empty, remove all discount codes
    return await cart.updateDiscountCodes([]);
  }

  // Check what items remain in the cart
  const remainingItems = cartResult.cart.lines.nodes;

  // Check if cart still qualifies for bundle discounts
  const applicableDiscountCodes: string[] = [];

  // Check for 2 tops bundle (needs 2+ tops)
  const topsInCart = remainingItems.filter((line: any) =>
    line.merchandise?.product?.handle?.includes('top') ||
    line.merchandise?.product?.collections?.nodes?.some((collection: any) =>
      collection.handle === 'tops'
    )
  );
  if (topsInCart.length >= 2) {
    applicableDiscountCodes.push('2TOPS10');
  }

  // Check for 3 tops bundle (needs 3+ tops)
  if (topsInCart.length >= 3) {
    applicableDiscountCodes.push('3TOPS15');
  }

  // Check for polo bundles
  const polosInCart = remainingItems.filter((line: any) =>
    line.merchandise?.product?.collections?.nodes?.some((collection: any) =>
      collection.handle === 'oversized-polos'
    )
  );
  if (polosInCart.length >= 2) {
    applicableDiscountCodes.push('POLO2BUNDLE10');
  }
  if (polosInCart.length >= 3) {
    applicableDiscountCodes.push('POLO3BUNDLE15');
  }

  // Update discount codes based on remaining items
  if (applicableDiscountCodes.length > 0) {
    return await cart.updateDiscountCodes(applicableDiscountCodes);
  } else {
    // Remove all bundle discount codes if no bundles qualify
    return await cart.updateDiscountCodes([]);
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { cart } = context;

  const formData = await request.formData();

  const { action, inputs } = CartForm.getFormInput(formData);
  const analyticsRaw = formData.get('analytics') as string | null;
  let event_id_from_client: string | undefined;
  if (analyticsRaw) {
    try {
      const parsed = JSON.parse(analyticsRaw);
      if (parsed && typeof parsed.event_id === 'string') {
        event_id_from_client = parsed.event_id;
      }
    } catch { }
  }

  if (!action) {
    throw new Error('No action provided');
  }

  let status = 200;
  let result: CartQueryDataReturn;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd: {
      result = await cart.addLines(inputs.lines);
      try {
        const lines = Array.isArray(inputs.lines) ? inputs.lines : [];
        const first = lines?.[0];
        const merchandiseId = first?.merchandiseId as string | undefined;
        const mappedId = toMetaContentId(merchandiseId);
        const quantity = Number(first?.quantity || 1);
        const price = Number(first?.selectedVariant?.price?.amount || 0);
        const currency = first?.selectedVariant?.price?.currencyCode || 'USD';
        const event_id = event_id_from_client || crypto.randomUUID?.() || String(Date.now());
        const origin = new URL(request.url).origin;
        context.waitUntil?.(
          fetch(`${origin}/api.meta-capi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_name: 'AddToCart',
              event_id,
              custom_data: {
                content_type: 'product',
                content_ids: mappedId ? [mappedId] : undefined,
                contents: mappedId ? [{ id: mappedId, quantity, item_price: price }] : undefined,
                value: price * quantity,
                currency,
              },
            }),
          }).catch(() => { }),
        );
      } catch { }
      if (inputs.discountCode) {
        const discountCodes = [inputs.discountCode] as string[];
        discountCodes.push(...((inputs.discountCodes || []) as string[]));
        result = await cart.updateDiscountCodes(discountCodes);
      }
      break;
    }
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      // Update bundle discount codes based on remaining cart contents
      result = await updateBundleDiscountCodes(cart, result);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      // Update bundle discount codes based on remaining cart contents
      result = await updateBundleDiscountCodes(cart, result);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = inputs.discountCode;

      // User inputted discount code
      const discountCodes = (
        formDiscountCode ? [formDiscountCode] : []
      ) as string[];

      // Combine discount codes already applied on cart
      discountCodes.push(...inputs.discountCodes);

      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesUpdate: {
      const formGiftCardCode = inputs.giftCardCode;

      // User inputted gift card code
      const giftCardCodes = (
        formGiftCardCode ? [formGiftCardCode] : []
      ) as string[];

      // Combine gift card codes already applied on cart
      giftCardCodes.push(...inputs.giftCardCodes);

      result = await cart.updateGiftCardCodes(giftCardCodes);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      break;
    }
    default:
      throw new Error(`${action} cart action is not defined`);
  }

  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
  const { cart: cartResult, errors, warnings } = result;

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  return data(
    {
      cart: cartResult,
      errors,
      warnings,
      analytics: {
        cartId,
      },
    },
    { status, headers },
  );
}

export async function loader({ context }: LoaderFunctionArgs) {
  const { cart } = context;
  return await cart.get();
}

export default function Cart() {
  const cart = useLoaderData<typeof loader>();

  return (
    <div className="cart">
      <h1>Cart</h1>
      <CartMain layout="page" cart={cart} />
      <Analytics.CartView data={{ cart }} />
    </div>
  );
}
