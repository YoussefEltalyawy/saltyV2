import { useState, useEffect } from 'react';
import { AddToCartButton } from '~/components/AddToCartButton';
import { useAside } from '~/components/Aside';
import ProductBundleCard from '~/components/ProductBundleCard';
import { getFirstColor, getFirstSize, getVariantIdFromOptions, getVariantById, getPriceInfo } from '~/lib/bundleUtils';

interface BundleCollection3CardProps {
  collectionProducts: any[];
}

export default function BundleCollection3Card({
  collectionProducts,
}: BundleCollection3CardProps) {
  const { open } = useAside();
  const [collectionSelections, setCollectionSelections] = useState([
    { variantId: '' },
    { variantId: '' },
    { variantId: '' },
  ]);

  // Initialize collectionSelections when collectionProducts become available
  useEffect(() => {
    if (collectionProducts?.length >= 3) {
      setCollectionSelections([
        { variantId: collectionProducts[0]?.variants?.nodes?.[0]?.id || '' },
        { variantId: collectionProducts[1]?.variants?.nodes?.[0]?.id || '' },
        { variantId: collectionProducts[2]?.variants?.nodes?.[0]?.id || '' },
      ]);
    }
  }, [collectionProducts]);

  if (!collectionProducts || collectionProducts.length < 3) return null;

  const prices = collectionSelections.filter(sel => sel?.variantId).map((sel) => {
    const product = collectionProducts.find((p: any) => p.variants?.nodes?.some((v: any) => v.id === sel.variantId));
    if (!product) return { price: 0, currency: 'USD' };
    const variant = getVariantById(product, sel.variantId);
    return getPriceInfo(variant);
  });
  const original = prices.reduce(
    (sum, p: any) => sum + (p?.price || 0),
    0,
  );
  const discounted = original * 0.85;
  const currency = prices[0]?.currency || 'USD';

  return (
    <div className="mt-8 border border-gray-200 p-6">
      <h2 className="text-2xl font-medium text-black mb-2">
        Any 3 Products from &quot;Made By Artist W&apos;25&quot; – 15% Off!
      </h2>

      <p className="mb-6 text-gray-700">
        Pick any 3 products from the collection and save 15%.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((idx) => (
          <ProductBundleCard
            key={idx}
            products={collectionProducts}
            initialProduct={collectionProducts[idx] || collectionProducts[0]}
            title={`Product ${idx + 1}`}
            onChange={(product, color, size) => {
              const newSelections = [...collectionSelections];
              newSelections[idx].variantId = getVariantIdFromOptions(product, color, size);
              setCollectionSelections(newSelections);
            }}
            initialColor={
              collectionSelections[idx]?.variantId
                ? getVariantById(collectionProducts.find((p: any) => p.variants?.nodes?.some((v: any) => v.id === collectionSelections[idx].variantId)), collectionSelections[idx].variantId)
                  ?.selectedOptions.find((o: any) => o.name.toLowerCase() === 'color')?.value
                : ''
            }
            initialSize={
              collectionSelections[idx]?.variantId
                ? getVariantById(collectionProducts.find((p: any) => p.variants?.nodes?.some((v: any) => v.id === collectionSelections[idx].variantId)), collectionSelections[idx].variantId)
                  ?.selectedOptions.find((o: any) => o.name.toLowerCase() === 'size')?.value
                : ''
            }
          />
        ))}
      </div>
      {/* Price calculation */}
      <div className="mt-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-gray-500 line-through">
            {original.toFixed(2)} {currency}
          </span>
          <span className="text-xl font-bold">
            {discounted.toFixed(2)} {currency}
          </span>
          <span className="text-green-600 text-sm">(Save 15%)</span>
        </div>
      </div>
      <div className="mt-6">
        <AddToCartButton
          lines={collectionSelections.filter(sel => sel?.variantId).map((sel) => ({
            merchandiseId: sel.variantId,
            quantity: 1,
          }))}
          onClick={() => open('cart')}
          discountCode="3ITEMS15"
        >
          <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
            Add Bundle to Cart
          </span>
        </AddToCartButton>
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">
        Discount applied automatically with code 3ITEMS15.
      </div>
    </div>
  );
}
