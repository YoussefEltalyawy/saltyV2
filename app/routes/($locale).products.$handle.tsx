import { redirect, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
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
import React, { useState } from 'react';
import { AddToCartButton } from '~/components/AddToCartButton';
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
    <div className="my-12 flex flex-col gap-10">
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
  const [selections, setSelections] = useState(Array(minQuantity).fill({}));
  const [error, setError] = useState('');

  // Option values
  const getOptionValues = (optionName: string): string[] => {
    const opt = productOptions.find((o) => o.name.toLowerCase() === optionName);
    return opt ? opt.optionValues.map((v: any) => v.name) : [];
  };
  const colorOptions = getOptionValues('color');
  const sizeOptions = getOptionValues('size');

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
    ? selections.map(sel => ({ merchandiseId: sel.variantId, quantity: 1 }))
    : [];

  // Validate before add to cart
  const handleClick = () => {
    if (!selections.every(sel => sel.variantId)) {
      setError(`Please select color and size for all ${minQuantity} tops.`);
      return false;
    }
    setError('');
    return true;
  };

  return (
    <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg max-w-3xl mx-auto shadow-md">
      <h2 className="text-2xl font-bold mb-2 text-center">{title}</h2>
      <p className="mb-6 text-center text-gray-700">{description}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {selections.map((sel, idx) => (
          <div key={idx} className="flex flex-col items-center bg-white rounded-lg p-4 shadow-sm">
            <span className="font-medium mb-2">Top {idx + 1}</span>
            <div className="w-24 h-24 mb-2 flex items-center justify-center bg-gray-100 rounded">
              {sel.image ? (
                <img src={sel.image} alt="Selected variant" className="w-full h-full object-contain rounded" />
              ) : (
                <span className="text-gray-400">No image</span>
              )}
            </div>
            <select
              className="border rounded px-2 py-1 mb-2 w-full"
              value={sel.color || ''}
              onChange={e => handleChange(idx, 'color', e.target.value)}
            >
              <option value="">Color</option>
              {colorOptions.map((color) => (
                <option key={color} value={color}>{color}</option>
              ))}
            </select>
            <select
              className="border rounded px-2 py-1 w-full"
              value={sel.size || ''}
              onChange={e => handleChange(idx, 'size', e.target.value)}
            >
              <option value="">Size</option>
              {sizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {error && <div className="text-red-600 mt-4 text-center">{error}</div>}
      <div className="mt-8 flex justify-center">
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

          <div className="product-description">
            <h3 className="text-lg font-medium text-black mb-4">Description</h3>
            <div
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </div>
        </div>
      </div>

      {/* Upsell Section: Only show if upsells are configured for this product */}
      {upsells.length > 0 && (
        <UpsellSection product={product} productOptions={productOptions} upsells={upsells} />
      )}

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
