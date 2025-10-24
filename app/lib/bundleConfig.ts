// Collection handles for bundles
export const BUNDLE_COLLECTIONS = {
  DENIM: 'denim',
  POLO: 'oversized-polos',
  CAPS: 'caps',
  TOPS: 'tops',
} as const;

// Bundle types
export const BUNDLE_TYPES = {
  BUNDLE: 'bundle',
  CROSS_SELL: 'crossSell',
  LINEN_CROSS_SELL: 'linenCrossSell',
  TOPS_CAP_BUNDLE: 'topsCapBundle',
} as const;

// Centralized bundle definitions
export const BUNDLE_DEFINITIONS = {
  // Bundle 1: Zip Up + Sweatpants
  zipUpSweatpantsBundle: {
    type: BUNDLE_TYPES.BUNDLE,
    title: 'Zip Up + Sweatpants Bundle – 10% Off!',
    description: 'Get a zip up and any sweatpants and save 10%.',
    minQuantity: 2,
    discountType: 'code',
    discountCode: 'XEENF2JK81SS',
    discountValue: 10,
    productIds: ['9085394354381'], // Zip Up
    complementaryProductIds: ['9085410410701', '9085413949645'], // Sweatpants
  },

  // Bundle 2: Hoodie + Sweatpants
  hoodieSweatpantsBundle: {
    type: BUNDLE_TYPES.BUNDLE,
    title: 'Hoodie + Sweatpants Bundle – 10% Off!',
    description: 'Get a hoodie and any sweatpants and save 10%.',
    minQuantity: 2,
    discountType: 'code',
    discountCode: 'H3KXGDBA3XKB',
    discountValue: 10,
    productIds: ['9085406118093', '9085406052557'], // Hoodies
    complementaryProductIds: ['9085410410701', '9085413949645'], // Sweatpants
  },

  // Bundle 3: Any 3 Products from Collection
  collection3ItemsBundle: {
    type: BUNDLE_TYPES.BUNDLE,
    title: ' Any 3 Products from &quot;Made By Artist W&apos;25&quot; – 15% Off!',
    description: 'Pick any 3 products from the collection and save 15%.',
    minQuantity: 3,
    discountType: 'code',
    discountCode: '3ITEMS15',
    discountValue: 15,
    collectionId: '619384013005',
  },

  // Linen Cross-Sell Bundle
  linenCrossSell: {
    type: BUNDLE_TYPES.LINEN_CROSS_SELL,
    title: 'Linen Shirt + Pants Bundle – 15% Off!',
    description: 'Complete your linen look and save 15% on the total bundle price.',
    discountType: 'automatic',
    discountValue: 15,
    shirtHandle: 'linen-shirt',
    pantsHandle: 'linen-pants',
    // This bundle is eligible for both linen-shirt and linen-pants products
    eligibleProducts: ['linen-shirt', 'linen-pants'],
  },

  // Denim + Polo Cross-Sell Bundle
  crossSellDenimPolo: {
    type: BUNDLE_TYPES.CROSS_SELL,
    title: 'Denim + Polo Bundle – 10% Off!',
    description: 'Add a matching piece to complete your look and save 10%.',
    discountType: 'automatic',
    discountValue: 10,
    collections: [BUNDLE_COLLECTIONS.DENIM, BUNDLE_COLLECTIONS.POLO],
    // This bundle is eligible for any product in denim or polo collections
    eligibleCollections: [BUNDLE_COLLECTIONS.DENIM, BUNDLE_COLLECTIONS.POLO],
  },

  // 2 Polos Bundle
  poloBundle2: {
    type: BUNDLE_TYPES.BUNDLE,
    title: '2 Polos Bundle – 10% Off!',
    description: 'Pick any 2 polos (choose color and size for each) and get 10% off.',
    minQuantity: 2,
    discountType: 'automatic',
    discountValue: 10,
    collectionRestriction: BUNDLE_COLLECTIONS.POLO,
    // This bundle is eligible for any product in the polo collection
    eligibleCollections: [BUNDLE_COLLECTIONS.POLO],
  },

  // 3 Polos Bundle
  poloBundle3: {
    type: BUNDLE_TYPES.BUNDLE,
    title: '3 Polos Bundle – 15% Off!',
    description: 'Pick any 3 polos (choose color and size for each) and get 15% off.',
    minQuantity: 3,
    discountType: 'automatic',
    discountValue: 15,
    collectionRestriction: BUNDLE_COLLECTIONS.POLO,
    // This bundle is eligible for any product in the polo collection
    eligibleCollections: [BUNDLE_COLLECTIONS.POLO],
  },

  // 2 Tops Bundle
  topsBundle2: {
    type: BUNDLE_TYPES.BUNDLE,
    title: '2 Tops Bundle – 10% Off!',
    description: 'Pick any 2 tops (choose color and size for each) and get 10% off.',
    minQuantity: 2,
    discountType: 'code',
    discountCode: '2TOPS10',
    discountValue: 10,
    collectionRestriction: BUNDLE_COLLECTIONS.TOPS,
    // This bundle is eligible for any product in the tops collection
    eligibleCollections: [BUNDLE_COLLECTIONS.TOPS],
  },

  // 3 Tops Bundle
  topsBundle3: {
    type: BUNDLE_TYPES.BUNDLE,
    title: '3 Tops Bundle – 15% Off!',
    description: 'Pick any 3 tops (choose color and size for each) and get 15% off.',
    minQuantity: 3,
    discountType: 'code',
    discountCode: '3TOPS15',
    discountValue: 15,
    collectionRestriction: BUNDLE_COLLECTIONS.TOPS,
    // This bundle is eligible for any product in the tops collection
    eligibleCollections: [BUNDLE_COLLECTIONS.TOPS],
  },

  // 4 Tops + 1 Cap Bundle
  topsCapBundle: {
    type: BUNDLE_TYPES.TOPS_CAP_BUNDLE,
    title: 'Buy 4 Tops Get 1 Cap Free!',
    description: 'Choose 4 tops and get a cap of your choice absolutely free.',
    discountType: 'code',
    discountCode: '4TOPSFREECAP',
    minTopsQuantity: 4,
    freeCapsQuantity: 1,
    // This bundle is eligible for products in tops or caps collections
    eligibleCollections: [BUNDLE_COLLECTIONS.TOPS, BUNDLE_COLLECTIONS.CAPS],
  },
} as const;

// Product-specific upsell configurations
export const PRODUCT_UPSELLS: Record<string, string[]> = {
  'cocktails-baby-tee-pre-order': ['topsBundle3'],
};

// Global upsells that apply to collections
export const COLLECTION_UPSELLS: Record<string, string[]> = {
  [BUNDLE_COLLECTIONS.DENIM]: ['crossSellDenimPolo'],
  [BUNDLE_COLLECTIONS.POLO]: ['crossSellDenimPolo', 'poloBundle2', 'poloBundle3'],
  [BUNDLE_COLLECTIONS.TOPS]: ['topsBundle2', 'topsBundle3', 'topsCapBundle'],
  [BUNDLE_COLLECTIONS.CAPS]: ['topsCapBundle'],
};

// Linen product upsells
export const LINEN_UPSELLS = ['linenCrossSell'];

// Helper function to get bundle definition by key
export function getBundleDefinition(key: string) {
  return BUNDLE_DEFINITIONS[key as keyof typeof BUNDLE_DEFINITIONS];
}

// Helper function to get all bundle definitions
export function getAllBundleDefinitions() {
  return Object.values(BUNDLE_DEFINITIONS);
}

// Helper function to check if a product is eligible for a specific bundle
export function isProductEligibleForBundle(productHandle: string, collections: string[], bundleKey: string): boolean {
  const bundle = getBundleDefinition(bundleKey);
  if (!bundle) return false;

  // Check if product is directly eligible (e.g., linen products)
  if (bundle.eligibleProducts && bundle.eligibleProducts.includes(productHandle)) {
    return true;
  }

  // Check if product is eligible through collections
  if (bundle.eligibleCollections) {
    return bundle.eligibleCollections.some(collection => collections.includes(collection));
  }

  return false;
}

// Helper function to get upsells for a product
export function getProductUpsells(productHandle: string, collections: string[]): string[] {
  const upsells: string[] = [];

  // Add product-specific upsells
  if (PRODUCT_UPSELLS[productHandle]) {
    upsells.push(...PRODUCT_UPSELLS[productHandle]);
  }

  // Check all bundles to see if this product is eligible
  Object.keys(BUNDLE_DEFINITIONS).forEach(bundleKey => {
    if (isProductEligibleForBundle(productHandle, collections, bundleKey)) {
      upsells.push(bundleKey);
    }
  });

  // Remove duplicates
  return [...new Set(upsells)];
}
