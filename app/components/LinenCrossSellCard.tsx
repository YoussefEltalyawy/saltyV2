import { useState, useEffect } from 'react';
import { useLoaderData } from 'react-router';
import { useAside } from './Aside';
import { AddToCartButton } from './AddToCartButton';
import type { ProductFragment } from 'storefrontapi.generated';

function findVariant(
  product: any,
  selectedOptions: { name: string; value: string }[],
): any {
  return product.variants.nodes.find((variant: any) => {
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

function LinenCrossSellCard({
  currentProduct,
  upsell,
}: {
  currentProduct: ProductFragment;
  upsell: {
    title: string;
    description: string;
    discountValue: number;
    shirtHandle: string;
    pantsHandle: string;
  };
}) {
  const { open } = useAside();
  const [error, setError] = useState('');
  const loaderData = useLoaderData() as any;

  // Get the linen products from loader data
  const linenShirt = loaderData?.productCollections?.linenShirt;
  const linenPants = loaderData?.productCollections?.linenPants;

  // State for selections
  const [shirtSelection, setShirtSelection] = useState({
    color: '',
    size: '',
    variantId: '',
    image: '',
  });

  const [pantsSelection, setPantsSelection] = useState({
    color: '',
    size: '',
    variantId: '',
    image: '',
  });

  // Initialize selections with default values
  useEffect(() => {
    if (linenShirt && linenShirt.options) {
      const colorOption = linenShirt.options.find((opt: any) => opt.name.toLowerCase() === 'color');
      const sizeOption = linenShirt.options.find((opt: any) => opt.name.toLowerCase() === 'size');

      const defaultColor = colorOption?.optionValues?.[0]?.name || '';
      const defaultSize = sizeOption?.optionValues?.[0]?.name || '';

      if (defaultColor && defaultSize) {
        const variant = findVariant(linenShirt, [
          { name: 'Color', value: defaultColor },
          { name: 'Size', value: defaultSize },
        ]);

        setShirtSelection({
          color: defaultColor,
          size: defaultSize,
          variantId: variant?.id || '',
          image: variant?.image?.url || linenShirt.featuredImage?.url || '',
        });
      }
    }

    if (linenPants && linenPants.options) {
      const colorOption = linenPants.options.find((opt: any) => opt.name.toLowerCase() === 'color');
      const sizeOption = linenPants.options.find((opt: any) => opt.name.toLowerCase() === 'size');

      const defaultColor = colorOption?.optionValues?.[0]?.name || '';
      const defaultSize = sizeOption?.optionValues?.[0]?.name || '';

      if (defaultColor && defaultSize) {
        const variant = findVariant(linenPants, [
          { name: 'Color', value: defaultColor },
          { name: 'Size', value: defaultSize },
        ]);

        setPantsSelection({
          color: defaultColor,
          size: defaultSize,
          variantId: variant?.id || '',
          image: variant?.image?.url || linenPants.featuredImage?.url || '',
        });
      }
    }
  }, [linenShirt, linenPants]);

  // Get option values for a product
  const getOptionValues = (product: any, optionName: string): string[] => {
    if (!product?.options) return [];
    const option = product.options.find((opt: any) => opt.name.toLowerCase() === optionName);
    return option?.optionValues?.map((v: any) => v.name) || [];
  };

  // Handle selection change
  const handleSelectionChange = (
    productType: 'shirt' | 'pants',
    field: 'color' | 'size',
    value: string
  ) => {
    const product = productType === 'shirt' ? linenShirt : linenPants;
    const currentSelection = productType === 'shirt' ? shirtSelection : pantsSelection;
    const setSelection = productType === 'shirt' ? setShirtSelection : setPantsSelection;

    const newSelection = {
      ...currentSelection,
      [field]: value,
    };

    // Find matching variant
    if (newSelection.color && newSelection.size) {
      const variant = findVariant(product, [
        { name: 'Color', value: newSelection.color },
        { name: 'Size', value: newSelection.size },
      ]);

      newSelection.variantId = variant?.id || '';
      newSelection.image = variant?.image?.url || product?.featuredImage?.url || '';
    }

    setSelection(newSelection);
  };

  // Get swatch color from product options
  const getSwatchColor = (product: any, color: string): string | undefined => {
    if (!product?.options) return undefined;
    const colorOption = product.options.find((opt: any) => opt.name.toLowerCase() === 'color');
    if (!colorOption?.optionValues) return undefined;
    const value = colorOption.optionValues.find((v: any) => v.name === color);
    return value?.swatch?.color;
  };

  // Calculate bundle price
  const calculateBundlePrice = () => {
    // Get shirt price
    const shirtVariant = linenShirt?.variants?.nodes?.find((v: any) => v.id === shirtSelection.variantId);
    const shirtPrice = shirtVariant?.price?.amount ? parseFloat(shirtVariant.price.amount) : 0;

    // Get pants price
    const pantsVariant = linenPants?.variants?.nodes?.find((v: any) => v.id === pantsSelection.variantId);
    const pantsPrice = pantsVariant?.price?.amount ? parseFloat(pantsVariant.price.amount) : 0;

    // Apply 15% discount to pants only
    const discountedPantsPrice = pantsPrice * (1 - upsell.discountValue / 100);
    const bundleTotal = shirtPrice + discountedPantsPrice;
    const originalTotal = shirtPrice + pantsPrice;

    return {
      original: originalTotal,
      discounted: bundleTotal,
      currencyCode: shirtVariant?.price?.currencyCode || pantsVariant?.price?.currencyCode || 'USD',
      shirtPrice: shirtPrice || 0,
      pantsPrice: pantsPrice || 0,
      discountedPantsPrice: discountedPantsPrice || 0,
    };
  };

  const bundlePrice = calculateBundlePrice();

  // Prepare lines for AddToCartButton
  const lines = shirtSelection.variantId && pantsSelection.variantId
    ? [
      { merchandiseId: shirtSelection.variantId, quantity: 1 },
      { merchandiseId: pantsSelection.variantId, quantity: 1 },
    ]
    : [];

  // Check if any variant is out of stock
  const shirtVariant = linenShirt?.variants?.nodes?.find((v: any) => v.id === shirtSelection.variantId);
  const pantsVariant = linenPants?.variants?.nodes?.find((v: any) => v.id === pantsSelection.variantId);
  const anyOutOfStock = !shirtVariant?.availableForSale || !pantsVariant?.availableForSale;

  // Validate before add to cart
  const handleClick = () => {
    if (!shirtSelection.variantId || !pantsSelection.variantId) {
      setError('Please select color and size for both items.');
      return false;
    }
    setError('');
    open('cart');
    return true;
  };

  if (!linenShirt || !linenPants || !linenShirt.variants?.nodes || !linenPants.variants?.nodes) {
    return null; // Don't render if products aren't loaded or don't have variants
  }

  return (
    <div className="mb-4 border border-gray-200 p-6">
      <h2 className="text-2xl font-medium text-black mb-2">{upsell.title}</h2>
      <p className="mb-6 text-gray-700">{upsell.description}</p>

      {/* Product cards in a horizontal row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Linen Shirt */}
        <div className="flex flex-col border border-gray-100 p-3">
          <h3 className="text-sm font-medium mb-3">{linenShirt.title}</h3>

          {/* Product image */}
          <div className="w-full aspect-[9/16] mb-3 bg-gray-100 max-h-88">
            {(shirtSelection.image || linenShirt?.featuredImage?.url) ? (
              <img
                src={shirtSelection.image || linenShirt?.featuredImage?.url}
                alt="Selected shirt variant"
                className="w-full h-full object-cover"
              />
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
              {getOptionValues(linenShirt, 'color').map((color) => {
                const swatchColor = getSwatchColor(linenShirt, color);
                const variant = linenShirt.variants.nodes.find((v: any) =>
                  v.selectedOptions.some((opt: any) =>
                    opt.name.toLowerCase() === 'color' && opt.value === color
                  ) &&
                  v.selectedOptions.some((opt: any) =>
                    opt.name.toLowerCase() === 'size' && opt.value === shirtSelection.size
                  )
                );
                const outOfStock = variant ? !variant.availableForSale : false;

                return (
                  <button
                    key={color}
                    type="button"
                    className={`product-options-item transition-all w-6 h-6 flex items-center justify-center p-0 color-swatch relative
                      ${shirtSelection.color === color
                        ? 'border-2 border-gray-900'
                        : 'border border-gray-200 hover:border-gray-400'
                      }
                      ${outOfStock ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    onClick={() => !outOfStock && handleSelectionChange('shirt', 'color', color)}
                    style={{ borderRadius: '0' }}
                    disabled={outOfStock}
                  >
                    <div
                      aria-label={color}
                      className="w-full h-full relative"
                      style={{
                        backgroundColor: swatchColor || color.toLowerCase(),
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
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size selection */}
          <div className="product-options">
            <h5 className="text-xs font-medium text-gray-900 mb-2">Size</h5>
            <div className="flex flex-wrap gap-2 justify-start">
              {getOptionValues(linenShirt, 'size').map((size) => {
                const variant = linenShirt.variants.nodes.find((v: any) =>
                  v.selectedOptions.some((opt: any) =>
                    opt.name.toLowerCase() === 'color' && opt.value === shirtSelection.color
                  ) &&
                  v.selectedOptions.some((opt: any) =>
                    opt.name.toLowerCase() === 'size' && opt.value === size
                  )
                );
                const outOfStock = variant ? !variant.availableForSale : false;

                return (
                  <button
                    key={size}
                    type="button"
                    className={`product-options-item transition-all px-2 py-1 text-xs font-medium relative
                      ${shirtSelection.size === size
                        ? 'text-gray-900 underline underline-offset-4'
                        : 'text-gray-600 hover:text-gray-900'
                      }
                      ${outOfStock ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    onClick={() => !outOfStock && handleSelectionChange('shirt', 'size', size)}
                    disabled={outOfStock}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Linen Pants */}
        <div className="flex flex-col border border-gray-100 p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">{linenPants.title}</h3>
            <span className="text-xs text-green-600 font-medium">15% OFF</span>
          </div>

          {/* Product image */}
          <div className="w-full aspect-[9/16] mb-3 bg-gray-100 max-h-88">
            {(pantsSelection.image || linenPants?.featuredImage?.url) ? (
              <img
                src={pantsSelection.image || linenPants?.featuredImage?.url}
                alt="Selected pants variant"
                className="w-full h-full object-cover"
              />
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
              {getOptionValues(linenPants, 'color').map((color) => {
                const swatchColor = getSwatchColor(linenPants, color);
                const variant = linenPants.variants.nodes.find((v: any) =>
                  v.selectedOptions.some((opt: any) =>
                    opt.name.toLowerCase() === 'color' && opt.value === color
                  ) &&
                  v.selectedOptions.some((opt: any) =>
                    opt.name.toLowerCase() === 'size' && opt.value === pantsSelection.size
                  )
                );
                const outOfStock = variant ? !variant.availableForSale : false;

                return (
                  <button
                    key={color}
                    type="button"
                    className={`product-options-item transition-all w-6 h-6 flex items-center justify-center p-0 color-swatch relative
                      ${pantsSelection.color === color
                        ? 'border-2 border-gray-900'
                        : 'border border-gray-200 hover:border-gray-400'
                      }
                      ${outOfStock ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    onClick={() => !outOfStock && handleSelectionChange('pants', 'color', color)}
                    style={{ borderRadius: '0' }}
                    disabled={outOfStock}
                  >
                    <div
                      aria-label={color}
                      className="w-full h-full relative"
                      style={{
                        backgroundColor: swatchColor || color.toLowerCase(),
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
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size selection */}
          <div className="product-options">
            <h5 className="text-xs font-medium text-gray-900 mb-2">Size</h5>
            <div className="flex flex-wrap gap-2 justify-start">
              {getOptionValues(linenPants, 'size').map((size) => {
                const variant = linenPants.variants.nodes.find((v: any) =>
                  v.selectedOptions.some((opt: any) =>
                    opt.name.toLowerCase() === 'color' && opt.value === pantsSelection.color
                  ) &&
                  v.selectedOptions.some((opt: any) =>
                    opt.name.toLowerCase() === 'size' && opt.value === size
                  )
                );
                const outOfStock = variant ? !variant.availableForSale : false;

                return (
                  <button
                    key={size}
                    type="button"
                    className={`product-options-item transition-all px-2 py-1 text-xs font-medium relative
                      ${pantsSelection.size === size
                        ? 'text-gray-900 underline underline-offset-4'
                        : 'text-gray-600 hover:text-gray-900'
                      }
                      ${outOfStock ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    onClick={() => !outOfStock && handleSelectionChange('pants', 'size', size)}
                    disabled={outOfStock}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bundle pricing */}
      <div className="mt-6 text-center">
        <div className="text-lg font-medium">Bundle Price:</div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-gray-500 line-through">
            {bundlePrice.original.toFixed(2)} {bundlePrice.currencyCode}
          </span>
          <span className="text-xl font-bold">
            {bundlePrice.discounted.toFixed(2)} {bundlePrice.currencyCode}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          Shirt: {bundlePrice.shirtPrice.toFixed(2)} {bundlePrice.currencyCode} +
          Pants: <span className="line-through">{bundlePrice.pantsPrice.toFixed(2)}</span> {bundlePrice.discountedPantsPrice.toFixed(2)} {bundlePrice.currencyCode} (15% off)
        </div>
      </div>

      {error && <div className="text-red-600 mt-4 text-sm text-center">{error}</div>}

      <div className="mt-6">
        <AddToCartButton
          disabled={lines.length !== 2 || anyOutOfStock}
          lines={lines}
          onClick={handleClick}
        >
          <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
            {anyOutOfStock ? 'Out of Stock' : 'Add Bundle to Cart'}
          </span>
        </AddToCartButton>
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">
        15% discount on pants applied automatically at checkout.
      </div>
    </div>
  );
}

export default LinenCrossSellCard;