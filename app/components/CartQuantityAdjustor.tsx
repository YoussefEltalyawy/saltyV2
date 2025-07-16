import type { CartLineUpdateInput } from '@shopify/hydrogen/storefront-api-types';
import { CartForm, type OptimisticCartLine } from '@shopify/hydrogen';
import { useState } from 'react';

/**
 * CartQuantityAdjustor handles quantity changes and removal for a cart line.
 * Shows loading spinner when updating.
 */
export function CartQuantityAdjustor({
  line,
  setLoading,
}: {
  line: OptimisticCartLine<any>;
  setLoading?: (loading: boolean) => void;
}) {
  const { id: lineId, quantity, isOptimistic } = line;
  const [loading, setLocalLoading] = useState(false);
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  // Show spinner if optimistic or local loading
  const showSpinner = isOptimistic || loading;

  // Helper to update both local and parent loading
  const handleSetLoading = (val: boolean) => {
    setLocalLoading(val);
    if (setLoading) setLoading(val);
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <CartLineUpdateButton
        lines={[{ id: lineId, quantity: prevQuantity }]}
        setLoading={handleSetLoading}
      >
        <button
          aria-label="Decrease quantity"
          disabled={quantity <= 1 || showSpinner}
          className="w-7 h-7 rounded flex items-center justify-center text-lg disabled:opacity-50 bg-transparent shadow-none border-none"
        >
          &minus;
        </button>
      </CartLineUpdateButton>
      <span className="w-6 text-center">{quantity}</span>
      <CartLineUpdateButton
        lines={[{ id: lineId, quantity: nextQuantity }]}
        setLoading={handleSetLoading}
      >
        <button
          aria-label="Increase quantity"
          disabled={showSpinner}
          className="w-7 h-7 rounded flex items-center justify-center text-lg disabled:opacity-50 bg-transparent shadow-none border-none"
        >
          +
        </button>
      </CartLineUpdateButton>
    </div>
  );
}

function CartLineUpdateButton({
  children,
  lines,
  setLoading,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
  setLoading: (loading: boolean) => void;
}) {
  const lineIds = lines.map((line) => line.id);
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{ lines }}
    >
      {(fetcher) => {
        // Set loading state based on fetcher
        if (fetcher.state !== 'idle') setLoading(true);
        else setLoading(false);
        return children;
      }}
    </CartForm>
  );
}

function getUpdateKey(lineIds: string[]) {
  return `update-${lineIds.join('-')}`;
} 