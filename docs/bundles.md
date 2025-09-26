## Centralized Bundles System

This project now uses a centralized configuration and data service for all bundle and cross-sell logic. The same definitions drive both the Product page and the Bundles page.

### What changed

- Single source of truth for bundle definitions in `app/lib/bundleConfig.ts`.
- Single data access layer in `app/lib/bundleDataService.ts` for all bundle-related fetching.
- Product page loader calls `BundleDataService.fetchProductPageBundleData(handle)`.
- Bundles page loader calls `BundleDataService.fetchAllBundleData()`.
- UI components continue to render the same layouts; only data sourcing and helpers were centralized.

### Files

- `app/lib/bundleConfig.ts`: bundle types, collections, and bundle definitions.
- `app/lib/bundleDataService.ts`: centralized GraphQL queries and cache for bundles.
- `app/lib/bundleUtils.ts`: shared helpers for variants, prices, selections.
- `app/routes/($locale).products.$handle.tsx`: uses the data service for bundle data.
- `app/routes/($locale).bundles.tsx`: uses the data service to populate bundle products.

### Adding a new bundle

1. Define the bundle in `app/lib/bundleConfig.ts` under `BUNDLE_DEFINITIONS`.

```ts
export const BUNDLE_DEFINITIONS = {
  // ...existing
  myNewBundle: {
    type: BUNDLE_TYPES.BUNDLE, // or CROSS_SELL, LINEN_CROSS_SELL, etc.
    title: 'My Bundle – 10% Off',
    description: 'Short description here',
    discountType: 'automatic',
    discountValue: 10,
    minQuantity: 2, // if applicable
    eligibleCollections: ['oversized-polos'], // or product handles/collections per your logic
  },
} as const;
```

2. If the bundle needs specific products or collections at runtime, ensure `BundleDataService` fetches them.

- For collections: use `fetchCollectionProducts(collectionHandle)`.
- For specific products: use `fetchProduct(handle)`.
- If it needs to appear on the product page based on collection membership, `fetchProductPageBundleData` already returns: membership flags, `polos`, `caps`, `tops`, `linenShirt`, `linenPants`, and `complementaryProducts` (denim/polo cross-sell).

3. Render on Product page

- Product page computes `upsells` via `getProductUpsells` and `getBundleDefinition` from `bundleConfig`.
- `app/components/UpsellSection.tsx` maps `upsells` to the correct card component.
- If you add a new bundle `type`, add a case in `UpsellSection` to render the appropriate component.

4. Render on Bundles page

- The Bundles page already uses `fetchAllBundleData()` and renders existing bundle cards. To add a new card, follow existing sections’ patterns and use the same helpers from `bundleUtils`.

### Shared helpers

Use `app/lib/bundleUtils.ts` for:

- `getVariant`, `getVariantById`, `getVariantIdFromOptions`
- `getFirstColor`, `getFirstSize`, `getColorOptions`, `getSizeOptions`
- `getPriceInfo`, `calculateBundlePrice`
- `initializeProductSelections`, `initializeVariantSelections`

This avoids duplicating variant resolution or price math in components.

### Data service quick reference

```ts
import {createBundleDataService} from '~/lib/bundleDataService';

const dataService = createBundleDataService(storefront);

// Bundles page
const all = await dataService.fetchAllBundleData();

// Product page
const perProduct = await dataService.fetchProductPageBundleData(productHandle);
```

### Conventions

- Keep routing-related imports from `react-router` (not Remix).
- Prefer using the data service over inline GraphQL in routes/components.
- Reuse `bundleUtils` in all components for consistent behavior.
