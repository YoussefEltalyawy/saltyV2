import { useLoaderData } from 'react-router';
import {
  BUNDLE_TYPES,
  getBundleDefinition,
  BUNDLE_COLLECTIONS,
  getSlotLabel,
} from '~/lib/bundleConfig';
import BundlesPageBundleCard from './BundlesPageBundleCard';
import CrossSellUpsellCard from './CrossSellUpsellCard';
import LinenCrossSellCard from './LinenCrossSellCard';
import TopsCapBundleCard from './TopsCapBundleCard';
import MixedBundleCard from './MixedBundleCard';

interface UpsellSectionProps {
  product: any;
  productOptions: any[];
  upsells: string[]; // bundle definition keys
}

export default function UpsellSection({ product, productOptions, upsells }: UpsellSectionProps) {
  const loaderData = useLoaderData() as any;
  const productCollections = loaderData?.productCollections;

  if (!upsells.length) return null;

  return (
    <div className="flex flex-col gap-10">
      {upsells.map((key) => {
        const def = getBundleDefinition(key);
        if (!def || !def.enabled) return null;

        // ── MIXED ────────────────────────────────────────────────────────────
        if (def.type === BUNDLE_TYPES.MIXED) {
          const bundleData = productCollections?.mixedBundleProductMap?.[key];
          if (!bundleData) return null;
          const [slot1Products, slot2Products] = bundleData.slotProducts;
          if (!slot1Products?.length || !slot2Products?.length) return null;

          return (
            <MixedBundleCard
              key={key}
              def={def}
              slot1Products={slot1Products}
              slot2Products={slot2Products}
            />
          );
        }

        // ── BUNDLE (polo / tops / collection) — per-slot product picker ──────
        if (def.type === BUNDLE_TYPES.BUNDLE) {
          let pool: any[] = [];
          if (def.collectionRestriction === BUNDLE_COLLECTIONS.POLO) {
            pool = productCollections?.polos ?? [];
          } else if (def.collectionRestriction === BUNDLE_COLLECTIONS.TOPS) {
            pool = productCollections?.tops ?? [];
          } else if (def.collectionId) {
            pool = productCollections?.collectionBundle3Products?.products?.nodes ?? [];
          }

          if (!pool.length) return null;

          const minQty = def.minQuantity ?? 2;

          // Pre-select the current product page product in slot 1 (if it's in the pool).
          // We re-order the pool so the current product is first for slot 1,
          // meaning ProductBundleCard will initialise to it automatically.
          const currentInPool = pool.find((p: any) => p.handle === product?.handle);

          const slots = Array.from({ length: minQty }, (_, i) => {
            if (i === 0 && currentInPool) {
              // Slot 1: current product first, rest of pool after
              return {
                title: getSlotLabel(def, i, minQty),
                products: [currentInPool, ...pool.filter((p: any) => p.handle !== currentInPool.handle)],
              };
            }
            return { title: getSlotLabel(def, i, minQty), products: pool };
          });

          return <BundlesPageBundleCard key={key} def={def} slots={slots} />;
        }

        // ── CROSS_SELL ───────────────────────────────────────────────────────
        if (def.type === BUNDLE_TYPES.CROSS_SELL) {
          const complementaryProducts = productCollections?.complementaryProducts ?? [];
          if (!complementaryProducts.length) return null;

          return (
            <CrossSellUpsellCard
              key={key}
              currentProduct={product}
              complementaryProducts={complementaryProducts}
              upsell={def}
            />
          );
        }

        // ── LINEN_CROSS_SELL ─────────────────────────────────────────────────
        if (def.type === BUNDLE_TYPES.LINEN_CROSS_SELL) {
          return (
            <LinenCrossSellCard
              key={key}
              currentProduct={product}
              upsell={def}
            />
          );
        }

        // ── TOPS_CAP ─────────────────────────────────────────────────────────
        if (def.type === BUNDLE_TYPES.TOPS_CAP) {
          return (
            <TopsCapBundleCard
              key={key}
              product={product}
              productOptions={productOptions}
              upsell={def}
            />
          );
        }

        return null;
      })}
    </div>
  );
}