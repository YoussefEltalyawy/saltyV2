// ─── Bundle model ─────────────────────────────────────────────────────────────
//
// A bundle is a list of "slots". Each slot is a pool the customer picks from:
// a collection, or a few explicit products. This is the whole data model.
//
//   slots: [
//     { collection: 'zip-ups' },
//     { collection: 'sweatpants' },
//   ]
//
// Everything else (which product pages show it, how many pickers to draw, the
// card labels) is derived from the slots, so a new bundle needs no new code.
//
// Bundles are defined in Shopify with the `salty_bundle` and
// `salty_bundle_slot` metaobjects — see docs/bundles-metaobject.md. There are
// no definitions in code: the metaobjects are the only source.

export interface BundleSlot {
  /** Card label. Auto-derived from the source when omitted. */
  label?: string;
  /** Collection handle or numeric ID to pull products from. */
  collection?: string;
  /** Explicit product handles, used instead of `collection`. */
  productHandles?: string[];
  /** Explicit product IDs, used instead of `collection`. */
  productIds?: string[];
  /** How many pickers to render from this source. Defaults to 1. */
  quantity?: number;
  /** Free items are shown in the bundle but excluded from the price. */
  free?: boolean;
}

export interface BundleDefinition {
  enabled: boolean;
  title: string;
  description: string;
  discountValue: number;
  /** When set, the bundle uses a code. Otherwise Shopify's automatic discount applies. */
  discountCode?: string;
  slots: BundleSlot[];
  /** Lower shows first on /bundles. Defaults to 900. */
  sortOrder?: number;
}

/** A single picker, after `quantity` has been expanded. */
export interface ResolvedSlot {
  label?: string;
  collection?: string;
  productHandles?: string[];
  productIds?: string[];
  free: boolean;
  /** Position within a multi-pick slot, and how many picks that slot had. */
  groupIndex?: number;
  groupSize?: number;
}

// ─── Runtime registry ─────────────────────────────────────────────────────────
/**
 * Active definitions, populated from the Shopify metaobjects by
 * `bundleDataService`. Module-level so helpers stay synchronous.
 */
let activeDefinitions: Record<string, BundleDefinition> = {};

function cloneSlot(slot: BundleSlot): BundleSlot {
  return {
    ...slot,
    productHandles: slot.productHandles ? [...slot.productHandles] : undefined,
    productIds: slot.productIds ? [...slot.productIds] : undefined,
  };
}

function cloneDefinition(def: BundleDefinition): BundleDefinition {
  return {
    ...def,
    slots: (def.slots ?? []).map(cloneSlot),
  };
}

function cloneDefinitions(
  defs: Record<string, BundleDefinition>,
): Record<string, BundleDefinition> {
  return Object.fromEntries(
    Object.entries(defs).map(([key, def]) => [key, cloneDefinition(def)]),
  );
}

export function getBundleDefinitions(): Record<string, BundleDefinition> {
  return activeDefinitions;
}

export function setBundleDefinitions(defs: Record<string, BundleDefinition>) {
  activeDefinitions = cloneDefinitions(defs);
}

/** All enabled bundles, ordered by `sortOrder` (then insertion order). */
export function getAllEnabledBundles(): Array<{ key: string; def: BundleDefinition }> {
  return Object.entries(activeDefinitions)
    .filter(([, def]) => def.enabled)
    .sort(
      ([, a], [, b]) => (a.sortOrder ?? 900) - (b.sortOrder ?? 900),
    )
    .map(([key, def]) => ({ key, def }));
}

// ─── Slot helpers ─────────────────────────────────────────────────────────────

/** Expand each slot's `quantity` into one entry per picker. */
export function resolveSlots(def: BundleDefinition): ResolvedSlot[] {
  const resolved: ResolvedSlot[] = [];

  for (const slot of def.slots ?? []) {
    const quantity = Math.max(1, slot.quantity ?? 1);
    for (let i = 0; i < quantity; i++) {
      resolved.push({
        label: slot.label,
        collection: slot.collection,
        productHandles: slot.productHandles,
        productIds: slot.productIds,
        free: Boolean(slot.free),
        groupIndex: i,
        groupSize: quantity,
      });
    }
  }

  return resolved;
}

/** True when the bundle contains a free slot (renders the "free gift" card). */
export function hasFreeSlot(def: BundleDefinition): boolean {
  return (def.slots ?? []).some((slot) => slot.free);
}
