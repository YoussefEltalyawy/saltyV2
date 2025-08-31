import { useState, useEffect } from 'react';
import { useLoaderData } from 'react-router';
import { useAside } from './Aside';
import { AddToCartButton } from './AddToCartButton';
import type { ProductFragment } from 'storefrontapi.generated';
import { loader } from '../routes/($locale).products.$handle';

const POLO_COLLECTION = 'oversized-polos';

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

function BundleUpsellCard({
  product,
  productOptions,
  upsell,
}: {
  product: ProductFragment;
  productOptions: any[];
  upsell: {
    minQuantity: number;
    title: string;
    description: string;
    discountValue?: number;
    collectionRestriction?: string;
    [key: string]: any;
  };
}) {
  const {
    minQuantity,
    title,
    description,
    discountValue = 15,
    collectionRestriction,
    discountCode,
  } = upsell;
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
      const initialPoloHandles = Array(minQuantity).fill(
        allPolos[0]?.handle || '',
      );
      setSelectedPoloHandles(initialPoloHandles);
      const initialPolos = Array(minQuantity).fill(allPolos[0] || undefined);
      setSelectedPolos(initialPolos);
    }
  }, [isPoloBundle, product, productCollections, minQuantity]);

  // Initialize selections with default values (first color and size)
  const initializeSelections = (): SelectionType[] => {
    const defaultSelections: SelectionType[] = [];

    // Find first available variant to get default color and size
    let defaultColor = '';
    let defaultSize = '';

    if (product.variants?.nodes) {
      const firstAvailableVariant = product.variants.nodes.find((v: any) => v.availableForSale);
      if (firstAvailableVariant) {
        const colorOption = firstAvailableVariant.selectedOptions.find((opt: any) =>
          opt.name.toLowerCase() === 'color'
        );
        const sizeOption = firstAvailableVariant.selectedOptions.find((opt: any) =>
          opt.name.toLowerCase() === 'size'
        );
        defaultColor = colorOption?.value || '';
        defaultSize = sizeOption?.value || '';
      }
    }

    for (let i = 0; i < minQuantity; i++) {
      const selection: SelectionType = {
        color: defaultColor,
        size: defaultSize,
        productHandle: isPoloBundle
          ? i === 0
            ? product.handle
            : ''
          : undefined,
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

  const [selections, setSelections] =
    useState<SelectionType[]>(initializeSelections);

  // Handle polo selection change
  const handlePoloChange = (idx: number, handle: string) => {
    // Find the selected polo
    const selectedPolo = availablePolos.find((p) => p.handle === handle);
    if (!selectedPolo) return;

    // Update selected polos
    const newSelectedPoloHandles = [...selectedPoloHandles];
    newSelectedPoloHandles[idx] = handle;
    setSelectedPoloHandles(newSelectedPoloHandles);

    const newSelectedPolos = [...selectedPolos];
    newSelectedPolos[idx] = selectedPolo;
    setSelectedPolos(newSelectedPolos);

    // Get default color and size for this polo from first available variant
    let defaultColor = '';
    let defaultSize = '';
    let defaultVariant;

    if (selectedPolo.variants?.nodes) {
      // Find first available variant
      const firstAvailableVariant = selectedPolo.variants.nodes.find((v: any) => v.availableForSale);
      if (firstAvailableVariant) {
        const colorOption = firstAvailableVariant.selectedOptions.find((opt: any) =>
          opt.name.toLowerCase() === 'color'
        );
        const sizeOption = firstAvailableVariant.selectedOptions.find((opt: any) =>
          opt.name.toLowerCase() === 'size'
        );
        defaultColor = colorOption?.value || '';
        defaultSize = sizeOption?.value || '';
        defaultVariant = firstAvailableVariant;
      }
    }

    // Update the selection for this slot
    const newSelections = [...selections];
    newSelections[idx] = {
      color: defaultColor,
      size: defaultSize,
      productHandle: handle,
      variantId: defaultVariant?.id,
      image: defaultVariant?.image?.url || selectedPolo.featuredImage?.url,
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
      const selectedPolo = availablePolos.find(
        (p) => p.handle === newSelections[idx].productHandle,
      );
      if (selectedPolo && newSelections[idx].color && newSelections[idx].size) {
        // Find matching variant
        const variant = selectedPolo.variants.nodes.find(
          (v: any) =>
            v.selectedOptions.some(
              (opt: any) =>
                opt.name.toLowerCase() === 'color' &&
                opt.value === newSelections[idx].color,
            ) &&
            v.selectedOptions.some(
              (opt: any) =>
                opt.name.toLowerCase() === 'size' &&
                opt.value === newSelections[idx].size,
            ),
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
    const polo = availablePolos.find((p) => p.handle === poloHandle);
    if (!polo || !polo.options) return [];
    const colorOption = polo.options.find(
      (opt: any) => opt.name.toLowerCase() === 'color',
    );
    return colorOption && colorOption.optionValues
      ? colorOption.optionValues.map((v: any) => v.name)
      : [];
  };

  // Get size options for a specific polo
  const getPoloSizeOptions = (poloHandle: string) => {
    const polo = availablePolos.find((p) => p.handle === poloHandle);
    if (!polo || !polo.options) return [];
    const sizeOption = polo.options.find(
      (opt: any) => opt.name.toLowerCase() === 'size',
    );
    return sizeOption && sizeOption.optionValues
      ? sizeOption.optionValues.map((v: any) => v.name)
      : [];
  };

  // Find variant with color for color swatches
  const findVariantWithColor = (poloHandle: string, color: string) => {
    const polo = availablePolos.find((p) => p.handle === poloHandle);
    if (!polo || !polo.variants?.nodes) return null;

    return polo.variants.nodes.find((v: any) =>
      v.selectedOptions.some(
        (opt: any) => opt.name.toLowerCase() === 'color' && opt.value === color,
      ),
    );
  };

  // --- Color swatch rendering helper ---
  // Get the swatch color from Shopify metafield if available
  const getSwatchColor = (polo: any, color: string): string | undefined => {
    if (!polo?.options) return undefined;
    const colorOption = polo.options.find(
      (opt: any) => opt.name.toLowerCase() === 'color',
    );
    if (!colorOption || !colorOption.optionValues) return undefined;
    const value = colorOption.optionValues.find((v: any) => v.name === color);
    return value?.swatch?.color;
  };

  // Prepare lines for AddToCartButton
  const lines = selections.every((sel) => sel.variantId)
    ? selections.map((sel) => ({ merchandiseId: sel.variantId!, quantity: 1 }))
    : [];
  // Check if any selected variant is out of stock
  const anyOutOfStock = selections.some((sel) => {
    if (!sel.variantId) return true;
    const polo =
      isPoloBundle && sel.productHandle
        ? availablePolos.find((p) => p.handle === sel.productHandle)
        : product;
    const variant = polo?.variants?.nodes.find(
      (v: any) => v.id === sel.variantId,
    );
    return variant ? !variant.availableForSale : true;
  });

  // Validate before add to cart
  const handleClick = () => {
    if (!selections.every((sel) => sel.variantId)) {
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
      .filter((sel) => sel.variantId)
      .map((sel) => {
        // For polo bundles, find the variant in the selected polo
        if (isPoloBundle && sel.productHandle) {
          const polo = availablePolos.find(
            (p) => p.handle === sel.productHandle,
          );
          if (polo) {
            const variant = polo.variants.nodes.find(
              (v: any) => v.id === sel.variantId,
            );
            return variant?.price?.amount
              ? parseFloat(variant.price.amount)
              : 0;
          }
        }
        // For regular bundles, find the variant in the current product
        else {
          const variant = product.variants.nodes.find(
            (v: any) => v.id === sel.variantId,
          );
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
      currencyCode:
        product.selectedOrFirstAvailableVariant?.price?.currencyCode || 'USD',
    };
  };

  const bundlePrice = calculateBundlePrice();

  return (
    <div className="mb-4 border border-gray-200 p-6">
      <h2 className="text-2xl font-medium text-black mb-2">{title}</h2>
      <p className="mb-6 text-gray-700">{description}</p>

      {/* Product cards in a horizontal row */}
      <div
        className={`grid ${minQuantity === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}
      >
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
                  <option value="" disabled>
                    Select a polo
                  </option>
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
                <img
                  src={sel.image}
                  alt="Selected variant"
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
                value={`${sel.color}/${sel.size}`}
                onChange={(e) => {
                  if (e.target.value === '') return;
                  const [color, size] = e.target.value.split('/');
                  if (color && size) {
                    // Update both color and size at once to avoid race conditions
                    const newSelections = [...selections];
                    newSelections[idx] = {
                      ...newSelections[idx],
                      color,
                      size,
                    };

                    // Find the variant for this color/size combination
                    const productForVariants = isPoloBundle && sel.productHandle
                      ? availablePolos.find((p) => p.handle === sel.productHandle)
                      : product;

                    if (productForVariants?.variants?.nodes) {
                      const variant = productForVariants.variants.nodes.find((v: any) => {
                        const hasColor = v.selectedOptions.some((opt: any) =>
                          opt.name.toLowerCase() === 'color' && opt.value === color
                        );
                        const hasSize = v.selectedOptions.some((opt: any) =>
                          opt.name.toLowerCase() === 'size' && opt.value === size
                        );
                        return hasColor && hasSize;
                      });

                      if (variant) {
                        newSelections[idx].variantId = variant.id;
                        newSelections[idx].image = variant.image?.url || productForVariants.featuredImage?.url;
                      }
                    }

                    setSelections(newSelections);
                  }
                }}
              >
                <option value="">Choose color/size...</option>
                {(() => {
                  const productForVariants = isPoloBundle && sel.productHandle
                    ? availablePolos.find((p) => p.handle === sel.productHandle)
                    : product;

                  if (!productForVariants?.variants?.nodes) return [];

                  return productForVariants.variants.nodes.map((variant: any) => {
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
            (Save {discountValue}% )
          </span>
        </div>
      </div>

      {error && (
        <div className="text-red-600 mt-4 text-sm text-center">{error}</div>
      )}

      <div className="mt-6">
        <AddToCartButton
          disabled={lines.length !== minQuantity || anyOutOfStock}
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
        Discount applied automatically at checkout.
      </div>
    </div>
  );
}

export default BundleUpsellCard;
