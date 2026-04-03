import { useLoaderData } from 'react-router';
import {
  BUNDLE_DEFINITIONS,
  BUNDLE_TYPES,
  getBundleDefinition,
  getProductUpsells,
  BUNDLE_COLLECTIONS,
} from '~/lib/bundleConfig';
import BundleUpsellCard from './BundleUpsellCard';
import CrossSellUpsellCard from './CrossSellUpsellCard';
import LinenCrossSellCard from './LinenCrossSellCard';
import TopsCapBundleCard from './TopsCapBundleCard';
import MixedBundleCard from './MixedBundleCard';

interface UpsellSectionProps {
  product: any;
  productOptions: any[];
  upsells: string[];  // Array of bundle definition keys
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

        // ── MIXED: zip-up/hoodie style bundles ──────────────────────────────
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

        // ── BUNDLE: polo / tops same-collection multi-picker ─────────────────
        if (def.type === BUNDLE_TYPES.BUNDLE) {
          // Determine product pool from collectionRestriction or collectionId
          let poolProducts: any[] = [];
          if (def.collectionRestriction === BUNDLE_COLLECTIONS.POLO) {
            poolProducts = productCollections?.polos ?? [];
          } else if (def.collectionRestriction === BUNDLE_COLLECTIONS.TOPS) {
            poolProducts = productCollections?.tops ?? [];
          } else if (def.collectionId) {
            poolProducts = productCollections?.collectionBundle3Products?.products?.nodes ?? [];
          }

          if (!poolProducts.length) return null;

          return (
            <BundleUpsellCard
              key={key}
              product={product}
              productOptions={productOptions}
              upsell={{ ...def, key }}
              poolProducts={poolProducts}
            />
          );
        }

        // ── CROSS_SELL: denim ↔ polo ─────────────────────────────────────────
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