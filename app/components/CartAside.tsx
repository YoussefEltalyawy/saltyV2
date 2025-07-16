import { Suspense } from 'react';
import { Await } from 'react-router';
import { Aside } from '~/components/Aside';
import { CartMain } from '~/components/CartMain';
import type { CartApiQueryFragment } from 'storefrontapi.generated';

interface CartAsideProps {
  cart: Promise<CartApiQueryFragment | null>;
}

export function CartAside({ cart }: CartAsideProps) {
  return (
    <Aside type="cart" heading="CART" animation="right">
      <Suspense fallback={<p>Loading cart ...</p>}>
        <Await resolve={cart}>
          {(cart) => {
            return <CartMain cart={cart} layout="aside" />;
          }}
        </Await>
      </Suspense>
    </Aside>
  );
} 