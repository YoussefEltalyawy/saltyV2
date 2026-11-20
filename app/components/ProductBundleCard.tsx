import { useState } from 'react';
import {
  getFirstAvailableVariant,
  getFirstVariant,
  getVariantById,
  hasVariantChoices,
  variantLabel,
} from '~/lib/bundleUtils';

interface ProductBundleCardProps {
  products: any[];
  initialProduct: any;
  initialVariantId?: string;
  title: string;
  onChange: (product: any, variantId: string) => void;
}

/**
 * Single slot card used inside BundlesPageBundleCard.
 * Design matches the site aesthetic: 3/4 portrait image, Manrope font, minimal black/white.
 *
 * Variants are selected by id from the product's real variant list, so this
 * works for products with Color + Size, only Color, only Size, no options at
 * all, or entirely custom option names.
 */
export default function ProductBundleCard({
  products,
  initialProduct,
  initialVariantId,
  title,
  onChange,
}: ProductBundleCardProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState(initialProduct);
  const [selectedVariantId, setSelectedVariantId] = useState(
    initialVariantId ?? getFirstAvailableVariant(initialProduct)?.id ?? '',
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleProductChange(handle: string) {
    const product = products.find((candidate) => candidate.handle === handle);
    if (!product) return;

    const variant = getFirstAvailableVariant(product);
    setSelectedProduct(product);
    setSelectedVariantId(variant?.id ?? '');
    onChange(product, variant?.id ?? '');
  }

  function handleVariantChange(variantId: string) {
    if (!variantId) return;
    setSelectedVariantId(variantId);
    onChange(selectedProduct, variantId);
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentVariant =
    getVariantById(selectedProduct, selectedVariantId) ??
    getFirstVariant(selectedProduct);

  const image =
    currentVariant?.image?.url || selectedProduct?.featuredImage?.url;
  const price = currentVariant?.price;
  const compareAtPrice = currentVariant?.compareAtPrice;
  const hasDiscount =
    compareAtPrice &&
    parseFloat(compareAtPrice.amount) > parseFloat(price?.amount ?? '0');

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
          {products.map((product) => (
            <option key={product.handle} value={product.handle}>
              {product.title}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-wider mb-3 truncate">
          {selectedProduct?.title}
        </p>
      )}

      {/* Image — 3/4 portrait ratio matching site product cards */}
      <div
        className="w-full bg-[#f5f3f0] overflow-hidden"
        style={{ aspectRatio: '3/4' }}
      >
        {image ? (
          <img
            src={image}
            alt={selectedProduct?.title ?? 'Product'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-300 text-xs tracking-wider uppercase">
              No image
            </span>
          </div>
        )}
      </div>

      {/* Variant selector — one option per real variant, whatever the options are */}
      <div className="mt-3">
        {hasVariantChoices(selectedProduct) ? (
          <select
            className="w-full bg-white border border-gray-200 text-xs tracking-wide px-3 py-2.5 focus:outline-none focus:border-black appearance-none cursor-pointer transition-colors"
            style={{ WebkitAppearance: 'none' }}
            value={selectedVariantId}
            onChange={(e) => handleVariantChange(e.target.value)}
          >
            {selectedVariantId === '' && (
              <option value="">Select an option…</option>
            )}
            {selectedProduct?.variants?.nodes?.map((variant: any) => (
              <option
                key={variant.id}
                value={variant.id}
                disabled={!variant.availableForSale}
              >
                {variantLabel(variant)}
                {variant.availableForSale ? '' : ' — Sold Out'}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-gray-500 tracking-wide">
            {currentVariant ? variantLabel(currentVariant) : 'Sold out'}
          </p>
        )}
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
