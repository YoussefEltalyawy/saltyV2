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
import { redirectIfHandleIsLocalized } from '~/lib/redirect';
import { useState, useEffect } from 'react';
import { AddToCartButton } from '~/components/AddToCartButton';
import { useAside } from '~/components/Aside';
import type { ProductFragment, ProductVariantFragment } from 'storefrontapi.generated';
import type { MappedProductOptions } from '@shopify/hydrogen';

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
  poloBundle2: {
    type: 'bundle',
    title: '2 Polos Bundle – 10% Off!',
    description: 'Pick any 2 polos (choose color and size for each) and get 10% off.',
    minQuantity: 2,
    discountType: 'automatic',
    discountValue: 10,
    collectionRestriction: POLO_COLLECTION,
  },
  poloBundle3: {
    type: 'bundle',
    title: '3 Polos Bundle – 15% Off!',
    description: 'Pick any 3 polos (choose color and size for each) and get 15% off.',
    minQuantity: 3,
    discountType: 'automatic',
    discountValue: 15,
    collectionRestriction: POLO_COLLECTION,
  }
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
  const productCollections = await fetchProductCollections(args, product.handle);

  return {
    ...deferredData,
    ...criticalData,
    productCollections,
  };
}

// Fetch collections for the current product and complementary products for cross-selling
async function fetchProductCollections(args: LoaderFunctionArgs, productHandle: string) {
  const { context } = args;
  const { storefront } = context;

  try {
    // First, determine which collections the current product belongs to
    const { product } = await storefront.query(PRODUCT_COLLECTIONS_QUERY, {
      variables: { handle: productHandle },
    });

    // Get the collection handles the product belongs to
    const productCollectionHandles = product?.collections?.nodes.map((collection: any) => collection.handle) || [];

    // Check if product is in denim or polo collection
    const isInDenim = productCollectionHandles.includes(DENIM_COLLECTION);
    const isInPolo = productCollectionHandles.includes(POLO_COLLECTION);

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
      const complementaryCollection = isInDenim ? POLO_COLLECTION : DENIM_COLLECTION;
      try {
        const result = await storefront.query(`
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
        `, {
          variables: { handle: complementaryCollection },
        });
        if (result?.collection?.products?.nodes) {
          complementaryProducts = result.collection.products.nodes;
        }
      } catch (collectionError) {
        console.error('Error fetching complementary products:', collectionError);
      }
    }

    return {
      isInDenim,
      isInPolo,
      complementaryProducts, // for cross-sell
      polos, // for polo bundles
    };
  } catch (error) {
    console.error('Error fetching collections:', error);
    return {
      isInDenim: false,
      isInPolo: false,
      complementaryProducts: [],
      polos: [],
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
  const { productCollections } = useLoaderData<typeof loader>();

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
        } else if (upsell.type === 'crossSell') {
          // Use real data from collections
          const complementaryProducts = productCollections?.complementaryProducts || [];

          if (complementaryProducts.length > 0) {
            return (
              <CrossSellUpsellCard
                key={idx}
                currentProduct={product}
                complementaryProducts={complementaryProducts}
                upsell={upsell}
              />
            );
          }
        }
        return null;
      })}
    </div>
  );
}

function CrossSellUpsellCard({ currentProduct, complementaryProducts, upsell }: {
  currentProduct: ProductFragment;
  complementaryProducts: any[];
  upsell: {
    title: string;
    description: string;
    discountValue: number;
    [key: string]: any;
  };
}) {
  const { title, description, discountValue } = upsell;
  const { open } = useAside();
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});

  // Initialize with the first product if available
  useEffect(() => {
    if (complementaryProducts.length > 0 && !selectedProduct) {
      const product = complementaryProducts[0];
      setSelectedProduct(product);

      // Initialize with first variant
      if (product.variants.nodes.length > 0) {
        const firstVariant = product.variants.nodes[0];
        setSelectedVariantId(firstVariant.id);
        setSelectedVariant(firstVariant);

        // Initialize selected options from the first variant
        const initialOptions: { [key: string]: string } = {};
        firstVariant.selectedOptions.forEach((option: any) => {
          initialOptions[option.name] = option.value;
        });
        setSelectedOptions(initialOptions);
      }
    }
  }, [complementaryProducts, selectedProduct]);

  // Handle product selection change
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productHandle = e.target.value;
    const product = complementaryProducts.find(p => p.handle === productHandle);

    if (product) {
      setSelectedProduct(product);

      // Reset variant selection and set to first available variant
      if (product.variants.nodes.length > 0) {
        const firstVariant = product.variants.nodes[0];
        setSelectedVariantId(firstVariant.id);
        setSelectedVariant(firstVariant);

        // Initialize selected options from the first variant
        const initialOptions: { [key: string]: string } = {};
        firstVariant.selectedOptions.forEach((option: any) => {
          initialOptions[option.name] = option.value;
        });
        setSelectedOptions(initialOptions);
      } else {
        setSelectedVariantId(null);
        setSelectedVariant(null);
        setSelectedOptions({});
      }
    }
  };

  // Handle option change (color, size, etc.)
  const handleOptionChange = (name: string, value: string) => {
    const newOptions = { ...selectedOptions, [name]: value };
    setSelectedOptions(newOptions);

    // Find the variant that matches all selected options
    if (selectedProduct) {
      const matchingVariant = selectedProduct.variants.nodes.find((variant: any) => {
        return variant.selectedOptions.every((option: any) => {
          return newOptions[option.name] === option.value;
        });
      });

      if (matchingVariant) {
        setSelectedVariantId(matchingVariant.id);
        setSelectedVariant(matchingVariant);
      }
    }
  };

  // Get available options for the selected product
  const getProductOptions = () => {
    if (!selectedProduct || !selectedProduct.options) return [];
    return selectedProduct.options;
  };

  // Get option values for a specific option name
  const getOptionValues = (optionName: string) => {
    const option = selectedProduct?.options?.find((opt: any) => opt.name === optionName);
    return option && option.optionValues ? option.optionValues.map((v: any) => v.name) : [];
  };

  // Prepare lines for AddToCartButton (current product + selected complementary product)
  const lines = [];

  // Add current product to cart
  if (currentProduct.selectedOrFirstAvailableVariant?.id) {
    lines.push({
      merchandiseId: currentProduct.selectedOrFirstAvailableVariant.id,
      quantity: 1
    });
  }

  // Add selected complementary product to cart
  if (selectedVariantId) {
    lines.push({
      merchandiseId: selectedVariantId,
      quantity: 1
    });
  }

  // Validate before add to cart
  const handleClick = () => {
    if (!selectedVariantId) {
      setError('Please select a product to complete the bundle.');
      return false;
    }
    setError('');
    open('cart'); // Open cart aside when successfully added
    return true;
  };

  // Calculate original and discounted prices
  const calculatePrices = () => {
    if (!currentProduct.selectedOrFirstAvailableVariant?.price || !selectedVariant?.price) {
      return { original: 0, discounted: 0 };
    }

    const currentProductPrice = parseFloat(currentProduct.selectedOrFirstAvailableVariant.price.amount);
    const complementaryProductPrice = parseFloat(selectedVariant.price.amount);
    const originalTotal = currentProductPrice + complementaryProductPrice;
    const discountedTotal = originalTotal * (1 - discountValue / 100);

    return {
      original: originalTotal,
      discounted: discountedTotal,
      currencyCode: currentProduct.selectedOrFirstAvailableVariant.price.currencyCode
    };
  };

  const prices = calculatePrices();

  return (
    <div className="mb-4 border border-gray-200 p-6">
      <h2 className="text-2xl font-medium text-black mb-2">{title}</h2>
      <p className="mb-6 text-gray-700">{description}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current product */}
        <div className="flex flex-col border border-gray-100 p-3">
          <h3 className="text-sm font-medium mb-2">Current Selection</h3>
          <div className="w-full aspect-square mb-3 bg-gray-100 max-h-48">
            {currentProduct.selectedOrFirstAvailableVariant?.image?.url ? (
              <img
                src={currentProduct.selectedOrFirstAvailableVariant.image.url}
                alt={currentProduct.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400 text-xs">No image available</span>
              </div>
            )}
          </div>
          <div className="text-sm font-medium">{currentProduct.title}</div>
          <div className="text-xs text-gray-500 mt-1">
            {(currentProduct.selectedOrFirstAvailableVariant?.selectedOptions ?? []).map((option: any) => (
              <span key={option.name}>{option.name}: {option.value} </span>
            ))}
          </div>
          <div className="mt-2 text-sm font-medium">
            {currentProduct.selectedOrFirstAvailableVariant?.price?.amount} {currentProduct.selectedOrFirstAvailableVariant?.price?.currencyCode}
          </div>
        </div>

        {/* Complementary product selection */}
        <div className="flex flex-col border border-gray-100 p-3">
          <h3 className="text-sm font-medium mb-2">Choose a complementary item</h3>

          <select
            className="border border-gray-300 rounded px-2 py-1 mb-3 text-sm"
            onChange={handleProductChange}
            value={selectedProduct?.handle || ''}
          >
            {(complementaryProducts ?? []).map((product: any) => (
              <option key={product.handle} value={product.handle}>
                {product.title}
              </option>
            ))}
          </select>

          {selectedProduct && (
            <>
              <div className="w-full aspect-square mb-3 bg-gray-100 max-h-48">
                {selectedVariant?.image?.url ? (
                  <img
                    src={selectedVariant.image.url}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                ) : selectedProduct.featuredImage?.url ? (
                  <img
                    src={selectedProduct.featuredImage.url}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No image available</span>
                  </div>
                )}
              </div>
              <div className="text-sm font-medium">{selectedProduct.title}</div>

              {/* Variant options */}
              {getProductOptions().map((option: any) => (
                <div key={option.name} className="product-options mb-3">
                  <h5 className="text-xs font-medium text-gray-900 mb-2">{option.name}</h5>
                  <div className="flex flex-wrap gap-2 justify-start">
                    {(getOptionValues(option.name) ?? []).map((value: string) => (
                      option.name.toLowerCase() === 'color' ? (
                        <button
                          key={value}
                          type="button"
                          className={`product-options-item transition-all w-8 h-8 flex items-center justify-center p-0 color-swatch
                            ${selectedOptions[option.name] === value
                              ? 'border-2 border-gray-900'
                              : 'border border-gray-200 hover:border-gray-400'
                            }`}
                          onClick={() => handleOptionChange(option.name, value)}
                          style={{ borderRadius: '0' }} // Make it square
                        >
                          {/* Find the variant with this color to get the actual swatch */}
                          {(() => {
                            // Try to find a variant with this color to get its image
                            const variantWithColor = selectedProduct.variants.nodes.find((v: any) =>
                              v.selectedOptions.some((opt: any) =>
                                opt.name === option.name && opt.value === value
                              )
                            );

                            // If variant has an image, use it as background
                            if (variantWithColor?.image?.url) {
                              return (
                                <div
                                  aria-label={value}
                                  className="w-full h-full"
                                  style={{
                                    backgroundImage: `url(${variantWithColor.image.url})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    padding: 0,
                                    margin: 0,
                                    display: 'block',
                                  }}
                                />
                              );
                            }

                            // Otherwise use the color name as background color
                            return (
                              <div
                                aria-label={value}
                                className="w-full h-full"
                                style={{
                                  backgroundColor: value.toLowerCase(),
                                  padding: 0,
                                  margin: 0,
                                  display: 'block',
                                }}
                              >
                                {/* Add border for white/light colors */}
                                {(value.toLowerCase() === 'white' || value.toLowerCase().includes('white')) && (
                                  <div className="w-full h-full border border-gray-300 pointer-events-none absolute top-0 left-0" />
                                )}
                              </div>
                            );
                          })()}
                        </button>
                      ) : (
                        <button
                          key={value}
                          type="button"
                          className={`product-options-item transition-all px-2 py-1 text-xs font-medium
                            ${selectedOptions[option.name] === value
                              ? 'text-gray-900 underline underline-offset-4'
                              : 'text-gray-600 hover:text-gray-900'
                            }`}
                          onClick={() => handleOptionChange(option.name, value)}
                        >
                          {value}
                        </button>
                      )
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-2 text-sm font-medium">
                {selectedVariant?.price?.amount} {selectedVariant?.price?.currencyCode}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bundle pricing */}
      <div className="mt-6 text-center">
        <div className="text-lg font-medium">Bundle Price:</div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-gray-500 line-through">
            {prices.original.toFixed(2)} {prices.currencyCode}
          </span>
          <span className="text-xl font-bold">
            {prices.discounted.toFixed(2)} {prices.currencyCode}
          </span>
          <span className="text-green-600 text-sm">
            (Save {discountValue}%)
          </span>
        </div>
      </div>

      {error && <div className="text-red-600 mt-4 text-sm text-center">{error}</div>}

      <div className="mt-6">
        <AddToCartButton
          disabled={lines.length < 2}
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

function BundleUpsellCard({ product, productOptions, upsell }: {
  product: ProductFragment;
  productOptions: MappedProductOptions[];
  upsell: {
    minQuantity: number;
    title: string;
    description: string;
    discountValue?: number;
    collectionRestriction?: string;
    [key: string]: any;
  };
}) {
  const { minQuantity, title, description, discountValue = 15, collectionRestriction } = upsell;
  const { open } = useAside();
  const [error, setError] = useState('');
  const { productCollections } = useLoaderData<typeof loader>();

  // For polo bundles, we need to fetch other polos
  const [availablePolos, setAvailablePolos] = useState<any[]>([]);
  const [selectedPoloHandles, setSelectedPoloHandles] = useState<string[]>([]);
  const [selectedPolos, setSelectedPolos] = useState<any[]>([]);

  // Check if this is a polo bundle (2 or 3 polos)
  const isPoloBundle = collectionRestriction === POLO_COLLECTION;

  // Define the selection type to fix TypeScript errors
  type SelectionType = {
    color: string;
    size: string;
    variantId?: string;
    image?: string;
    productHandle?: string; // For polo bundles
  };

  // Option values
  const getOptionValues = (optionName: string): string[] => {
    const opt = productOptions.find((o) => o.name.toLowerCase() === optionName);
    return opt ? opt.optionValues.map((v: any) => v.name) : [];
  };

  const colorOptions = getOptionValues('color');
  const sizeOptions = getOptionValues('size');

  // Only show polos in the dropdown for polo bundles
  useEffect(() => {
    if (isPoloBundle && productCollections?.polos) {
      let allPolos = [...productCollections.polos];
      if (!allPolos.some((p) => p.handle === product.handle)) {
        allPolos = [product, ...allPolos];
      }
      setAvailablePolos(allPolos);
      const initialPoloHandles = Array(minQuantity).fill(allPolos[0]?.handle || '');
      setSelectedPoloHandles(initialPoloHandles);
      const initialPolos = Array(minQuantity).fill(allPolos[0] || undefined);
      setSelectedPolos(initialPolos);
    }
  }, [isPoloBundle, product, productCollections, minQuantity]);

  // Initialize selections with default values (first color and size)
  const initializeSelections = (): SelectionType[] => {
    const defaultSelections: SelectionType[] = [];
    const defaultColor = colorOptions.length > 0 ? colorOptions[0] : '';
    const defaultSize = sizeOptions.length > 0 ? sizeOptions[0] : '';

    for (let i = 0; i < minQuantity; i++) {
      const selection: SelectionType = {
        color: defaultColor,
        size: defaultSize,
        productHandle: isPoloBundle ? (i === 0 ? product.handle : '') : undefined
      };

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

  // Handle polo selection change
  const handlePoloChange = (idx: number, handle: string) => {
    // Find the selected polo
    const selectedPolo = availablePolos.find(p => p.handle === handle);
    if (!selectedPolo) return;

    // Update selected polos
    const newSelectedPoloHandles = [...selectedPoloHandles];
    newSelectedPoloHandles[idx] = handle;
    setSelectedPoloHandles(newSelectedPoloHandles);

    const newSelectedPolos = [...selectedPolos];
    newSelectedPolos[idx] = selectedPolo;
    setSelectedPolos(newSelectedPolos);

    // Get default color and size for this polo
    let defaultColor = '';
    let defaultSize = '';
    let defaultVariant;

    if (selectedPolo.options) {
      // Find color option
      const colorOption = selectedPolo.options.find((opt: any) => opt.name.toLowerCase() === 'color');
      if (colorOption && colorOption.optionValues && colorOption.optionValues.length > 0) {
        defaultColor = colorOption.optionValues[0].name;
      }
      // Find size option
      const sizeOption = selectedPolo.options.find((opt: any) => opt.name.toLowerCase() === 'size');
      if (sizeOption && sizeOption.optionValues && sizeOption.optionValues.length > 0) {
        defaultSize = sizeOption.optionValues[0].name;
      }
      // Find default variant
      if (defaultColor && defaultSize && selectedPolo.variants?.nodes) {
        defaultVariant = selectedPolo.variants.nodes.find((v: any) =>
          v.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'color' && opt.value === defaultColor) &&
          v.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'size' && opt.value === defaultSize)
        );
      }
    }

    // Update the selection for this slot
    const newSelections = [...selections];
    newSelections[idx] = {
      color: defaultColor,
      size: defaultSize,
      productHandle: handle,
      variantId: defaultVariant?.id,
      image: defaultVariant?.image?.url || selectedPolo.featuredImage?.url
    };
    setSelections(newSelections);
  };

  // Update selection for a top
  const handleChange = (idx: number, field: string, value: string) => {
    const newSelections = [...selections];
    newSelections[idx] = {
      ...newSelections[idx],
      [field]: value,
    };

    // For polo bundles, we need to find the variant in the selected polo
    if (isPoloBundle && newSelections[idx].productHandle) {
      const selectedPolo = availablePolos.find(p => p.handle === newSelections[idx].productHandle);
      if (selectedPolo && newSelections[idx].color && newSelections[idx].size) {
        // Find matching variant
        const variant = selectedPolo.variants.nodes.find((v: any) =>
          v.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'color' && opt.value === newSelections[idx].color) &&
          v.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'size' && opt.value === newSelections[idx].size)
        );

        if (variant) {
          newSelections[idx].variantId = variant.id;
          newSelections[idx].image = variant.image?.url;
        } else {
          newSelections[idx].variantId = undefined;
          newSelections[idx].image = undefined;
        }
      }
    }
    // For regular bundles, use the current product
    else if (newSelections[idx].color && newSelections[idx].size) {
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

  // Get color options for a specific polo
  const getPoloColorOptions = (poloHandle: string) => {
    const polo = availablePolos.find(p => p.handle === poloHandle);
    if (!polo || !polo.options) return [];
    const colorOption = polo.options.find((opt: any) => opt.name.toLowerCase() === 'color');
    return colorOption && colorOption.optionValues ? colorOption.optionValues.map((v: any) => v.name) : [];
  };

  // Get size options for a specific polo
  const getPoloSizeOptions = (poloHandle: string) => {
    const polo = availablePolos.find(p => p.handle === poloHandle);
    if (!polo || !polo.options) return [];
    const sizeOption = polo.options.find((opt: any) => opt.name.toLowerCase() === 'size');
    return sizeOption && sizeOption.optionValues ? sizeOption.optionValues.map((v: any) => v.name) : [];
  };

  // Find variant with color for color swatches
  const findVariantWithColor = (poloHandle: string, color: string) => {
    const polo = availablePolos.find(p => p.handle === poloHandle);
    if (!polo || !polo.variants?.nodes) return null;

    return polo.variants.nodes.find((v: any) =>
      v.selectedOptions.some((opt: any) =>
        opt.name.toLowerCase() === 'color' && opt.value === color
      )
    );
  };

  // --- Color swatch rendering helper ---
  // Get the swatch color from Shopify metafield if available
  const getSwatchColor = (polo: any, color: string): string | undefined => {
    if (!polo?.options) return undefined;
    const colorOption = polo.options.find((opt: any) => opt.name.toLowerCase() === 'color');
    if (!colorOption || !colorOption.optionValues) return undefined;
    const value = colorOption.optionValues.find((v: any) => v.name === color);
    return value?.swatch?.color;
  };

  // Prepare lines for AddToCartButton
  const lines = selections.every(sel => sel.variantId)
    ? selections.map(sel => ({ merchandiseId: sel.variantId!, quantity: 1 }))
    : [];
  // Check if any selected variant is out of stock
  const anyOutOfStock = selections.some(sel => {
    if (!sel.variantId) return true;
    const polo = isPoloBundle && sel.productHandle ? availablePolos.find(p => p.handle === sel.productHandle) : product;
    const variant = polo?.variants?.nodes.find((v: any) => v.id === sel.variantId);
    return variant ? !variant.availableForSale : true;
  });

  // Validate before add to cart
  const handleClick = () => {
    if (!selections.every(sel => sel.variantId)) {
      setError(`Please select color and size for all ${minQuantity} items.`);
      return false;
    }
    setError('');
    open('cart'); // Open cart aside when successfully added
    return true;
  };

  // Calculate bundle price
  const calculateBundlePrice = () => {
    // Get prices of all selected variants
    const prices = selections
      .filter(sel => sel.variantId)
      .map(sel => {
        // For polo bundles, find the variant in the selected polo
        if (isPoloBundle && sel.productHandle) {
          const polo = availablePolos.find(p => p.handle === sel.productHandle);
          if (polo) {
            const variant = polo.variants.nodes.find((v: any) => v.id === sel.variantId);
            return variant?.price?.amount ? parseFloat(variant.price.amount) : 0;
          }
        }
        // For regular bundles, find the variant in the current product
        else {
          const variant = product.variants.nodes.find((v: any) => v.id === sel.variantId);
          return variant?.price?.amount ? parseFloat(variant.price.amount) : 0;
        }
        return 0;
      });

    // Calculate total
    const originalTotal = prices.reduce((sum, price) => sum + price, 0);
    const discountedTotal = originalTotal * (1 - discountValue / 100);

    return {
      original: originalTotal,
      discounted: discountedTotal,
      currencyCode: product.selectedOrFirstAvailableVariant?.price?.currencyCode || 'USD'
    };
  };

  const bundlePrice = calculateBundlePrice();

  return (
    <div className="mb-4 border border-gray-200 p-6">
      <h2 className="text-2xl font-medium text-black mb-2">{title}</h2>
      <p className="mb-6 text-gray-700">{description}</p>

      {/* Product cards in a horizontal row */}
      <div className="grid grid-cols-3 gap-4">
        {(selections ?? []).map((sel, idx) => (
          <div key={idx} className="flex flex-col border border-gray-100 p-3">
            {/* Polo selection dropdown for polo bundles */}
            {isPoloBundle && (
              <div className="mb-3">
                <select
                  className="border border-gray-300 rounded px-2 py-1 w-full text-sm"
                  value={sel.productHandle || ''}
                  onChange={(e) => handlePoloChange(idx, e.target.value)}
                >
                  <option value="" disabled>Select a polo</option>
                  {availablePolos.map((polo) => (
                    <option key={polo.handle} value={polo.handle}>
                      {polo.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Product image */}
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
                {((isPoloBundle ? getPoloColorOptions(sel.productHandle || '') : colorOptions) ?? []).map((color: string) => {
                  // Find the correct product (polo or top)
                  const productForSwatch = isPoloBundle && sel.productHandle ? availablePolos.find(p => p.handle === sel.productHandle) : product;
                  const swatchColor = getSwatchColor(productForSwatch, color);
                  // Find the variant for this color and current size
                  const variant = productForSwatch?.variants?.nodes.find((v: any) =>
                    v.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'color' && opt.value === color) &&
                    v.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'size' && opt.value === sel.size)
                  );
                  const outOfStock = variant ? !variant.availableForSale : false;
                  return (
                    <button
                      key={color}
                      type="button"
                      className={`product-options-item transition-all w-6 h-6 flex items-center justify-center p-0 color-swatch relative
                        ${sel.color === color
                          ? 'border-2 border-gray-900'
                          : 'border border-gray-200 hover:border-gray-400'
                        }
                        ${outOfStock ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                      onClick={() => !outOfStock && handleChange(idx, 'color', color)}
                      style={{ borderRadius: '0' }} // Make it square
                      disabled={outOfStock}
                    >
                      {swatchColor ? (
                        <div
                          aria-label={color}
                          className="w-full h-full relative"
                          style={{
                            backgroundColor: swatchColor,
                            padding: 0,
                            margin: 0,
                            display: 'block',
                          }}
                        >
                          {outOfStock && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <svg width="100%" height="100%" viewBox="0 0 24 24" className="absolute inset-0">
                                <line x1="4" y1="20" x2="20" y2="4" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
                              </svg>
                            </span>
                          )}
                        </div>
                      ) : (
                        <div
                          aria-label={color}
                          className="w-full h-full relative bg-gray-200"
                          style={{
                            padding: 0,
                            margin: 0,
                            display: 'block',
                          }}
                        >
                          {outOfStock && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <svg width="100%" height="100%" viewBox="0 0 24 24" className="absolute inset-0">
                                <line x1="4" y1="20" x2="20" y2="4" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
                              </svg>
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size selection */}
            <div className="product-options">
              <h5 className="text-xs font-medium text-gray-900 mb-2">Size</h5>
              <div className="flex flex-wrap gap-2 justify-start">
                {((isPoloBundle ? getPoloSizeOptions(sel.productHandle || '') : sizeOptions) ?? []).map((size: string) => {
                  const polo = isPoloBundle && sel.productHandle ? availablePolos.find(p => p.handle === sel.productHandle) : product;
                  const variant = polo?.variants?.nodes.find((v: any) =>
                    v.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'color' && opt.value === sel.color) &&
                    v.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'size' && opt.value === size)
                  );
                  const outOfStock = variant ? !variant.availableForSale : false;
                  return (
                    <button
                      key={size}
                      type="button"
                      className={`product-options-item transition-all px-2 py-1 text-xs font-medium relative
                        ${sel.size === size
                          ? 'text-gray-900 underline underline-offset-4'
                          : 'text-gray-600 hover:text-gray-900'
                        }
                        ${outOfStock ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                      onClick={() => !outOfStock && handleChange(idx, 'size', size)}
                      disabled={outOfStock}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bundle pricing */}
      <div className="mt-6 text-center">
        <div className="text-lg font-medium">Bundle Price:</div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-gray-500 line-through">
            {bundlePrice.original.toFixed(2)} {bundlePrice.currencyCode}
          </span>
          <span className="text-xl font-bold">
            {bundlePrice.discounted.toFixed(2)} {bundlePrice.currencyCode}
          </span>
          <span className="text-green-600 text-sm">
            (Save {discountValue}%)
          </span>
        </div>
      </div>

      {error && <div className="text-red-600 mt-4 text-sm text-center">{error}</div>}

      <div className="mt-6">
        <AddToCartButton
          disabled={lines.length !== minQuantity || anyOutOfStock}
          lines={lines}
          onClick={handleClick}
        >
          <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
            {anyOutOfStock ? 'Out of Stock' : 'Add Bundle to Cart'}
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

  // Get product collections data
  const { productCollections } = useLoaderData<typeof loader>();

  // Find upsells for this product
  let upsells = UPSELLS[handle] || [];

  // Add the denim + polo cross-sell upsell if the product is in one of those collections
  // and there are complementary products available
  if ((productCollections?.isInDenim || productCollections?.isInPolo) &&
    productCollections?.complementaryProducts?.length > 0) {
    upsells = [...upsells, GLOBAL_UPSELLS.crossSellDenimPolo];
  }

  // Add polo bundle offers if the product is in the polo collection
  if (productCollections?.isInPolo) {
    // Add "2 Polos Bundle – 10% Off" offer
    upsells = [...upsells, GLOBAL_UPSELLS.poloBundle2];

    // Add "3 Polos Bundle – 15% Off" offer
    upsells = [...upsells, GLOBAL_UPSELLS.poloBundle3];
  }

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
            <div className="mt-8">
              <UpsellSection product={product} productOptions={productOptions} upsells={upsells} />
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
