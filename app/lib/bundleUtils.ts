// Shared helpers for the bundle pickers.
//
// Products do not have a standard set of options. Some have Color + Size, some
// only Color, some only Size, some a single "Default Title" variant, and some
// have options with entirely different names. Everything here works from the
// product's actual variants instead of assuming Color and Size exist.

/** All variants for a bundled product (empty when the product has none). */
export function getVariants(product: any): any[] {
  const nodes = product?.variants?.nodes;
  return Array.isArray(nodes) ? nodes : [];
}

/** First variant that is in stock, falling back to the first one. */
export function getFirstVariant(product: any): any | undefined {
  const variants = getVariants(product);
  return variants.find((variant) => variant?.availableForSale) ?? variants[0];
}

/**
 * First variant that is actually in stock. Returns undefined when everything
 * is sold out, so the card can disable its add-to-cart button instead of
 * silently adding an unavailable variant.
 */
export function getFirstAvailableVariant(product: any): any | undefined {
  return getVariants(product).find((variant) => variant?.availableForSale);
}

/** The variant matching an exact variant id. */
export function getVariantById(
  product: any,
  variantId: string | undefined,
): any | undefined {
  if (!variantId) return undefined;
  return getVariants(product).find((variant) => variant?.id === variantId);
}

/**
 * Human label for a variant, e.g. "Black / M" or "One size (adjustable)".
 * Shopify's placeholder value for products without real options is hidden.
 */
export function variantLabel(variant: any): string {
  const values = (variant?.selectedOptions ?? [])
    .map((option: any) => String(option?.value ?? '').trim())
    .filter((value: string) => value && value.toLowerCase() !== 'default title');

  return values.length ? values.join(' / ') : 'Default';
}

/** True when there is more than one variant for the customer to choose from. */
export function hasVariantChoices(product: any): boolean {
  return getVariants(product).length > 1;
}

/**
 * Default product for a bundle slot: the first one that can actually be bought
 * right now. Falls back to the first product when every option is sold out, so
 * the card still renders (and shows why it cannot be added).
 */
export function getDefaultProduct(products: any[]): any | undefined {
  if (!Array.isArray(products) || !products.length) return undefined;
  return (
    products.find((product) => Boolean(getFirstAvailableVariant(product))) ??
    products[0]
  );
}
