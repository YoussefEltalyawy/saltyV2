import { useLoaderData } from 'react-router';
import { useAside } from '~/components/Aside';
import { createBundleDataService } from '~/lib/bundleDataService';
import {
  BUNDLE_DEFINITIONS,
  BUNDLE_TYPES,
  BUNDLE_COLLECTIONS,
  getAllEnabledBundles,
} from '~/lib/bundleConfig';

import BundleUpsellCard from '~/components/BundleUpsellCard';
import CrossSellUpsellCard from '~/components/CrossSellUpsellCard';
import LinenCrossSellCard from '~/components/LinenCrossSellCard';
import TopsCapBundleCard from '~/components/TopsCapBundleCard';
import MixedBundleCard from '~/components/MixedBundleCard';

// ─── Loader ───────────────────────────────────────────────────────────────────
export async function loader({ context }: any) {
  const { storefront } = context;
  const dataService = createBundleDataService(storefront);
  return dataService.fetchAllBundleData();
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BundlesPage() {
  const {
    polos,
    denims,
    caps,
    tops,
    linenShirt,
    linenPants,
    mixedBundleProductMap,
    collectionBundle3Products,
  } = useLoaderData<typeof loader>();

  // Map bundle keys → the products that feed their slot pickers
  function getPoolProducts(key: string, def: (typeof BUNDLE_DEFINITIONS)[string]): any[] {
    if (def.type === BUNDLE_TYPES.BUNDLE) {
      if (def.collectionRestriction === BUNDLE_COLLECTIONS.POLO) return polos;
      if (def.collectionRestriction === BUNDLE_COLLECTIONS.TOPS) return tops;
      if (def.collectionId) return collectionBundle3Products?.products?.nodes ?? [];
    }
    if (def.type === BUNDLE_TYPES.CROSS_SELL) return [...denims, ...polos];
    if (def.type === BUNDLE_TYPES.LINEN_CROSS_SELL) return [linenShirt, linenPants].filter(Boolean);
    if (def.type === BUNDLE_TYPES.TOPS_CAP) return [...tops, ...caps];
    if (def.type === BUNDLE_TYPES.MIXED) {
      const data = (mixedBundleProductMap as any)?.[key];
      return data ? [...(data.slotProducts[0] ?? []), ...(data.slotProducts[1] ?? [])] : [];
    }
    return [];
  }

  const enabledBundles = getAllEnabledBundles();

  // Linen cross-sell needs both products to exist
  const fakeLinenProduct = linenShirt; // used as a "currentProduct" placeholder on bundles page

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Shop Bundles</h1>

      <div className="flex flex-col gap-10">
        {enabledBundles.map(({ key, def }) => {
          // ── MIXED ──────────────────────────────────────────────────────────
          if (def.type === BUNDLE_TYPES.MIXED) {
            const data = (mixedBundleProductMap as any)?.[key];
            if (!data) return null;
            const [slot1, slot2] = data.slotProducts;
            if (!slot1?.length || !slot2?.length) return null;

            return (
              <MixedBundleCard
                key={key}
                def={def}
                slot1Products={slot1}
                slot2Products={slot2}
              />
            );
          }

          // ── BUNDLE ─────────────────────────────────────────────────────────
          if (def.type === BUNDLE_TYPES.BUNDLE) {
            let pool: any[] = [];
            if (def.collectionRestriction === BUNDLE_COLLECTIONS.POLO) pool = polos;
            else if (def.collectionRestriction === BUNDLE_COLLECTIONS.TOPS) pool = tops;
            else if (def.collectionId) pool = collectionBundle3Products?.products?.nodes ?? [];

            if (!pool.length) return null;

            // Use first pool product as a placeholder "current product" for the card
            return (
              <BundleUpsellCard
                key={key}
                product={pool[0]}
                productOptions={[]}
                upsell={{ ...def, key }}
                poolProducts={pool}
              />
            );
          }

          // ── CROSS_SELL ─────────────────────────────────────────────────────
          if (def.type === BUNDLE_TYPES.CROSS_SELL) {
            if (!denims.length || !polos.length) return null;

            return (
              <CrossSellUpsellCard
                key={key}
                currentProduct={denims[0]}
                complementaryProducts={polos}
                upsell={def}
              />
            );
          }

          // ── LINEN_CROSS_SELL ───────────────────────────────────────────────
          if (def.type === BUNDLE_TYPES.LINEN_CROSS_SELL) {
            if (!linenShirt || !linenPants) return null;

            return (
              <LinenCrossSellCard
                key={key}
                currentProduct={linenShirt}
                upsell={def}
              />
            );
          }

          // ── TOPS_CAP ───────────────────────────────────────────────────────
          if (def.type === BUNDLE_TYPES.TOPS_CAP) {
            if (!tops.length || !caps.length) return null;

            return (
              <TopsCapBundleCard
                key={key}
                product={tops[0]}
                productOptions={[]}
                upsell={def}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}