import { Await, useLoaderData } from 'react-router';
import { Suspense } from 'react';
import BundleUpsellCard from '~/components/BundleUpsellCard';
import CrossSellUpsellCard from '~/components/CrossSellUpsellCard';
import TopsCapBundleCard from '~/components/TopsCapBundleCard';
import LinenCrossSellCard from '~/components/LinenCrossSellCard';

import { useState, useEffect } from 'react';
import { AddToCartButton } from '~/components/AddToCartButton';
import { useAside } from '~/components/Aside';
import { createBundleDataService } from '~/lib/bundleDataService';
import { getAllBundleDefinitions, BUNDLE_TYPES } from '~/lib/bundleConfig';
import {
  getVariant,
  getVariantById,
  getPriceInfo,
  getFirstColor,
  getFirstSize,
  getVariantIdFromOptions,
  initializeProductSelections,
  initializeVariantSelections
} from '~/lib/bundleUtils';
import ProductBundleCard from '~/components/ProductBundleCard';

export async function loader({ context }: any) {
  const { storefront } = context;
  const dataService = createBundleDataService(storefront);

  // Fetch all bundle-related data using the centralized service
  const bundleData = await dataService.fetchAllBundleData();

  return bundleData;
}

export default function BundlesPage() {
  const { polos, denims, cocktailsBabyTee, caps, tops, linenShirt, linenPants } =
    useLoaderData<typeof loader>();
  const { open } = useAside();

  // Get all bundle definitions
  const bundleDefinitions = getAllBundleDefinitions();

  // --- 1. Denim + Polo Bundle ---
  const [selectedDenim, setSelectedDenim] = useState(denims[0] || null);
  const [selectedDenimVariantId, setSelectedDenimVariantId] = useState(
    selectedDenim?.variants.nodes[0]?.id || '',
  );
  const [selectedPolo, setSelectedPolo] = useState(polos[0] || null);
  const [selectedPoloVariantId, setSelectedPoloVariantId] = useState(
    selectedPolo?.variants.nodes[0]?.id || '',
  );

  // --- 2. 2 Polos Bundle ---
  const [selectedPolo1, setSelectedPolo1] = useState(polos[0] || null);
  const [selectedPolo1VariantId, setSelectedPolo1VariantId] = useState(
    selectedPolo1?.variants.nodes[0]?.id || '',
  );
  const [selectedPolo2, setSelectedPolo2] = useState(
    polos[1] || polos[0] || null,
  );
  const [selectedPolo2VariantId, setSelectedPolo2VariantId] = useState(
    selectedPolo2?.variants.nodes[0]?.id || '',
  );

  // --- 3. 3 Tops Bundle (Cocktails baby tee) ---
  const [topSelections, setTopSelections] = useState([
    { variantId: cocktailsBabyTee?.variants.nodes[0]?.id || '' },
    { variantId: cocktailsBabyTee?.variants.nodes[0]?.id || '' },
    { variantId: cocktailsBabyTee?.variants.nodes[0]?.id || '' },
  ]);

  // --- 4. 2 Tops Bundle (Cocktails baby tee) ---
  const [topSelections2, setTopSelections2] = useState([
    { variantId: '' },
    { variantId: '' },
  ]);

  // --- 5. 3 Polos Bundle ---
  const [selectedPolos, setSelectedPolos] = useState(
    initializeProductSelections(polos, 3)
  );
  const [selectedPolosVariantIds, setSelectedPolosVariantIds] = useState(
    initializeVariantSelections(polos, 3)
  );

  // Initialize topSelections2 when cocktailsBabyTee becomes available
  useEffect(() => {
    if (cocktailsBabyTee?.variants?.nodes?.[0]?.id) {
      const defaultVariantId = cocktailsBabyTee.variants.nodes[0].id;
      setTopSelections2([
        { variantId: defaultVariantId },
        { variantId: defaultVariantId },
      ]);
    }
  }, [cocktailsBabyTee]);

  // Don't render until cocktailsBabyTee is available
  if (!cocktailsBabyTee) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">Shop Bundles</h1>
        <div className="text-center text-gray-500">Loading bundles...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Shop Bundles</h1>
      <div className="flex flex-col gap-10">
        {/* 1. Linen Shirt + Pants Bundle */}
        {linenShirt && linenPants && (
          <LinenCrossSellCard
            currentProduct={linenShirt}
            upsell={{
              title: 'Linen Shirt + Pants Bundle – 15% Off!',
              description: 'Complete your linen look and save 15% on the total bundle price.',
              discountValue: 15,
              shirtHandle: 'linen-shirt',
              pantsHandle: 'linen-pants',
            }}
          />
        )}

        {/* 2. Denim + Polo Bundle */}
        <div className="mb-4 border border-gray-200 p-6">
          <h2 className="text-2xl font-medium text-black mb-2">
            Denim + Polo Bundle – 10% Off!
          </h2>
          <p className="mb-6 text-gray-700">
            Add a matching piece to complete your look and save 10%.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Denim selection */}
            <ProductBundleCard
              products={[selectedDenim, ...denims]}
              initialProduct={selectedDenim}
              title="Choose Denim"
              onChange={(product, color, size) => {
                setSelectedDenim(product);
                setSelectedDenimVariantId(
                  getVariantIdFromOptions(product, color, size)
                );
              }}
              initialColor={getFirstColor(selectedDenim)}
              initialSize={getFirstSize(selectedDenim)}
            />
            {/* Polo selection */}
            <ProductBundleCard
              products={[selectedPolo, ...polos]}
              initialProduct={selectedPolo}
              title="Choose Polo"
              onChange={(product, color, size) => {
                setSelectedPolo(product);
                setSelectedPoloVariantId(
                  getVariantIdFromOptions(product, color, size)
                );
              }}
              initialColor={getFirstColor(selectedPolo)}
              initialSize={getFirstSize(selectedPolo)}
            />
          </div>
          {/* Price calculation */}
          <div className="mt-6 text-center">
            {(() => {
              const denimVariant = getVariant(selectedDenim, getFirstColor(selectedDenim), getFirstSize(selectedDenim));
              const poloVariant = getVariant(selectedPolo, getFirstColor(selectedPolo), getFirstSize(selectedPolo));
              const denimPrice = getPriceInfo(denimVariant);
              const poloPrice = getPriceInfo(poloVariant);
              const original = (denimPrice.price || 0) + (poloPrice.price || 0);
              const discounted = original * 0.9;
              return (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-gray-500 line-through">
                    {original.toFixed(2)} {denimPrice.currency}
                  </span>
                  <span className="text-xl font-bold">
                    {discounted.toFixed(2)} {denimPrice.currency}
                  </span>
                  <span className="text-green-600 text-sm">(Save 10%)</span>
                </div>
              );
            })()}
          </div>
          <div className="mt-6">
            <AddToCartButton
              lines={[
                { merchandiseId: selectedDenimVariantId, quantity: 1 },
                { merchandiseId: selectedPoloVariantId, quantity: 1 },
              ]}
              onClick={() => open('cart')}
            >
              <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
                Add Bundle to Cart
              </span>
            </AddToCartButton>
          </div>
        </div>

        {/* 3. 2 Polos Bundle */}
        <div className="mb-4 border border-gray-200 p-6">
          <h2 className="text-2xl font-medium text-black mb-2">
            2 Polos Bundle – 10% Off!
          </h2>
          <p className="mb-6 text-gray-700">
            Pick any 2 polos (choose color and size for each) and get 10% off.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1].map((idx) => (
              <ProductBundleCard
                key={idx}
                products={[selectedPolo1, selectedPolo2, ...polos]}
                initialProduct={idx === 0 ? selectedPolo1 : selectedPolo2}
                title={`Choose Polo ${idx + 1}`}
                onChange={(product, color, size) => {
                  if (idx === 0) {
                    setSelectedPolo1(product);
                    setSelectedPolo1VariantId(
                      getVariantIdFromOptions(product, color, size)
                    );
                  } else {
                    setSelectedPolo2(product);
                    setSelectedPolo2VariantId(
                      getVariantIdFromOptions(product, color, size)
                    );
                  }
                }}
                initialColor={getFirstColor(idx === 0 ? selectedPolo1 : selectedPolo2)}
                initialSize={getFirstSize(idx === 0 ? selectedPolo1 : selectedPolo2)}
              />
            ))}
          </div>
          {/* Price calculation */}
          <div className="mt-6 text-center">
            {(() => {
              const v1 = getVariant(selectedPolo1, getFirstColor(selectedPolo1), getFirstSize(selectedPolo1));
              const v2 = getVariant(selectedPolo2, getFirstColor(selectedPolo2), getFirstSize(selectedPolo2));
              const p1 = getPriceInfo(v1);
              const p2 = getPriceInfo(v2);
              const original = (p1.price || 0) + (p2.price || 0);
              const discounted = original * 0.9;
              return (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-gray-500 line-through">
                    {original.toFixed(2)} {p1.currency}
                  </span>
                  <span className="text-xl font-bold">
                    {discounted.toFixed(2)} {p1.currency}
                  </span>
                  <span className="text-green-600 text-sm">(Save 10%)</span>
                </div>
              );
            })()}
          </div>
          <div className="mt-6">
            <AddToCartButton
              lines={[
                { merchandiseId: selectedPolo1VariantId, quantity: 1 },
                { merchandiseId: selectedPolo2VariantId, quantity: 1 },
              ]}
              onClick={() => open('cart')}
            >
              <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
                Add Bundle to Cart
              </span>
            </AddToCartButton>
          </div>
        </div>

        {/* 4. 3 Tops Bundle (Cocktails baby tee) */}
        <div className="mb-4 border border-gray-200 p-6">
          <h2 className="text-2xl font-medium text-black mb-2">
            3 Tops Bundle – 15% Off!
          </h2>
          <p className="mb-6 text-gray-700">
            Pick any 3 tops (choose color and size for each) and get 15% off.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((idx) => (
              <ProductBundleCard
                key={idx}
                products={[cocktailsBabyTee]}
                initialProduct={cocktailsBabyTee}
                title={`Top ${idx + 1}`}
                onChange={(product, color, size) => {
                  const newSelections = [...topSelections];
                  newSelections[idx].variantId = getVariantIdFromOptions(product, color, size);
                  setTopSelections(newSelections);
                }}
                initialColor={
                  topSelections[idx]?.variantId
                    ? getVariantById(cocktailsBabyTee, topSelections[idx].variantId)
                      ?.selectedOptions.find((o: any) => o.name.toLowerCase() === 'color')?.value
                    : ''
                }
                initialSize={
                  topSelections[idx]?.variantId
                    ? getVariantById(cocktailsBabyTee, topSelections[idx].variantId)
                      ?.selectedOptions.find((o: any) => o.name.toLowerCase() === 'size')?.value
                    : ''
                }
              />
            ))}
          </div>
          {/* Price calculation */}
          <div className="mt-6 text-center">
            {(() => {
              const prices = topSelections.filter(sel => sel?.variantId).map((sel) =>
                getPriceInfo(getVariantById(cocktailsBabyTee, sel.variantId)),
              );
              const original = prices.reduce(
                (sum, p) => sum + (p.price || 0),
                0,
              );
              const discounted = original * 0.85;
              return (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-gray-500 line-through">
                    {original.toFixed(2)} {prices[0]?.currency}
                  </span>
                  <span className="text-xl font-bold">
                    {discounted.toFixed(2)} {prices[0]?.currency}
                  </span>
                  <span className="text-green-600 text-sm">(Save 15%)</span>
                </div>
              );
            })()}
          </div>
          <div className="mt-6">
            <AddToCartButton
              lines={topSelections.filter(sel => sel?.variantId).map((sel) => ({
                merchandiseId: sel.variantId,
                quantity: 1,
              }))}
              onClick={() => open('cart')}
              discountCode="3TOPS15"
            >
              <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
                Add Bundle to Cart
              </span>
            </AddToCartButton>
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            Discount applied automatically with code 3TOPS15.
          </div>
        </div>

        {/* 5. 3 Polos Bundle */}
        <div className="mb-4 border border-gray-200 p-6">
          <h2 className="text-2xl font-medium text-black mb-2">
            3 Polos Bundle – 15% Off!
          </h2>
          <p className="mb-6 text-gray-700">
            Pick any 3 polos (choose color and size for each) and get 15% off.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((idx) => (
              <ProductBundleCard
                key={idx}
                products={[selectedPolos[idx], ...polos]}
                initialProduct={selectedPolos[idx]}
                title={`Polo ${idx + 1}`}
                onChange={(product, color, size) => {
                  const newPolos = [...selectedPolos];
                  const newVariants = [...selectedPolosVariantIds];
                  newPolos[idx] = product;
                  newVariants[idx] = getVariantIdFromOptions(product, color, size);
                  setSelectedPolos(newPolos);
                  setSelectedPolosVariantIds(newVariants);
                }}
                initialColor={getFirstColor(selectedPolos[idx])}
                initialSize={getFirstSize(selectedPolos[idx])}
              />
            ))}
          </div>
          {/* Price calculation */}
          <div className="mt-6 text-center">
            {(() => {
              const prices = selectedPolosVariantIds.map((variantId, idx) =>
                getPriceInfo(getVariantById(selectedPolos[idx], variantId)),
              );
              const original = prices.reduce(
                (sum, p) => sum + (p.price || 0),
                0,
              );
              const discounted = original * 0.85;
              return (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-gray-500 line-through">
                    {original.toFixed(2)} {prices[0]?.currency}
                  </span>
                  <span className="text-xl font-bold">
                    {discounted.toFixed(2)} {prices[0]?.currency}
                  </span>
                  <span className="text-green-600 text-sm">(Save 15%)</span>
                </div>
              );
            })()}
          </div>
          <div className="mt-6">
            <AddToCartButton
              lines={selectedPolosVariantIds.map((variantId) => ({
                merchandiseId: variantId,
                quantity: 1,
              }))}
              onClick={() => open('cart')}
            >
              <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
                Add Bundle to Cart
              </span>
            </AddToCartButton>
          </div>
        </div>

        {/* 6. 2 Tops Bundle */}
        <div className="mb-4 border border-gray-200 p-6">
          <h2 className="text-2xl font-medium text-black mb-2">
            2 Tops Bundle – 10% Off!
          </h2>
          <p className="mb-6 text-gray-700">
            Pick any 2 tops (choose color and size for each) and get 10% off.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1].map((idx) => (
              <ProductBundleCard
                key={idx}
                products={[cocktailsBabyTee]}
                initialProduct={cocktailsBabyTee}
                title={`Top ${idx + 1}`}
                onChange={(product, color, size) => {
                  const newSelections = [...topSelections2];
                  newSelections[idx].variantId = getVariantIdFromOptions(product, color, size);
                  setTopSelections2(newSelections);
                }}
                initialColor={
                  topSelections2[idx].variantId
                    ? getVariantById(cocktailsBabyTee, topSelections2[idx].variantId)
                      ?.selectedOptions.find((o: any) => o.name.toLowerCase() === 'color')?.value
                    : ''
                }
                initialSize={
                  topSelections2[idx].variantId
                    ? getVariantById(cocktailsBabyTee, topSelections2[idx].variantId)
                      ?.selectedOptions.find((o: any) => o.name.toLowerCase() === 'size')?.value
                    : ''
                }
              />
            ))}
          </div>
          {/* Price calculation */}
          <div className="mt-6 text-center">
            {(() => {
              const prices = topSelections2.filter(sel => sel?.variantId).map((sel) =>
                getPriceInfo(getVariantById(cocktailsBabyTee, sel.variantId)),
              );
              const original = prices.reduce(
                (sum, p) => sum + (p.price || 0),
                0,
              );
              const discounted = original * 0.9;
              return (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-gray-500 line-through">
                    {original.toFixed(2)} {prices[0]?.currency}
                  </span>
                  <span className="text-xl font-bold">
                    {discounted.toFixed(2)} {prices[0]?.currency}
                  </span>
                  <span className="text-green-600 text-sm">(Save 10%)</span>
                </div>
              );
            })()}
          </div>
          <div className="mt-6">
            <AddToCartButton
              lines={topSelections2.filter(sel => sel?.variantId).map((sel) => ({
                merchandiseId: sel.variantId,
                quantity: 1,
              }))}
              onClick={() => open('cart')}
              discountCode="2TOPS10"
            >
              <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
                Add Bundle to Cart
              </span>
            </AddToCartButton>
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            Discount applied automatically with code 2TOPS10.
          </div>
        </div>

        {/* 7. 4 Tops + 1 Cap Bundle */}
        {caps.length > 0 && tops.length > 0 && (
          <TopsCapBundleCard
            product={tops[0] || caps[0]}
            productOptions={[]}
            upsell={{
              title: 'Buy 4 Tops Get 1 Cap Free!',
              description: 'Choose 4 tops and get a cap of your choice absolutely free.',
              discountCode: '4TOPSFREECAP',
              minTopsQuantity: 4,
              freeCapsQuantity: 1,
            }}
          />
        )}
      </div>
    </div>
  );
}