import { Money } from '@shopify/hydrogen';
import type { MoneyV2 } from '@shopify/hydrogen/storefront-api-types';

export function ProductPrice({
  price,
  compareAtPrice,
}: {
  price?: MoneyV2;
  compareAtPrice?: MoneyV2 | null;
}) {
  return (
    <div className="product-price">
      {compareAtPrice ? (
        <div className="product-price-on-sale flex items-center gap-2">
          {price ? (
            <span className="text-xs font-medium text-black">
              <Money data={price} />
            </span>
          ) : null}
          <s className="text-sm text-gray-500">
            <Money data={compareAtPrice} />
          </s>
        </div>
      ) : price ? (
        <span className="text-xs font-medium text-black">
          <Money data={price} />
        </span>
      ) : (
        <span>&nbsp;</span>
      )}
    </div>
  );
}
