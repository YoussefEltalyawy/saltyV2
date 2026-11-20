import { hasFreeSlot, type BundleDefinition } from '~/lib/bundleConfig';
import type { BundleSlotData } from '~/lib/bundleDataService';
import BundlesPageBundleCard from './BundlesPageBundleCard';
import FreeGiftBundleCard from './FreeGiftBundleCard';

interface UpsellSectionProps {
  /** Bundle keys resolved for this product by the server. */
  upsells: string[];
  /** All active bundle definitions, keyed by bundle key. */
  definitions: Record<string, BundleDefinition>;
  /** Resolved picker pools, keyed by bundle key. */
  slotsByKey: Record<string, BundleSlotData[]>;
}

/**
 * Renders every bundle that applies to the current product. The server has
 * already resolved the picker pools, so this only maps data to one of two
 * cards: the standard picker card, or the free-gift card.
 */
export default function UpsellSection({
  upsells,
  definitions,
  slotsByKey,
}: UpsellSectionProps) {
  if (!upsells.length) return null;

  return (
    <div className="flex flex-col gap-10">
      {upsells.map((key) => {
        const def = definitions[key];
        const slots = slotsByKey[key];
        if (!def || !slots?.length) return null;

        if (hasFreeSlot(def)) {
          return <FreeGiftBundleCard key={key} def={def} slots={slots} />;
        }

        return (
          <BundlesPageBundleCard
            key={key}
            def={def}
            slots={slots.map((slot) => ({
              id: slot.id,
              title: slot.label,
              products: slot.products,
            }))}
          />
        );
      })}
    </div>
  );
}
