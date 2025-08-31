import { BUNDLE_COLLECTIONS } from './bundleConfig';

// Common utility functions for bundles

/**
 * Get the first available color option from a product
 */
export function getFirstColor(product: any): string {
  const colorOpt = product?.options?.find(
    (o: any) => o.name.toLowerCase() === 'color',
  );
  return colorOpt?.optionValues[0]?.name || '';
}

/**
 * Get the first available size option from a product
 */
export function getFirstSize(product: any): string {
  const sizeOpt = product?.options?.find(
    (o: any) => o.name.toLowerCase() === 'size',
  );
  return sizeOpt?.optionValues[0]?.name || '';
}

/**
 * Find a variant based on color and size options
 */
export function getVariant(product: any, color: string, size: string): any {
  return product?.variants?.nodes?.find(
    (v: any) =>
      v.selectedOptions.some(
        (o: any) => o.name.toLowerCase() === 'color' && o.value === color,
      ) &&
      v.selectedOptions.some(
        (o: any) => o.name.toLowerCase() === 'size' && o.value === size,
      ),
  );
}

/**
 * Get swatch color for a specific color option
 */
export function getSwatchColor(product: any, color: string): string | undefined {
  const colorOpt = product?.options?.find(
    (o: any) => o.name.toLowerCase() === 'color',
  );
  const value = colorOpt?.optionValues?.find((v: any) => v.name === color);
  return value?.swatch?.color;
}

/**
 * Get color options from a product
 */
export function getColorOptions(product: any): string[] {
  return product?.options
    ?.find((o: any) => o.name.toLowerCase() === 'color')
    ?.optionValues?.map((v: any) => v.name) || [];
}

/**
 * Get size options from a product
 */
export function getSizeOptions(product: any): string[] {
  return product?.options
    ?.find((o: any) => o.name.toLowerCase() === 'size')
    ?.optionValues?.map((v: any) => v.name) || [];
}

/**
 * Find a variant by ID
 */
export function getVariantById(product: any, variantId: string): any {
  return product?.variants?.nodes?.find((v: any) => v.id === variantId);
}

/**
 * Get price information from a variant
 */
export function getPriceInfo(variant: any): {
  price: number;
  compareAt: number | null;
  currency: string;
} {
  if (!variant) return { price: 0, compareAt: 0, currency: 'USD' };
  return {
    price: parseFloat(variant.price?.amount || '0'),
    compareAt: variant.compareAtPrice
      ? parseFloat(variant.compareAtPrice.amount)
      : null,
    currency: variant.price?.currencyCode || 'USD',
  };
}

/**
 * Calculate bundle price with discount
 */
export function calculateBundlePrice(
  variants: any[],
  discountValue: number,
  currency: string = 'USD'
): {
  original: number;
  discounted: number;
  currency: string;
} {
  const prices = variants
    .filter(v => v)
    .map(v => parseFloat(v?.price?.amount || '0'));

  const originalTotal = prices.reduce((sum, price) => sum + price, 0);
  const discountedTotal = originalTotal * (1 - discountValue / 100);

  return {
    original: originalTotal,
    discounted: discountedTotal,
    currency,
  };
}

/**
 * Get variant ID from product, color, and size
 */
export function getVariantIdFromOptions(
  product: any,
  color: string,
  size: string
): string {
  const variant = getVariant(product, color, size);
  return variant?.id || '';
}

/**
 * Check if a product belongs to a specific collection
 */
export function isProductInCollection(
  product: any,
  collectionHandle: string
): boolean {
  return product?.collections?.nodes?.some(
    (c: any) => c.handle === collectionHandle
  ) || false;
}

/**
 * Get collection handles from a product
 */
export function getProductCollectionHandles(product: any): string[] {
  return product?.collections?.nodes?.map((c: any) => c.handle) || [];
}

/**
 * Check if a product is in the denim collection
 */
export function isDenimProduct(product: any): boolean {
  return isProductInCollection(product, BUNDLE_COLLECTIONS.DENIM);
}

/**
 * Check if a product is in the polo collection
 */
export function isPoloProduct(product: any): boolean {
  return isProductInCollection(product, BUNDLE_COLLECTIONS.POLO);
}

/**
 * Check if a product is in the tops collection
 */
export function isTopsProduct(product: any): boolean {
  return isProductInCollection(product, BUNDLE_COLLECTIONS.TOPS);
}

/**
 * Check if a product is in the caps collection
 */
export function isCapsProduct(product: any): boolean {
  return isProductInCollection(product, BUNDLE_COLLECTIONS.CAPS);
}

/**
 * Check if a product is a linen product
 */
export function isLinenProduct(product: any): boolean {
  return product?.handle === 'linen-shirt' || product?.handle === 'linen-pants';
}

/**
 * Get available products for a collection
 */
export function getCollectionProducts(
  collectionData: any,
  collectionHandle: string
): any[] {
  return collectionData?.[collectionHandle] || [];
}

/**
 * Initialize product selections for bundles
 */
export function initializeProductSelections(
  products: any[],
  count: number
): any[] {
  if (products.length === 0) return Array(count).fill(null);
  return Array(count).fill(products[0]);
}

/**
 * Initialize variant selections for bundles
 */
export function initializeVariantSelections(
  products: any[],
  count: number
): string[] {
  if (products.length === 0) return Array(count).fill('');
  return Array(count).fill(products[0]?.variants?.nodes?.[0]?.id || '');
}
