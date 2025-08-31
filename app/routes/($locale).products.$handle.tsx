import { type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { useLoaderData, type MetaFunction } from 'react-router';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
  Money,
} from '@shopify/hydrogen';
import { ProductPrice } from '~/components/ProductPrice';
import { ProductImageCarousel } from '~/components/ProductImageCarousel';
import { ProductForm } from '~/components/ProductForm';
import { flattenConnection } from '@shopify/hydrogen';
import { redirectIfHandleIsLocalized } from '~/lib/redirect';
import { useState, useEffect } from 'react';
import { trackPixelEvent, generateEventId } from '~/components/MetaPixel';
import { toMetaContentId } from '~/lib/meta';
import { AddToCartButton } from '~/components/AddToCartButton';
import { useAside } from '~/components/Aside';
import type {
  ProductFragment,
  ProductVariantFragment,
} from 'storefrontapi.generated';
import type { MappedProductOptions } from '@shopify/hydrogen';
import UpsellSection from '~/components/UpsellSection';
import BundleUpsellCard from '~/components/BundleUpsellCard';
import CrossSellUpsellCard from '~/components/CrossSellUpsellCard';

import {
  getProductUpsells,
  getBundleDefinition,
  BUNDLE_COLLECTIONS
} from '~/lib/bundleConfig';

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

  // Check if this product is in denim or polo collection and needs the crossSell upsell
  const { product } = criticalData;
  const productCollections = await fetchProductCollections(
    args,
    product.handle,
  );

  // Get all product images
  return {
    ...deferredData,
    ...criticalData,
    productCollections,
  };
}

// Fetch collections for the current product and complementary products for cross-selling
async function fetchProductCollections(
  args: LoaderFunctionArgs,
  productHandle: string,
) {
  const { context } = args;
  const { storefront } = context;

  try {
    // First, determine which collections the current product belongs to
    const { product } = await storefront.query(PRODUCT_COLLECTIONS_QUERY, {
      variables: { handle: productHandle },
    });

    // Get the collection handles the product belongs to
    const productCollectionHandles =
      product?.collections?.nodes.map((collection: any) => collection.handle) ||
      [];

    // Check if product is in denim or polo collection
    const isInDenim = productCollectionHandles.includes(BUNDLE_COLLECTIONS.DENIM);
    const isInPolo = productCollectionHandles.includes(BUNDLE_COLLECTIONS.POLO);
    const isInCaps = productCollectionHandles.includes(BUNDLE_COLLECTIONS.CAPS);
    const isInTops = productCollectionHandles.includes(BUNDLE_COLLECTIONS.TOPS);

    // Fetch products from the oversized-polos collection for polo bundles
    let polos: any[] = [];
    try {
      const result = await storefront.query(`
        query GetPolos {
          collection(handle: "${BUNDLE_COLLECTIONS.POLO}") {
            products(first: 50) {
              nodes {
                id
                title
                handle
                description
                featuredImage {
                  url
                  altText
                }
                options {
                  name
                  optionValues {
                    name
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
                variants(first: 100) {
                  nodes {
                    id
                    availableForSale
                    image {
                      url
                      altText
                    }
                    price {
                      amount
                      currencyCode
                    }
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
            }
          }
        }
      `);
      if (result?.collection?.products?.nodes) {
        polos = result.collection.products.nodes;
      }
    } catch (err) {
      console.error('Error fetching polos:', err);
    }

    // If product is in one of our target collections, fetch complementary products for cross-sell
    let complementaryProducts: any[] = [];
    if (isInDenim || isInPolo) {
      // Fetch products from the complementary collection
      const complementaryCollection = isInDenim
        ? BUNDLE_COLLECTIONS.POLO
        : BUNDLE_COLLECTIONS.DENIM;
      try {
        const result = await storefront.query(
          `
          query GetCollectionProducts($handle: String!) {
            collection(handle: $handle) {
              products(first: 10) {
                nodes {
                  id
                  title
                  handle
                  description
                  featuredImage {
                    url
                    altText
                  }
                  options {
                    name
                    optionValues {
                      name
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
                  variants(first: 100) {
                    nodes {
                      id
                      availableForSale
                      image {
                        url
                        altText
                      }
                      price {
                        amount
                        currencyCode
                      }
                      selectedOptions {
                        name
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        `,
          {
            variables: { handle: complementaryCollection },
          },
        );
        if (result?.collection?.products?.nodes) {
          complementaryProducts = result.collection.products.nodes;
        }
      } catch (collectionError) {
        console.error(
          'Error fetching complementary products:',
          collectionError,
        );
      }
    }

    // Fetch linen products for the linen bundle
    let linenShirt: any = null;
    let linenPants: any = null;

    // Check if current product is one of the linen products
    const isLinenShirt = productHandle === 'linen-shirt';
    const isLinenPants = productHandle === 'linen-pants';

    // Always fetch linen products if we're on either linen product page
    if (isLinenShirt || isLinenPants) {
      // Fetch both linen products
      try {
        const [shirtResult, pantsResult] = await Promise.all([
          storefront.query(`
            query GetLinenShirt {
              product(handle: "linen-shirt") {
                id
                title
                handle
                description
                featuredImage {
                  url
                  altText
                }
                options {
                  name
                  optionValues {
                    name
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
                variants(first: 100) {
                  nodes {
                    id
                    availableForSale
                    image {
                      url
                      altText
                    }
                    price {
                      amount
                      currencyCode
                    }
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
            }
          `),
          storefront.query(`
            query GetLinenPants {
              product(handle: "linen-pants") {
                id
                title
                handle
                description
                featuredImage {
                  url
                  altText
                }
                options {
                  name
                  optionValues {
                    name
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
                variants(first: 100) {
                  nodes {
                    id
                    availableForSale
                    image {
                      url
                      altText
                    }
                    price {
                      amount
                      currencyCode
                    }
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
            }
          `)
        ]);

        linenShirt = shirtResult?.product;
        linenPants = pantsResult?.product;
      } catch (err) {
        console.error('Error fetching linen products:', err);
      }
    }

    // Fetch caps and tops for the 4 tops + 1 cap bundle
    let caps: any[] = [];
    let tops: any[] = [];

    // Always fetch caps and tops for the bundle (not just when current product is in those collections)
    // Fetch caps collection
    try {
      const capsResult = await storefront.query(`
          query GetCaps {
            collection(handle: "${BUNDLE_COLLECTIONS.CAPS}") {
              products(first: 50) {
                nodes {
                  id
                  title
                  handle
                  description
                  featuredImage {
                    url
                    altText
                  }
                  options {
                    name
                    optionValues {
                      name
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
                  variants(first: 100) {
                    nodes {
                      id
                      availableForSale
                      image {
                        url
                        altText
                      }
                      price {
                        amount
                        currencyCode
                      }
                      selectedOptions {
                        name
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        `);
      if (capsResult?.collection?.products?.nodes) {
        caps = capsResult.collection.products.nodes;
      }
    } catch (err) {
      console.error('Error fetching caps:', err);
    }

    // Fetch tops collection
    try {
      const topsResult = await storefront.query(`
          query GetTops {
            collection(handle: "${BUNDLE_COLLECTIONS.TOPS}") {
              products(first: 50) {
                nodes {
                  id
                  title
                  handle
                  description
                  featuredImage {
                    url
                    altText
                  }
                  options {
                    name
                    optionValues {
                      name
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
                  variants(first: 100) {
                    nodes {
                      id
                      availableForSale
                      image {
                        url
                        altText
                      }
                      price {
                        amount
                        currencyCode
                      }
                      selectedOptions {
                        name
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        `);
      if (topsResult?.collection?.products?.nodes) {
        tops = topsResult.collection.products.nodes;
      }
    } catch (err) {
      console.error('Error fetching tops:', err);
    }

    return {
      isInDenim,
      isInPolo,
      isInCaps,
      isInTops,
      isLinenShirt,
      isLinenPants,
      complementaryProducts, // for cross-sell
      polos, // for polo bundles
      caps, // for 4 tops + 1 cap bundle
      tops, // for 4 tops + 1 cap bundle
      linenShirt, // for linen bundle
      linenPants, // for linen bundle
    };
  } catch (error) {
    console.error('Error fetching collections:', error);
    return {
      isInDenim: false,
      isInPolo: false,
      isInCaps: false,
      isInTops: false,
      isLinenShirt: false,
      isLinenPants: false,
      complementaryProducts: [],
      polos: [],
      caps: [],
      tops: [],
      linenShirt: null,
      linenPants: null,
    };
  }
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

function findVariant(
  product: ProductFragment,
  selectedOptions: { name: string; value: string }[],
): ProductVariantFragment | undefined {
  return product.variants.nodes.find((variant: ProductVariantFragment) => {
    return selectedOptions.every(
      ({ name, value }: { name: string; value: string }) => {
        return variant.selectedOptions.some(
          (opt: { name: string; value: string }) =>
            opt.name === name && opt.value === value,
        );
      },
    );
  });
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
  useEffect(() => {
    const variantId = selectedVariant?.id;
    if (!product?.id || !variantId) return;
    const priceAmount = Number(selectedVariant?.price?.amount || 0);
    const currency = selectedVariant?.price?.currencyCode || 'USD';
    const eventId = generateEventId();
    const mappedId = toMetaContentId(variantId);
    trackPixelEvent('ViewContent', {
      content_type: 'product',
      content_ids: mappedId ? [mappedId] : undefined,
      value: priceAmount,
      currency,
      eventID: eventId,
    });
  }, [product?.id, selectedVariant?.id]);


  // Get product collections data
  const { productCollections } = useLoaderData<typeof loader>();

  // Find upsells for this product using centralized configuration
  const upsellKey = handle?.toLowerCase().trim();
  const collectionHandles = [];
  if (productCollections?.isInDenim) collectionHandles.push(BUNDLE_COLLECTIONS.DENIM);
  if (productCollections?.isInPolo) collectionHandles.push(BUNDLE_COLLECTIONS.POLO);
  if (productCollections?.isInCaps) collectionHandles.push(BUNDLE_COLLECTIONS.CAPS);
  if (productCollections?.isInTops) collectionHandles.push(BUNDLE_COLLECTIONS.TOPS);

  // Get all bundles this product is eligible for
  const upsellKeys = getProductUpsells(upsellKey || '', collectionHandles);
  const upsells = upsellKeys.map(key => getBundleDefinition(key)).filter(Boolean);

  // The centralized configuration already handles all the bundle logic
  // No need to manually add bundles - they're all configured in bundleConfig.ts

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Image Carousel */}
        <div className="product-image-section">
          <ProductImageCarousel
            product={product}
            selectedVariant={selectedVariant}
            allImages={product.images ? flattenConnection(product.images) as Array<{ id: string; url: string; altText: string | null; width: number; height: number; }> : []}
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
            <div className="mt-8">
              <UpsellSection
                product={product}
                productOptions={productOptions}
                upsells={upsells}
              />
            </div>
          )}

          <div className="product-description mt-8">
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
    images(first: 250) {
      nodes {
        id
        url
        altText
        width
        height
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

const PRODUCT_COLLECTIONS_QUERY = `#graphql
  query ProductCollections($handle: String!) {
    product(handle: $handle) {
      collections(first: 10) {
        nodes {
          id
          title
          handle
        }
      }
    }
  }
` as const;

const COLLECTION_PRODUCTS_QUERY = `#graphql
  query CollectionProducts($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      products(first: $first) {
        nodes {
          id
          title
          handle
          description
          featuredImage {
            url
            altText
            width
            height
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          variants(first: 1) {
            nodes {
              id
              availableForSale
              price {
                amount
                currencyCode
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
  }
` as const;
