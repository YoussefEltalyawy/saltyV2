import {Await, useLoaderData} from 'react-router';
import {Suspense} from 'react';
import BundleUpsellCard from '~/components/BundleUpsellCard';
import CrossSellUpsellCard from '~/components/CrossSellUpsellCard';
import TopsCapBundleCard from '~/components/TopsCapBundleCard';
import LinenCrossSellCard from '~/components/LinenCrossSellCard';
import {json} from '@shopify/remix-oxygen';
import {useState} from 'react';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';

function ProductBundleCard({
  products,
  initialProduct,
  title,
  onChange,
  initialColor,
  initialSize,
  minQuantity = 1,
}) {
  const [selectedProduct, setSelectedProduct] = useState(initialProduct);
  const [selectedColor, setSelectedColor] = useState(
    initialColor || getFirstColor(selectedProduct),
  );
  const [selectedSize, setSelectedSize] = useState(
    initialSize || getFirstSize(selectedProduct),
  );

  function getFirstColor(product) {
    const colorOpt = product?.options?.find(
      (o) => o.name.toLowerCase() === 'color',
    );
    return colorOpt?.optionValues[0]?.name || '';
  }
  function getFirstSize(product) {
    const sizeOpt = product?.options?.find(
      (o) => o.name.toLowerCase() === 'size',
    );
    return sizeOpt?.optionValues[0]?.name || '';
  }
  function getVariant(product, color, size) {
    return product?.variants.nodes.find(
      (v) =>
        v.selectedOptions.some(
          (o) => o.name.toLowerCase() === 'color' && o.value === color,
        ) &&
        v.selectedOptions.some(
          (o) => o.name.toLowerCase() === 'size' && o.value === size,
        ),
    );
  }
  function getSwatchColor(product, color) {
    const colorOpt = product?.options?.find(
      (o) => o.name.toLowerCase() === 'color',
    );
    const value = colorOpt?.optionValues.find((v) => v.name === color);
    return value?.swatch?.color;
  }
  const colorOptions =
    selectedProduct?.options
      ?.find((o) => o.name.toLowerCase() === 'color')
      ?.optionValues.map((v) => v.name) || [];
  const sizeOptions =
    selectedProduct?.options
      ?.find((o) => o.name.toLowerCase() === 'size')
      ?.optionValues.map((v) => v.name) || [];
  const variant = getVariant(selectedProduct, selectedColor, selectedSize);
  const image = variant?.image?.url || selectedProduct?.featuredImage?.url;
  const outOfStock = variant ? !variant.availableForSale : false;

  // When product changes, reset color/size
  function handleProductChange(handle) {
    const prod = products.find((p) => p.handle === handle);
    setSelectedProduct(prod);
    setSelectedColor(getFirstColor(prod));
    setSelectedSize(getFirstSize(prod));
    onChange && onChange(prod, getFirstColor(prod), getFirstSize(prod));
  }
  function handleColorChange(color) {
    setSelectedColor(color);
    setSelectedSize(getFirstSize(selectedProduct));
    onChange && onChange(selectedProduct, color, getFirstSize(selectedProduct));
  }
  function handleSizeChange(size) {
    setSelectedSize(size);
    onChange && onChange(selectedProduct, selectedColor, size);
  }

  return (
    <div className="flex flex-col border border-gray-100 p-3">
      {products.length > 1 && (
        <select
          className="border border-gray-300 rounded px-2 py-1 mb-3 text-sm"
          value={selectedProduct?.handle || ''}
          onChange={(e) => handleProductChange(e.target.value)}
        >
          {products.map((p) => (
            <option key={p.handle} value={p.handle}>
              {p.title}
            </option>
          ))}
        </select>
      )}
      <div className="w-full aspect-square mb-3 bg-gray-100 max-h-48">
        {image ? (
          <img
            src={image}
            alt="Selected variant"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-400 text-xs">Select options</span>
          </div>
        )}
      </div>
      {/* Color swatches */}
      <div className="product-options mb-3">
        <h5 className="text-xs font-medium text-gray-900 mb-2">Color</h5>
        <div className="flex flex-wrap gap-2 justify-start">
          {colorOptions.map((color) => {
            const swatchColor = getSwatchColor(selectedProduct, color);
            const v = getVariant(selectedProduct, color, selectedSize);
            const oos = v ? !v.availableForSale : false;
            return (
              <button
                key={color}
                type="button"
                className={`product-options-item transition-all w-6 h-6 flex items-center justify-center p-0 color-swatch relative
                  ${selectedColor === color ? 'border-2 border-gray-900' : 'border border-gray-200 hover:border-gray-400'}
                  ${oos ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !oos && handleColorChange(color)}
                style={{borderRadius: '0'}}
                disabled={oos}
              >
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
                  {oos && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <svg
                        width="100%"
                        height="100%"
                        viewBox="0 0 24 24"
                        className="absolute inset-0"
                      >
                        <line
                          x1="4"
                          y1="20"
                          x2="20"
                          y2="4"
                          stroke="#b91c1c"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {/* Size swatches */}
      <div className="product-options">
        <h5 className="text-xs font-medium text-gray-900 mb-2">Size</h5>
        <div className="flex flex-wrap gap-2 justify-start">
          {sizeOptions.map((size) => {
            const v = getVariant(selectedProduct, selectedColor, size);
            const oos = v ? !v.availableForSale : false;
            return (
              <button
                key={size}
                type="button"
                className={`product-options-item transition-all px-2 py-1 text-xs font-medium relative
                  ${selectedSize === size ? 'text-gray-900 underline underline-offset-4' : 'text-gray-600 hover:text-gray-900'}
                  ${oos ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !oos && handleSizeChange(size)}
                disabled={oos}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>
      {/* Price */}
      <div className="mt-2 text-sm font-medium">
        {variant?.price?.amount} {variant?.price?.currencyCode}
      </div>
    </div>
  );
}

const DENIM_COLLECTION = 'denim';
const POLO_COLLECTION = 'oversized-polos';
const CAPS_COLLECTION = 'caps';
const TOPS_COLLECTION = 'tops';

const BUNDLES = [
  {
    type: 'linenCrossSell',
    title: 'Linen Shirt + Pants Bundle – 15% Off Pants!',
    description: 'Complete your linen look with matching pants and save 15% on the pants.',
    discountType: 'automatic',
    discountValue: 15,
    shirtHandle: 'linen-shirt',
    pantsHandle: 'linen-pants',
  },
  {
    type: 'crossSell',
    title: 'Denim + Polo Bundle – 10% Off!',
    description: 'Add a matching piece to complete your look and save 10%.',
    discountType: 'automatic',
    discountValue: 10,
    collections: [DENIM_COLLECTION, POLO_COLLECTION],
  },
  {
    type: 'bundle',
    title: '2 Polos Bundle – 10% Off!',
    description:
      'Pick any 2 polos (choose color and size for each) and get 10% off.',
    minQuantity: 2,
    discountType: 'automatic',
    discountValue: 10,
    collectionRestriction: POLO_COLLECTION,
  },
  {
    type: 'bundle',
    title: '3 Tops Bundle – 15% Off!',
    description:
      'Pick any 3 tops (choose color and size for each) and get 15% off.',
    minQuantity: 3,
    discountType: 'automatic',
    discountValue: 15,
    // For demo, you may want to restrict to a tops collection if available
  },
  {
    type: 'bundle',
    title: '3 Polos Bundle – 15% Off!',
    description:
      'Pick any 3 polos (choose color and size for each) and get 15% off.',
    minQuantity: 3,
    discountType: 'automatic',
    discountValue: 15,
    collectionRestriction: POLO_COLLECTION,
  },
  {
    type: 'topsCapBundle',
    title: 'Buy 4 Tops Get 1 Cap Free!',
    description: 'Choose 4 tops and get a cap of your choice absolutely free.',
    discountType: 'automatic',
    discountCode: '4TOPSFREECAP',
    minTopsQuantity: 4,
    freeCapsQuantity: 1,
  },
];

export async function loader({context}: any) {
  const {storefront} = context;
  // Fetch all polos for polo bundles
  const polosResult = await storefront.query(`
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
                compareAtPrice {
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
  const polos = polosResult?.collection?.products?.nodes || [];

  // Fetch all denims for cross-sell
  const denimsResult = await storefront.query(`
    query GetDenims {
      collection(handle: "${DENIM_COLLECTION}") {
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
                compareAtPrice {
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
  const denims = denimsResult?.collection?.products?.nodes || [];

  // Fetch Cocktails baby tee [PRE ORDER] by handle
  const cocktailsResult = await storefront.query(`
    query GetCocktailsBabyTee {
      product(handle: "cocktails-baby-tee-pre-order") {
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
            compareAtPrice {
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
  `);
  const cocktailsBabyTee = cocktailsResult?.product || null;

  // Fetch caps for the 4 tops + 1 cap bundle
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
                compareAtPrice {
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
  const caps = capsResult?.collection?.products?.nodes || [];

  // Fetch tops for the 4 tops + 1 cap bundle
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
                compareAtPrice {
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
  const tops = topsResult?.collection?.products?.nodes || [];

  // Fetch linen products for the linen bundle
  const [linenShirtResult, linenPantsResult] = await Promise.all([
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
              compareAtPrice {
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
              compareAtPrice {
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

  const linenShirt = linenShirtResult?.product || null;
  const linenPants = linenPantsResult?.product || null;

  return {polos, denims, cocktailsBabyTee, caps, tops, linenShirt, linenPants};
}

export default function BundlesPage() {
  const {polos, denims, cocktailsBabyTee, caps, tops, linenShirt, linenPants} =
    useLoaderData<typeof loader>();
  const {open} = useAside();

  // --- 1. Denim + Polo Bundle ---
  const [selectedDenim, setSelectedDenim] = useState(denims[0] || null);
  const [selectedDenimVariantId, setSelectedDenimVariantId] = useState(
    selectedDenim?.variants.nodes[0]?.id || '',
  );
  const [selectedPolo, setSelectedPolo] = useState(polos[0] || null);
  const [selectedPoloVariantId, setSelectedPoloVariantId] = useState(
    selectedPolo?.variants.nodes[0]?.id || '',
  );

  // --- 2. 2 Polos Bundle ---
  const [selectedPolo1, setSelectedPolo1] = useState(polos[0] || null);
  const [selectedPolo1VariantId, setSelectedPolo1VariantId] = useState(
    selectedPolo1?.variants.nodes[0]?.id || '',
  );
  const [selectedPolo2, setSelectedPolo2] = useState(
    polos[1] || polos[0] || null,
  );
  const [selectedPolo2VariantId, setSelectedPolo2VariantId] = useState(
    selectedPolo2?.variants.nodes[0]?.id || '',
  );

  // --- 3. 3 Tops Bundle (Cocktails baby tee) ---
  const [topSelections, setTopSelections] = useState([
    {variantId: cocktailsBabyTee?.variants.nodes[0]?.id || ''},
    {variantId: cocktailsBabyTee?.variants.nodes[0]?.id || ''},
    {variantId: cocktailsBabyTee?.variants.nodes[0]?.id || ''},
  ]);

  // --- 4. 3 Polos Bundle ---
  const [selectedPolos, setSelectedPolos] = useState([
    polos[0] || null,
    polos[1] || polos[0] || null,
    polos[2] || polos[0] || null,
  ]);
  const [selectedPolosVariantIds, setSelectedPolosVariantIds] = useState([
    polos[0]?.variants.nodes[0]?.id || '',
    polos[1]?.variants.nodes[0]?.id || '',
    polos[2]?.variants.nodes[0]?.id || '',
  ]);

  // Helper: get variant by id
  function getVariant(product, variantId) {
    return product?.variants.nodes.find((v) => v.id === variantId);
  }

  // Helper: get price info
  function getPriceInfo(variant) {
    if (!variant) return {price: 0, compareAt: 0, currency: 'USD'};
    return {
      price: parseFloat(variant.price.amount),
      compareAt: variant.compareAtPrice
        ? parseFloat(variant.compareAtPrice.amount)
        : null,
      currency: variant.price.currencyCode,
    };
  }

  // --- Render ---
  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Shop Bundles</h1>
      <div className="flex flex-col gap-10">
        {/* 1. Linen Shirt + Pants Bundle */}
        {linenShirt && linenPants && (
          <LinenCrossSellCard
            currentProduct={linenShirt}
            upsell={{
              title: 'Linen Shirt + Pants Bundle – 15% Off Pants!',
              description: 'Complete your linen look with matching pants and save 15% on the pants.',
              discountValue: 15,
              shirtHandle: 'linen-shirt',
              pantsHandle: 'linen-pants',
            }}
          />
        )}

        {/* 2. Denim + Polo Bundle */}
        <div className="mb-4 border border-gray-200 p-6">
          <h2 className="text-2xl font-medium text-black mb-2">
            Denim + Polo Bundle – 10% Off!
          </h2>
          <p className="mb-6 text-gray-700">
            Add a matching piece to complete your look and save 10%.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Denim selection */}
            <ProductBundleCard
              products={[selectedDenim, ...denims]}
              initialProduct={selectedDenim}
              title="Choose Denim"
              onChange={(product, color, size) => {
                setSelectedDenim(product);
                setSelectedDenimVariantId(
                  product?.variants.nodes.find(
                    (v) =>
                      v.selectedOptions.some(
                        (o) =>
                          o.name.toLowerCase() === 'color' && o.value === color,
                      ) &&
                      v.selectedOptions.some(
                        (o) =>
                          o.name.toLowerCase() === 'size' && o.value === size,
                      ),
                  )?.id || '',
                );
              }}
              initialColor={
                selectedDenim?.options
                  ?.find((o) => o.name.toLowerCase() === 'color')
                  ?.optionValues.find(
                    (v) =>
                      v.name ===
                      selectedDenim?.options?.find(
                        (o) => o.name.toLowerCase() === 'color',
                      )?.optionValues[0]?.name,
                  )?.name
              }
              initialSize={
                selectedDenim?.options
                  ?.find((o) => o.name.toLowerCase() === 'size')
                  ?.optionValues.find(
                    (v) =>
                      v.name ===
                      selectedDenim?.options?.find(
                        (o) => o.name.toLowerCase() === 'size',
                      )?.optionValues[0]?.name,
                  )?.name
              }
            />
            {/* Polo selection */}
            <ProductBundleCard
              products={[selectedPolo, ...polos]}
              initialProduct={selectedPolo}
              title="Choose Polo"
              onChange={(product, color, size) => {
                setSelectedPolo(product);
                setSelectedPoloVariantId(
                  product?.variants.nodes.find(
                    (v) =>
                      v.selectedOptions.some(
                        (o) =>
                          o.name.toLowerCase() === 'color' && o.value === color,
                      ) &&
                      v.selectedOptions.some(
                        (o) =>
                          o.name.toLowerCase() === 'size' && o.value === size,
                      ),
                  )?.id || '',
                );
              }}
              initialColor={
                selectedPolo?.options
                  ?.find((o) => o.name.toLowerCase() === 'color')
                  ?.optionValues.find(
                    (v) =>
                      v.name ===
                      selectedPolo?.options?.find(
                        (o) => o.name.toLowerCase() === 'color',
                      )?.optionValues[0]?.name,
                  )?.name
              }
              initialSize={
                selectedPolo?.options
                  ?.find((o) => o.name.toLowerCase() === 'size')
                  ?.optionValues.find(
                    (v) =>
                      v.name ===
                      selectedPolo?.options?.find(
                        (o) => o.name.toLowerCase() === 'size',
                      )?.optionValues[0]?.name,
                  )?.name
              }
            />
          </div>
          {/* Price calculation */}
          <div className="mt-6 text-center">
            {(() => {
              const denimVariant = getVariant(
                selectedDenim,
                selectedDenimVariantId,
              );
              const poloVariant = getVariant(
                selectedPolo,
                selectedPoloVariantId,
              );
              const denimPrice = getPriceInfo(denimVariant);
              const poloPrice = getPriceInfo(poloVariant);
              const original = (denimPrice.price || 0) + (poloPrice.price || 0);
              const discounted = original * 0.9;
              return (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-gray-500 line-through">
                    {original.toFixed(2)} {denimPrice.currency}
                  </span>
                  <span className="text-xl font-bold">
                    {discounted.toFixed(2)} {denimPrice.currency}
                  </span>
                  <span className="text-green-600 text-sm">(Save 10%)</span>
                </div>
              );
            })()}
          </div>
          <div className="mt-6">
            <AddToCartButton
              lines={[
                {merchandiseId: selectedDenimVariantId, quantity: 1},
                {merchandiseId: selectedPoloVariantId, quantity: 1},
              ]}
              onClick={() => open('cart')}
            >
              <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
                Add Bundle to Cart
              </span>
            </AddToCartButton>
          </div>
        </div>

        {/* 2. 2 Polos Bundle */}
        <div className="mb-4 border border-gray-200 p-6">
          <h2 className="text-2xl font-medium text-black mb-2">
            2 Polos Bundle – 10% Off!
          </h2>
          <p className="mb-6 text-gray-700">
            Pick any 2 polos (choose color and size for each) and get 10% off.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1].map((idx) => (
              <ProductBundleCard
                key={idx}
                products={[selectedPolo1, selectedPolo2, ...polos]}
                initialProduct={idx === 0 ? selectedPolo1 : selectedPolo2}
                title={`Choose Polo ${idx + 1}`}
                onChange={(product, color, size) => {
                  if (idx === 0) {
                    setSelectedPolo1(product);
                    setSelectedPolo1VariantId(
                      product?.variants.nodes.find(
                        (v) =>
                          v.selectedOptions.some(
                            (o) =>
                              o.name.toLowerCase() === 'color' &&
                              o.value === color,
                          ) &&
                          v.selectedOptions.some(
                            (o) =>
                              o.name.toLowerCase() === 'size' &&
                              o.value === size,
                          ),
                      )?.id || '',
                    );
                  } else {
                    setSelectedPolo2(product);
                    setSelectedPolo2VariantId(
                      product?.variants.nodes.find(
                        (v) =>
                          v.selectedOptions.some(
                            (o) =>
                              o.name.toLowerCase() === 'color' &&
                              o.value === color,
                          ) &&
                          v.selectedOptions.some(
                            (o) =>
                              o.name.toLowerCase() === 'size' &&
                              o.value === size,
                          ),
                      )?.id || '',
                    );
                  }
                }}
                initialColor={
                  idx === 0
                    ? selectedPolo1?.options
                        ?.find((o) => o.name.toLowerCase() === 'color')
                        ?.optionValues.find(
                          (v) =>
                            v.name ===
                            selectedPolo1?.options?.find(
                              (o) => o.name.toLowerCase() === 'color',
                            )?.optionValues[0]?.name,
                        )?.name
                    : selectedPolo2?.options
                        ?.find((o) => o.name.toLowerCase() === 'color')
                        ?.optionValues.find(
                          (v) =>
                            v.name ===
                            selectedPolo2?.options?.find(
                              (o) => o.name.toLowerCase() === 'color',
                            )?.optionValues[0]?.name,
                        )?.name
                }
                initialSize={
                  idx === 0
                    ? selectedPolo1?.options
                        ?.find((o) => o.name.toLowerCase() === 'size')
                        ?.optionValues.find(
                          (v) =>
                            v.name ===
                            selectedPolo1?.options?.find(
                              (o) => o.name.toLowerCase() === 'size',
                            )?.optionValues[0]?.name,
                        )?.name
                    : selectedPolo2?.options
                        ?.find((o) => o.name.toLowerCase() === 'size')
                        ?.optionValues.find(
                          (v) =>
                            v.name ===
                            selectedPolo2?.options?.find(
                              (o) => o.name.toLowerCase() === 'size',
                            )?.optionValues[0]?.name,
                        )?.name
                }
              />
            ))}
          </div>
          {/* Price calculation */}
          <div className="mt-6 text-center">
            {(() => {
              const v1 = getVariant(selectedPolo1, selectedPolo1VariantId);
              const v2 = getVariant(selectedPolo2, selectedPolo2VariantId);
              const p1 = getPriceInfo(v1);
              const p2 = getPriceInfo(v2);
              const original = (p1.price || 0) + (p2.price || 0);
              const discounted = original * 0.9;
              return (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-gray-500 line-through">
                    {original.toFixed(2)} {p1.currency}
                  </span>
                  <span className="text-xl font-bold">
                    {discounted.toFixed(2)} {p1.currency}
                  </span>
                  <span className="text-green-600 text-sm">(Save 10%)</span>
                </div>
              );
            })()}
          </div>
          <div className="mt-6">
            <AddToCartButton
              lines={[
                {merchandiseId: selectedPolo1VariantId, quantity: 1},
                {merchandiseId: selectedPolo2VariantId, quantity: 1},
              ]}
              onClick={() => open('cart')}
            >
              <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
                Add Bundle to Cart
              </span>
            </AddToCartButton>
          </div>
        </div>

        {/* 3. 3 Tops Bundle (Cocktails baby tee) */}
        <div className="mb-4 border border-gray-200 p-6">
          <h2 className="text-2xl font-medium text-black mb-2">
            3 Tops Bundle – 15% Off!
          </h2>
          <p className="mb-6 text-gray-700">
            Pick any 3 tops (choose color and size for each) and get 15% off.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((idx) => (
              <ProductBundleCard
                key={idx}
                products={[cocktailsBabyTee]} // Only one product, so no dropdown
                initialProduct={cocktailsBabyTee}
                title={`Top ${idx + 1}`}
                onChange={(product, color, size) => {
                  const newSelections = [...topSelections];
                  newSelections[idx].variantId =
                    product?.variants.nodes.find(
                      (v) =>
                        v.selectedOptions.some(
                          (o) =>
                            o.name.toLowerCase() === 'color' &&
                            o.value === color,
                        ) &&
                        v.selectedOptions.some(
                          (o) =>
                            o.name.toLowerCase() === 'size' && o.value === size,
                        ),
                    )?.id || '';
                  setTopSelections(newSelections);
                }}
                initialColor={
                  topSelections[idx].variantId
                    ? getVariant(
                        cocktailsBabyTee,
                        topSelections[idx].variantId,
                      )?.selectedOptions.find(
                        (o) => o.name.toLowerCase() === 'color',
                      )?.value
                    : ''
                }
                initialSize={
                  topSelections[idx].variantId
                    ? getVariant(
                        cocktailsBabyTee,
                        topSelections[idx].variantId,
                      )?.selectedOptions.find(
                        (o) => o.name.toLowerCase() === 'size',
                      )?.value
                    : ''
                }
              />
            ))}
          </div>
          {/* Price calculation */}
          <div className="mt-6 text-center">
            {(() => {
              const prices = topSelections.map((sel) =>
                getPriceInfo(getVariant(cocktailsBabyTee, sel.variantId)),
              );
              const original = prices.reduce(
                (sum, p) => sum + (p.price || 0),
                0,
              );
              const discounted = original * 0.85;
              return (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-gray-500 line-through">
                    {original.toFixed(2)} {prices[0]?.currency}
                  </span>
                  <span className="text-xl font-bold">
                    {discounted.toFixed(2)} {prices[0]?.currency}
                  </span>
                  <span className="text-green-600 text-sm">(Save 15%)</span>
                </div>
              );
            })()}
          </div>
          <div className="mt-6">
            <AddToCartButton
              lines={topSelections.map((sel) => ({
                merchandiseId: sel.variantId,
                quantity: 1,
              }))}
              onClick={() => open('cart')}
            >
              <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
                Add Bundle to Cart
              </span>
            </AddToCartButton>
          </div>
        </div>

        {/* 4. 3 Polos Bundle */}
        <div className="mb-4 border border-gray-200 p-6">
          <h2 className="text-2xl font-medium text-black mb-2">
            3 Polos Bundle – 15% Off!
          </h2>
          <p className="mb-6 text-gray-700">
            Pick any 3 polos (choose color and size for each) and get 15% off.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((idx) => (
              <ProductBundleCard
                key={idx}
                products={[
                  selectedPolos[idx],
                  selectedPolos[idx],
                  selectedPolos[idx],
                ]}
                initialProduct={selectedPolos[idx]}
                title={`Polo ${idx + 1}`}
                onChange={(product, color, size) => {
                  const newPolos = [...selectedPolos];
                  const newVariants = [...selectedPolosVariantIds];
                  newPolos[idx] = product;
                  newVariants[idx] =
                    product?.variants.nodes.find(
                      (v) =>
                        v.selectedOptions.some(
                          (o) =>
                            o.name.toLowerCase() === 'color' &&
                            o.value === color,
                        ) &&
                        v.selectedOptions.some(
                          (o) =>
                            o.name.toLowerCase() === 'size' && o.value === size,
                        ),
                    )?.id || '';
                  setSelectedPolos(newPolos);
                  setSelectedPolosVariantIds(newVariants);
                }}
                initialColor={
                  selectedPolos[idx]?.options
                    ?.find((o) => o.name.toLowerCase() === 'color')
                    ?.optionValues.find(
                      (v) =>
                        v.name ===
                        selectedPolos[idx]?.options?.find(
                          (o) => o.name.toLowerCase() === 'color',
                        )?.optionValues[0]?.name,
                    )?.name
                }
                initialSize={
                  selectedPolos[idx]?.options
                    ?.find((o) => o.name.toLowerCase() === 'size')
                    ?.optionValues.find(
                      (v) =>
                        v.name ===
                        selectedPolos[idx]?.options?.find(
                          (o) => o.name.toLowerCase() === 'size',
                        )?.optionValues[0]?.name,
                    )?.name
                }
              />
            ))}
          </div>
          {/* Price calculation */}
          <div className="mt-6 text-center">
            {(() => {
              const prices = selectedPolosVariantIds.map((variantId, idx) =>
                getPriceInfo(getVariant(selectedPolos[idx], variantId)),
              );
              const original = prices.reduce(
                (sum, p) => sum + (p.price || 0),
                0,
              );
              const discounted = original * 0.85;
              return (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-gray-500 line-through">
                    {original.toFixed(2)} {prices[0]?.currency}
                  </span>
                  <span className="text-xl font-bold">
                    {discounted.toFixed(2)} {prices[0]?.currency}
                  </span>
                  <span className="text-green-600 text-sm">(Save 15%)</span>
                </div>
              );
            })()}
          </div>
          <div className="mt-6">
            <AddToCartButton
              lines={selectedPolosVariantIds.map((variantId) => ({
                merchandiseId: variantId,
                quantity: 1,
              }))}
              onClick={() => open('cart')}
            >
              <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
                Add Bundle to Cart
              </span>
            </AddToCartButton>
          </div>
        </div>

        {/* 5. 4 Tops + 1 Cap Bundle */}
        {caps.length > 0 && tops.length > 0 && (
          <TopsCapBundleCard
            product={tops[0] || caps[0]} // Use first available product as base
            productOptions={[]} // Will be handled internally by the component
            upsell={{
              title: 'Buy 4 Tops Get 1 Cap Free!',
              description:
                'Choose 4 tops and get a cap of your choice absolutely free.',
              discountCode: '4TOPSFREECAP',
              minTopsQuantity: 4,
              freeCapsQuantity: 1,
            }}
          />
        )}
      </div>
    </div>
  );
}
