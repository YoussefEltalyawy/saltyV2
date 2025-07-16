import { useOptimisticCart } from '@shopify/hydrogen';
import { Link } from 'react-router';
import type { CartApiQueryFragment } from 'storefrontapi.generated';
import { useAside } from '~/components/Aside';
import { CartLineItem } from '~/components/CartLineItem';
import { CartSummary } from './CartSummary';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: CartLayout;
};

/**
 * The main cart component that displays the cart items and summary.
 * It is used by both the /cart route and the cart aside dialog.
 */
export function CartMain({ layout, cart: originalCart }: CartMainProps) {
  // The useOptimisticCart hook applies pending actions to the cart
  // so the user immediately sees feedback when they modify the cart.
  const cart = useOptimisticCart(originalCart);

  const linesCount = Boolean(cart?.lines?.nodes?.length || 0);
  const withDiscount =
    cart &&
    Boolean(cart?.discountCodes?.filter((code) => code.applicable)?.length);
  const className = `cart-main ${withDiscount ? 'with-discount' : ''} ${layout === 'aside' ? 'h-full !max-h-none !overflow-visible' : ''}`;
  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false;

  return (
    <div className={className}>
      {!cartHasItems && (
        <div className="text-lg text-gray-700 font-medium">Your cart is empty</div>
      )}
      {cartHasItems && (
        <div className={layout === 'aside' ? 'flex flex-col h-full' : 'cart-details'}>
          <div aria-labelledby="cart-lines" className={layout === 'aside' ? 'flex-1 overflow-y-auto pb-4' : ''}>
            <ul>
              {(cart?.lines?.nodes ?? []).map((line) => (
                <CartLineItem key={line.id} line={line} layout={layout} />
              ))}
            </ul>
          </div>
          <div className={layout === 'aside' ? 'mt-auto border-t border-gray-200 pt-4' : ''}>
            <CartSummary cart={cart} layout={layout} />
          </div>
        </div>
      )}
    </div>
  );
}

function CartEmpty({
  hidden = false,
}: {
  hidden: boolean;
  layout?: CartMainProps['layout'];
}) {
  const { close } = useAside();
  return (
    <div hidden={hidden}>
      <br />
      <p>
        Looks like you haven&rsquo;t added anything yet, let&rsquo;s get you
        started!
      </p>
      <br />
      <Link to="/collections" onClick={close} prefetch="viewport">
        Continue shopping →
      </Link>
    </div>
  );
}
