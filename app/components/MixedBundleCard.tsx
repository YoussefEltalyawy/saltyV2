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
 * Replaces both BundleZipUpSweatpantsCard and BundleHoodieSweatpantsCard.
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

  return (
    <div className="mb-4 border border-gray-200 p-6">
      <h2 className="text-2xl font-medium text-black mb-2">{title}</h2>
      <p className="mb-6 text-gray-700">{description}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {/* Pricing */}
      <div className="mt-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-gray-500 line-through">
            {original.toFixed(2)} {currency}
          </span>
          <span className="text-xl font-bold">
            {discounted.toFixed(2)} {currency}
          </span>
          <span className="text-green-600 text-sm">(Save {discountValue}%)</span>
        </div>
      </div>

      <div className="mt-6">
        <AddToCartButton
          lines={lines}
          disabled={lines.length < 2}
          onClick={() => open('cart')}
          discountCode={discountCode}
        >
          <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
            Add Bundle to Cart
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
