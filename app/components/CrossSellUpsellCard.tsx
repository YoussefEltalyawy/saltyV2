import { useState, useEffect } from 'react';
import { useAside } from './Aside';
import { AddToCartButton } from './AddToCartButton';

function CrossSellUpsellCard({ currentProduct, complementaryProducts, upsell }: {
  currentProduct: any;
  complementaryProducts: any[];
  upsell: any;
}) {
  const { title, description, discountValue, discountCode } = upsell;
  const { open } = useAside();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  useEffect(() => {
    if (complementaryProducts.length > 0 && !selectedProduct) {
      const product = complementaryProducts[0];
      setSelectedProduct(product);
      if (product.variants?.nodes?.length > 0) {
        const firstAvailable = product.variants.nodes.find((v: any) => v.availableForSale) || product.variants.nodes[0];
        setSelectedVariant(firstAvailable);
      }
    }
  }, [complementaryProducts, selectedProduct]);

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const product = complementaryProducts.find(p => p.handle === e.target.value);
    if (product) {
      setSelectedProduct(product);
      const firstAvailable = product.variants?.nodes?.find((v: any) => v.availableForSale) || product.variants?.nodes?.[0];
      setSelectedVariant(firstAvailable);
    }
  };

  const handleVariantChange = (val: string) => {
    const [color, size] = val.split('/');
    const variant = selectedProduct.variants.nodes.find((v: any) => {
      return v.selectedOptions.every((opt: any) => {
        if (opt.name.toLowerCase() === 'color') return opt.value === color;
        if (opt.name.toLowerCase() === 'size') return opt.value === size;
        return true;
      });
    });
    if (variant) setSelectedVariant(variant);
  };

  const currentVariant = currentProduct.selectedOrFirstAvailableVariant;
  const lines = [
    { merchandiseId: currentVariant?.id, quantity: 1 },
    { merchandiseId: selectedVariant?.id, quantity: 1 }
  ].filter(l => l.merchandiseId);

  const isReady = lines.length >= 2;

  const calculatePrices = () => {
    const p1 = parseFloat(currentVariant?.price?.amount || '0');
    const p2 = parseFloat(selectedVariant?.price?.amount || '0');
    const original = p1 + p2;
    const discounted = original * (1 - discountValue / 100);
    return { original, discounted, currency: currentVariant?.price?.currencyCode || 'EGP' };
  };

  const prices = calculatePrices();

  return (
    <div className="mb-12">
      <div className="flex flex-col mb-8 text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black mb-2 uppercase">
          {title}
        </h2>
        <p className="text-sm text-gray-500 max-w-xl">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-6 md:gap-8">
        {/* Current product */}
        <div className="flex flex-col">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-gray-400 mb-2">
            Your Selection
          </p>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3 truncate">
            {currentProduct.title}
          </p>
          <div className="w-full bg-[#f5f3f0] overflow-hidden" style={{ aspectRatio: '3/4' }}>
            <img
              src={currentVariant?.image?.url || currentProduct.featuredImage?.url}
              alt={currentProduct.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="mt-3">
            <div className="text-[11px] text-gray-500 uppercase tracking-widest px-3 py-2.5 border border-gray-100 bg-gray-50/50">
              {currentVariant?.selectedOptions?.map((o: any) => o.value).join(' / ')}
            </div>
          </div>
          <div className="mt-2 text-sm font-semibold">
            {currentVariant?.price?.amount} {currentVariant?.price?.currencyCode}
          </div>
        </div>

        {/* Complementary product selection */}
        <div className="flex flex-col">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-gray-400 mb-2">
            Choose a matching piece
          </p>
          <select
            className="w-full bg-white border border-black text-xs font-semibold uppercase tracking-wider px-3 py-2 mb-3 focus:outline-none appearance-none cursor-pointer"
            style={{ WebkitAppearance: 'none' }}
            onChange={handleProductChange}
            value={selectedProduct?.handle || ''}
          >
            {complementaryProducts.map((p: any) => (
              <option key={p.handle} value={p.handle}>{p.title}</option>
            ))}
          </select>
          <div className="w-full bg-[#f5f3f0] overflow-hidden" style={{ aspectRatio: '3/4' }}>
            <img
              src={selectedVariant?.image?.url || selectedProduct?.featuredImage?.url}
              alt={selectedProduct?.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="mt-3">
            <select
              className="w-full bg-white border border-gray-200 text-xs tracking-wide px-3 py-2.5 focus:outline-none focus:border-black appearance-none cursor-pointer transition-colors"
              style={{ WebkitAppearance: 'none' }}
              value={`${selectedVariant?.selectedOptions?.find((o:any)=>o.name.toLowerCase()==='color')?.value}/${selectedVariant?.selectedOptions?.find((o:any)=>o.name.toLowerCase()==='size')?.value}`}
              onChange={(e) => handleVariantChange(e.target.value)}
            >
              {selectedProduct?.variants?.nodes?.map((v: any) => {
                const c = v.selectedOptions.find((o:any)=>o.name.toLowerCase()==='color')?.value;
                const s = v.selectedOptions.find((o:any)=>o.name.toLowerCase()==='size')?.value;
                return (
                  <option key={v.id} value={`${c}/${s}`} disabled={!v.availableForSale}>
                    {c} / {s} {!v.availableForSale ? ' — Sold Out' : ''}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="mt-2 text-sm font-semibold">
            {selectedVariant?.price?.amount} {selectedVariant?.price?.currencyCode}
          </div>
        </div>
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
                {prices.discounted.toLocaleString()} {prices.currency}
              </span>
              <span className="text-sm text-gray-400 line-through">
                {prices.original.toLocaleString()} {prices.currency}
              </span>
              <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 tracking-tighter">
                -{discountValue}%
              </span>
            </div>
          </div>

          <div className="w-full sm:w-[300px]">
            <AddToCartButton
              lines={lines}
              disabled={!isReady}
              onClick={() => open('cart')}
              discountCode={discountCode}
            >
              <span className="block w-full text-center py-4 px-8 text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 bg-black text-white hover:bg-zinc-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed">
                {isReady ? 'Add Bundle to Cart' : 'Select options'}
              </span>
            </AddToCartButton>
            <p className="text-[9px] text-gray-400 mt-2 text-center uppercase tracking-widest font-medium">
              {discountCode
                ? `Discount code ${discountCode} applied`
                : 'Discount auto-applied at checkout'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrossSellUpsellCard;