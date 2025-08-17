import { type FetcherWithComponents } from 'react-router';
import { CartForm, type OptimisticCartLineInput } from '@shopify/hydrogen';
import { trackPixelEvent, generateEventId } from '~/components/MetaPixel';
import { toMetaContentId } from '~/lib/meta';
import { useRef } from 'react';

export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
  discountCode,
}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: Array<OptimisticCartLineInput>;
  onClick?: () => void;
  discountCode?: string;
}) {
  const analyticsInputRef = useRef<HTMLInputElement>(null);
  return (
    <CartForm
      route="/cart"
      inputs={{ lines, discountCode }}
      action={CartForm.ACTIONS.LinesAdd}
    >
      {(fetcher: FetcherWithComponents<any>) => {
        const isSubmitting = fetcher.state !== 'idle';

        return (
          <>
            <input
              name="analytics"
              type="hidden"
              ref={analyticsInputRef}
              value={JSON.stringify(analytics)}
            />
            <button
              type="submit"
              onClick={() => {
                const first = lines?.[0] as any;
                const merchandiseId: string | undefined = first?.merchandiseId;
                const mappedId = toMetaContentId(merchandiseId);
                const quantity: number | undefined = first?.quantity;
                const eventId = generateEventId();
                if (analyticsInputRef.current) {
                  try {
                    analyticsInputRef.current.value = JSON.stringify({
                      event_id: eventId,
                    });
                  } catch { }
                }
                trackPixelEvent('AddToCart', {
                  content_type: 'product',
                  content_ids: mappedId ? [mappedId] : undefined,
                  contents: mappedId
                    ? [{ id: mappedId, quantity: quantity || 1 }]
                    : undefined,
                  eventID: eventId,
                });
                onClick?.();
              }}
              disabled={disabled ?? isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <span className="block w-full text-center py-3 px-6 rounded-lg tracking-wide text-base font-medium transition-all duration-200 bg-gray-600 text-white cursor-not-allowed">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Adding to cart...
                  </div>
                </span>
              ) : (
                children
              )}
            </button>
          </>
        );
      }}
    </CartForm>
  );
}
