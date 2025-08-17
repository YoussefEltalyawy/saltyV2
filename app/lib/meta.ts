export function toMetaContentId(id?: string | null): string | undefined {
  if (!id) return undefined;
  // Shopify GID => numeric id
  // e.g. gid://shopify/ProductVariant/48270014316749 => 48270014316749
  const m = id.match(/gid:\/\/shopify\/(?:ProductVariant|Product)\/(\d+)/i);
  if (m) return m[1];
  // Already numeric? return as-is
  if (/^\d+$/.test(id)) return id;
  return id;
}

export function mapContentsIds(contents: Array<{ id?: string | null; quantity?: number; item_price?: number }>): Array<{ id: string; quantity?: number; item_price?: number }> {
  return contents
    .map((c) => {
      const mapped = toMetaContentId(c.id || undefined);
      return mapped ? { id: mapped, quantity: c.quantity, item_price: c.item_price } : null;
    })
    .filter(Boolean) as Array<{ id: string; quantity?: number; item_price?: number }>;
}
