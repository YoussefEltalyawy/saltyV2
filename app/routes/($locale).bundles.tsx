import { useLoaderData } from 'react-router';
import { createBundleDataService } from '~/lib/bundleDataService';
import { hasFreeSlot, type BundleDefinition } from '~/lib/bundleConfig';
import type { BundleSlotData } from '~/lib/bundleDataService';

import BundlesPageBundleCard from '~/components/BundlesPageBundleCard';
import FreeGiftBundleCard from '~/components/FreeGiftBundleCard';

export async function loader({ context }: any) {
  return createBundleDataService(context.storefront).fetchAllBundleData();
}

export default function BundlesPage() {
  const { bundles, bundleSlots } = useLoaderData<typeof loader>() as {
    bundles: Array<{ key: string; def: BundleDefinition }>;
    bundleSlots: Record<string, BundleSlotData[]>;
  };

  return (
    <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center text-center mb-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-black mb-4">
          Exclusive Bundles
        </h1>
        <div className="w-16 h-1 bg-black mb-6"></div>
        <p className="max-w-2xl text-base text-gray-500 font-medium lowercase tracking-wide">
          unlock premium savings when you curate your perfect salty collection.
          bulk buy and elevate your rotation for less.
        </p>
      </div>

      <div className="flex flex-col gap-24">
        {bundles.map(({ key, def }) => {
          const slots = bundleSlots[key];
          if (!slots?.length) return null;

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
    </main>
  );
}
