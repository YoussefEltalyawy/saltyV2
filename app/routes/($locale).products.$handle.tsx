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

// --- Upsell Config ---
type UpsellConfig = {
  [key: string]: Array<{
    type: string;
    title: string;
    description: string;
    minQuantity?: number;
    discountType: string;
    discountValue?: number;
    collections?: string[];
    [key: string]: any;
  }>;
};

// Collection handles for the denim + polo bundle - using the exact collection handles from the store
// These are the exact collection handles from the URLs: collections/denim and collections/oversized-polos
const DENIM_COLLECTION = 'denim';
const POLO_COLLECTION = 'oversized-polos';
const CAPS_COLLECTION = 'caps';
const TOPS_COLLECTION = 'tops';

// No debug mode or test data - we'll fetch actual products from collections

// Global upsells that apply to specific collections rather than product handles
const GLOBAL_UPSELLS = {
  crossSellDenimPolo: {
    type: 'crossSell',
    title: 'Denim + Polo Bundle – 10% Off!',
    description: 'Add a matching piece to complete your look and save 10%.',
    discountType: 'automatic',
    discountValue: 10,
    collections: [DENIM_COLLECTION, POLO_COLLECTION],
  },
  linenCrossell: {
    type: 'linenCrossSell',
    title: 'Linen Shirt + Pants Bundle – 15% Off!',
    description: 'Complete your linen look and save 15% on the total bundle price.',
    discountType: 'automatic',
    discountValue: 15,
    shirtHandle: 'linen-shirt',
    pantsHandle: 'linen-pants',
  },
  poloBundle2: {
    type: 'bundle',
    title: '2 Polos Bundle – 10% Off!',
    description:
      'Pick any 2 polos (choose color and size for each) and get 10% off.',
    minQuantity: 2,
    discountType: 'automatic',
    discountValue: 10,
    collectionRestriction: POLO_COLLECTION,
  },
  poloBundle3: {
    type: 'bundle',
    title: '3 Polos Bundle – 15% Off!',
    description:
      'Pick any 3 polos (choose color and size for each) and get 15% off.',
    minQuantity: 3,
    discountType: 'automatic',
    discountValue: 15,
    collectionRestriction: POLO_COLLECTION,
  },
  topsCapBundle: {
    type: 'crossSell',
    title: 'Buy 4 Tops Get 1 Cap Free!',
    description: 'Choose 4 tops and get a cap of your choice absolutely free.',
    discountType: 'automatic',
    discountCode: '4TOPSFREECAP',
    collections: [TOPS_COLLECTION, CAPS_COLLECTION],
    minTopsQuantity: 4,
    freeCapsQuantity: 1,
  },
};

const UPSELLS: UpsellConfig = {
  'cocktails-baby-tee-pre-order': [
    {
      type: 'bundle',
      title: '3 Tops Bundle – 15% Off!',
      description:
        'Pick any 3 tops (choose color and size for each) and get 15% off.',
      minQuantity: 3,
      discountType: 'automatic',
    },
  ],
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
    const isInDenim = productCollectionHandles.includes(DENIM_COLLECTION);
    const isInPolo = productCollectionHandles.includes(POLO_COLLECTION);
    const isInCaps = productCollectionHandles.includes(CAPS_COLLECTION);
    const isInTops = productCollectionHandles.includes(TOPS_COLLECTION);

    // Fetch products from the oversized-polos collection for polo bundles
    let polos: any[] = [];
    try {
      const result = await storefront.query(`
        query GetPolos {
          collection(handle: "${POLO_COLLECTION}") {
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
        ? POLO_COLLECTION
        : DENIM_COLLECTION;
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
    if (true) {
      // Fetch caps collection
      try {
        const capsResult = await storefront.query(`
          query GetCaps {
            collection(handle: "${CAPS_COLLECTION}") {
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
            collection(handle: "${TOPS_COLLECTION}") {
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

  // Find upsells for this product
  const upsellKey = handle?.toLowerCase().trim();
  let upsells = [...(UPSELLS[upsellKey] || [])];

  // Add polo bundle offers if the product is in the polo collection
  if (productCollections?.isInPolo) {
    upsells = [...upsells, GLOBAL_UPSELLS.poloBundle3];
    upsells = [...upsells, GLOBAL_UPSELLS.poloBundle2];
  }

  // Add the denim + polo cross-sell upsell if the product is in one of those collections
  // and there are complementary products available
  if (
    (productCollections?.isInDenim || productCollections?.isInPolo) &&
    productCollections?.complementaryProducts?.length > 0
  ) {
    upsells = [...upsells, GLOBAL_UPSELLS.crossSellDenimPolo];
  }

  // Add 4 tops + 1 cap bundle if the product is in caps or tops collection, or if it's the cocktails baby tee
  if (
    productCollections?.isInCaps ||
    productCollections?.isInTops ||
    handle === 'cocktails-baby-tee-pre-order'
  ) {
    upsells = [...upsells, GLOBAL_UPSELLS.topsCapBundle];
  }

  // Add linen cross-sell bundle if the product is linen shirt or linen pants
  if (
    (productCollections?.isLinenShirt || productCollections?.isLinenPants) &&
    productCollections?.linenShirt &&
    productCollections?.linenPants
  ) {
    upsells = [...upsells, GLOBAL_UPSELLS.linenCrossell];
  }

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
