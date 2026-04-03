import { useLoaderData } from 'react-router';
import { createBundleDataService } from '~/lib/bundleDataService';
import {
  BUNDLE_TYPES,
  BUNDLE_COLLECTIONS,
  getAllEnabledBundles,
  getSlotLabel,
} from '~/lib/bundleConfig';

import BundlesPageBundleCard from '~/components/BundlesPageBundleCard';
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

  const enabledBundles = getAllEnabledBundles();

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Shop Bundles</h1>

      <div className="flex flex-col gap-10">
        {enabledBundles.map(({ key, def }) => {

          // ── MIXED (Zip Up / Hoodie + Sweatpants) ───────────────────────────
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

          // ── BUNDLE (same-collection multi-picker: polos / tops / collection) ─
          if (def.type === BUNDLE_TYPES.BUNDLE) {
            let pool: any[] = [];

            if (def.collectionRestriction === BUNDLE_COLLECTIONS.POLO) pool = polos;
            else if (def.collectionRestriction === BUNDLE_COLLECTIONS.TOPS) pool = tops;
            else if (def.collectionId) {
              pool = (collectionBundle3Products as any)?.products?.nodes ?? [];
            }

            if (!pool.length) return null;

            const minQty = def.minQuantity ?? 2;

            // Each slot picks from the same pool — use BundlesPageBundleCard
            // which gives every slot its own independent ProductBundleCard
            const slots = Array.from({ length: minQty }, (_, i) => ({
              title: getSlotLabel(def, i, minQty),
              products: pool,
            }));

            return (
              <BundlesPageBundleCard
                key={key}
                def={def}
                slots={slots}
              />
            );
          }

          // ── CROSS_SELL (Denim + Polo) ───────────────────────────────────────
          if (def.type === BUNDLE_TYPES.CROSS_SELL) {
            if (!denims.length || !polos.length) return null;

            // Two slots: one picks from denims, one picks from polos
            const slots = [
              { title: getSlotLabel(def, 0, 2) || 'Choose Denim', products: denims },
              { title: getSlotLabel(def, 1, 2) || 'Choose Polo',  products: polos  },
            ];

            return (
              <BundlesPageBundleCard
                key={key}
                def={def}
                slots={slots}
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