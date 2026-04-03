import { useState, useEffect } from 'react';
import { useAside } from './Aside';
import { AddToCartButton } from './AddToCartButton';
import ProductBundleCard from './ProductBundleCard';
import {
  getFirstColor,
  getFirstSize,
  getVariantIdFromOptions,
  getVariant,
  getPriceInfo,
  getVariantById,
} from '~/lib/bundleUtils';
import { getSlotLabel, type BundleDefinition } from '~/lib/bundleConfig';

interface SlotConfig {
  /** Title shown above the card */
  title: string;
  /** Products available for this slot */
  products: any[];
}

interface BundlesPageBundleCardProps {
  def: BundleDefinition;
  /**
   * One entry per slot. Each slot gets its own product pool and title.
   * For same-collection bundles (polos/tops/collection-3) all slots share the same pool.
   * For cross-sell bundles (denim+polo) the two slots have different pools.
   */
  slots: SlotConfig[];
}

/**
 * Bundles-page-only card. Uses ProductBundleCard per slot so every slot has its
 * own independent product picker. Handles pricing + AddToCartButton.
 * This is NOT used on product pages — UpsellSection handles that.
 */
export default function BundlesPageBundleCard({ def, slots }: BundlesPageBundleCardProps) {
  const { open } = useAside();
  const { title, description, discountValue, discountCode } = def;
  const minQuantity = def.minQuantity ?? slots.length;

  // Track selected products + variant IDs per slot
  const [selectedProducts, setSelectedProducts] = useState<any[]>(() =>
    slots.map((s) => s.products[0] ?? null),
  );
  const [variantIds, setVariantIds] = useState<string[]>(() =>
    slots.map((s) => {
      const p = s.products[0];
      if (!p?.variants?.nodes?.length) return '';
      // only pre-select if there is an in-stock variant
      const firstAvail = p.variants.nodes.find((v: any) => v.availableForSale);
      return firstAvail?.id ?? '';
    }),
  );

  // Reset if slots change (e.g. async data load)
  useEffect(() => {
    setSelectedProducts(slots.map((s) => s.products[0] ?? null));
    setVariantIds(
      slots.map((s) => {
        const p = s.products[0];
        if (!p?.variants?.nodes?.length) return '';
        const firstAvail = p.variants.nodes.find((v: any) => v.availableForSale);
        return firstAvail?.id ?? '';
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.length]);

  // Pricing
  function calcPrice() {
    let total = 0;
    let currency = 'USD';
    selectedProducts.forEach((prod, i) => {
      if (!prod || !variantIds[i]) return;
      const variant = prod.variants?.nodes?.find((v: any) => v.id === variantIds[i]);
      if (variant?.price?.amount) {
        total += parseFloat(variant.price.amount);
        currency = variant.price.currencyCode ?? currency;
      }
    });
    return { original: total, discounted: total * (1 - discountValue / 100), currency };
  }

  const price = calcPrice();
  const cartLines = variantIds
    .filter((id) => id)
    .map((id) => ({ merchandiseId: id, quantity: 1 }));
  const isReady = cartLines.length === minQuantity;

  // Grid columns based on slot count
  const gridCols =
    slots.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : slots.length === 3
        ? 'grid-cols-1 md:grid-cols-3'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';

  return (
    <div className="mb-4 border border-gray-200 p-6">
      <h2 className="text-2xl font-medium text-black mb-2">{title}</h2>
      <p className="mb-6 text-gray-700">{description}</p>

      <div className={`grid ${gridCols} gap-6`}>
        {slots.map((slot, idx) => (
          <ProductBundleCard
            key={idx}
            products={slot.products}
            initialProduct={slot.products[0]}
            title={slot.title}
            onChange={(prod, color, size) => {
              const newProducts = [...selectedProducts];
              const newIds = [...variantIds];
              newProducts[idx] = prod;
              newIds[idx] = getVariantIdFromOptions(prod, color, size);
              setSelectedProducts(newProducts);
              setVariantIds(newIds);
            }}
            initialColor={getFirstColor(slot.products[0])}
            initialSize={getFirstSize(slot.products[0])}
          />
        ))}
      </div>

      {/* Pricing */}
      <div className="mt-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-gray-500 line-through">
            {price.original.toFixed(2)} {price.currency}
          </span>
          <span className="text-xl font-bold">
            {price.discounted.toFixed(2)} {price.currency}
          </span>
          <span className="text-green-600 text-sm">(Save {discountValue}%)</span>
        </div>
      </div>

      <div className="mt-6">
        <AddToCartButton
          lines={cartLines}
          disabled={!isReady}
          onClick={() => open('cart')}
          discountCode={discountCode}
        >
          <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
            {isReady ? 'Add Bundle to Cart' : 'Select options to add'}
          </span>
        </AddToCartButton>
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">
        {discountCode
          ? `Discount applied automatically with code ${discountCode}.`
          : 'Discount applied automatically at checkout.'}
      </div>
    </div>
  );
}
