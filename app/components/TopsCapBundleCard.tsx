import {useState, useEffect} from 'react';
import {useLoaderData} from 'react-router';
import {useAside} from './Aside';
import {AddToCartButton} from './AddToCartButton';
import type {ProductFragment} from 'storefrontapi.generated';

function findVariant(
  product: any,
  selectedOptions: {name: string; value: string}[] | null,
): any {
  if (!product?.variants?.nodes) {
    console.warn(`No variants found for product: ${product?.handle}`);
    return null;
  }
  if (!selectedOptions || selectedOptions.length === 0) {
    // For products with no options (single variant)
    const variant = product.variants.nodes[0];
    console.log(
      `findVariant: product=${product.handle}, no options, variantId=${variant?.id}, available=${variant?.availableForSale}`,
    );
    return variant;
  }
  const variant = product.variants.nodes.find((variant: any) => {
    return selectedOptions.every(
      ({name, value}: {name: string; value: string}) => {
        return variant.selectedOptions.some(
          (opt: {name: string; value: string}) =>
            opt.name === name && opt.value === value,
        );
      },
    );
  });
  console.log(
    `findVariant: product=${product.handle}, options=${JSON.stringify(selectedOptions)}, variantId=${variant?.id}, available=${variant?.availableForSale}`,
  );
  return variant;
}

function TopsCapBundleCard({
  product,
  productOptions,
  upsell,
}: {
  product: ProductFragment;
  productOptions: any[];
  upsell: {
    title: string;
    description: string;
    discountCode: string;
    minTopsQuantity: number;
    freeCapsQuantity: number;
    [key: string]: any;
  };
}) {
  const {
    title,
    description,
    discountCode,
    minTopsQuantity = 4,
    freeCapsQuantity = 1,
  } = upsell;
  const {open} = useAside();
  const [error, setError] = useState('');
  const loaderData = useLoaderData() as any;
  const productCollections = loaderData?.productCollections;

  // Available products
  const [availableTops, setAvailableTops] = useState<any[]>([]);
  const [availableCaps, setAvailableCaps] = useState<any[]>([]);

  // Selection state
  type SelectionType = {
    color: string | null;
    size: string | null;
    variantId?: string;
    image?: string;
    productHandle?: string;
    type: 'top' | 'cap';
  };

  const [topSelections, setTopSelections] = useState<SelectionType[]>([]);
  const [capSelections, setCapSelections] = useState<SelectionType[]>([]);

  // Initialize available products
  useEffect(() => {
    console.log('Initializing available products...');
    let topsToUse: ProductFragment[] = [];

    // Always use tops from the tops collection if available
    if (productCollections?.tops && productCollections.tops.length > 0) {
      topsToUse = [...productCollections.tops];
      console.log(
        'Using tops from productCollections:',
        topsToUse.map((p) => p.handle),
      );
    } else if (loaderData?.tops && loaderData.tops.length > 0) {
      topsToUse = [...loaderData.tops];
      console.log(
        'Using tops from loaderData:',
        topsToUse.map((p) => p.handle),
      );
    }

    // Only add current product if it's actually a top (not a cap)
    if (productCollections?.isInTops && !topsToUse.some((p) => p.handle === product.handle)) {
      topsToUse = [product, ...topsToUse];
      console.log('Adding current product to tops:', product.handle);
    }

    // Special case for cocktails baby tee
    if (product.handle === 'cocktails-baby-tee-pre-order') {
      if (!topsToUse.some((p) => p.handle === product.handle)) {
        topsToUse = [product, ...topsToUse];
        console.log('Adding cocktails baby tee to tops:', product.handle);
      }
    }

    // If we still don't have any tops, use the cocktails baby tee from loader data as fallback
    if (topsToUse.length === 0 && loaderData?.cocktailsBabyTee) {
      topsToUse = [loaderData.cocktailsBabyTee];
      console.log(
        'Fallback: Using cocktailsBabyTee from loaderData:',
        topsToUse[0]?.handle,
      );
    }

    console.log(
      'Available tops:',
      topsToUse.map((p) => p.handle),
    );
    setAvailableTops(topsToUse);

    let capsToUse: ProductFragment[] = [];

    if (productCollections?.caps && productCollections.caps.length > 0) {
      capsToUse = [...productCollections.caps];
      console.log(
        'Using caps from productCollections:',
        capsToUse.map((p) => p.handle),
      );
    } else if (loaderData?.caps && loaderData.caps.length > 0) {
      capsToUse = [...loaderData.caps];
      console.log(
        'Using caps from loaderData:',
        capsToUse.map((p) => p.handle),
      );
    }

    if (
      productCollections?.isInCaps &&
      !capsToUse.some((p) => p.handle === product.handle)
    ) {
      capsToUse = [product, ...capsToUse];
      console.log('Adding current product to caps:', product.handle);
    }

    console.log(
      'Available caps:',
      capsToUse.map((p) => p.handle),
    );
    setAvailableCaps(capsToUse);
  }, [loaderData, productCollections, product]);

  // Initialize selections
  useEffect(() => {
    if (availableTops.length > 0 && topSelections.length === 0) {
      console.log('Initializing top selections...');
      const initialTopSelections: SelectionType[] = [];
      for (let i = 0; i < minTopsQuantity; i++) {
        // Always use the first available top for each slot
        const defaultTop = availableTops[0];
        const defaultColor = getFirstColor(defaultTop);
        const defaultSize = getFirstSize(defaultTop);

        const variant =
          defaultColor && defaultSize
            ? findVariant(defaultTop, [
                {name: 'Color', value: defaultColor},
                {name: 'Size', value: defaultSize},
              ])
            : null;

        console.log(
          `Top ${i}: handle=${defaultTop?.handle}, color=${defaultColor}, size=${defaultSize}, variantId=${variant?.id}, available=${variant?.availableForSale}`,
        );

        initialTopSelections.push({
          color: defaultColor || null,
          size: defaultSize || null,
          productHandle: defaultTop?.handle || '',
          variantId: variant?.id,
          image: variant?.image?.url || defaultTop?.featuredImage?.url,
          type: 'top',
        });
      }
      setTopSelections(initialTopSelections);
    }

    if (availableCaps.length > 0 && capSelections.length === 0) {
      console.log('Initializing cap selections...');
      const initialCapSelections: SelectionType[] = [];
      for (let i = 0; i < freeCapsQuantity; i++) {
        const defaultCap =
          i === 0 && productCollections?.isInCaps ? product : availableCaps[0];
        const defaultColor = getFirstColor(defaultCap);
        const defaultSize = getFirstSize(defaultCap);

        const variant = findVariant(
          defaultCap,
          defaultColor && defaultSize
            ? [
                {name: 'Color', value: defaultColor},
                {name: 'Size', value: defaultSize},
              ]
            : null,
        );

        console.log(
          `Cap ${i}: handle=${defaultCap?.handle}, color=${defaultColor}, size=${defaultSize}, variantId=${variant?.id}, available=${variant?.availableForSale}`,
        );

        initialCapSelections.push({
          color: defaultColor || null,
          size: defaultSize || null,
          productHandle: defaultCap?.handle || '',
          variantId: variant?.id,
          image: variant?.image?.url || defaultCap?.featuredImage?.url,
          type: 'cap',
        });
      }
      setCapSelections(initialCapSelections);
    }
  }, [
    availableTops,
    availableCaps,
    minTopsQuantity,
    freeCapsQuantity,
    product,
    productCollections,
    topSelections.length,
    capSelections.length,
  ]);

  // Helper functions
  const getFirstColor = (product: any): string | null => {
    const colorOption = product?.options?.find(
      (opt: any) => opt.name.toLowerCase() === 'color',
    );
    const color = colorOption?.optionValues?.[0]?.name || null;
    console.log(`getFirstColor: product=${product?.handle}, color=${color}`);
    return color;
  };

  const getFirstSize = (product: any): string | null => {
    const sizeOption = product?.options?.find(
      (opt: any) => opt.name.toLowerCase() === 'size',
    );
    const size = sizeOption?.optionValues?.[0]?.name || null;
    console.log(`getFirstSize: product=${product?.handle}, size=${size}`);
    return size;
  };

  const getProductColorOptions = (productHandle: string) => {
    const productList = productHandle
      ? availableTops.find((p) => p.handle === productHandle) ||
        availableCaps.find((p) => p.handle === productHandle)
      : null;
    if (!productList?.options) return [];
    const colorOption = productList.options.find(
      (opt: any) => opt.name.toLowerCase() === 'color',
    );
    const colors = colorOption?.optionValues?.map((v: any) => v.name) || [];
    console.log(
      `getProductColorOptions: handle=${productHandle}, colors=${colors}`,
    );
    return colors;
  };

  const getProductSizeOptions = (productHandle: string) => {
    const productList = productHandle
      ? availableTops.find((p) => p.handle === productHandle) ||
        availableCaps.find((p) => p.handle === productHandle)
      : null;
    if (!productList?.options) return [];
    const sizeOption = productList.options.find(
      (opt: any) => opt.name.toLowerCase() === 'size',
    );
    const sizes = sizeOption?.optionValues?.map((v: any) => v.name) || [];
    console.log(
      `getProductSizeOptions: handle=${productHandle}, sizes=${sizes}`,
    );
    return sizes;
  };

  const getSwatchColor = (
    productHandle: string,
    color: string,
  ): string | undefined => {
    const productList = productHandle
      ? availableTops.find((p) => p.handle === productHandle) ||
        availableCaps.find((p) => p.handle === productHandle)
      : null;
    if (!productList?.options) return undefined;
    const colorOption = productList.options.find(
      (opt: any) => opt.name.toLowerCase() === 'color',
    );
    const value = colorOption?.optionValues?.find((v: any) => v.name === color);
    const swatchColor = value?.swatch?.color;
    console.log(
      `getSwatchColor: handle=${productHandle}, color=${color}, swatch=${swatchColor}`,
    );
    return swatchColor;
  };

  const hasVariants = (product: any): boolean => {
    const hasOptions = product?.options?.some(
      (opt: any) =>
        opt.name.toLowerCase() === 'color' || opt.name.toLowerCase() === 'size',
    );
    const hasMultipleVariants = product?.variants?.nodes?.length > 1;
    return hasOptions || hasMultipleVariants;
  };

  // Handle product selection change
  const handleProductChange = (idx: number, handle: string, isTop: boolean) => {
    const productList = isTop ? availableTops : availableCaps;
    const selectedProduct = productList.find((p) => p.handle === handle);
    if (!selectedProduct) {
      console.warn(`Product not found for handle=${handle}, isTop=${isTop}`);
      return;
    }

    const defaultColor = getFirstColor(selectedProduct);
    const defaultSize = getFirstSize(selectedProduct);
    const defaultVariant = findVariant(
      selectedProduct,
      defaultColor && defaultSize
        ? [
            {name: 'Color', value: defaultColor},
            {name: 'Size', value: defaultSize},
          ]
        : null,
    );

    const newSelection: SelectionType = {
      color: defaultColor,
      size: defaultSize,
      productHandle: handle,
      variantId: defaultVariant?.id,
      image: defaultVariant?.image?.url || selectedProduct.featuredImage?.url,
      type: isTop ? 'top' : 'cap',
    };

    console.log(
      `handleProductChange: idx=${idx}, handle=${handle}, isTop=${isTop}, variantId=${defaultVariant?.id}, available=${defaultVariant?.availableForSale}`,
    );

    if (isTop) {
      const newSelections = [...topSelections];
      newSelections[idx] = newSelection;
      setTopSelections(newSelections);
    } else {
      const newSelections = [...capSelections];
      newSelections[idx] = newSelection;
      setCapSelections(newSelections);
    }
  };

  // Handle option change (color/size) for tops only
  const handleOptionChange = (
    idx: number,
    field: string,
    value: string,
    isTop: boolean,
  ) => {
    if (!isTop) return; // Caps don't have options
    const selections = topSelections;
    const setSelections = setTopSelections;
    const productList = availableTops;

    const newSelections = [...selections];
    newSelections[idx] = {
      ...newSelections[idx],
      [field]: value,
    };

    const selectedProduct = productList.find(
      (p) => p.handle === newSelections[idx].productHandle,
    );
    if (
      selectedProduct &&
      newSelections[idx].color &&
      newSelections[idx].size
    ) {
      const variant = findVariant(selectedProduct, [
        {name: 'Color', value: newSelections[idx].color},
        {name: 'Size', value: newSelections[idx].size},
      ]);

      if (variant) {
        newSelections[idx].variantId = variant.id;
        newSelections[idx].image =
          variant.image?.url || selectedProduct.featuredImage?.url;
      } else {
        newSelections[idx].variantId = undefined;
        newSelections[idx].image = selectedProduct.featuredImage?.url;
      }

      console.log(
        `handleOptionChange: idx=${idx}, field=${field}, value=${value}, isTop=${isTop}, variantId=${variant?.id}, available=${variant?.availableForSale}`,
      );
    }

    setSelections(newSelections);
  };

  // Prepare lines for AddToCartButton
  const allSelections = [...topSelections, ...capSelections];
  const lines = allSelections.every((sel) => sel.variantId)
    ? allSelections.map((sel) => ({merchandiseId: sel.variantId!, quantity: 1}))
    : [];

  // Check if any selected variant is out of stock
  const anyOutOfStock = allSelections.some((sel) => {
    if (!sel.variantId) {
      console.warn(`Missing variantId for selection: ${JSON.stringify(sel)}`);
      return true;
    }

    let selectedProduct;
    if (sel.type === 'top') {
      selectedProduct = availableTops.find(
        (p) => p.handle === sel.productHandle,
      );
    } else if (sel.type === 'cap') {
      selectedProduct = availableCaps.find(
        (p) => p.handle === sel.productHandle,
      );
    }

    if (!selectedProduct) {
      console.warn(
        `Product not found for handle: ${sel.productHandle}, type=${sel.type}`,
      );
      return true;
    }

    if (selectedProduct.handle === 'bundle-cap') {
      console.log(
        `Bypassing availability check for bundle-cap: ${sel.productHandle}`,
      );
      return false;
    }

    const variant = selectedProduct.variants?.nodes.find(
      (v: any) => v.id === sel.variantId,
    );

    if (!variant) {
      console.warn(
        `Variant not found for id=${sel.variantId}, product=${sel.productHandle}`,
      );
      return true;
    }

    console.log(
      `Checking stock: product=${selectedProduct.handle}, variantId=${variant.id}, available=${variant.availableForSale}`,
    );

    return !variant.availableForSale;
  });

  // Validate before add to cart
  const handleClick = () => {
    if (!allSelections.every((sel) => sel.variantId)) {
      setError('Please select valid options for all items.');
      console.error('Add to cart blocked: Missing variantId in selections');
      return false;
    }
    setError('');
    open('cart');
    console.log('Adding to cart:', lines);
    return true;
  };

  // Calculate bundle price
  const calculateBundlePrice = () => {
    let currencyCode = 'USD'; // Default fallback
    
    const topPrices = topSelections
      .filter((sel) => sel.variantId)
      .map((sel) => {
        const selectedProduct = availableTops.find(
          (p) => p.handle === sel.productHandle,
        );
        const variant = selectedProduct?.variants?.nodes.find(
          (v: any) => v.id === sel.variantId,
        );
        const price = variant?.price?.amount
          ? parseFloat(variant.price.amount)
          : 0;
        
        // Get currency from the first variant that has one
        if (variant?.price?.currencyCode && currencyCode === 'USD') {
          currencyCode = variant.price.currencyCode;
        }
        
        console.log(
          `Price for top: handle=${sel.productHandle}, variantId=${sel.variantId}, price=${price}, currency=${variant?.price?.currencyCode}`,
        );
        return price;
      });

    const originalTotal = topPrices.reduce((sum, price) => sum + price, 0);

    return {
      original: originalTotal,
      discounted: originalTotal,
      currencyCode: currencyCode,
    };
  };

  const bundlePrice = calculateBundlePrice();

  if (availableTops.length === 0 || availableCaps.length === 0) {
    console.warn('Bundle not rendered: No tops or caps available');
    return null;
  }

  return (
    <div className="mb-4 border border-gray-200 p-6">
      <h2 className="text-2xl font-medium text-black mb-2">{title}</h2>
      <p className="mb-6 text-gray-700">{description}</p>

      {/* Tops Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-black mb-4">
          Choose {minTopsQuantity} Tops
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {topSelections.map((sel, idx) => (
            <div key={idx} className="flex flex-col border border-gray-100 p-3">
              <div className="w-full aspect-square mb-4 bg-gray-100">
                {sel.image ? (
                  <img
                    src={sel.image}
                    alt="Selected variant"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400 text-xs">
                      Select options
                    </span>
                  </div>
                )}
              </div>

              <div className="product-options mb-3">
                <h5 className="text-xs font-medium text-gray-900 mb-2">
                  Color
                </h5>
                <div className="flex flex-wrap gap-2 justify-start">
                  {getProductColorOptions(sel.productHandle || '').map(
                    (color: string) => {
                      const swatchColor = getSwatchColor(
                        sel.productHandle || '',
                        color,
                      );
                      const selectedProduct = availableTops.find(
                        (p) => p.handle === sel.productHandle,
                      );
                      const variant = selectedProduct?.variants?.nodes.find(
                        (v: any) =>
                          v.selectedOptions.some(
                            (opt: any) =>
                              opt.name.toLowerCase() === 'color' &&
                              opt.value === color,
                          ) &&
                          v.selectedOptions.some(
                            (opt: any) =>
                              opt.name.toLowerCase() === 'size' &&
                              opt.value === sel.size,
                          ),
                      );
                      const outOfStock = variant
                        ? !variant.availableForSale
                        : false;

                      return (
                        <button
                          key={color}
                          type="button"
                          className={`product-options-item transition-all w-6 h-6 flex items-center justify-center p-0 color-swatch relative
                          ${sel.color === color ? 'border-2 border-gray-900' : 'border border-gray-200 hover:border-gray-400'}
                          ${outOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() =>
                            !outOfStock &&
                            handleOptionChange(idx, 'color', color, true)
                          }
                          style={{borderRadius: '0'}}
                          disabled={outOfStock}
                        >
                          <div
                            aria-label={color}
                            className="w-full h-full relative"
                            style={{
                              backgroundColor: swatchColor || '#f3f4f6',
                              padding: 0,
                              margin: 0,
                              display: 'block',
                            }}
                          >
                            {outOfStock && (
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
                    },
                  )}
                </div>
              </div>

              <div className="product-options">
                <h5 className="text-xs font-medium text-gray-900 mb-2">Size</h5>
                <div className="flex flex-wrap gap-2 justify-start">
                  {getProductSizeOptions(sel.productHandle || '').map(
                    (size: string) => {
                      const selectedProduct = availableTops.find(
                        (p) => p.handle === sel.productHandle,
                      );
                      const variant = selectedProduct?.variants?.nodes.find(
                        (v: any) =>
                          v.selectedOptions.some(
                            (opt: any) =>
                              opt.name.toLowerCase() === 'color' &&
                              opt.value === sel.color,
                          ) &&
                          v.selectedOptions.some(
                            (opt: any) =>
                              opt.name.toLowerCase() === 'size' &&
                              opt.value === size,
                          ),
                      );
                      const outOfStock = variant
                        ? !variant.availableForSale
                        : false;

                      return (
                        <button
                          key={size}
                          type="button"
                          className={`product-options-item transition-all px-2 py-1 text-xs font-medium relative
                          ${sel.size === size ? 'text-gray-900 underline underline-offset-4' : 'text-gray-600 hover:text-gray-900'}
                          ${outOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() =>
                            !outOfStock &&
                            handleOptionChange(idx, 'size', size, true)
                          }
                          disabled={outOfStock}
                        >
                          {size}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Caps Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-black mb-4">
          Choose {freeCapsQuantity} Free Cap
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {capSelections.map((sel, idx) => (
            <div
              key={idx}
              className="flex flex-col border border-gray-100 p-3 max-w-xs"
            >
              <div className="mb-3">
                <select
                  className="border border-gray-300 rounded px-2 py-1 w-full text-sm"
                  value={sel.productHandle || ''}
                  onChange={(e) =>
                    handleProductChange(idx, e.target.value, false)
                  }
                >
                  <option value="" disabled>
                    Select a cap
                  </option>
                  {availableCaps.map((cap) => (
                    <option key={cap.handle} value={cap.handle}>
                      {cap.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full aspect-square mb-3 bg-gray-100 max-h-48">
                {sel.image ? (
                  <img
                    src={sel.image}
                    alt="Selected cap"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400 text-xs">Select a cap</span>
                  </div>
                )}
              </div>

              <div className="mt-2 text-sm font-medium text-green-600">
                FREE!
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bundle pricing */}
      <div className="mt-6 text-center">
        <div className="text-lg font-medium">Bundle Price:</div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl font-bold">
            {bundlePrice.discounted.toFixed(2)} {bundlePrice.currencyCode}
          </span>
          <span className="text-green-600 text-sm">
            + {freeCapsQuantity} Free Cap{freeCapsQuantity > 1 ? 's' : ''}!
          </span>
        </div>
      </div>

      {error && (
        <div className="text-red-600 mt-4 text-sm text-center">{error}</div>
      )}

      <div className="mt-6">
        <AddToCartButton
          disabled={
            lines.length !== minTopsQuantity + freeCapsQuantity || anyOutOfStock
          }
          lines={lines}
          onClick={handleClick}
          discountCode={discountCode}
        >
          <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
            {anyOutOfStock ? 'Out of Stock' : 'Add Bundle to Cart'}
          </span>
        </AddToCartButton>
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">
        Discount applied automatically at checkout with code {discountCode}.
      </div>
    </div>
  );
}

export default TopsCapBundleCard;
