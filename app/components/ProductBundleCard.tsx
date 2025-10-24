import { useState } from 'react';
import {
  getFirstColor,
  getFirstSize,
  getVariant,
  getVariantIdFromOptions,
} from '~/lib/bundleUtils';

interface ProductBundleCardProps {
  products: any[];
  initialProduct: any;
  title: string;
  onChange: (product: any, color: string, size: string) => void;
  initialColor?: string;
  initialSize?: string;
  minQuantity?: number;
}

export default function ProductBundleCard({
  products,
  initialProduct,
  title,
  onChange,
  initialColor,
  initialSize,
  minQuantity = 1,
}: ProductBundleCardProps) {
  // Helper functions to get first available color and size
  const getFirstAvailableColor = (product: any): string => {
    if (!product?.variants?.nodes) return '';

    // Find the first variant that's available
    const firstAvailableVariant = product.variants.nodes.find((v: any) => v.availableForSale);
    if (firstAvailableVariant) {
      const colorOption = firstAvailableVariant.selectedOptions.find((opt: any) =>
        opt.name.toLowerCase() === 'color'
      );
      return colorOption?.value || '';
    }
    return '';
  };

  const getFirstAvailableSize = (product: any): string => {
    if (!product?.variants?.nodes) return '';

    // Find the first variant that's available
    const firstAvailableVariant = product.variants.nodes.find((v: any) => v.availableForSale);
    if (firstAvailableVariant) {
      const colorOption = firstAvailableVariant.selectedOptions.find((opt: any) =>
        opt.name.toLowerCase() === 'color'
      );
      const sizeOption = firstAvailableVariant.selectedOptions.find((opt: any) =>
        opt.name.toLowerCase() === 'size'
      );
      return sizeOption?.value || '';
    }
    return '';
  };

  const [selectedProduct, setSelectedProduct] = useState(initialProduct);
  const [selectedColor, setSelectedColor] = useState(
    initialColor || getFirstAvailableColor(selectedProduct),
  );
  const [selectedSize, setSelectedSize] = useState(
    initialSize || getFirstAvailableSize(selectedProduct),
  );

  // When product changes, reset color/size
  function handleProductChange(handle: string) {
    const prod = products.find((p) => p.handle === handle);
    setSelectedProduct(prod);
    setSelectedColor(getFirstAvailableColor(prod));
    setSelectedSize(getFirstAvailableSize(prod));
    if (onChange) {
      onChange(prod, getFirstAvailableColor(prod), getFirstAvailableSize(prod));
    }
  }

  // Handle variant selection change
  function handleVariantChange(variantOption: string) {
    if (variantOption === '') return;

    const [color, size] = variantOption.split('/');
    if (color && size) {
      setSelectedColor(color);
      setSelectedSize(size);
      if (onChange) {
        onChange(selectedProduct, color, size);
      }
    }
  }

  // Generate all variant combinations for the selected product
  const getVariantOptions = () => {
    if (!selectedProduct?.variants?.nodes) return [];

    const options: Array<{
      value: string;
      label: string;
      available: boolean;
      variant: any;
    }> = [];

    selectedProduct.variants.nodes.forEach((variant: any) => {
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

        options.push({
          value,
          label,
          available,
          variant,
        });
      }
    });

    return options;
  };

  const variantOptions = getVariantOptions();
  const currentVariant = getVariant(selectedProduct, selectedColor, selectedSize);
  const currentVariantOption = `${selectedColor}/${selectedSize}`;
  const image = currentVariant?.image?.url || selectedProduct?.featuredImage?.url;

  return (
    <div className="flex flex-col border border-gray-100 p-3">
      {products.length > 1 ? (
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
      ) : (
        <div className="mb-3 text-sm font-medium text-gray-900">
          {selectedProduct?.title}
        </div>
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

      {/* Variant Selection Dropdown */}
      <div className="mb-3">
        <h5 className="text-xs font-medium text-gray-900 mb-2">Select Variant</h5>
        <select
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          value={currentVariantOption}
          onChange={(e) => handleVariantChange(e.target.value)}
        >
          <option value="">Choose color/size...</option>
          {variantOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={!option.available}
              style={{
                color: option.available ? '#000' : '#9CA3AF',
                backgroundColor: option.available ? '#fff' : '#F3F4F6',
              }}
            >
              {option.label} {!option.available ? '(Out of Stock)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Price */}
      <div className="mt-2 text-sm font-medium">
        {currentVariant?.price?.amount} {currentVariant?.price?.currencyCode}
      </div>
    </div>
  );
}
