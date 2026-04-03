// ─── Collection handles ───────────────────────────────────────────────────────
export const BUNDLE_COLLECTIONS = {
  DENIM: 'denim',
  POLO: 'oversized-polos',
  CAPS: 'caps',
  TOPS: 'tops',
} as const;

// ─── Bundle type identifiers ──────────────────────────────────────────────────
/**
 * BUNDLE         – N identical-collection items from a pool, same variant picker each slot
 * CROSS_SELL     – 2 products from different collections (current + complementary)
 * LINEN_CROSS_SELL – specific 2-product set (shirt + pants) fetched by handle
 * TOPS_CAP       – pick N tops + 1 free cap (specialised layout)
 * MIXED          – pick items from explicit product-ID lists (zip-up/hoodie bundles)
 */
export const BUNDLE_TYPES = {
  BUNDLE: 'bundle',
  CROSS_SELL: 'crossSell',
  LINEN_CROSS_SELL: 'linenCrossSell',
  TOPS_CAP: 'topsCapBundle',
  MIXED: 'mixed',
} as const;

// ─── Slot-label helpers ───────────────────────────────────────────────────────
/** Returns a label for each slot-card title based on the bundle definition */
export function getSlotLabel(bundleDef: BundleDefinition, index: number, total: number): string {
  if (bundleDef.slotLabels && bundleDef.slotLabels[index]) {
    return bundleDef.slotLabels[index];
  }
  if (total === 1) return 'Choose Product';
  return `Product ${index + 1}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BundleDefinition {
  /** Set to false to instantly hide this bundle everywhere */
  enabled: boolean;
  type: string;
  title: string;
  description: string;
  discountValue: number;
  discountType: 'automatic' | 'code';
  discountCode?: string;

  /** How many items the customer must pick */
  minQuantity?: number;

  /** Custom per-slot labels shown above each ProductBundleCard */
  slotLabels?: string[];

  // ── Eligibility – determines which products show this bundle ─────────────
  /** Products by handle that explicitly show this bundle */
  eligibleProducts?: string[];
  /** Shopify collection handles – any product in these collections shows this bundle */
  eligibleCollections?: string[];

  // ── Data sources ─────────────────────────────────────────────────────────
  /** Restrict picker to products from this collection handle (polo/tops bundles) */
  collectionRestriction?: string;

  /** Explicit Shopify Product IDs for MIXED bundles (slot 1) */
  productIds?: string[];
  /** Explicit Shopify Product IDs for MIXED bundles (slot 2) */
  complementaryProductIds?: string[];

  /** Two product handles for the linen bundle */
  shirtHandle?: string;
  pantsHandle?: string;

  /** Shopify collection ID string for the collection-3-items bundle */
  collectionId?: string;

  // ── Special fields for TOPS_CAP ──────────────────────────────────────────
  minTopsQuantity?: number;
  freeCapsQuantity?: number;
  /** The field key in the 'bundles' metaobject in Shopify */
  metaobjectField?: string;
}

// ─── Bundle Registry ──────────────────────────────────────────────────────────
/**
 * *** THIS IS THE ONLY PLACE YOU NEED TO TOUCH TO ADD / REMOVE / TOGGLE A BUNDLE ***
 *
 * To deactivate a bundle: set `enabled: false`
 * To add a new bundle:    add a new entry here and fill in the relevant fields
 */
export const BUNDLE_DEFINITIONS: Record<string, BundleDefinition> = {

  // ── 1. Zip Up + Sweatpants ─────────────────────────────────────────────────
  zipUpSweatpantsBundle: {
    enabled: true,
    type: BUNDLE_TYPES.MIXED,
    title: 'Zip Up + Sweatpants Bundle – 10% Off!',
    description: 'Get a zip up and any sweatpants and save 10%.',
    minQuantity: 2,
    discountType: 'code',
    discountCode: 'XEENF2JK81SS',
    discountValue: 10,
    slotLabels: ['Choose Zip Up', 'Choose Sweatpants'],
    // Shopify numeric product IDs
    productIds: ['9085394354381'],                          // Zip Up
    complementaryProductIds: ['9085410410701', '9085413949645'], // Sweatpants
    metaobjectField: 'zip_up_sweatpants_bundle_10_off',
    eligibleProducts: [], // resolved by bundleDataService using productIds
  },

  // ── 2. Hoodie + Sweatpants ─────────────────────────────────────────────────
  hoodieSweatpantsBundle: {
    enabled: true,
    type: BUNDLE_TYPES.MIXED,
    title: 'Hoodie + Sweatpants Bundle – 10% Off!',
    description: 'Get a hoodie and any sweatpants and save 10%.',
    minQuantity: 2,
    discountType: 'code',
    discountCode: 'H3KXGDBA3XKB',
    discountValue: 10,
    slotLabels: ['Choose Hoodie', 'Choose Sweatpants'],
    productIds: ['9085406118093', '9085406052557'],         // Hoodies
    complementaryProductIds: ['9085410410701', '9085413949645'], // Sweatpants
    metaobjectField: 'hoodie_sweatpants_bundle_10_off',
    eligibleProducts: [],
  },

  // ── 3. Any 3 from Artist Collection ───────────────────────────────────────
  collection3ItemsBundle: {
    enabled: true,
    type: BUNDLE_TYPES.BUNDLE,
    title: "Any 3 Products from \"Made By Artist W'25\" – 15% Off!",
    description: 'Pick any 3 products from the collection and save 15%.',
    minQuantity: 3,
    discountType: 'code',
    discountCode: '3ITEMS15',
    discountValue: 15,
    collectionId: '619384013005',
    metaobjectField: 'any_3_artist_collection_products_15_off',
    eligibleCollections: ['619384013005'],
  },

  // ── 4. Linen Shirt + Pants ─────────────────────────────────────────────────
  linenCrossSell: {
    enabled: true,
    type: BUNDLE_TYPES.LINEN_CROSS_SELL,
    title: 'Linen Shirt + Pants Bundle – 15% Off!',
    description: 'Complete your linen look and save 15% on the total bundle price.',
    discountType: 'automatic',
    discountValue: 15,
    shirtHandle: 'linen-shirt',
    pantsHandle: 'linen-pants',
    metaobjectField: 'linen_shirt_pants_bundle_15_off',
    eligibleProducts: ['linen-shirt', 'linen-pants'],
  },

  // ── 5. Denim + Polo Cross-Sell ─────────────────────────────────────────────
  crossSellDenimPolo: {
    enabled: true,
    type: BUNDLE_TYPES.CROSS_SELL,
    title: 'Denim + Polo Bundle – 10% Off!',
    description: 'Add a matching piece to complete your look and save 10%.',
    discountType: 'automatic',
    discountValue: 10,
    slotLabels: ['Choose Denim', 'Choose Polo'],
    metaobjectField: 'denim_polo_bundle_10_off',
    eligibleCollections: [BUNDLE_COLLECTIONS.DENIM, BUNDLE_COLLECTIONS.POLO],
  },

  // ── 6. 2 Polos ────────────────────────────────────────────────────────────
  poloBundle2: {
    enabled: true,
    type: BUNDLE_TYPES.BUNDLE,
    title: '2 Polos Bundle – 10% Off!',
    description: 'Pick any 2 polos (choose color and size for each) and get 10% off.',
    minQuantity: 2,
    discountType: 'automatic',
    discountValue: 10,
    collectionRestriction: BUNDLE_COLLECTIONS.POLO,
    metaobjectField: '2_polos_bundle_10_off',
    eligibleCollections: [BUNDLE_COLLECTIONS.POLO],
  },

  // ── 7. 3 Polos ────────────────────────────────────────────────────────────
  poloBundle3: {
    enabled: true,
    type: BUNDLE_TYPES.BUNDLE,
    title: '3 Polos Bundle – 15% Off!',
    description: 'Pick any 3 polos (choose color and size for each) and get 15% off.',
    minQuantity: 3,
    discountType: 'automatic',
    discountValue: 15,
    collectionRestriction: BUNDLE_COLLECTIONS.POLO,
    metaobjectField: '3_polos_bundle_15_off',
    eligibleCollections: [BUNDLE_COLLECTIONS.POLO],
  },

  // ── 8. 2 Tops ─────────────────────────────────────────────────────────────
  topsBundle2: {
    enabled: true,
    type: BUNDLE_TYPES.BUNDLE,
    title: '2 Tops Bundle – 10% Off!',
    description: 'Pick any 2 tops (choose color and size for each) and get 10% off.',
    minQuantity: 2,
    discountType: 'code',
    discountCode: '2TOPS10',
    discountValue: 10,
    collectionRestriction: BUNDLE_COLLECTIONS.TOPS,
    metaobjectField: '2_tops_bundle_10_off',
    eligibleCollections: [BUNDLE_COLLECTIONS.TOPS],
  },

  // ── 9. 3 Tops ─────────────────────────────────────────────────────────────
  topsBundle3: {
    enabled: true,
    type: BUNDLE_TYPES.BUNDLE,
    title: '3 Tops Bundle – 15% Off!',
    description: 'Pick any 3 tops (choose color and size for each) and get 15% off.',
    minQuantity: 3,
    discountType: 'code',
    discountCode: '3TOPS15',
    discountValue: 15,
    collectionRestriction: BUNDLE_COLLECTIONS.TOPS,
    metaobjectField: '3_tops_bundle_15_off',
    eligibleCollections: [BUNDLE_COLLECTIONS.TOPS],
  },

  // ── 10. 4 Tops + 1 Free Cap ───────────────────────────────────────────────
  topsCapBundle: {
    enabled: true,
    type: BUNDLE_TYPES.TOPS_CAP,
    title: 'Buy 4 Tops Get 1 Cap Free!',
    description: 'Choose 4 tops and get a cap of your choice absolutely free.',
    discountType: 'code',
    discountCode: '4TOPSFREECAP',
    discountValue: 100, // 100% off cap price
    minTopsQuantity: 4,
    freeCapsQuantity: 1,
    metaobjectField: '4_tops_1_free_cap_bundle',
    eligibleCollections: [BUNDLE_COLLECTIONS.TOPS, BUNDLE_COLLECTIONS.CAPS],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Retrieve a single bundle definition by key (returns undefined if not found) */
export function getBundleDefinition(key: string): BundleDefinition | undefined {
  return BUNDLE_DEFINITIONS[key];
}

/** All enabled bundle definitions as an array */
export function getAllEnabledBundles(): Array<{ key: string; def: BundleDefinition }> {
  return Object.entries(BUNDLE_DEFINITIONS)
    .filter(([, def]) => def.enabled)
    .map(([key, def]) => ({ key, def }));
}

/** Returns a record of bundle keys and their enabled status */
export function getBundleStatuses(): Record<string, boolean> {
  return Object.fromEntries(
    Object.entries(BUNDLE_DEFINITIONS).map(([key, def]) => [key, def.enabled])
  );
}

/** Returns bundle keys that are relevant for a given product handle + collection list */
export function getProductUpsells(
  productHandle: string,
  collectionHandles: string[],
): string[] {
  const keys: string[] = [];

  for (const [key, def] of Object.entries(BUNDLE_DEFINITIONS)) {
    if (!def.enabled) continue;

    // explicit product match
    if (def.eligibleProducts?.includes(productHandle)) {
      keys.push(key);
      continue;
    }

    // collection match
    if (def.eligibleCollections?.some((c) => collectionHandles.includes(c))) {
      keys.push(key);
      continue;
    }

    // MIXED bundles are resolved by checking if the product ID is in productIds/complementaryProductIds
    // The bundleDataService resolves this separately via isZipUp / isHoodie / isSweatpants checks
  }

  return [...new Set(keys)];
}

/**
 * Updates the 'enabled' state of all bundles based on values from a Shopify Metaobject.
 * Expected format: array of { key, value } from metaobject fields.
 */
export function applyMetaobjectToggles(fields: Array<{ key: string; value: string | boolean }>) {
  if (!fields || !fields.length) return;

  const statusMap = new Map(fields.map((f) => [f.key, f.value === 'true' || f.value === true]));

  Object.entries(BUNDLE_DEFINITIONS).forEach(([, def]) => {
    if (def.metaobjectField && statusMap.has(def.metaobjectField)) {
      def.enabled = statusMap.get(def.metaobjectField)!;
    }
  });
}
