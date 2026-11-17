import { getProductBadges } from '~/lib/productTags';

interface ProductTagBadgesProps {
  tags?: readonly string[] | null;
  /** Positioning classes for the badge stack, e.g. "absolute top-2 left-2 z-10". */
  className?: string;
}

/**
 * Renders product tags as badges. The merchant controls which tags appear by
 * adding them to the product in Shopify admin.
 */
export function ProductTagBadges({ tags, className = '' }: ProductTagBadgesProps) {
  const badges = getProductBadges(tags);

  if (!badges.length) return null;

  return (
    <div
      className={`flex flex-col items-start gap-1 pointer-events-none ${className}`}
    >
      {badges.map((tag) => (
        <span
          key={tag}
          className="max-w-[12rem] truncate bg-black/90 text-white text-[10px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 backdrop-blur-sm"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
