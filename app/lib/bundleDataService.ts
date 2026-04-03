import { BUNDLE_COLLECTIONS, BUNDLE_DEFINITIONS, BUNDLE_TYPES, type BundleDefinition } from './bundleConfig';

const SALTY_CLUB_COLLECTION_HANDLE = 'salty-club';

// ─── Shared GraphQL fragment for a full product ───────────────────────────────
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

// ─── Class ────────────────────────────────────────────────────────────────────
export class BundleDataService {
  private storefront: any;
  private cache: Map<string, any> = new Map();

  constructor(storefront: any) {
    this.storefront = storefront;
  }

  // ── Cached store queries ────────────────────────────────────────────────────

  async fetchCollectionProducts(collectionHandle: string): Promise<any[]> {
    const key = `col_${collectionHandle}`;
    if (this.cache.has(key)) return this.cache.get(key);

    try {
      const result = await this.storefront.query(`
        query GetCollectionProducts($handle: String!) {
          collection(handle: $handle) {
            products(first: 50) { nodes { ${PRODUCT_FIELDS} } }
          }
        }
      `, { variables: { handle: collectionHandle } });

      const products = result?.collection?.products?.nodes ?? [];
      this.cache.set(key, products);
      return products;
    } catch {
      return [];
    }
  }

  async fetchProduct(handle: string): Promise<any> {
    const key = `prod_${handle}`;
    if (this.cache.has(key)) return this.cache.get(key);

    try {
      const result = await this.storefront.query(`
        query GetProduct($handle: String!) {
          product(handle: $handle) { ${PRODUCT_FIELDS} }
        }
      `, { variables: { handle } });

      const product = result?.product ?? null;
      this.cache.set(key, product);
      return product;
    } catch {
      return null;
    }
  }

  async fetchProductsByIds(ids: string[]): Promise<any[]> {
    const products: any[] = [];
    for (const id of ids) {
      const key = `prodid_${id}`;
      if (this.cache.has(key)) { products.push(this.cache.get(key)); continue; }

      try {
        const gid = id.startsWith('gid://') ? id : `gid://shopify/Product/${id}`;
        const result = await this.storefront.query(`
          query GetProductById($id: ID!) {
            product(id: $id) { ${PRODUCT_FIELDS} }
          }
        `, { variables: { id: gid } });

        const product = result?.product ?? null;
        if (product) { this.cache.set(key, product); products.push(product); }
      } catch { /* skip */ }
    }
    return products;
  }

  async fetchCollectionById(id: string): Promise<any> {
    const key = `colid_${id}`;
    if (this.cache.has(key)) return this.cache.get(key);

    try {
      const gid = id.startsWith('gid://') ? id : `gid://shopify/Collection/${id}`;
      const result = await this.storefront.query(`
        query GetCollectionById($id: ID!) {
          collection(id: $id) {
            id title handle description
            products(first: 50) { nodes { ${PRODUCT_FIELDS} } }
          }
        }
      `, { variables: { id: gid } });

      const collection = result?.collection ?? null;
      this.cache.set(key, collection);
      return collection;
    } catch {
      return null;
    }
  }

  async fetchProductCollectionHandles(productHandle: string): Promise<string[]> {
    const key = `pcolhandles_${productHandle}`;
    if (this.cache.has(key)) return this.cache.get(key);

    try {
      const result = await this.storefront.query(`
        query ProductCollections($handle: String!) {
          product(handle: $handle) {
            collections(first: 10) { nodes { handle id } }
          }
        }
      `, { variables: { handle: productHandle } });

      const nodes = result?.product?.collections?.nodes ?? [];
      // include both handle strings AND numeric collection IDs for eligibility checks
      const all = [
        ...nodes.map((c: any) => c.handle),
        ...nodes.map((c: any) => c.id?.split('/').pop()),
      ].filter(Boolean);

      this.cache.set(key, all);
      return all;
    } catch {
      return [];
    }
  }

  // ── Product-page data ───────────────────────────────────────────────────────
  /**
   * Fetches all data the product page needs to render applicable bundles.
   * Derived entirely from BUNDLE_DEFINITIONS – no hardcoded IDs here.
   */
  async fetchProductPageBundleData(productHandle: string) {
    const collectionHandles = await this.fetchProductCollectionHandles(productHandle);

    const isInDenim   = collectionHandles.includes(BUNDLE_COLLECTIONS.DENIM);
    const isInPolo    = collectionHandles.includes(BUNDLE_COLLECTIONS.POLO);
    const isInCaps    = collectionHandles.includes(BUNDLE_COLLECTIONS.CAPS);
    const isInTops    = collectionHandles.includes(BUNDLE_COLLECTIONS.TOPS);
    const isInSaltyClub = collectionHandles.includes(SALTY_CLUB_COLLECTION_HANDLE);

    const isLinenShirt  = productHandle === 'linen-shirt';
    const isLinenPants  = productHandle === 'linen-pants';

    // ── Collect all productIds needed by MIXED bundles from config ────────────
    // Resolve the current product's numeric ID for MIXED-bundle eligibility
    const currentProduct = await this.fetchProduct(productHandle);
    const currentProductNumericId = currentProduct?.id?.split('/').pop() ?? '';

    // Gather unique slots from all enabled MIXED bundle definitions
    const allMixedIds = new Set<string>();
    const allComplementaryIds = new Set<string>();

    for (const def of Object.values(BUNDLE_DEFINITIONS)) {
      if (!def.enabled || def.type !== BUNDLE_TYPES.MIXED) continue;
      def.productIds?.forEach((id) => allMixedIds.add(id));
      def.complementaryProductIds?.forEach((id) => allComplementaryIds.add(id));
    }

    // Determine which MIXED bundles this product participates in
    const activeMixedBundleKeys = Object.entries(BUNDLE_DEFINITIONS)
      .filter(([, def]) => def.enabled && def.type === BUNDLE_TYPES.MIXED)
      .filter(([, def]) =>
        def.productIds?.includes(currentProductNumericId) ||
        def.complementaryProductIds?.includes(currentProductNumericId),
      )
      .map(([key]) => key);

    // Build set of IDs to pre-fetch for active mixed bundles
    const idsToFetch = new Set<string>();
    for (const key of activeMixedBundleKeys) {
      const def = BUNDLE_DEFINITIONS[key];
      def.productIds?.forEach((id) => idsToFetch.add(id));
      def.complementaryProductIds?.forEach((id) => idsToFetch.add(id));
    }

    // ── Parallel fetches ─────────────────────────────────────────────────────
    const [
      polos,
      caps,
      tops,
      linenShirt,
      linenPants,
      complementaryProducts,
      mixedBundleProducts,
      // Collection-3-items bundle: only when product's collection matches
      collectionBundle3Products,
    ] = await Promise.all([
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.POLO),
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.CAPS),
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.TOPS),
      (isLinenShirt || isLinenPants) ? this.fetchProduct('linen-shirt') : Promise.resolve(null),
      (isLinenShirt || isLinenPants) ? this.fetchProduct('linen-pants') : Promise.resolve(null),
      (isInDenim || isInPolo)
        ? this.fetchCollectionProducts(isInDenim ? BUNDLE_COLLECTIONS.POLO : BUNDLE_COLLECTIONS.DENIM)
        : Promise.resolve([]),
      idsToFetch.size > 0 ? this.fetchProductsByIds([...idsToFetch]) : Promise.resolve([]),
      // For collection-3-items: check if product is in collection
      collectionHandles.includes('619384013005')
        ? this.fetchCollectionById('619384013005')
        : Promise.resolve(null),
    ]);

    // ── Build per-bundle product maps consumed by UpsellSection ──────────────
    // Keyed by bundle definition key → array of products for each slot group
    const mixedBundleProductMap: Record<string, { slotProducts: any[][]; }> = {};
    for (const key of activeMixedBundleKeys) {
      const def = BUNDLE_DEFINITIONS[key];
      const slot1 = mixedBundleProducts.filter((p: any) =>
        def.productIds?.includes(p.id?.split('/').pop()),
      );
      const slot2 = mixedBundleProducts.filter((p: any) =>
        def.complementaryProductIds?.includes(p.id?.split('/').pop()),
      );
      mixedBundleProductMap[key] = { slotProducts: [slot1, slot2] };
    }

    return {
      // Collection membership flags
      isInDenim,
      isInPolo,
      isInCaps,
      isInTops,
      isInSaltyClub,
      isLinenShirt,
      isLinenPants,

      // Product pools
      polos,
      caps,
      tops,
      linenShirt,
      linenPants,
      complementaryProducts,

      // Mixed bundle data: { [bundleKey]: { slotProducts: any[][] } }
      mixedBundleProductMap,
      activeMixedBundleKeys,

      // Collection-3-items bundle
      collectionBundle3Products,
      isInCollection619384013005: collectionHandles.includes('619384013005'),
    };
  }

  // ── Bundles page: fetch ALL data ─────────────────────────────────────────────
  async fetchAllBundleData() {
    // Collect all unique numeric IDs needed by MIXED bundles
    const allIds = new Set<string>();
    for (const def of Object.values(BUNDLE_DEFINITIONS)) {
      if (!def.enabled || def.type !== BUNDLE_TYPES.MIXED) continue;
      def.productIds?.forEach((id) => allIds.add(id));
      def.complementaryProductIds?.forEach((id) => allIds.add(id));
    }

    const [
      polos,
      denims,
      caps,
      tops,
      linenShirt,
      linenPants,
      mixedProducts,
      collectionBundle3Products,
    ] = await Promise.all([
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.POLO),
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.DENIM),
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.CAPS),
      this.fetchCollectionProducts(BUNDLE_COLLECTIONS.TOPS),
      this.fetchProduct('linen-shirt'),
      this.fetchProduct('linen-pants'),
      allIds.size > 0 ? this.fetchProductsByIds([...allIds]) : Promise.resolve([]),
      this.fetchCollectionById('619384013005'),
    ]);

    // Build per-bundle slot product maps
    const mixedBundleProductMap: Record<string, { slotProducts: any[][] }> = {};
    for (const [key, def] of Object.entries(BUNDLE_DEFINITIONS)) {
      if (!def.enabled || def.type !== BUNDLE_TYPES.MIXED) continue;
      const slot1 = mixedProducts.filter((p: any) =>
        def.productIds?.includes(p.id?.split('/').pop()),
      );
      const slot2 = mixedProducts.filter((p: any) =>
        def.complementaryProductIds?.includes(p.id?.split('/').pop()),
      );
      mixedBundleProductMap[key] = { slotProducts: [slot1, slot2] };
    }

    return {
      polos,
      denims,
      caps,
      tops,
      linenShirt,
      linenPants,
      mixedBundleProductMap,
      collectionBundle3Products,
    };
  }

  clearCache() { this.cache.clear(); }
  getCacheSize() { return this.cache.size; }
}

export function createBundleDataService(storefront: any): BundleDataService {
  return new BundleDataService(storefront);
}
