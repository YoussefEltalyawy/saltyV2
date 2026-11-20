import { useEffect, useMemo, useState } from 'react';
import { useAside } from './Aside';
import { AddToCartButton } from './AddToCartButton';
import {
  getDefaultProduct,
  getFirstAvailableVariant,
  getFirstVariant,
  getVariantById,
  hasVariantChoices,
  variantLabel,
} from '~/lib/bundleUtils';
import type { BundleDefinition } from '~/lib/bundleConfig';
import type { BundleSlotData } from '~/lib/bundleDataService';
import { useBundleQuote } from '~/lib/useBundleQuote';

type Selection = {
  handle: string;
  variantId?: string;
  image?: string;
};

function firstSelection(product: any): Selection {
  const available = getFirstAvailableVariant(product);
  const display = available ?? getFirstVariant(product);

  return {
    handle: product?.handle ?? '',
    variantId: available?.id ?? '',
    image: display?.image?.url ?? product?.featuredImage?.url ?? '',
  };
}

function priceOf(slot: BundleSlotData, selection: Selection): number {
  const product = slot.products.find(
    (candidate) => candidate.handle === selection.handle,
  );
  const variant = product?.variants?.nodes?.find(
    (candidate: any) => candidate.id === selection.variantId,
  );
  return Number.parseFloat(variant?.price?.amount ?? '0') || 0;
}

/**
 * Bundle card for "buy N, get M free" bundles. Paid items are charged; free
 * items are shown in their own section and add to the cart at no cost.
 */
export default function FreeGiftBundleCard({
  def,
  slots,
}: {
  def: BundleDefinition;
  slots: BundleSlotData[];
}) {
  const { open } = useAside();

  const signature = useMemo(
    () => slots.map((slot) => slot.products.map((p: any) => p.id).join(',')).join('|'),
    [slots],
  );

  const [selections, setSelections] = useState<Selection[]>(() =>
    slots.map((slot) => firstSelection(getDefaultProduct(slot.products))),
  );

  useEffect(() => {
    setSelections(
      slots.map((slot) => firstSelection(getDefaultProduct(slot.products))),
    );
    // `signature` captures the product pools; `slots` is rebuilt on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const items = slots.map((slot, index) => ({ slot, index }));
  const paidItems = items.filter(({ slot }) => !slot.free);
  const freeItems = items.filter(({ slot }) => slot.free);

  const paidTotal = paidItems.reduce(
    (total, { slot, index }) => total + priceOf(slot, selections[index]),
    0,
  );
  const originalTotal = items.reduce(
    (total, { slot, index }) => total + priceOf(slot, selections[index]),
    0,
  );

  const currency =
    slots[0]?.products[0]?.variants?.nodes?.[0]?.price?.currencyCode ?? 'EGP';

  const lines = selections
    .filter((selection) => selection.variantId)
    .map((selection) => ({ merchandiseId: selection.variantId!, quantity: 1 }));

  const isReady =
    selections.length === slots.length &&
    selections.every((selection) => Boolean(selection.variantId));

  const livePrice = useBundleQuote(lines, def.discountCode, isReady);
  const total = livePrice?.discounted ?? paidTotal;
  const was = livePrice?.original ?? originalTotal;
  const displayedCurrency = livePrice?.currency ?? currency;

  const updateProduct = (index: number, handle: string) => {
    const slot = slots[index];
    const product = slot.products.find((candidate) => candidate.handle === handle);
    setSelections((previous) => {
      const next = [...previous];
      next[index] = firstSelection(product);
      return next;
    });
  };

  const updateVariant = (index: number, variantId: string) => {
    setSelections((previous) => {
      const next = [...previous];
      const slot = slots[index];
      const product = slot.products.find(
        (candidate) => candidate.handle === next[index].handle,
      );
      const variant = getVariantById(product, variantId);
      next[index] = {
        ...next[index],
        variantId,
        image: variant?.image?.url ?? product?.featuredImage?.url ?? '',
      };
      return next;
    });
  };

  const renderPicker = ({ slot, index }: { slot: BundleSlotData; index: number }) => {
    const selection = selections[index];
    const product = slot.products.find(
      (candidate) => candidate.handle === selection?.handle,
    );
    const isFree = slot.free;

    return (
      <div key={slot.id} className="flex flex-col">
        <select
          className="w-full bg-white border border-black text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 mb-2 appearance-none cursor-pointer"
          style={{ WebkitAppearance: 'none' }}
          value={selection?.handle ?? ''}
          onChange={(event) => updateProduct(index, event.target.value)}
        >
          {slot.products.map((candidate) => (
            <option key={candidate.handle} value={candidate.handle}>
              {candidate.title}
            </option>
          ))}
        </select>

        <div className="w-full bg-[#f5f3f0] overflow-hidden" style={{ aspectRatio: '3/4' }}>
          <img
            src={selection?.image}
            alt={product?.title ?? ''}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="mt-2">
          {hasVariantChoices(product) ? (
            <select
              className="w-full bg-white border border-gray-200 text-[10px] tracking-wide px-2 py-1.5 focus:outline-none appearance-none cursor-pointer"
              style={{ WebkitAppearance: 'none' }}
              value={selection?.variantId ?? ''}
              onChange={(event) => updateVariant(index, event.target.value)}
            >
              {!selection?.variantId && (
                <option value="">Select an option…</option>
              )}
              {product?.variants?.nodes?.map((variant: any) => (
                <option
                  key={variant.id}
                  value={variant.id}
                  disabled={!variant.availableForSale}
                >
                  {variantLabel(variant)}
                  {variant.availableForSale ? '' : ' — Sold out'}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              {variantLabel(
                getVariantById(product, selection?.variantId) ??
                  getFirstVariant(product),
              )}
            </p>
          )}
          {isFree && (
            <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-green-600">
              Free
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mb-12">
      <div className="flex flex-col mb-8 text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black mb-2 uppercase">
          {def.title}
        </h2>
        <p className="text-sm text-gray-500 max-w-xl">{def.description}</p>
      </div>

      {paidItems.length > 0 && (
        <div className="mb-12">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-black mb-6 border-b border-gray-100 pb-2 flex justify-between">
            <span>Choose {paidItems.length}</span>
            <span className="text-gray-400 font-medium italic">Essential base</span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {paidItems.map(renderPicker)}
          </div>
        </div>
      )}

      {freeItems.length > 0 && (
        <div className="mb-12">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-black mb-6 border-b border-gray-100 pb-2 flex justify-between">
            <span>Choose {freeItems.length} Free</span>
            <span className="text-green-600 font-medium italic">Unlocked!</span>
          </p>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-xl">
            {freeItems.map(renderPicker)}
          </div>
        </div>
      )}

      <div className="mt-12 pt-8 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-1">
              Bundle Total
            </p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-black">
                {total.toLocaleString()} {displayedCurrency}
              </span>
              {was > total && (
                <span className="text-sm text-gray-400 line-through">
                  {was.toLocaleString()} {displayedCurrency}
                </span>
              )}
            </div>
          </div>

          <div className="w-full sm:w-[300px]">
            <AddToCartButton
              lines={lines}
              disabled={!isReady}
              onClick={() => open('cart')}
              discountCode={def.discountCode}
            >
              <span className="block w-full text-center py-4 px-8 text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 bg-black text-white hover:bg-zinc-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed">
                {isReady ? 'Add Bundle to Cart' : 'Select all options'}
              </span>
            </AddToCartButton>
          </div>
        </div>
      </div>
    </div>
  );
}
