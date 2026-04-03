import { useState } from 'react';
import { useAside } from './Aside';
import { AddToCartButton } from './AddToCartButton';
import ProductBundleCard from './ProductBundleCard';
import { getVariantIdFromOptions, getVariant, getPriceInfo, getFirstColor, getFirstSize } from '~/lib/bundleUtils';
import type { BundleDefinition } from '~/lib/bundleConfig';
import { getSlotLabel } from '~/lib/bundleConfig';

interface MixedBundleCardProps {
  def: BundleDefinition;
  /** Products for slot 1 (e.g. Zip Ups / Hoodies) */
  slot1Products: any[];
  /** Products for slot 2 (e.g. Sweatpants) */
  slot2Products: any[];
}

/**
 * Generic 2-slot bundle card for MIXED bundle type.
 * Matches the site aesthetic: Manrope font, premium black/white CTA.
 */
export default function MixedBundleCard({ def, slot1Products, slot2Products }: MixedBundleCardProps) {
  const { open } = useAside();
  const { title, description, discountValue, discountCode } = def;

  // Deduplicate by product ID
  const uniqueSlot1 = Array.from(new Map(slot1Products.map((p) => [p.id, p])).values());
  const uniqueSlot2 = Array.from(new Map(slot2Products.map((p) => [p.id, p])).values());

  const initProduct1 = uniqueSlot1[0] ?? null;
  const initProduct2 = uniqueSlot2[0] ?? null;

  const [product1, setProduct1] = useState<any>(initProduct1);
  const [variantId1, setVariantId1] = useState<string>(
    initProduct1?.variants?.nodes?.[0]?.id ?? '',
  );
  const [product2, setProduct2] = useState<any>(initProduct2);
  const [variantId2, setVariantId2] = useState<string>(
    initProduct2?.variants?.nodes?.[0]?.id ?? '',
  );

  if (!initProduct1 || !initProduct2) return null;

  /** Compute displayed pricing */
  const variant1 = getVariant(product1, getFirstColor(product1), getFirstSize(product1));
  const variant2 = getVariant(product2, getFirstColor(product2), getFirstSize(product2));
  const price1 = getPriceInfo(variant1);
  const price2 = getPriceInfo(variant2);
  const original = price1.price + price2.price;
  const discounted = original * (1 - discountValue / 100);
  const currency = price1.currency || price2.currency;

  const lines = [
    { merchandiseId: variantId1, quantity: 1 },
    { merchandiseId: variantId2, quantity: 1 },
  ].filter((l) => l.merchandiseId);

  const isReady = lines.length >= 2;

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

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-6 md:gap-8">
        <ProductBundleCard
          products={uniqueSlot1}
          initialProduct={initProduct1}
          title={getSlotLabel(def, 0, 2)}
          onChange={(prod, color, size) => {
            setProduct1(prod);
            setVariantId1(getVariantIdFromOptions(prod, color, size));
          }}
          initialColor={getFirstColor(initProduct1)}
          initialSize={getFirstSize(initProduct1)}
        />
        <ProductBundleCard
          products={uniqueSlot2}
          initialProduct={initProduct2}
          title={getSlotLabel(def, 1, 2)}
          onChange={(prod, color, size) => {
            setProduct2(prod);
            setVariantId2(getVariantIdFromOptions(prod, color, size));
          }}
          initialColor={getFirstColor(initProduct2)}
          initialSize={getFirstSize(initProduct2)}
        />
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
                {discounted.toLocaleString()} {currency}
              </span>
              <span className="text-sm text-gray-400 line-through">
                {original.toLocaleString()} {currency}
              </span>
              <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 tracking-tighter">
                -{discountValue}%
              </span>
            </div>
          </div>

          <div className="w-full sm:w-[300px]">
            <AddToCartButton
              lines={lines}
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
