import { useState, useEffect } from 'react';
import { useLoaderData } from 'react-router';
import { useAside } from './Aside';
import { AddToCartButton } from './AddToCartButton';

function findVariant(
  product: any,
  selectedOptions: { name: string; value: string }[] | null,
): any {
  if (!product?.variants?.nodes) return null;
  if (!selectedOptions || selectedOptions.length === 0) return product.variants.nodes[0];

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

function TopsCapBundleCard({ product, productOptions, upsell }: {
  product: any;
  productOptions: any[];
  upsell: {
    title: string;
    description: string;
    discountValue: number;
    discountCode?: string;
    minTopsQuantity?: number;
    freeCapsQuantity?: number;
    [key: string]: any;
  };
}) {
  const { title, description, discountCode, minTopsQuantity = 4, freeCapsQuantity = 1 } = upsell;
  const { open } = useAside();
  const loaderData = useLoaderData() as any;
  const productCollections = loaderData?.productCollections;

  const [availableTops, setAvailableTops] = useState<any[]>([]);
  const [availableCaps, setAvailableCaps] = useState<any[]>([]);

  type SelectionType = {
    color: string | null;
    size: string | null;
    variantId?: string;
    image?: string;
    productHandle?: string;
    type: 'top' | 'cap';
  };

  const [topSelections, setTopSelections] = useState<SelectionType[]>([]);
  const [capSelections, setCapSelections] = useState<SelectionType[]>([]);

  useEffect(() => {
    const tops = loaderData?.productCollections?.tops || loaderData?.tops || [];
    setAvailableTops(tops);
    const caps = loaderData?.productCollections?.caps || loaderData?.caps || [];
    setAvailableCaps(caps);
  }, [loaderData]);

  useEffect(() => {
    if (availableTops.length > 0 && topSelections.length === 0) {
      setTopSelections(Array.from({ length: minTopsQuantity }).map(() => {
        const p = availableTops[0];
        const v = p.variants?.nodes?.find((v: any) => v.availableForSale) || p.variants?.nodes?.[0];
        return {
          color: v?.selectedOptions?.find((o: any) => o.name.toLowerCase() === 'color')?.value || '',
          size: v?.selectedOptions?.find((o: any) => o.name.toLowerCase() === 'size')?.value || '',
          productHandle: p.handle,
          variantId: v?.id,
          image: v?.image?.url || p.featuredImage?.url,
          type: 'top',
        };
      }));
    }
    if (availableCaps.length > 0 && capSelections.length === 0) {
      setCapSelections(Array.from({ length: freeCapsQuantity }).map(() => {
        const p = availableCaps[0];
        const v = p.variants?.nodes?.find((v: any) => v.availableForSale) || p.variants?.nodes?.[0];
        return {
          color: v?.selectedOptions?.find((o: any) => o.name.toLowerCase() === 'color')?.value || '',
          size: v?.selectedOptions?.find((o: any) => o.name.toLowerCase() === 'size')?.value || '',
          productHandle: p.handle,
          variantId: v?.id,
          image: v?.image?.url || p.featuredImage?.url,
          type: 'cap',
        };
      }));
    }
  }, [availableTops, availableCaps, minTopsQuantity, freeCapsQuantity]);

  const handleSelectionChange = (idx: number, type: 'top' | 'cap', field: string, val: string) => {
    const list = type === 'top' ? availableTops : availableCaps;
    const selections = type === 'top' ? topSelections : capSelections;
    const set = type === 'top' ? setTopSelections : setCapSelections;

    const newSelections = [...selections];
    const item = { ...newSelections[idx], [field]: val };

    if (field === 'productHandle') {
      const p = list.find(p => p.handle === val);
      const v = p.variants?.nodes?.find((v: any) => v.availableForSale) || p.variants?.nodes?.[0];
      item.color = v?.selectedOptions?.find((o: any) => o.name.toLowerCase() === 'color')?.value || '';
      item.size = v?.selectedOptions?.find((o: any) => o.name.toLowerCase() === 'size')?.value || '';
      item.variantId = v?.id;
      item.image = v?.image?.url || p.featuredImage?.url;
    } else {
      const p = list.find(p => p.handle === item.productHandle);
      const [c, s] = val.split('/');
      item.color = c;
      item.size = s;
      const v = findVariant(p, [{ name: 'Color', value: c }, { name: 'Size', value: s }]);
      item.variantId = v?.id;
      item.image = v?.image?.url || p.featuredImage?.url;
    }

    newSelections[idx] = item;
    set(newSelections);
  };

  const calculateBundlePrice = () => {
    let total = 0;
    topSelections.forEach(s => {
      const p = availableTops.find(t => t.handle === s.productHandle);
      const v = p?.variants?.nodes?.find((v: any) => v.id === s.variantId);
      total += parseFloat(v?.price?.amount || '0');
    });
    let capValue = 0;
    capSelections.forEach(s => {
      const p = availableCaps.find(c => c.handle === s.productHandle);
      const v = p?.variants?.nodes?.find((v: any) => v.id === s.variantId);
      capValue += parseFloat(v?.price?.amount || '0');
    });
    return {
      original: total + capValue,
      discounted: total,
      currency: availableTops[0]?.variants?.nodes?.[0]?.price?.currencyCode || 'EGP',
    };
  };

  const bundlePrice = calculateBundlePrice();
  const allSelections = [...topSelections, ...capSelections];
  const lines = allSelections.map(s => ({ merchandiseId: s.variantId!, quantity: 1 })).filter(l => l.merchandiseId);
  const isReady = lines.length === (minTopsQuantity + freeCapsQuantity);

  return (
    <div className="mb-12">
      <div className="flex flex-col mb-8 text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black mb-2 uppercase">{title}</h2>
        <p className="text-sm text-gray-500 max-w-xl">{description}</p>
      </div>

      <div className="mb-12">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-black mb-6 border-b border-gray-100 pb-2 flex justify-between">
          <span>Choose {minTopsQuantity} Tops</span>
          <span className="text-gray-400 font-medium italic">Essential base</span>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {topSelections.map((sel, idx) => (
            <div key={idx} className="flex flex-col">
              <select
                className="w-full bg-white border border-black text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 mb-2 appearance-none cursor-pointer"
                style={{ WebkitAppearance: 'none' }}
                value={sel.productHandle}
                onChange={(e) => handleSelectionChange(idx, 'top', 'productHandle', e.target.value)}
              >
                {availableTops.map(p => <option key={p.handle} value={p.handle}>{p.title}</option>)}
              </select>
              <div className="w-full bg-[#f5f3f0] overflow-hidden" style={{ aspectRatio: '3/4' }}>
                <img src={sel.image} alt="top" className="w-full h-full object-cover" />
              </div>
              <div className="mt-2">
                <select
                  className="w-full bg-white border border-gray-200 text-[10px] tracking-wide px-2 py-1.5 focus:outline-none appearance-none cursor-pointer"
                  style={{ WebkitAppearance: 'none' }}
                  value={`${sel.color}/${sel.size}`}
                  onChange={(e) => handleSelectionChange(idx, 'top', 'variant', e.target.value)}
                >
                  {availableTops.find(p => p.handle === sel.productHandle)?.variants?.nodes?.map((v: any) => {
                    const c = v.selectedOptions.find((o: any) => o.name.toLowerCase() === 'color')?.value;
                    const s = v.selectedOptions.find((o: any) => o.name.toLowerCase() === 'size')?.value;
                    return <option key={v.id} value={`${c}/${s}`} disabled={!v.availableForSale}>{c} / {s} {!v.availableForSale ? ' — OOS' : ''}</option>;
                  })}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-12">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-black mb-6 border-b border-gray-100 pb-2 flex justify-between">
          <span>Choose {freeCapsQuantity} Free Cap</span>
          <span className="text-green-600 font-medium italic">Unlocked!</span>
        </p>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-xl">
          {capSelections.map((sel, idx) => (
            <div key={idx} className="flex flex-col">
              <select
                className="w-full bg-white border border-black text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 mb-2 appearance-none cursor-pointer"
                style={{ WebkitAppearance: 'none' }}
                value={sel.productHandle}
                onChange={(e) => handleSelectionChange(idx, 'cap', 'productHandle', e.target.value)}
              >
                {availableCaps.map(p => <option key={p.handle} value={p.handle}>{p.title}</option>)}
              </select>
              <div className="w-full bg-[#f5f3f0] overflow-hidden" style={{ aspectRatio: '3/4' }}>
                <img src={sel.image} alt="cap" className="w-full h-full object-cover" />
              </div>
              <div className="mt-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest px-2 py-1.5 border border-gray-100 bg-gray-50/50">
                  {sel.color} / {sel.size}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing & CTA */}
      <div className="mt-12 pt-8 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-1">Bundle Total</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-black">{bundlePrice.discounted.toLocaleString()} {bundlePrice.currency}</span>
              <span className="text-sm text-gray-400 line-through">{bundlePrice.original.toLocaleString()} {bundlePrice.currency}</span>
              <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 tracking-tighter">-{upsell.discountValue || 20}%</span>
            </div>
          </div>
          <div className="w-full sm:w-[300px]">
            <AddToCartButton lines={lines} disabled={!isReady} onClick={() => open('cart')} discountCode={discountCode}>
              <span className="block w-full text-center py-4 px-8 text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 bg-black text-white hover:bg-zinc-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed">
                {isReady ? 'Add Collection to Cart' : 'Select all options'}
              </span>
            </AddToCartButton>
            <p className="text-[9px] text-gray-400 mt-2 text-center uppercase tracking-widest font-medium">
              {discountCode ? `Discount code ${discountCode} applied` : 'Discount auto-applied at checkout'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopsCapBundleCard;
