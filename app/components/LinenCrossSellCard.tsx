import { useState, useEffect } from 'react';
import { useLoaderData } from 'react-router';
import { useAside } from './Aside';
import { AddToCartButton } from './AddToCartButton';

function findVariant(
  product: any,
  selectedOptions: { name: string; value: string }[],
): any {
  return product.variants.nodes.find((variant: any) => {
    return selectedOptions.every(
      ({ name, value }: { name: string; value: string }) => {
        return variant.selectedOptions.some(
          (opt: { name: string; value: string }) =>
            opt.name === name && opt.value === value,
        );
      },
    );
  });
}

function LinenCrossSellCard({
  currentProduct,
  upsell,
}: {
  currentProduct: any;
  upsell: {
    title: string;
    description: string;
    discountValue: number;
    discountCode?: string;
    [key: string]: any;
  };
}) {
  const { open } = useAside();
  const loaderData = useLoaderData() as any;

  const linenShirt = loaderData?.productCollections?.linenShirt || loaderData?.linenShirt;
  const linenPants = loaderData?.productCollections?.linenPants || loaderData?.linenPants;

  const [shirtSelection, setShirtSelection] = useState({ color: '', size: '', variantId: '', image: '' });
  const [pantsSelection, setPantsSelection] = useState({ color: '', size: '', variantId: '', image: '' });

  useEffect(() => {
    [
      { prod: linenShirt, set: setShirtSelection },
      { prod: linenPants, set: setPantsSelection },
    ].forEach(({ prod, set }) => {
      if (prod?.variants?.nodes) {
        const firstAvail = prod.variants.nodes.find((v: any) => v.availableForSale) || prod.variants.nodes[0];
        if (firstAvail) {
          const c = firstAvail.selectedOptions.find((o: any) => o.name.toLowerCase() === 'color')?.value || '';
          const s = firstAvail.selectedOptions.find((o: any) => o.name.toLowerCase() === 'size')?.value || '';
          set({
            color: c,
            size: s,
            variantId: firstAvail.id,
            image: firstAvail.image?.url || prod.featuredImage?.url || '',
          });
        }
      }
    });
  }, [linenShirt, linenPants]);

  const handleSelectionChange = (type: 'shirt' | 'pants', val: string) => {
    const [color, size] = val.split('/');
    const product = type === 'shirt' ? linenShirt : linenPants;
    const set = type === 'shirt' ? setShirtSelection : setPantsSelection;

    const variant = findVariant(product, [
      { name: 'Color', value: color },
      { name: 'Size', value: size },
    ]);

    set({
      color,
      size,
      variantId: variant?.id || '',
      image: variant?.image?.url || product?.featuredImage?.url || '',
    });
  };

  const calculateBundlePrice = () => {
    const sPrice = parseFloat(linenShirt?.variants?.nodes?.find((v: any) => v.id === shirtSelection.variantId)?.price?.amount || '0');
    const pPrice = parseFloat(linenPants?.variants?.nodes?.find((v: any) => v.id === pantsSelection.variantId)?.price?.amount || '0');
    const original = sPrice + pPrice;
    const discounted = original * (1 - upsell.discountValue / 100);
    return {
      original,
      discounted,
      currency: linenShirt?.variants?.nodes?.[0]?.price?.currencyCode || 'EGP',
    };
  };

  const bundlePrice = calculateBundlePrice();
  const lines = [
    { merchandiseId: shirtSelection.variantId, quantity: 1 },
    { merchandiseId: pantsSelection.variantId, quantity: 1 },
  ].filter(l => l.merchandiseId);

  const isReady = lines.length === 2;

  if (!linenShirt || !linenPants) return null;

  return (
    <div className="mb-12">
      <div className="flex flex-col mb-8 text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black mb-2 uppercase">
          {upsell.title}
        </h2>
        <p className="text-sm text-gray-500 max-w-xl">
          {upsell.description}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-6 md:gap-8">
        {[
          { label: 'Linen Shirt', prod: linenShirt, state: shirtSelection, type: 'shirt' as const },
          { label: 'Linen Pants', prod: linenPants, state: pantsSelection, type: 'pants' as const },
        ].map(({ label, prod, state, type }) => (
          <div key={type} className="flex flex-col">
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-gray-400 mb-2">
              {label}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3 truncate">
              {prod.title}
            </p>
            <div className="w-full bg-[#f5f3f0] overflow-hidden" style={{ aspectRatio: '3/4' }}>
              <img
                src={state.image}
                alt={prod.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-3">
              <select
                className="w-full bg-white border border-gray-200 text-xs tracking-wide px-3 py-2.5 focus:outline-none focus:border-black appearance-none cursor-pointer transition-colors"
                style={{ WebkitAppearance: 'none' }}
                value={`${state.color}/${state.size}`}
                onChange={(e) => handleSelectionChange(type, e.target.value)}
              >
                {prod.variants.nodes.map((v: any) => {
                  const c = v.selectedOptions.find((o: any) => o.name.toLowerCase() === 'color')?.value;
                  const s = v.selectedOptions.find((o: any) => o.name.toLowerCase() === 'size')?.value;
                  return (
                    <option key={v.id} value={`${c}/${s}`} disabled={!v.availableForSale}>
                      {c} / {s} {!v.availableForSale ? ' — Sold Out' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing & CTA */}
      <div className="mt-12 pt-8 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-1">
              Bundle Total
            </p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-black">
                {bundlePrice.discounted.toLocaleString()} {bundlePrice.currency}
              </span>
              <span className="text-sm text-gray-400 line-through">
                {bundlePrice.original.toLocaleString()} {bundlePrice.currency}
              </span>
              <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 tracking-tighter">
                -{upsell.discountValue}%
              </span>
            </div>
          </div>

          <div className="w-full sm:w-[300px]">
            <AddToCartButton
              lines={lines}
              disabled={!isReady}
              onClick={() => open('cart')}
              discountCode={upsell.discountCode}
            >
              <span className="block w-full text-center py-4 px-8 text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 bg-black text-white hover:bg-zinc-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed">
                {isReady ? 'Add Linen Bundle to Cart' : 'Select options'}
              </span>
            </AddToCartButton>
            <p className="text-[9px] text-gray-400 mt-2 text-center uppercase tracking-widest font-medium">
              {upsell.discountCode
                ? `Discount code ${upsell.discountCode} applied`
                : 'Discount auto-applied at checkout'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LinenCrossSellCard;