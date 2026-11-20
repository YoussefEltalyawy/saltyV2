import { type BundleDefinition, type BundleSlot } from './bundleConfig';

/**
 * Shopify metaobject types that drive bundle configuration.
 *
 * - `salty_bundle`      one entry per bundle (title, discount, slots, …)
 * - `salty_bundle_slot` one entry per picker group inside a bundle
 *
 * Create them with `npm run setup:bundles`, or by hand in
 * Settings → Custom data → Metaobjects. See docs/bundles-metaobject.md.
 *
 * These entries are the only source of bundle definitions: there are no
 * hardcoded bundles in code.
 */
export const BUNDLE_METAOBJECT_TYPE = 'salty_bundle';
export const BUNDLE_SLOT_METAOBJECT_TYPE = 'salty_bundle_slot';

/**
 * Bundles reference their slots through `list.metaobject_reference`, so the
 * query has to walk one level deeper than a flat metafield query.
 *
 * Limits: 20 slots per bundle, 20 explicit products per slot. Collections are
 * fetched separately by the data service, so they are not limited here.
 */
export const BUNDLE_METAOBJECT_QUERY = `#graphql
  query BundleDefinitions($type: String!, $first: Int!) {
    metaobjects(type: $type, first: $first) {
      nodes {
        handle
        fields {
          key
          value
          references(first: 20) {
            nodes {
              __typename
              ... on Product {
                id
                handle
                title
              }
              ... on Collection {
                id
                handle
                title
              }
              ... on Metaobject {
                handle
                type
                fields {
                  key
                  value
                  references(first: 20) {
                    nodes {
                      __typename
                      ... on Product {
                        id
                        handle
                        title
                      }
                      ... on Collection {
                        id
                        handle
                        title
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
` as const;

// ─── Field helpers ────────────────────────────────────────────────────────────

type MetaobjectField = {
  key?: string;
  value?: string | boolean | null;
  references?: { nodes?: any[] };
};

function fieldMap(entry: any): Record<string, MetaobjectField> {
  const fields: MetaobjectField[] = Array.isArray(entry?.fields) ? entry.fields : [];
  return Object.fromEntries(fields.filter((f) => f?.key).map((f) => [f.key!, f]));
}

function readText(field?: MetaobjectField): string | undefined {
  const value = field?.value;
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function readBool(field?: MetaobjectField): boolean | undefined {
  const value = field?.value;
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (text === 'true' || text === '1') return true;
  if (text === 'false' || text === '0') return false;
  return undefined;
}

function readNumber(field?: MetaobjectField): number | undefined {
  const value = field?.value;
  if (value === null || value === undefined || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function readList(field?: MetaobjectField): string[] {
  const value = field?.value;
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];

  const trimmed = value.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // fall through to delimiter parsing
    }
  }

  return trimmed
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function referenceNodes(field?: MetaobjectField, type?: string): any[] {
  const nodes: any[] = field?.references?.nodes ?? [];
  if (!Array.isArray(nodes)) return [];
  return type ? nodes.filter((node: any) => node?.__typename === type) : nodes;
}

/**
 * A collection reference → its handle (or numeric ID when that is all we have).
 *
 * The Storefront API does not expand collection references inside metaobject
 * fields: the field's `references` connection comes back empty and the raw
 * `value` is the collection GID. Normalise that to the numeric id so the rest
 * of the code (which compares ids) can match it. Handles pass through
 * unchanged because `shortId('caps')` is still `'caps'`.
 */
function readCollectionRef(field?: MetaobjectField): string | undefined {
  const collection = referenceNodes(field, 'Collection')[0];
  if (collection) return collection.handle || shortId(collection.id);
  const value = readText(field);
  return value ? shortId(value) : undefined;
}

/** Product references → handles when possible, otherwise numeric IDs. */
function readProductRefs(field?: MetaobjectField): {
  handles?: string[];
  ids?: string[];
} {
  const products = referenceNodes(field, 'Product');
  if (products.length) {
    const handles = products.map((p: any) => p?.handle).filter(Boolean) as string[];
    if (handles.length) return { handles };
    return { ids: products.map((p: any) => shortId(p?.id)).filter(Boolean) };
  }

  const values = readList(field);
  if (!values.length) return {};

  const ids = values.map(shortId).filter(Boolean);
  const allNumeric = ids.length === values.length && ids.every((id) => /^\d+$/.test(id));
  return allNumeric ? { ids } : { handles: values };
}

function shortId(value: any): string {
  return String(value ?? '').split('/').pop() ?? '';
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function buildSlot(
  label: string | undefined,
  collection: string | undefined,
  products: { handles?: string[]; ids?: string[] },
  quantity: number | undefined,
  free: boolean,
): BundleSlot | null {
  if (!collection && !products.handles?.length && !products.ids?.length) {
    return null;
  }

  return {
    label,
    collection,
    productHandles: products.handles,
    productIds: products.ids,
    quantity: Math.max(1, quantity ?? 1),
    free: free || undefined,
  };
}

/**
 * Parse one `salty_bundle_slot` entry into a slot. Returns null for an empty
 * slot (no collection and no products), so a half-filled entry is ignored
 * instead of breaking the bundle.
 */
export function parseSlotMetaobject(entry: any): BundleSlot | null {
  if (
    entry?.type &&
    String(entry.type) !== BUNDLE_SLOT_METAOBJECT_TYPE
  ) {
    return null;
  }

  const fields = fieldMap(entry);

  return buildSlot(
    readText(fields.label),
    readCollectionRef(fields.collection),
    readProductRefs(fields.products),
    readNumber(fields.quantity),
    readBool(fields.free) === true,
  );
}

/** Read the `slots` list reference, preserving the order set in Shopify admin. */
function readSlotReferences(field?: MetaobjectField): BundleSlot[] {
  const slots: BundleSlot[] = [];

  for (const node of referenceNodes(field, 'Metaobject')) {
    const slot = parseSlotMetaobject(node);
    if (slot) slots.push(slot);
  }

  return slots;
}

/**
 * Parse one `salty_bundle` metaobject entry into a partial definition. Only
 * fields that are present are returned, so missing fields fall back to the
 * values in `buildBundleDefinitions` instead of blanking the bundle.
 *
 * New entries use the `slots` list of `salty_bundle_slot` references. Entries
 * created with the earlier flat two-slot fields (`collection`, `products`,
 * `second_collection`, …) are still read as a fallback.
 */
export function parseBundleMetaobject(
  entry: any,
): { key: string; def: Partial<BundleDefinition> } | null {
  const fields = fieldMap(entry);
  const key =
    readText(fields.bundle_key) ?? String(entry?.handle ?? '').trim();
  if (!key) return null;

  const def: Partial<BundleDefinition> = {};

  const title = readText(fields.title);
  if (title) def.title = title;

  const description = readText(fields.description);
  if (description) def.description = description;

  const hidden = readBool(fields.hidden);
  if (hidden !== undefined) def.enabled = !hidden;

  const discountValue = readNumber(fields.discount_percent);
  if (discountValue !== undefined) def.discountValue = discountValue;

  const discountCode = readText(fields.discount_code);
  if (discountCode) def.discountCode = discountCode;

  const sortOrder = readNumber(fields.sort_order);
  if (sortOrder !== undefined) def.sortOrder = sortOrder;

  // Preferred: an ordered list of `salty_bundle_slot` references.
  const slotRefs = readSlotReferences(fields.slots);
  if (slotRefs.length) {
    def.slots = slotRefs;
    return { key, def };
  }

  // A non-empty Slots field that produced no usable slots is almost always a
  // setup problem (Storefront access, or slots with no collection/products).
  // The bundle keeps no slots and is skipped instead of silently blanking.
  if (
    fields.slots &&
    (readList(fields.slots).length || fields.slots.references?.nodes?.length)
  ) {
    console.warn(
      `[bundles] "${key}" has a Slots field but no usable slots were read. ` +
        'Check Storefront access on the Bundle Slot definition and that each slot has a collection or products.',
    );
  }

  // Fallback: the original flat one/two-slot fields. Kept so entries created
  // before the slot metaobject existed keep working.
  const slot1 = buildSlot(
    undefined,
    readCollectionRef(fields.collection),
    readProductRefs(fields.products),
    readNumber(fields.quantity),
    false,
  );

  const slot2 = buildSlot(
    undefined,
    readCollectionRef(fields.second_collection),
    readProductRefs(fields.second_products),
    readNumber(fields.second_quantity),
    readBool(fields.second_free) === true,
  );

  const flatSlots = [slot1, slot2].filter(Boolean) as BundleSlot[];
  if (flatSlots.length) def.slots = flatSlots;

  return { key, def };
}

// ─── Merge ────────────────────────────────────────────────────────────────────

/**
 * Build the bundle registry from metaobject entries.
 *
 * - One entry → one bundle. The entry's `bundle_key` is the bundle key.
 * - `hidden: true` → hide a bundle without deleting it.
 * - Duplicate keys → later entries override the fields they define.
 *
 * `base` exists for tests and for callers that want to seed definitions; the
 * storefront passes nothing, so the metaobjects are the only source.
 */
export function buildBundleDefinitions(
  entries: any[],
  base: Record<string, BundleDefinition> = {},
): Record<string, BundleDefinition> {
  const next: Record<string, BundleDefinition> = Object.fromEntries(
    Object.entries(base).map(([key, def]) => [
      key,
      { ...def, slots: def.slots.map((slot) => ({ ...slot })) },
    ]),
  );

  for (const entry of entries) {
    const parsed = parseBundleMetaobject(entry);
    if (!parsed) continue;

    // Match existing keys case-insensitively so a duplicated entry overrides
    // the earlier one instead of creating a second bundle.
    const matchedKey = Object.keys(next).find(
      (key) => key.toLowerCase() === parsed.key.toLowerCase(),
    );
    const key = matchedKey ?? parsed.key;

    const fallback: BundleDefinition = next[key] ?? {
      enabled: true,
      title: parsed.key,
      description: '',
      discountValue: 0,
      slots: [],
    };

    next[key] = { ...fallback, ...parsed.def, slots: parsed.def.slots ?? fallback.slots };
  }

  return next;
}
