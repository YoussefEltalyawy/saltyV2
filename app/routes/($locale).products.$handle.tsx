import { type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { useLoaderData, type MetaFunction } from 'react-router';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import { ProductPrice } from '~/components/ProductPrice';
import { ProductImageCarousel } from '~/components/ProductImageCarousel';
import { ProductForm } from '~/components/ProductForm';
import { redirectIfHandleIsLocalized } from '~/lib/redirect';
import { useState } from 'react';
import { AddToCartButton } from '~/components/AddToCartButton';
import { useAside } from '~/components/Aside';
import type { ProductFragment, ProductVariantFragment } from 'storefrontapi.generated';
import type { MappedProductOptions } from '@shopify/hydrogen';

// --- Upsell Config ---
type UpsellConfig = {
  [handle: string]: Array<{
    type: string;
    title: string;
    description: string;
    minQuantity: number;
    discountType: string;
    [key: string]: any;
  }>;
};

const UPSELLS: UpsellConfig = {
  'cocktails-baby-tee-pre-order': [
    {
      type: 'bundle',
      title: '3 Tops Bundle – 15% Off!',
      description: 'Pick any 3 tops (choose color and size for each) and get 15% off.',
      minQuantity: 3,
      discountType: 'automatic',
    },
    // Add more upsells for this product here
  ],
  // Add more product handles as needed
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `SALTY | ${data?.product.title ?? ''}` },
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
  ];
};

export async function loader(args: LoaderFunctionArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return { ...deferredData, ...criticalData };
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({
  context,
  params,
  request,
}: LoaderFunctionArgs) {
  const { handle } = params;
  const { storefront } = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{ product }] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: { handle, selectedOptions: getSelectedProductOptions(request) },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response(null, { status: 404 });
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, { handle, data: product });

  return {
    product,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({ context, params }: LoaderFunctionArgs) {
  // Put any API calls that is not critical to be available on first page render
  // For example: product reviews, product recommendations, social feeds.

  return {};
}

function findVariant(product: ProductFragment, selectedOptions: { name: string; value: string }[]): ProductVariantFragment | undefined {
  return product.variants.nodes.find((variant: ProductVariantFragment) => {
    return selectedOptions.every(({ name, value }: { name: string; value: string }) => {
      return variant.selectedOptions.some(
        (opt: { name: string; value: string }) => opt.name === name && opt.value === value
      );
    });
  });
}

function UpsellSection({ product, productOptions, upsells }: {
  product: ProductFragment;
  productOptions: MappedProductOptions[];
  upsells: any[];
}) {
  return (
    <div className="flex flex-col gap-10">
      {upsells.map((upsell: any, idx: number) => {
        if (upsell.type === 'bundle') {
          return (
            <BundleUpsellCard
              key={idx}
              product={product}
              productOptions={productOptions}
              upsell={upsell}
            />
          );
        }
        // Add more upsell types here
        return null;
      })}
    </div>
  );
}

function BundleUpsellCard({ product, productOptions, upsell }: {
  product: ProductFragment;
  productOptions: MappedProductOptions[];
  upsell: {
    minQuantity: number;
    title: string;
    description: string;
    [key: string]: any;
  };
}) {
  const { minQuantity, title, description } = upsell;
  const { open } = useAside();
  const [error, setError] = useState('');

  // Define the selection type to fix TypeScript errors
  type SelectionType = {
    color: string;
    size: string;
    variantId?: string;
    image?: string;
  };

  // Option values
  const getOptionValues = (optionName: string): string[] => {
    const opt = productOptions.find((o) => o.name.toLowerCase() === optionName);
    return opt ? opt.optionValues.map((v: any) => v.name) : [];
  };

  const colorOptions = getOptionValues('color');
  const sizeOptions = getOptionValues('size');

  // Initialize selections with default values (first color and size)
  const initializeSelections = (): SelectionType[] => {
    const defaultSelections: SelectionType[] = [];
    const defaultColor = colorOptions.length > 0 ? colorOptions[0] : '';
    const defaultSize = sizeOptions.length > 0 ? sizeOptions[0] : '';

    for (let i = 0; i < minQuantity; i++) {
      const selection: SelectionType = { color: defaultColor, size: defaultSize };

      // Find variant for default selection
      if (defaultColor && defaultSize) {
        const variant = findVariant(product, [
          { name: 'Color', value: defaultColor },
          { name: 'Size', value: defaultSize },
        ]);

        if (variant) {
          selection.variantId = variant.id;
          selection.image = variant.image?.url;
        }
      }

      defaultSelections.push(selection);
    }

    return defaultSelections;
  };

  const [selections, setSelections] = useState<SelectionType[]>(initializeSelections);

  // Update selection for a top
  const handleChange = (idx: number, field: string, value: string) => {
    const newSelections = [...selections];
    newSelections[idx] = {
      ...newSelections[idx],
      [field]: value,
    };
    // Try to resolve variant if both color and size are selected
    if (newSelections[idx].color && newSelections[idx].size) {
      const variant = findVariant(product, [
        { name: 'Color', value: newSelections[idx].color },
        { name: 'Size', value: newSelections[idx].size },
      ]);
      newSelections[idx].variantId = variant?.id;
      newSelections[idx].image = variant?.image?.url;
    } else {
      newSelections[idx].variantId = undefined;
      newSelections[idx].image = undefined;
    }
    setSelections(newSelections);
  };

  // Prepare lines for AddToCartButton
  const lines = selections.every(sel => sel.variantId)
    ? selections.map(sel => ({ merchandiseId: sel.variantId!, quantity: 1 }))
    : [];

  // Validate before add to cart
  const handleClick = () => {
    if (!selections.every(sel => sel.variantId)) {
      setError(`Please select color and size for all ${minQuantity} tops.`);
      return false;
    }
    setError('');
    open('cart'); // Open cart aside when successfully added
    return true;
  };

  return (
    <div className="mb-4 border border-gray-200 p-6">
      <h2 className="text-2xl font-medium text-black mb-2">{title}</h2>
      <p className="mb-6 text-gray-700">{description}</p>

      {/* Product cards in a horizontal row */}
      <div className="grid grid-cols-3 gap-4">
        {selections.map((sel, idx) => (
          <div key={idx} className="flex flex-col border border-gray-100 p-3">
            {/* Larger product image without title */}
            <div className="w-full aspect-square mb-3 bg-gray-100 max-h-48">
              {sel.image ? (
                <img src={sel.image} alt="Selected variant" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-gray-400 text-xs">Select options</span>
                </div>
              )}
            </div>

            {/* Color selection */}
            <div className="product-options mb-3">
              <h5 className="text-xs font-medium text-gray-900 mb-2">Color</h5>
              <div className="flex flex-wrap gap-2 justify-start">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`product-options-item transition-all w-6 h-6 flex items-center justify-center p-0 color-swatch
                      ${sel.color === color
                        ? 'border-2 border-gray-900'
                        : 'border border-gray-200 hover:border-gray-400'
                      }`}
                    onClick={() => handleChange(idx, 'color', color)}
                  >
                    <div
                      aria-label={color}
                      className="w-full h-full"
                      style={{
                        backgroundColor: color.toLowerCase(),
                        padding: 0,
                        margin: 0,
                        display: 'block',
                      }}
                    >
                      {/* Add border for white/light colors */}
                      {(color.toLowerCase() === 'white' || color.toLowerCase().includes('white')) && (
                        <div className="w-full h-full border border-gray-300 pointer-events-none absolute top-0 left-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Size selection */}
            <div className="product-options">
              <h5 className="text-xs font-medium text-gray-900 mb-2">Size</h5>
              <div className="flex flex-wrap gap-2 justify-start">
                {sizeOptions.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`product-options-item transition-all px-2 py-1 text-xs font-medium
                      ${sel.size === size
                        ? 'text-gray-900 underline underline-offset-4'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                    onClick={() => handleChange(idx, 'size', size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="text-red-600 mt-4 text-sm">{error}</div>}

      <div className="mt-6">
        <AddToCartButton
          disabled={lines.length !== minQuantity}
          lines={lines}
          onClick={handleClick}
        >
          <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
            Add Bundle to Cart
          </span>
        </AddToCartButton>
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">Discount applied automatically at checkout.</div>
    </div>
  );
}

export default function Product() {
  const { product } = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const { title, descriptionHtml, handle } = product;

  // Find upsells for this product
  const upsells = UPSELLS[handle] || [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Image Carousel */}
        <div className="product-image-section">
          <ProductImageCarousel
            product={product}
            selectedVariant={selectedVariant}
          />
        </div>

        {/* Product Details */}
        <div className="product-details px-2">
          <h1 className="text-2xl font-medium text-black">{title}</h1>

          <div className="">
            <ProductPrice
              price={selectedVariant?.price}
              compareAtPrice={selectedVariant?.compareAtPrice}
              size="base"
            />
          </div>

          <div className="">
            <ProductForm
              productOptions={productOptions}
              selectedVariant={selectedVariant}
            />
          </div>

          {/* Upsell Section: Moved before description, only show if upsells are configured for this product */}
          {upsells.length > 0 && (
            <div className="mt-">
              <UpsellSection product={product} productOptions={productOptions} upsells={upsells} />
            </div>
          )}

          <div className="product-description mt-">
            <h3 className="text-lg font-medium text-black mb-4">Description</h3>
            <div
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </div>
        </div>
      </div>

      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    variants(first: 100) {
      nodes {
        ...ProductVariant
      }
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;
