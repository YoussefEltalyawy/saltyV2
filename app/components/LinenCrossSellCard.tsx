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
  // Handle both product pages (data in productCollections) and bundles page (data directly in loader)
  const linenShirt = loaderData?.productCollections?.linenShirt || loaderData?.linenShirt;
  const linenPants = loaderData?.productCollections?.linenPants || loaderData?.linenPants;

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

  // Initialize selections with default values from first available variants
  useEffect(() => {
    if (linenShirt && linenShirt.variants?.nodes) {
      // Find first available variant
      const firstAvailableVariant = linenShirt.variants.nodes.find((v: any) => v.availableForSale);
      if (firstAvailableVariant) {
        const colorOption = firstAvailableVariant.selectedOptions.find((opt: any) =>
          opt.name.toLowerCase() === 'color'
        );
        const sizeOption = firstAvailableVariant.selectedOptions.find((opt: any) =>
          opt.name.toLowerCase() === 'size'
        );

        const defaultColor = colorOption?.value || '';
        const defaultSize = sizeOption?.value || '';

        if (defaultColor && defaultSize) {
          setShirtSelection({
            color: defaultColor,
            size: defaultSize,
            variantId: firstAvailableVariant.id,
            image: firstAvailableVariant.image?.url || linenShirt.featuredImage?.url || '',
          });
        }
      }
    }

    if (linenPants && linenPants.variants?.nodes) {
      // Find first available variant
      const firstAvailableVariant = linenPants.variants.nodes.find((v: any) => v.availableForSale);
      if (firstAvailableVariant) {
        const colorOption = firstAvailableVariant.selectedOptions.find((opt: any) =>
          opt.name.toLowerCase() === 'color'
        );
        const sizeOption = firstAvailableVariant.selectedOptions.find((opt: any) =>
          opt.name.toLowerCase() === 'size'
        );

        const defaultColor = colorOption?.value || '';
        const defaultSize = sizeOption?.value || '';

        if (defaultColor && defaultSize) {
          setPantsSelection({
            color: defaultColor,
            size: defaultSize,
            variantId: firstAvailableVariant.id,
            image: firstAvailableVariant.image?.url || linenPants.featuredImage?.url || '',
          });
        }
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

    // Calculate original total
    const originalTotal = shirtPrice + pantsPrice;

    // Apply 15% discount to the total sum
    const bundleTotal = originalTotal * (1 - upsell.discountValue / 100);

    return {
      original: originalTotal,
      discounted: bundleTotal,
      currencyCode: shirtVariant?.price?.currencyCode || pantsVariant?.price?.currencyCode || 'USD',
      shirtPrice: shirtPrice || 0,
      pantsPrice: pantsPrice || 0,
      savings: originalTotal - bundleTotal,
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

          {/* Variant Selection Dropdown */}
          <div className="product-options mb-3">
            <h5 className="text-xs font-medium text-gray-900 mb-2">Select Variant</h5>
            <select
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              value={`${shirtSelection.color}/${shirtSelection.size}`}
              onChange={(e) => {
                if (e.target.value === '') return;
                const [color, size] = e.target.value.split('/');
                if (color && size) {
                  // Update both color and size at once to avoid race conditions
                  setShirtSelection(prev => ({
                    ...prev,
                    color,
                    size,
                  }));

                  // Find the variant for this color/size combination
                  if (linenShirt?.variants?.nodes) {
                    const variant = linenShirt.variants.nodes.find((v: any) => {
                      const hasColor = v.selectedOptions.some((opt: any) =>
                        opt.name.toLowerCase() === 'color' && opt.value === color
                      );
                      const hasSize = v.selectedOptions.some((opt: any) =>
                        opt.name.toLowerCase() === 'size' && opt.value === size
                      );
                      return hasColor && hasSize;
                    });

                    if (variant) {
                      setShirtSelection(prev => ({
                        ...prev,
                        variantId: variant.id,
                        image: variant.image?.url || linenShirt.featuredImage?.url,
                      }));
                    }
                  }
                }
              }}
            >
              <option value="">Choose color/size...</option>
              {(() => {
                if (!linenShirt?.variants?.nodes) return [];

                return linenShirt.variants.nodes.map((variant: any) => {
                  const colorOption = variant.selectedOptions.find((opt: any) =>
                    opt.name.toLowerCase() === 'color'
                  );
                  const sizeOption = variant.selectedOptions.find((opt: any) =>
                    opt.name.toLowerCase() === 'size'
                  );

                  if (colorOption && sizeOption) {
                    const value = `${colorOption.value}/${sizeOption.value}`;
                    const label = `${colorOption.value}/${sizeOption.value}`;
                    const available = variant.availableForSale;

                    return (
                      <option
                        key={value}
                        value={value}
                        disabled={!available}
                        style={{
                          color: available ? '#000' : '#9CA3AF',
                          backgroundColor: available ? '#fff' : '#F3F4F6',
                        }}
                      >
                        {label} {!available ? '(Out of Stock)' : ''}
                      </option>
                    );
                  }
                  return null;
                }).filter(Boolean);
              })()}
            </select>
          </div>
        </div>

        {/* Linen Pants */}
        <div className="flex flex-col border border-gray-100 p-3">
          <h3 className="text-sm font-medium mb-3">{linenPants.title}</h3>

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

          {/* Variant Selection Dropdown */}
          <div className="product-options mb-3">
            <h5 className="text-xs font-medium text-gray-900 mb-2">Select Variant</h5>
            <select
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              value={`${pantsSelection.color}/${pantsSelection.size}`}
              onChange={(e) => {
                if (e.target.value === '') return;
                const [color, size] = e.target.value.split('/');
                if (color && size) {
                  // Update both color and size at once to avoid race conditions
                  setPantsSelection(prev => ({
                    ...prev,
                    color,
                    size,
                  }));

                  // Find the variant for this color/size combination
                  if (linenPants?.variants?.nodes) {
                    const variant = linenPants.variants.nodes.find((v: any) => {
                      const hasColor = v.selectedOptions.some((opt: any) =>
                        opt.name.toLowerCase() === 'color' && opt.value === color
                      );
                      const hasSize = v.selectedOptions.some((opt: any) =>
                        opt.name.toLowerCase() === 'size' && opt.value === size
                      );
                      return hasColor && hasSize;
                    });

                    if (variant) {
                      setPantsSelection(prev => ({
                        ...prev,
                        variantId: variant.id,
                        image: variant.image?.url || linenPants.featuredImage?.url,
                      }));
                    }
                  }
                }
              }}
            >
              <option value="">Choose color/size...</option>
              {(() => {
                if (!linenPants?.variants?.nodes) return [];

                return linenPants.variants.nodes.map((variant: any) => {
                  const colorOption = variant.selectedOptions.find((opt: any) =>
                    opt.name.toLowerCase() === 'color'
                  );
                  const sizeOption = variant.selectedOptions.find((opt: any) =>
                    opt.name.toLowerCase() === 'size'
                  );

                  if (colorOption && sizeOption) {
                    const value = `${colorOption.value}/${sizeOption.value}`;
                    const label = `${colorOption.value}/${sizeOption.value}`;
                    const available = variant.availableForSale;

                    return (
                      <option
                        key={value}
                        value={value}
                        disabled={!available}
                        style={{
                          color: available ? '#000' : '#9CA3AF',
                          backgroundColor: available ? '#fff' : '#F3F4F6',
                        }}
                      >
                        {label} {!available ? '(Out of Stock)' : ''}
                      </option>
                    );
                  }
                  return null;
                }).filter(Boolean);
              })()}
            </select>
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
          Pants: {bundlePrice.pantsPrice.toFixed(2)} {bundlePrice.currencyCode}
          <br />
          <span className="text-green-600 font-medium">Save {bundlePrice.savings.toFixed(2)} {bundlePrice.currencyCode} (15% off total)</span>
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
        15% discount on total bundle price applied automatically at checkout.
      </div>
    </div>
  );
}

export default LinenCrossSellCard;