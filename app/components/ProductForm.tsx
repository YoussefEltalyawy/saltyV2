import { Link, useNavigate } from 'react-router';
import { useNewsletterPopupControls } from './NewsletterPopupContext';
import { type MappedProductOptions } from '@shopify/hydrogen';
import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types';
import { AddToCartButton } from './AddToCartButton';
import { useAside } from './Aside';
import { SizeChartButton } from './SizeChartButton';
import type { ProductFragment } from 'storefrontapi.generated';

interface ProductFormProps {
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  isInSaltyClub?: boolean;
  sizeChartImage?: {
    id: string;
    url: string;
    altText: string | null;
    width: number;
    height: number;
  } | null;
}

export function ProductForm({
  productOptions,
  selectedVariant,
  isInSaltyClub = false,
  sizeChartImage,
}: ProductFormProps) {
  const navigate = useNavigate();
  const { open } = useAside();
  const { open: openNewsletterPopup } = useNewsletterPopupControls();

  const isVariantAvailable = selectedVariant?.availableForSale;
  const shouldShowNotifyButton = Boolean(selectedVariant && !isVariantAvailable && isInSaltyClub);

  return (
    <div className="product-form space-y-6">
      {productOptions.map((option) => {
        // If there is only a single value in the option values, don't display the option
        if (option.optionValues.length === 1) return null;

        const isColor = option.name.toLowerCase() === 'color';
        const isSize = option.name.toLowerCase() === 'size';

        return (
          <div className="product-options" key={option.name}>
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-medium text-gray-900">{option.name}</h5>
              {isSize && <SizeChartButton sizeChartImage={sizeChartImage} />}
            </div>
            <div className={`flex flex-wrap gap-3 ${isColor ? 'justify-start' : 'justify-start'}`}>
              {option.optionValues.map((value) => {
                const {
                  name,
                  handle,
                  variantUriQuery,
                  selected,
                  available,
                  exists,
                  isDifferentProduct,
                  swatch,
                } = value;

                if (isDifferentProduct) {
                  // SEO
                  // When the variant is a combined listing child product
                  // that leads to a different url, we need to render it
                  // as an anchor tag
                  return (
                    <Link
                      className={`product-options-item transition-all ${isColor
                        ? 'w-8 h-8 flex items-center justify-center p-0 color-swatch'
                        : 'px-4 py-2 text-sm font-medium'
                        } ${selected
                          ? isColor
                            ? 'border-2 border-gray-900'
                            : 'text-gray-900 underline underline-offset-4'
                          : isColor
                            ? 'border border-gray-200 hover:border-gray-400'
                            : 'text-gray-600 hover:text-gray-900'
                        } ${!available ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      key={option.name + name}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={`/products/${handle}?${variantUriQuery}`}
                    >
                      <ProductOptionSwatch
                        swatch={swatch}
                        name={name}
                        isColor={isColor}
                        selected={selected}
                      />
                    </Link>
                  );
                } else {
                  // SEO
                  // When the variant is an update to the search param,
                  // render it as a button with javascript navigating to
                  // the variant so that SEO bots do not index these as
                  // duplicated links
                  return (
                    <button
                      type="button"
                      className={`product-options-item transition-all ${isColor
                        ? 'w-8 h-8 flex items-center justify-center p-0 color-swatch'
                        : 'px-4 py-2 text-sm font-medium'
                        } ${selected
                          ? isColor
                            ? 'border-2 border-gray-900'
                            : 'text-gray-900 underline underline-offset-4'
                          : isColor
                            ? 'border border-gray-200 hover:border-gray-400'
                            : 'text-gray-600 hover:text-gray-900'
                        } ${!exists ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      key={option.name + name}
                      disabled={!exists}
                      onClick={() => {
                        if (!selected) {
                          navigate(`?${variantUriQuery}`, {
                            replace: true,
                            preventScrollReset: true,
                          });
                        }
                      }}
                    >
                      <ProductOptionSwatch
                        swatch={swatch}
                        name={name}
                        isColor={isColor}
                        selected={selected}
                      />
                    </button>
                  );
                }
              })}
            </div>
          </div>
        );
      })}

      <div className="pt-4 space-y-3">
        <AddToCartButton
          disabled={!selectedVariant || !isVariantAvailable}
          onClick={() => {
            open('cart');
          }}
          lines={
            selectedVariant
              ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: 1,
                  selectedVariant,
                },
              ]
              : []
          }
        >
          <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
            {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
          </span>
        </AddToCartButton>
        {shouldShowNotifyButton && (
          <button
            type="button"
            onClick={openNewsletterPopup}
            className="w-full py-3 px-6 text-center tracking-wide text-base font-semibold transition-all duration-200 bg-[#beb1a1] text-black hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#beb1a1] active:opacity-80 border border-transparent"
          >
            Notify me when back in stock
          </button>
        )}
      </div>
    </div>
  );
}

function ProductOptionSwatch({
  swatch,
  name,
  isColor,
  selected,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
  isColor: boolean;
  selected: boolean;
}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (isColor) {
    if (!image && !color) return null;

    // Check if the color is white or very light
    const isWhiteOrLight = color && (
      color.toLowerCase() === 'white' ||
      color.toLowerCase() === '#ffffff' ||
      color.toLowerCase() === '#fff' ||
      color.toLowerCase().includes('white')
    );

    return (
      <div
        aria-label={name}
        className="w-full h-full"
        style={{
          backgroundColor: color || 'transparent',
          padding: 0, // Remove any padding
          margin: 0,  // Remove any margin
          display: 'block',
        }}
      >
        {!!image && (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover block" // Remove padding/margin from img
            style={{ padding: 0, margin: 0, display: 'block' }}
          />
        )}
        {/* Add border for white/light colors even when not selected */}
        {isWhiteOrLight && !selected && (
          <div className="w-full h-full border border-gray-300 pointer-events-none absolute top-0 left-0" style={{ boxSizing: 'border-box' }} />
        )}
      </div>
    );
  }

  // For non-color options (like size), just return the name
  return name;
}
