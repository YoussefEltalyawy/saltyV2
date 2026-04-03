import { useState, useEffect } from 'react';
import { useAside } from './Aside';
import { AddToCartButton } from './AddToCartButton';
import { getSlotLabel, BUNDLE_COLLECTIONS, type BundleDefinition } from '~/lib/bundleConfig';

// ─── Variant helpers (local, no import needed) ────────────────────────────────
function findVariantByOptions(product: any, color: string, size: string): any {
  return product?.variants?.nodes?.find((v: any) =>
    v.selectedOptions.some((o: any) => o.name.toLowerCase() === 'color' && o.value === color) &&
    v.selectedOptions.some((o: any) => o.name.toLowerCase() === 'size' && o.value === size),
  );
}

function getFirstAvailableVariant(product: any) {
  return product?.variants?.nodes?.find((v: any) => v.availableForSale) ?? product?.variants?.nodes?.[0] ?? null;
}

function getOptionValue(variant: any, optionName: string): string {
  return variant?.selectedOptions?.find((o: any) => o.name.toLowerCase() === optionName)?.value ?? '';
}

// ─── Types ────────────────────────────────────────────────────────────────────
type SlotSelection = {
  productHandle: string;
  color: string;
  size: string;
  variantId?: string;
  image?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────
interface BundleUpsellCardProps {
  product: any;           // The current page product (used as context)
  productOptions: any[];  // Product options from the PDP
  upsell: BundleDefinition & { key?: string };
  /** The pool of products the customer can pick from for each slot */
  poolProducts: any[];
}

export default function BundleUpsellCard({
  product,
  productOptions,
  upsell,
  poolProducts,
}: BundleUpsellCardProps) {
  const { minQuantity = 1, title, description, discountValue = 10, discountCode, collectionRestriction } = upsell;
  const { open } = useAside();
  const [error, setError] = useState('');

  // ── Initialise slot selections ─────────────────────────────────────────────
  function buildInitialSelection(product: any, handle: string): SlotSelection {
    const v = getFirstAvailableVariant(product);
    return {
      productHandle: handle,
      color: getOptionValue(v, 'color'),
      size: getOptionValue(v, 'size'),
      variantId: v?.id,
      image: v?.image?.url ?? product?.featuredImage?.url,
    };
  }

  // Use poolProducts for the picker; if pool is empty fall back to current product
  const pickerProducts = poolProducts.length > 0 ? poolProducts : [product];

  const [selections, setSelections] = useState<SlotSelection[]>(() =>
    Array.from({ length: minQuantity }, () =>
      buildInitialSelection(pickerProducts[0], pickerProducts[0]?.handle ?? ''),
    ),
  );

  // Re-initialise when poolProducts load asynchronously
  useEffect(() => {
    if (pickerProducts.length === 0) return;
    setSelections(
      Array.from({ length: minQuantity }, () =>
        buildInitialSelection(pickerProducts[0], pickerProducts[0]?.handle ?? ''),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolProducts.length, minQuantity]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleProductChange(slotIdx: number, handle: string) {
    const prod = pickerProducts.find((p) => p.handle === handle);
    if (!prod) return;
    const newSel = [...selections];
    newSel[slotIdx] = buildInitialSelection(prod, handle);
    setSelections(newSel);
  }

  function handleVariantDropdownChange(slotIdx: number, value: string) {
    if (!value) return;
    const [color, size] = value.split('/');
    if (!color || !size) return;

    const prod = pickerProducts.find((p) => p.handle === selections[slotIdx].productHandle);
    const variant = prod ? findVariantByOptions(prod, color, size) : undefined;

    const newSel = [...selections];
    newSel[slotIdx] = {
      ...newSel[slotIdx],
      color,
      size,
      variantId: variant?.id,
      image: variant?.image?.url ?? prod?.featuredImage?.url,
    };
    setSelections(newSel);
  }

  // ── Pricing ────────────────────────────────────────────────────────────────
  function calcPrice() {
    let total = 0;
    let currency = 'USD';

    for (const sel of selections) {
      if (!sel.variantId) continue;
      const prod = pickerProducts.find((p) => p.handle === sel.productHandle);
      const variant = prod?.variants?.nodes?.find((v: any) => v.id === sel.variantId);
      if (variant?.price?.amount) {
        total += parseFloat(variant.price.amount);
        currency = variant.price.currencyCode ?? currency;
      }
    }

    return {
      original: total,
      discounted: total * (1 - discountValue / 100),
      currency,
    };
  }

  const price = calcPrice();
  const cartLines = selections
    .filter((s) => s.variantId)
    .map((s) => ({ merchandiseId: s.variantId!, quantity: 1 }));

  const isReady = cartLines.length === minQuantity;

  function handleAddToCart() {
    if (!isReady) {
      setError(`Please select color and size for all ${minQuantity} items.`);
      return false;
    }
    setError('');
    open('cart');
    return true;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const gridClass = minQuantity === 2 ? 'grid-cols-2' : minQuantity === 3 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <div className="mb-4 border border-gray-200 p-6">
      <h2 className="text-2xl font-medium text-black mb-2">{title}</h2>
      <p className="mb-6 text-gray-700">{description}</p>

      <div className={`grid ${gridClass} gap-4`}>
        {selections.map((sel, idx) => {
          // Build variant option list for the current product in this slot
          const prod = pickerProducts.find((p) => p.handle === sel.productHandle) ?? pickerProducts[0];
          const variantOptions = prod?.variants?.nodes?.map((v: any) => {
            const c = getOptionValue(v, 'color');
            const s = getOptionValue(v, 'size');
            if (!c && !s) return null;
            return { value: `${c}/${s}`, label: `${c}/${s}`, available: v.availableForSale };
          }).filter(Boolean) ?? [];

          return (
            <div key={idx} className="flex flex-col border border-gray-100 p-3">
              {/* Product picker dropdown (when multiple products in pool) */}
              {pickerProducts.length > 1 && (
                <select
                  className="border border-gray-300 rounded px-2 py-1 mb-3 text-sm"
                  value={sel.productHandle}
                  onChange={(e) => handleProductChange(idx, e.target.value)}
                >
                  {pickerProducts.map((p) => (
                    <option key={p.handle} value={p.handle}>{p.title}</option>
                  ))}
                </select>
              )}

              {/* Image */}
              <div className="w-full aspect-square mb-3 bg-gray-100 max-h-48">
                {sel.image
                  ? <img src={sel.image} alt="Selected variant" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-400 text-xs">Select options</span>
                    </div>
                }
              </div>

              {/* Variant dropdown */}
              <div className="product-options mb-3">
                <h5 className="text-xs font-medium text-gray-900 mb-2">
                  {getSlotLabel(upsell, idx, minQuantity)}
                </h5>
                <select
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  value={`${sel.color}/${sel.size}`}
                  onChange={(e) => handleVariantDropdownChange(idx, e.target.value)}
                >
                  <option value="">Choose color/size…</option>
                  {variantOptions.map((opt: any) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      disabled={!opt.available}
                      style={{ color: opt.available ? '#000' : '#9CA3AF' }}
                    >
                      {opt.label}{!opt.available ? ' (Out of Stock)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pricing */}
      <div className="mt-6 text-center">
        <div className="text-lg font-medium">Bundle Price:</div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-gray-500 line-through">
            {price.original.toFixed(2)} {price.currency}
          </span>
          <span className="text-xl font-bold">
            {price.discounted.toFixed(2)} {price.currency}
          </span>
          <span className="text-green-600 text-sm">(Save {discountValue}%)</span>
        </div>
      </div>

      {error && <div className="text-red-600 mt-4 text-sm text-center">{error}</div>}

      <div className="mt-6">
        <AddToCartButton
          disabled={!isReady}
          lines={cartLines}
          onClick={handleAddToCart}
          discountCode={discountCode}
        >
          <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
            Add Bundle to Cart
          </span>
        </AddToCartButton>
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">
        {discountCode
          ? `Discount applied automatically with code ${discountCode}.`
          : 'Discount applied automatically at checkout.'}
      </div>
    </div>
  );
}
