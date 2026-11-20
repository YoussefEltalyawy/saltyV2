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
import {
  getBundleDefinitions,
} from '~/lib/bundleConfig';
import { resolveCartDiscountCodes } from '~/lib/bundleDiscounts';
import { createBundleDataService } from '~/lib/bundleDataService';
import { updateCartDiscountCodes } from '~/lib/cartDiscountCodes';

export const meta: MetaFunction = () => {
  return [{ title: `SALTY | Cart` }];
};

export const headers: HeadersFunction = ({ actionHeaders }) => actionHeaders;

/**
 * Keep bundle discount codes in sync with what is actually in the cart.
 * Manual codes the customer entered are preserved; only bundle-owned codes
 * are added/removed here.
 */
function sameCodes(a: string[], b: string[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return (
    left.size === right.size && [...left].every((code) => right.has(code))
  );
}

async function updateBundleDiscountCodes(
  cart: any,
  storefront: any,
  cartResult: any,
  extraCodes: string[] = [],
) {
  // The mutation already returns the full cart (see CART_MUTATION_FRAGMENT).
  // Use those lines rather than calling cart.get() again: a second read can
  // return an older snapshot when two cart actions overlap, which makes us
  // compute codes from the wrong lines (and can bring back removed items).
  let current = cartResult?.cart;
  if (!current?.lines) {
    current = await cart.get();
  }

  const lines = current?.lines?.nodes ?? [];
  const currentCodes = (current?.discountCodes ?? [])
    .map((entry: any) => entry?.code)
    .filter(Boolean) as string[];

  const desiredCodes = resolveCartDiscountCodes(getBundleDefinitions(), lines, [
    ...currentCodes,
    ...extraCodes,
  ]);

  if (!current?.id || sameCodes(desiredCodes, currentCodes)) {
    return cartResult;
  }

  return await updateCartDiscountCodes(storefront, current.id, desiredCodes);
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { cart } = context;

  // Load the active bundle definitions (cached for 60s) so cart discount
  // handling follows the current Shopify metaobject configuration.
  try {
    const bundleDataService = createBundleDataService(context.storefront);
    await bundleDataService.fetchBundleDefinitions();
  } catch {
    // Bundles could not be read this request; the registry keeps whatever was
    // loaded last (empty on a cold start), so cart lines stay untouched.
  }

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
      // Apply any code the form asked for, and sync the codes the cart's
      // current contents qualify for (bundles) in one write.
      const requestedCodes: string[] = [
        ...(inputs.discountCode ? [inputs.discountCode as string] : []),
        ...((inputs.discountCodes || []) as string[]),
      ];
      result = await updateBundleDiscountCodes(
        cart,
        context.storefront,
        result,
        requestedCodes,
      );
      break;
    }
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      // Update bundle discount codes based on remaining cart contents
      result = await updateBundleDiscountCodes(
        cart,
        context.storefront,
        result,
      );
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      // Update bundle discount codes based on remaining cart contents
      result = await updateBundleDiscountCodes(
        cart,
        context.storefront,
        result,
      );
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = inputs.discountCode;

      // User inputted discount code
      const discountCodes = (
        formDiscountCode ? [formDiscountCode] : []
      ) as string[];

      // Combine discount codes already applied on cart
      discountCodes.push(...inputs.discountCodes);

      const cartId = cart.getCartId();
      result = cartId
        ? await updateCartDiscountCodes(context.storefront, cartId, discountCodes)
        : await cart.create({discountCodes});
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
