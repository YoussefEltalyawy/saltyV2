import { useState, useEffect } from 'react';
import { useAside } from './Aside';
import { AddToCartButton } from './AddToCartButton';
import ProductBundleCard from './ProductBundleCard';
import {
  getFirstColor,
  getFirstSize,
  getVariantIdFromOptions,
} from '~/lib/bundleUtils';

interface SlotConfig {
  /** Title shown above the card */
  title: string;
  /** Products available for this slot */
  products: any[];
}

interface BundlesPageBundleCardProps {
  def: {
    title: string;
    description: string;
    discountValue: number;
    discountCode?: string;
    minQuantity?: number;
  };
  /**
   * One entry per slot. Each slot gets its own product pool and title.
   */
  slots: SlotConfig[];
}

/**
 * Bundles-page-only card. Uses ProductBundleCard per slot so every slot has its
 * own independent product picker. Handles pricing + AddToCartButton.
 * Matches the site aesthetic: Manrope font, premium black/white CTA.
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
    let currency = 'EGP'; // Defaulting to EGP if not found, usually fetched from variant
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
      ? 'grid-cols-2'
      : slots.length === 3
        ? 'grid-cols-2 md:grid-cols-3'
        : 'grid-cols-2 lg:grid-cols-4';

  return (
    <div className="mb-12">
      <div className="flex flex-col mb-8 text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black mb-2 uppercase">
          {title}
        </h2>
        <p className="text-sm text-gray-500 max-w-xl">
          {description}
        </p>
      </div>

      <div className={`grid ${gridCols} gap-x-4 gap-y-8 sm:gap-6 md:gap-8`}>
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

      {/* Pricing & CTA */}
      <div className="mt-12 pt-8 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-1">
              Bundle Total
            </p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-black">
                {price.discounted.toLocaleString()} {price.currency}
              </span>
              <span className="text-sm text-gray-400 line-through">
                {price.original.toLocaleString()} {price.currency}
              </span>
              <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 tracking-tighter">
                -{discountValue}%
              </span>
            </div>
          </div>

          <div className="w-full sm:w-[300px]">
            <AddToCartButton
              lines={cartLines}
              disabled={!isReady}
              onClick={() => open('cart')}
              discountCode={discountCode}
            >
              <span className="block w-full text-center py-4 px-8 text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 bg-black text-white hover:bg-zinc-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed">
                {isReady ? 'Add Bundle to Cart' : 'Select all options'}
              </span>
            </AddToCartButton>
            <p className="text-[9px] text-gray-400 mt-2 text-center uppercase tracking-widest font-medium">
              {discountCode
                ? `Discount code ${discountCode} applied`
                : 'Discount auto-applied at checkout'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
