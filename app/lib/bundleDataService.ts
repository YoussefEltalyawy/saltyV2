import {
  getAllEnabledBundles,
  getBundleDefinitions,
  resolveSlots,
  setBundleDefinitions,
  type BundleDefinition,
} from './bundleConfig';
import {
  BUNDLE_METAOBJECT_QUERY,
  BUNDLE_METAOBJECT_TYPE,
  buildBundleDefinitions,
} from './bundleMetaobject';

const SALTY_CLUB_COLLECTION_HANDLE = 'salty-club';
const DEFINITIONS_TTL_MS = 60_000;

const PRODUCT_FIELDS = `
  id
  title
  handle
  featuredImage { url altText }
  options {
    name
    optionValues { name }
  }
  variants(first: 100) {
    nodes {
      id
      availableForSale
      image { url altText }
      price { amount currencyCode }
      compareAtPrice { amount currencyCode }
      selectedOptions { name value }
    }
  }
`;

/** Everything a card needs for one picker. */
export type BundleSlotData = {
  /** Stable key for React lists; derived from the slot source and position. */
  id: string;
  label: string;
  products: any[];
  free: boolean;
};

type DefinitionsResult = {
  at: number;
  source: 'metaobject' | 'empty';
  definitions: Record<string, BundleDefinition>;
};

type Resources = {
  collections: Map<string, { handle: string; title: string; products: any[] }>;
  products: Map<string, any>;
};

type ProductContext = {
  handle: string;
  id: string;
  collectionHandles: string[];
  collectionIds: string[];
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function shortId(value: any): string {
  return String(value ?? '').split('/').pop() ?? '';
}

function isNumeric(value: string): boolean {
  return /^\d+$/.test(value);
}

function isIdLike(value: string): boolean {
  return isNumeric(value) || value.startsWith('gid://');
}

function dedupe(products: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const product of products) {
    const id = String(product?.id ?? product?.handle ?? '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(product);
  }
  return out;
}

function matchesSlot(
  slot: { collection?: string; productHandles?: string[]; productIds?: string[] },
  ctx: ProductContext,
): boolean {
  if (slot.productHandles?.includes(ctx.handle)) return true;
  if (ctx.id && slot.productIds?.includes(ctx.id)) return true;

  if (slot.collection) {
    const ref = slot.collection;
    const id = shortId(ref);
    if (
      ctx.collectionHandles.includes(ref) ||
      ctx.collectionIds.includes(ref) ||
      (id && ctx.collectionIds.includes(id))
    ) {
      return true;
    }
  }

  return false;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

let definitionsCache: DefinitionsResult | null = null;
let definitionsInFlight: Promise<DefinitionsResult> | null = null;

// ─── Service ──────────────────────────────────────────────────────────────────

export class BundleDataService {
  private storefront: any;
  private cache = new Map<string, any>();

  constructor(storefront: any) {
    this.storefront = storefront;
  }

  // ── Bundle definitions ──────────────────────────────────────────────────────

  /**
   * Load definitions from the `salty_bundle` metaobject. The metaobjects are
   * the only source: when none are readable the registry is empty, so the
   * storefront shows no bundles rather than stale code-defined ones. Cached for
   * 60 seconds.
   */
  async fetchBundleDefinitions(): Promise<DefinitionsResult> {
    const now = Date.now();
    if (definitionsCache && now - definitionsCache.at < DEFINITIONS_TTL_MS) {
      setBundleDefinitions(definitionsCache.definitions);
      return definitionsCache;
    }

    if (definitionsInFlight) return definitionsInFlight;

    definitionsInFlight = (async (): Promise<DefinitionsResult> => {
      let definitions: Record<string, BundleDefinition> = {};
      let source: 'metaobject' | 'empty' = 'empty';

      try {
        const result = await this.storefront.query(BUNDLE_METAOBJECT_QUERY, {
          variables: { type: BUNDLE_METAOBJECT_TYPE, first: 50 },
          // The 60s cache above controls refresh; don't let the CDN keep
          // admin edits stale for longer than that.
          cache: this.storefront.CacheNone?.(),
        });

        const entries = result?.metaobjects?.nodes ?? [];
        if (entries.length) {
          definitions = buildBundleDefinitions(entries);
          source = 'metaobject';
        }
      } catch {
        // Leave the registry empty; the storefront hides the bundle sections.
      }

      const result: DefinitionsResult = { at: Date.now(), source, definitions };
      definitionsCache = result;
      setBundleDefinitions(definitions);
      return result;
    })();

    try {
      return await definitionsInFlight;
    } finally {
      definitionsInFlight = null;
    }
  }

  // ── Store queries ───────────────────────────────────────────────────────────

  private async fetchCollection(ref: string) {
    const key = `collection:${ref}`;
    if (this.cache.has(key)) return this.cache.get(key);

    try {
      const query = isIdLike(ref)
        ? `query CollectionById($id: ID!) {
            collection(id: $id) {
              handle
              title
              products(first: 50) { nodes { ${PRODUCT_FIELDS} } }
            }
          }`
        : `query CollectionByHandle($handle: String!) {
            collection(handle: $handle) {
              handle
              title
              products(first: 50) { nodes { ${PRODUCT_FIELDS} } }
            }
          }`;

      const variables = isIdLike(ref)
        ? { id: ref.startsWith('gid://') ? ref : `gid://shopify/Collection/${ref}` }
        : { handle: ref };

      const result = await this.storefront.query(query, { variables });
      const collection = result?.collection;
      const value = collection
        ? {
            handle: collection.handle,
            title: collection.title,
            products: collection.products?.nodes ?? [],
          }
        : null;

      this.cache.set(key, value);
      if (value?.handle) this.cache.set(`collection:${value.handle}`, value);
      if (collection?.id) this.cache.set(`collection:${shortId(collection.id)}`, value);
      return value;
    } catch {
      return null;
    }
  }

  private async fetchProduct(ref: string) {
    const key = `product:${ref}`;
    if (this.cache.has(key)) return this.cache.get(key);

    try {
      const query = isIdLike(ref)
        ? `query ProductById($id: ID!) { product(id: $id) { ${PRODUCT_FIELDS} } }`
        : `query ProductByHandle($handle: String!) { product(handle: $handle) { ${PRODUCT_FIELDS} } }`;

      const variables = isIdLike(ref)
        ? { id: ref.startsWith('gid://') ? ref : `gid://shopify/Product/${ref}` }
        : { handle: ref };

      const result = await this.storefront.query(query, { variables });
      const product = result?.product ?? null;

      this.cache.set(key, product);
      if (product) {
        if (product.handle) this.cache.set(`product:${product.handle}`, product);
        const id = shortId(product.id);
        if (id) this.cache.set(`product:${id}`, product);
      }
      return product;
    } catch {
      return null;
    }
  }

  private async fetchProductCollections(handle: string) {
    const key = `product-collections:${handle}`;
    if (this.cache.has(key)) return this.cache.get(key);

    try {
      const result = await this.storefront.query(
        `query ProductCollections($handle: String!) {
          product(handle: $handle) {
            collections(first: 50) { nodes { handle id } }
          }
        }`,
        { variables: { handle } },
      );

      const nodes = result?.product?.collections?.nodes ?? [];
      const value = {
        handles: nodes.map((node: any) => node.handle).filter(Boolean) as string[],
        ids: nodes.map((node: any) => shortId(node.id)).filter(Boolean) as string[],
      };

      this.cache.set(key, value);
      return value;
    } catch {
      return { handles: [], ids: [] };
    }
  }

  // ── Resolution ──────────────────────────────────────────────────────────────

  private async loadResources(defs: BundleDefinition[]) {
    const collections = new Set<string>();
    const products = new Set<string>();

    for (const def of defs) {
      for (const slot of resolveSlots(def)) {
        if (slot.collection) collections.add(slot.collection);
        slot.productHandles?.forEach((handle) => products.add(handle));
        slot.productIds?.forEach((id) => products.add(id));
      }
    }

    const resources: Resources = { collections: new Map(), products: new Map() };

    await Promise.all([
      ...[...collections].map(async (ref) => {
        const collection = await this.fetchCollection(ref);
        if (collection) resources.collections.set(ref, collection);
      }),
      ...[...products].map(async (ref) => {
        const product = await this.fetchProduct(ref);
        if (product) resources.products.set(ref, product);
      }),
    ]);

    return resources;
  }

  private resolveDefinition(
    def: BundleDefinition,
    resources: Resources,
    currentProduct?: any,
  ): BundleSlotData[] | null {
    const slots = resolveSlots(def);
    const resolved: BundleSlotData[] = [];

    for (let index = 0; index < slots.length; index++) {
      const slot = slots[index];
      const pool: any[] = [];

      if (slot.collection) {
        pool.push(...(resources.collections.get(slot.collection)?.products ?? []));
      }

      slot.productHandles?.forEach((handle) => {
        const product = resources.products.get(handle);
        if (product) pool.push(product);
      });

      slot.productIds?.forEach((id) => {
        const product = resources.products.get(id);
        if (product) pool.push(product);
      });

      const products = dedupe(pool);
      if (!products.length) return null;

      // On a product page, put the viewed product first so it is preselected.
      if (currentProduct) {
        const position = products.findIndex(
          (product) => product.handle === currentProduct.handle,
        );
        if (position > 0) {
          products.unshift(...products.splice(position, 1));
        }
      }

      const label =
        slot.label ||
        (slot.collection ? resources.collections.get(slot.collection)?.title : '') ||
        products[0]?.title ||
        'Option';
      const numbered =
        slot.groupSize && slot.groupSize > 1
          ? `${label} ${(slot.groupIndex ?? 0) + 1}`
          : label;

      const source =
        slot.collection ??
        slot.productHandles?.join('+') ??
        slot.productIds?.join('+') ??
        'slot';

      resolved.push({
        id: `${index}:${source}:${slot.groupIndex ?? 0}`,
        label: numbered,
        products,
        free: slot.free,
      });
    }

    return resolved.length ? resolved : null;
  }

  private definitionApplies(def: BundleDefinition, ctx: ProductContext) {
    if (!def.enabled) return false;
    return resolveSlots(def).some((slot) => matchesSlot(slot, ctx));
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Data for the product page: applicable bundles + resolved pickers. */
  async fetchProductPageBundleData(productHandle: string) {
    await this.fetchBundleDefinitions();

    const definitions = getBundleDefinitions();
    const currentProduct = await this.fetchProduct(productHandle);
    const membership = await this.fetchProductCollections(productHandle);

    const ctx: ProductContext = {
      handle: productHandle,
      id: shortId(currentProduct?.id),
      collectionHandles: membership.handles,
      collectionIds: membership.ids,
    };

    const enabled = getAllEnabledBundles();
    const applicable = enabled.filter(({ def }) => this.definitionApplies(def, ctx));
    const resources = await this.loadResources(applicable.map(({ def }) => def));

    const bundleSlots: Record<string, BundleSlotData[]> = {};
    const order: string[] = [];

    for (const { key, def } of applicable) {
      const slots = this.resolveDefinition(def, resources, currentProduct);
      if (slots) {
        bundleSlots[key] = slots;
        order.push(key);
      }
    }

    return {
      activeBundleKeys: order,
      bundleSlots,
      bundleDefinitions: definitions,
      isInSaltyClub: ctx.collectionHandles.includes(SALTY_CLUB_COLLECTION_HANDLE),
    };
  }

  /** Data for /bundles: every enabled bundle with resolved pickers. */
  async fetchAllBundleData() {
    await this.fetchBundleDefinitions();

    const enabled = getAllEnabledBundles();
    const resources = await this.loadResources(enabled.map(({ def }) => def));

    const bundleSlots: Record<string, BundleSlotData[]> = {};
    const bundles: Array<{ key: string; def: BundleDefinition }> = [];

    for (const entry of enabled) {
      const slots = this.resolveDefinition(entry.def, resources);
      if (!slots) continue;
      bundleSlots[entry.key] = slots;
      bundles.push(entry);
    }

    return { bundles, bundleSlots };
  }

  clearCache() {
    this.cache.clear();
  }
}

export function createBundleDataService(storefront: any) {
  return new BundleDataService(storefront);
}

/** Clear the module-level metaobject cache (useful after admin edits). */
export function clearBundleDefinitionsCache() {
  definitionsCache = null;
  definitionsInFlight = null;
}
