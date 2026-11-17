/**
 * Product tags that should appear as badges on storefront product cards.
 *
 * Merchants control badges from Shopify admin by adding product tags, so a new
 * badge does not need a deploy. Tags are deduplicated case-insensitively,
 * ordered so the common badges come first, and capped so a heavily tagged
 * product does not cover its own image.
 */

/** Internal tags that should never be rendered as badges. */
const HIDDEN_TAGS = new Set(['salty club', 'saltyclub']);

/** Common badge tags, highest priority first. */
const PRIORITY_TAGS = [
  'limited',
  'new',
  'sale',
  'bestseller',
  'exclusive',
  'restock',
  'pre-order',
  'sold out',
];

const MAX_BADGES = 3;

export function getProductBadges(
  tags: readonly string[] | null | undefined,
): string[] {
  if (!tags?.length) return [];

  const byKey = new Map<string, string>();

  for (const rawTag of tags) {
    const tag = String(rawTag ?? '').trim();
    if (!tag) continue;

    const key = tag.toLowerCase();
    if (HIDDEN_TAGS.has(key) || byKey.has(key)) continue;
    byKey.set(key, tag);
  }

  return [...byKey.entries()]
    .sort(([a], [b]) => {
      const aPriority = PRIORITY_TAGS.indexOf(a);
      const bPriority = PRIORITY_TAGS.indexOf(b);

      if (aPriority !== -1 || bPriority !== -1) {
        if (aPriority === -1) return 1;
        if (bPriority === -1) return -1;
        return aPriority - bPriority;
      }

      return a.localeCompare(b);
    })
    .slice(0, MAX_BADGES)
    .map(([, tag]) => tag);
}
