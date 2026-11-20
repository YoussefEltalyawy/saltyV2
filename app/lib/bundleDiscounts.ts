import { resolveSlots, type BundleDefinition, type ResolvedSlot } from './bundleConfig';

/** A cart line shape, narrowed to the fields bundle matching needs. */
export interface CartLineLike {
  quantity?: number | null;
  merchandise?: {
    product?: {
      id?: string | null;
      handle?: string | null;
      collections?: {
        nodes?: Array<{ handle?: string | null; id?: string | null } | null> | null;
      } | null;
    } | null;
  } | null;
}

function productHandle(line: CartLineLike): string {
  return line?.merchandise?.product?.handle ?? '';
}

function productId(line: CartLineLike): string {
  return String(line?.merchandise?.product?.id ?? '').split('/').pop() ?? '';
}

function collectionHandles(line: CartLineLike): string[] {
  return (
    line?.merchandise?.product?.collections?.nodes
      ?.map((collection) => collection?.handle)
      .filter(Boolean) as string[] | undefined
  ) ?? [];
}

function collectionIds(line: CartLineLike): string[] {
  return (
    line?.merchandise?.product?.collections?.nodes
      ?.map((collection) => String(collection?.id ?? '').split('/').pop())
      .filter(Boolean) as string[] | undefined
  ) ?? [];
}

/** Does this cart line belong to the pool a slot pulls from? */
export function lineMatchesSlot(line: CartLineLike, slot: ResolvedSlot): boolean {
  const handle = productHandle(line);
  const id = productId(line);

  if (slot.productHandles?.includes(handle)) return true;
  if (slot.productIds?.some((value) => String(value).split('/').pop() === id)) {
    return true;
  }

  if (slot.collection) {
    const ref = slot.collection;
    const refId = String(ref).split('/').pop() ?? '';
    if (
      collectionHandles(line).includes(ref) ||
      collectionIds(line).includes(refId)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Decide whether the cart currently qualifies for a bundle's discount code.
 *
 * Every slot needs one matching unit in the cart. Units are consumed greedily,
 * so a "4 tops + 1 free cap" bundle needs 4 top units and 1 cap unit, and two
 * slots pointing at the same collection do not double-count a single item.
 */
export function cartQualifiesForBundle(
  def: BundleDefinition,
  lines: CartLineLike[],
): boolean {
  if (!def.enabled || !def.discountCode) return false;

  const slots = resolveSlots(def);
  if (!slots.length) return false;

  // Track how many units each line can still contribute.
  const stock = lines
    .map((line) => ({ line, units: Number(line?.quantity ?? 1) }))
    .filter((entry) => entry.units > 0);

  for (const slot of slots) {
    let bestIndex = -1;
    let bestUnits = 0;

    for (let index = 0; index < stock.length; index++) {
      const entry = stock[index];
      if (entry.units <= 0) continue;
      if (!lineMatchesSlot(entry.line, slot)) continue;
      if (entry.units > bestUnits) {
        bestUnits = entry.units;
        bestIndex = index;
      }
    }

    if (bestIndex === -1) return false;
    stock[bestIndex].units -= 1;
  }

  return true;
}

/**
 * The bundle codes that should be on the cart right now. Codes the customer
 * typed by hand are preserved; only bundle-owned codes are added/removed.
 */
export function resolveCartDiscountCodes(
  defs: Record<string, BundleDefinition>,
  lines: CartLineLike[],
  currentCodes: string[],
): string[] {
  const bundleCodes = new Set(
    Object.values(defs)
      .map((def) => def.discountCode)
      .filter(Boolean) as string[],
  );

  const manualCodes = currentCodes.filter((code) => code && !bundleCodes.has(code));

  const applicable = Object.values(defs)
    .filter((def) => cartQualifiesForBundle(def, lines))
    .map((def) => def.discountCode!)
    .filter(Boolean);

  return [...new Set([...manualCodes, ...applicable])];
}
