import { Money } from '@shopify/hydrogen';
import type { MoneyV2 } from '@shopify/hydrogen/storefront-api-types';

export function ProductPrice({
  price,
  compareAtPrice,
  size = 'xs',
}: {
  price?: MoneyV2;
  compareAtPrice?: MoneyV2 | null;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
}) {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const textSizeClass = sizeClasses[size];

  return (
    <div className="product-price">
      {compareAtPrice ? (
        <div className="product-price-on-sale flex items-center gap-2">
          {price ? (
            <span className={`${textSizeClass} font-medium text-black`}>
              <Money data={price} />
            </span>
          ) : null}
          <s className={`${textSizeClass} text-gray-500`}>
            <Money data={compareAtPrice} />
          </s>
        </div>
      ) : price ? (
        <span className={`${textSizeClass} font-medium text-black`}>
          <Money data={price} />
        </span>
      ) : (
        <span>&nbsp;</span>
      )}
    </div>
  );
}
