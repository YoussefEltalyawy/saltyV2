import type { CartLineUpdateInput } from '@shopify/hydrogen/storefront-api-types';
import type { CartLayout } from '~/components/CartMain';
import { CartForm, Image, type OptimisticCartLine } from '@shopify/hydrogen';
import { useVariantUrl } from '~/lib/variants';
import { Link } from 'react-router';
import { ProductPrice } from './ProductPrice';
import { useAside } from './Aside';
import type { CartApiQueryFragment } from 'storefrontapi.generated';
import { CartQuantityAdjustor } from './CartQuantityAdjustor';
import { useState } from 'react';

type CartLine = OptimisticCartLine<CartApiQueryFragment>;

/**
 * A single line item in the cart. It displays the product image, title, price.
 * It also provides controls to update the quantity or remove the line item.
 */
export function CartLineItem({
  layout,
  line,
}: {
  layout: CartLayout;
  line: CartLine;
}) {
  const { id, merchandise, cost, isOptimistic } = line;
  const { product, title, image, selectedOptions } = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const { close } = useAside();
  const [loading, setLoading] = useState(false);

  // Extract size and color from selectedOptions
  const size = selectedOptions.find((o) => o.name.toLowerCase() === 'size')?.value;
  const color = selectedOptions.find((o) => o.name.toLowerCase() === 'color')?.value;

  return (
    <li
      key={id}
      className="flex bg-[#fafafa] rounded-lg overflow-hidden mb-4 min-h-[120px] relative"
      style={{ minHeight: '120px' }}
    >
      {/* Product Image */}
      {image && (
        <div className="flex-shrink-0 w-24 h-auto flex items-center justify-center bg-white">
          <Image
            alt={title}
            aspectRatio="1/1"
            data={image}
            height={120}
            loading="lazy"
            width={120}
            className="object-cover h-full w-full"
          />
        </div>
      )}
      {/* Info Section */}
      <div className="flex flex-col flex-1 p-4 relative min-w-0">
        {/* Price top right */}
        <div className="absolute right-4 top-4 text-right">
          {(isOptimistic || loading) ? (
            <span className="inline-block w-16 h-5 align-middle">
              <svg className="animate-spin h-5 w-5 text-gray-400 mx-auto" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </span>
          ) : (
            <ProductPrice price={cost?.totalAmount} className="font-semibold text-sm" />
          )}
        </div>
        {/* Product Name */}
        <Link
          prefetch="intent"
          to={lineItemUrl}
          onClick={() => {
            if (layout === 'aside') {
              close();
            }
          }}
          className="font-medium text-sm mb-1 break-words max-w-[70%] pr-20"
          style={{ wordBreak: 'break-word' }}
        >
          {product.title}
        </Link>
        {/* Size | Color */}
        <div className="text-base text-gray-600 mb-2">
          {size && <span>{size}</span>}
          {size && color && <span className="mx-1">|</span>}
          {color && <span>{color}</span>}
        </div>
        {/* Quantity Adjustor */}
        <CartQuantityAdjustor line={line} setLoading={setLoading} />
        {/* Remove Button bottom right */}
        <div className="absolute bottom-4 right-4">
          <CartLineRemoveButton lineIds={[id]} disabled={!!isOptimistic} />
        </div>
      </div>
    </li>
  );
}

/**
 * A button that removes a line item from the cart. It is disabled
 * when the line item is new, and the server hasn't yet responded
 * that it was successfully added to the cart.
 */
function CartLineRemoveButton({
  lineIds,
  disabled,
}: {
  lineIds: string[];
  disabled: boolean;
}) {
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{ lineIds }}
    >
      <button
        disabled={disabled}
        type="submit"
        className="underline text-xs text-black hover:opacity-70"
      >
        Remove
      </button>
    </CartForm>
  );
}

function CartLineUpdateButton({
  children,
  lines,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{ lines }}
    >
      {children}
    </CartForm>
  );
}

/**
 * Returns a unique key for the update action. This is used to make sure actions modifying the same line
 * items are not run concurrently, but cancel each other. For example, if the user clicks "Increase quantity"
 * and "Decrease quantity" in rapid succession, the actions will cancel each other and only the last one will run.
 * @param lineIds - line ids affected by the update
 * @returns
 */
function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}
