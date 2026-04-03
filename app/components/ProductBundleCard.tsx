import { useState } from 'react';
import { getVariant, getVariantIdFromOptions } from '~/lib/bundleUtils';

interface ProductBundleCardProps {
  products: any[];
  initialProduct: any;
  title: string;
  onChange: (product: any, color: string, size: string) => void;
  initialColor?: string;
  initialSize?: string;
}

/**
 * Single slot card used inside BundlesPageBundleCard.
 * Design matches the site aesthetic: 3/4 portrait image, Manrope font, minimal black/white.
 */
export default function ProductBundleCard({
  products,
  initialProduct,
  title,
  onChange,
  initialColor,
  initialSize,
}: ProductBundleCardProps) {

  // ── Helpers ──────────────────────────────────────────────────────────────
  function firstAvailColor(product: any): string {
    const v = product?.variants?.nodes?.find((v: any) => v.availableForSale);
    return v?.selectedOptions?.find((o: any) => o.name.toLowerCase() === 'color')?.value ?? '';
  }
  function firstAvailSize(product: any): string {
    const v = product?.variants?.nodes?.find((v: any) => v.availableForSale);
    return v?.selectedOptions?.find((o: any) => o.name.toLowerCase() === 'size')?.value ?? '';
  }

  // ── State ─────────────────────────────────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState(initialProduct);
  const [selectedColor, setSelectedColor] = useState(initialColor || firstAvailColor(initialProduct));
  const [selectedSize,  setSelectedSize]  = useState(initialSize  || firstAvailSize(initialProduct));

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleProductChange(handle: string) {
    const prod = products.find((p) => p.handle === handle);
    if (!prod) return;
    const c = firstAvailColor(prod);
    const s = firstAvailSize(prod);
    setSelectedProduct(prod);
    setSelectedColor(c);
    setSelectedSize(s);
    onChange(prod, c, s);
  }

  function handleVariantChange(val: string) {
    if (!val) return;
    const [c, s] = val.split('/');
    if (!c || !s) return;
    setSelectedColor(c);
    setSelectedSize(s);
    onChange(selectedProduct, c, s);
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const variantOptions = (selectedProduct?.variants?.nodes ?? []).map((v: any) => {
    const c = v.selectedOptions?.find((o: any) => o.name.toLowerCase() === 'color')?.value ?? '';
    const s = v.selectedOptions?.find((o: any) => o.name.toLowerCase() === 'size')?.value ?? '';
    return { value: `${c}/${s}`, label: `${c} / ${s}`, available: v.availableForSale };
  }).filter((o: any) => o.value !== '/');

  const currentVariant = getVariant(selectedProduct, selectedColor, selectedSize);
  const currentVariantValue = `${selectedColor}/${selectedSize}`;
  const image = currentVariant?.image?.url || selectedProduct?.featuredImage?.url;
  const price = currentVariant?.price;
  const compareAtPrice = currentVariant?.compareAtPrice;
  const hasDiscount = compareAtPrice && parseFloat(compareAtPrice.amount) > parseFloat(price?.amount ?? '0');
  const isOutOfStock = !selectedColor || !selectedSize;

  return (
    <div className="flex flex-col">
      {/* Slot label */}
      <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-gray-400 mb-2">
        {title}
      </p>

      {/* Product selector — always visible */}
      {products.length > 1 ? (
        <select
          className="w-full bg-white border border-black text-xs font-semibold uppercase tracking-wider px-3 py-2 mb-3 focus:outline-none focus:ring-0 appearance-none cursor-pointer"
          style={{ WebkitAppearance: 'none' }}
          value={selectedProduct?.handle || ''}
          onChange={(e) => handleProductChange(e.target.value)}
        >
          {products.map((p) => (
            <option key={p.handle} value={p.handle}>{p.title}</option>
          ))}
        </select>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-wider mb-3 truncate">
          {selectedProduct?.title}
        </p>
      )}

      {/* Image — 3/4 portrait ratio matching site product cards */}
      <div className="w-full bg-[#f5f3f0] overflow-hidden" style={{ aspectRatio: '3/4' }}>
        {image ? (
          <img
            src={image}
            alt={selectedProduct?.title ?? 'Product'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-300 text-xs tracking-wider uppercase">No image</span>
          </div>
        )}
      </div>

      {/* Variant selector */}
      <div className="mt-3">
        <select
          className="w-full bg-white border border-gray-200 text-xs tracking-wide px-3 py-2.5 focus:outline-none focus:border-black appearance-none cursor-pointer transition-colors"
          style={{ WebkitAppearance: 'none' }}
          value={currentVariantValue}
          onChange={(e) => handleVariantChange(e.target.value)}
        >
          {(selectedColor === '' || selectedSize === '') && (
            <option value="">Select size…</option>
          )}
          {variantOptions.map((opt: any) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={!opt.available}
            >
              {opt.label}{!opt.available ? ' — Sold Out' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Price */}
      {price?.amount && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm font-semibold">
            {parseFloat(price.amount).toFixed(2)} {price.currencyCode}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              {parseFloat(compareAtPrice.amount).toFixed(2)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
