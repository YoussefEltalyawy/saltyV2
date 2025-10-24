import { useState } from 'react';
import { AddToCartButton } from '~/components/AddToCartButton';
import { useAside } from '~/components/Aside';
import ProductBundleCard from '~/components/ProductBundleCard';
import { getFirstColor, getFirstSize, getVariantIdFromOptions, getVariant, getPriceInfo } from '~/lib/bundleUtils';

interface BundleHoodieSweatpantsCardProps {
  hoodieProducts: any[];
  sweatpantsProducts: any[];
}

export default function BundleHoodieSweatpantsCard({
  hoodieProducts,
  sweatpantsProducts,
}: BundleHoodieSweatpantsCardProps) {
  const { open } = useAside();
  const [selectedHoodie, setSelectedHoodie] = useState(hoodieProducts?.[0] || null);
  const [selectedHoodieVariantId, setSelectedHoodieVariantId] = useState(
    selectedHoodie?.variants?.nodes?.[0]?.id || '',
  );
  const [selectedSweatpants, setSelectedSweatpants] = useState(sweatpantsProducts?.[0] || null);
  const [selectedSweatpantsVariantId, setSelectedSweatpantsVariantId] = useState(
    selectedSweatpants?.variants?.nodes?.[0]?.id || '',
  );

  if (!selectedHoodie || !selectedSweatpants) return null;

  const hoodieVariant = getVariant(selectedHoodie, getFirstColor(selectedHoodie), getFirstSize(selectedHoodie));
  const sweatpantsVariant = getVariant(selectedSweatpants, getFirstColor(selectedSweatpants), getFirstSize(selectedSweatpants));
  const hoodiePrice = getPriceInfo(hoodieVariant);
  const sweatpantsPrice = getPriceInfo(sweatpantsVariant);
  const original = (hoodiePrice.price || 0) + (sweatpantsPrice.price || 0);
  const discounted = original * 0.9;

  return (
    <div className="mt-8 border border-gray-200 p-6">
      <h2 className="text-2xl font-medium text-black mb-2">
        Hoodie + Sweatpants Bundle – 10% Off!
      </h2>
      <p className="mb-6 text-gray-700">
        Get a hoodie and any sweatpants and save 10%.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hoodie selection */}
        <ProductBundleCard
          products={Array.from(new Map(hoodieProducts.map(p => [p.id, p])).values())}
          initialProduct={selectedHoodie}
          title="Choose Hoodie"
          onChange={(product, color, size) => {
            setSelectedHoodie(product);
            setSelectedHoodieVariantId(
              getVariantIdFromOptions(product, color, size)
            );
          }}
          initialColor={getFirstColor(selectedHoodie)}
          initialSize={getFirstSize(selectedHoodie)}
        />
        {/* Sweatpants selection */}
        <ProductBundleCard
          products={sweatpantsProducts}
          initialProduct={selectedSweatpants}
          title="Choose Sweatpants"
          onChange={(product, color, size) => {
            setSelectedSweatpants(product);
            setSelectedSweatpantsVariantId(
              getVariantIdFromOptions(product, color, size)
            );
          }}
          initialColor={getFirstColor(selectedSweatpants)}
          initialSize={getFirstSize(selectedSweatpants)}
        />
      </div>
      {/* Price calculation */}
      <div className="mt-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-gray-500 line-through">
            {original.toFixed(2)} {hoodiePrice.currency}
          </span>
          <span className="text-xl font-bold">
            {discounted.toFixed(2)} {hoodiePrice.currency}
          </span>
          <span className="text-green-600 text-sm">(Save 10%)</span>
        </div>
      </div>
      <div className="mt-6">
        <AddToCartButton
          lines={[
            { merchandiseId: selectedHoodieVariantId, quantity: 1 },
            { merchandiseId: selectedSweatpantsVariantId, quantity: 1 },
          ]}
          onClick={() => open('cart')}
          discountCode="H3KXGDBA3XKB"
        >
          <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
            Add Bundle to Cart
          </span>
        </AddToCartButton>
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">
        Discount applied automatically with code H3KXGDBA3XKB.
      </div>
    </div>
  );
}
