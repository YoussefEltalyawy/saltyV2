import { useState, useEffect, useMemo } from 'react';
import { useAside } from './Aside';
import { AddToCartButton } from './AddToCartButton';
import ProductBundleCard from './ProductBundleCard';
import {
  getDefaultProduct,
  getFirstAvailableVariant,
} from '~/lib/bundleUtils';
import { useBundleQuote } from '~/lib/useBundleQuote';

interface SlotConfig {
  /** Stable key for React lists. */
  id?: string;
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

  // Track selected products + variant IDs per slot
  const [selectedProducts, setSelectedProducts] = useState<any[]>(() =>
    slots.map((s) => getDefaultProduct(s.products) ?? null),
  );
  const [variantIds, setVariantIds] = useState<string[]>(() =>
    slots.map(
      (s) => getFirstAvailableVariant(getDefaultProduct(s.products))?.id ?? '',
    ),
  );

  // Product pools are rebuilt by the loader. Reset when their contents change,
  // not just when the slot count changes, so pickers never point at a product
  // that has been removed from the bundle.
  const signature = useMemo(
    () => slots.map((s) => s.products.map((p: any) => p.id).join(',')).join('|'),
    [slots],
  );

  useEffect(() => {
    setSelectedProducts(slots.map((s) => getDefaultProduct(s.products) ?? null));
    setVariantIds(
      slots.map(
        (s) => getFirstAvailableVariant(getDefaultProduct(s.products))?.id ?? '',
      ),
    );
  // `signature` captures the product pools; `slots` is rebuilt on each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // Fallback estimate until the live Shopify quote arrives (or if it fails).
  function estimatePrice() {
    let total = 0;
    let currency = 'EGP';
    selectedProducts.forEach((prod, i) => {
      const variant = prod?.variants?.nodes?.find((v: any) => v.id === variantIds[i]);
      if (variant?.price?.amount) {
        total += Number.parseFloat(variant.price.amount);
        currency = variant.price.currencyCode ?? currency;
      }
    });
    return { original: total, discounted: total * (1 - discountValue / 100), currency };
  }

  const cartLines = variantIds
    .filter((id) => id)
    .map((id) => ({ merchandiseId: id, quantity: 1 }));
  const isReady = slots.length > 0 && cartLines.length === slots.length;

  // Shopify's own price for this exact selection (BXGY, free gifts, automatic
  // discounts, ...), with the simple estimate as a fallback.
  const livePrice = useBundleQuote(cartLines, discountCode, isReady);
  const price = livePrice ?? estimatePrice();

  // Grid columns based on slot count
  const gridCols =
    slots.length === 1
      ? 'grid-cols-1 max-w-xs'
      : slots.length === 2
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
            key={`${slot.id ?? slot.title}:${slot.products
              .map((p: any) => p.id)
              .join(',')}`}
            products={slot.products}
            initialProduct={getDefaultProduct(slot.products)}
            initialVariantId={variantIds[idx]}
            title={slot.title}
            onChange={(product, variantId) => {
              const newProducts = [...selectedProducts];
              const newIds = [...variantIds];
              newProducts[idx] = product;
              newIds[idx] = variantId;
              setSelectedProducts(newProducts);
              setVariantIds(newIds);
            }}
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
          </div>
        </div>
      </div>
    </div>
  );
}
