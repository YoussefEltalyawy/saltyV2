import { useState, useEffect } from 'react';
import { useAside } from './Aside';
import { AddToCartButton } from './AddToCartButton';
import ProductBundleCard from './ProductBundleCard';
import {
  getVariant,
  getPriceInfo,
  calculateBundlePrice,
  getVariantIdFromOptions,
} from '~/lib/bundleUtils';
import { BUNDLE_TYPES } from '~/lib/bundleConfig';

interface BundleRendererProps {
  bundleType: string;
  bundleConfig: any;
  products: any[];
  onVariantChange?: (variantId: string, index: number) => void;
}

export default function BundleRenderer({
  bundleType,
  bundleConfig,
  products,
  onVariantChange,
}: BundleRendererProps) {
  const { open } = useAside();
  const [selections, setSelections] = useState<any[]>([]);

  const {
    title,
    description,
    minQuantity,
    discountValue,
    discountCode,
    discountType,
  } = bundleConfig;

  // Initialize selections based on bundle type
  useEffect(() => {
    if (bundleType === BUNDLE_TYPES.BUNDLE && minQuantity) {
      const initialSelections = Array(minQuantity).fill(null).map(() => ({
        product: products[0] || null,
        color: '',
        size: '',
        variantId: '',
      }));
      setSelections(initialSelections);
    } else if (bundleType === BUNDLE_TYPES.CROSS_SELL) {
      const initialSelections = [
        {
          product: products[0] || null,
          color: '',
          size: '',
          variantId: '',
        },
        {
          product: products[1] || products[0] || null,
          color: '',
          size: '',
          variantId: '',
        },
      ];
      setSelections(initialSelections);
    }
  }, [bundleType, minQuantity, products]);

  // Handle product selection change
  const handleProductChange = (index: number, product: any, color: string, size: string) => {
    const newSelections = [...selections];
    newSelections[index] = {
      product,
      color,
      size,
      variantId: getVariantIdFromOptions(product, color, size),
    };
    setSelections(newSelections);

    if (onVariantChange) {
      onVariantChange(newSelections[index].variantId, index);
    }
  };

  // Get cart lines for AddToCartButton
  const getCartLines = () => {
    return selections
      .filter(sel => sel.variantId)
      .map(sel => ({
        merchandiseId: sel.variantId,
        quantity: 1,
      }));
  };

  // Calculate bundle price
  const getBundlePrice = () => {
    const variants = selections
      .filter(sel => sel.variantId)
      .map(sel => {
        const variant = getVariant(sel.product, sel.color, sel.size);
        return variant;
      });

    if (variants.length === 0) return null;

    const currency = variants[0]?.price?.currencyCode || 'USD';
    return calculateBundlePrice(variants, discountValue, currency);
  };

  // Render bundle based on type
  const renderBundle = () => {
    if (bundleType === BUNDLE_TYPES.BUNDLE) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: minQuantity }).map((_, idx) => (
            <ProductBundleCard
              key={idx}
              products={products}
              initialProduct={selections[idx]?.product || products[0]}
              title={`${bundleConfig.collectionRestriction === 'oversized-polos' ? 'Polo' : 'Product'} ${idx + 1}`}
              onChange={(product, color, size) => handleProductChange(idx, product, color, size)}
              initialColor={selections[idx]?.color}
              initialSize={selections[idx]?.size}
            />
          ))}
        </div>
      );
    }

    if (bundleType === BUNDLE_TYPES.CROSS_SELL) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {selections.map((sel, idx) => (
            <ProductBundleCard
              key={idx}
              products={products}
              initialProduct={sel.product}
              title={idx === 0 ? 'Choose Denim' : 'Choose Polo'}
              onChange={(product, color, size) => handleProductChange(idx, product, color, size)}
              initialColor={sel.color}
              initialSize={sel.size}
            />
          ))}
        </div>
      );
    }

    return null;
  };

  const bundlePrice = getBundlePrice();
  const cartLines = getCartLines();

  return (
    <div className="mb-4 border border-gray-200 p-6">
      <h2 className="text-2xl font-medium text-black mb-2">{title}</h2>
      <p className="mb-6 text-gray-700">{description}</p>

      {renderBundle()}

      {/* Price calculation */}
      {bundlePrice && (
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-gray-500 line-through">
              {bundlePrice.original.toFixed(2)} {bundlePrice.currency}
            </span>
            <span className="text-xl font-bold">
              {bundlePrice.discounted.toFixed(2)} {bundlePrice.currency}
            </span>
            <span className="text-green-600 text-sm">
              (Save {discountValue}%)
            </span>
          </div>
        </div>
      )}

      {/* Add to Cart Button */}
      <div className="mt-6">
        <AddToCartButton
          lines={cartLines}
          onClick={() => open('cart')}
          discountCode={discountCode}
        >
          <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
            Add Bundle to Cart
          </span>
        </AddToCartButton>
      </div>

      {/* Discount code info */}
      {discountCode && discountType === 'code' && (
        <div className="text-xs text-gray-500 mt-2 text-center">
          Discount applied automatically with code {discountCode}.
        </div>
      )}
    </div>
  );
}
