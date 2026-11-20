# Bundles

Bundles are driven by one small model: **a bundle is an ordered list of slots**,
and each slot is a pool the customer picks from.

```
Bundle Definition: Zip Up + Sweatpants
  discount_percent: 10
  discount_code:    XEENF2JK81SS
  slots:
    - Slot "Zip Up"      → collection zip-ups
    - Slot "Sweatpants"  → collection sweatpants
```

There is no fixed slot count. A 3-product set is three slots; a “pick any 5”
bundle is one slot with quantity 5. Everything else is derived from the slots:
which product pages show the bundle, how many pickers to draw, the card labels,
and whether the cart qualifies for the discount.

Bundles are defined entirely in Shopify — see
[bundles-metaobject.md](./bundles-metaobject.md).

---

## Where things live

| File | Role |
|---|---|
| `app/lib/bundleConfig.ts` | Slot model, runtime registry, slot helpers. |
| `app/lib/bundleMetaobject.ts` | `salty_bundle` + `salty_bundle_slot` query, parser, and definition builder. |
| `app/lib/bundleDataService.ts` | Loads definitions, fetches collection/product pools, resolves slots per page. |
| `app/lib/bundleDiscounts.ts` | Decides when a cart qualifies, and which codes it should carry. |
| `app/lib/bundleUtils.ts` | Variant helpers used by the pickers. |
| `app/components/BundlesPageBundleCard.tsx` | Standard card: one picker per slot, pricing, add to cart. |
| `app/components/ProductBundleCard.tsx` | One slot picker (product, colour, size). |
| `app/components/FreeGiftBundleCard.tsx` | Card for bundles with a free slot. |
| `app/components/UpsellSection.tsx` | Product-page renderer. |
| `app/routes/($locale).bundles.tsx` | `/bundles` page. |
| `app/routes/($locale).cart.tsx` | Keeps bundle discount codes in sync with the cart. |
| `scripts/setup-bundle-metaobject.mjs` | Creates or tops up both metaobject definitions. |

---

## Metaobject shape

There are two Shopify metaobject types:

```
salty_bundle_slot                 salty_bundle
  label                             bundle_key
  collection                        title
  products                          description
  quantity                          hidden
  free                              discount_percent
                                    discount_code
                                    sort_order
                                    slots  ── list.metaobject_reference ──▶ salty_bundle_slot
```

`salty_bundle.slots` is a `list.metaobject_reference`, so a bundle can point at
any number of slot entries. The storefront query walks one level deeper to read
the referenced slots:

```graphql
metaobjects(type: "salty_bundle", first: 50) {
  nodes {
    fields {
      key
      value
      references(first: 20) {
        nodes {
          ... on Metaobject {
            type
            fields {
              key
              value
              references(first: 20) { nodes { ... on Product { handle } ... on Collection { handle } } }
            }
          }
        }
      }
    }
  }
}
```

The order of the `slots` list is the order the merchant arranged in Shopify
admin, and that is the order the pickers render in.

The parser prefers `slots`. If an entry has no slot references, it falls back to
the original flat fields (`collection`, `products`, `quantity`,
`second_collection`, `second_products`, `second_quantity`, `second_free`) so
older entries keep working.

---

## Adding a bundle

Create the **Bundle Slot** entries first, then a **Bundle Definition** that
lists them. No code or deploy is involved:

1. **Content → Metaobjects → Bundle Slot → Add entry** — one entry per picker
   group (collection or products, quantity, free flag).
2. **Content → Metaobjects → Bundle Definition → Add entry** — key, title,
   description, discount percent/code, sort order, and the slots in order.
3. Create the matching Shopify **Discount** (see
   [bundles-metaobject.md](./bundles-metaobject.md#discounts)).
4. Save; changes appear within about a minute.

`/bundles` renders the entry automatically, product pages for every product in
its pools show it, and the cart applies/removes its discount code automatically.

### Slot fields

| Field | Meaning |
|---|---|
| `label` | Card label. Defaults to the collection/product title. |
| `collection` | Collection handle or numeric ID to pull products from. |
| `productHandles` | Explicit product handles, instead of `collection`. |
| `productIds` | Explicit numeric product IDs, instead of `collection`. |
| `quantity` | Number of pickers to render from this pool. Defaults to 1. |
| `free` | Show these picks as a free gift (excluded from the card total). |

`quantity` is expanded into individual pickers, so `{ collection: 'tops',
quantity: 4 }` renders four independent top pickers.

---

## Offer types

Offer types are **recipes**, not a separate field. The slot configuration
decides how the card behaves, so there is no dead “bundle type” setting to keep
in sync.

| Offer type | Slot configuration |
|---|---|
| **Fixed / classic** | One slot per product, `quantity: 1` each. |
| **Mix & match / pick any N** | One slot with `quantity: N`. |
| **Multipack** | One slot with `quantity: N` (same as mix & match). |
| **BOGO / buy N get M free** | Paid slot(s) plus one or more slots with `free: true`. |
| **Quantity break / tiers** | Separate bundle entries at different percentages (e.g. 2 for 10%, 3 for 15%). |

Bundles containing a free slot render through `FreeGiftBundleCard`; everything
else renders through `BundlesPageBundleCard`. That is the only branch.

---

## Data flow

```
salty_bundle metaobject
        │
        ▼
bundleConfig registry   (empty until the metaobject is read)
        │
        ┌──────────────┴───────────────┐
        ▼                              ▼
fetchProductPageBundleData()     fetchAllBundleData()
        │                              │
  activeBundleKeys +            bundles + bundleSlots
  bundleSlots + definitions
        │                              │
        ▼                              ▼
  UpsellSection                  bundles route
```

`fetchBundleDefinitions()` caches the metaobject result for 60 seconds. The
metaobjects are the **only** source: if they cannot be read, no bundles are
shown (and existing cart codes are left untouched).

---

## How applicability works

A bundle shows on a product page when **any of its slots matches the product**:

- the product is in the slot's collection, or
- the product handle/ID is listed in the slot.

The viewed product is moved to the front of each matching picker pool, so the
page the customer is on is preselected.

`/bundles` shows every enabled bundle that resolves to at least one product in
every slot.

---

## Cart discount handling

`cartQualifiesForBundle()` walks the bundle's slots and consumes one matching
cart unit per slot. A “4 tops + 1 free cap” bundle therefore needs four top units
and one cap unit, and two slots over the same collection cannot double-count a
single item.

- Codes belonging to bundles are added/removed automatically.
- Codes the customer typed are preserved.
- Automatic (code-less) bundles are not touched by the cart route.

---

## Built-in bundles

| Key | Slots |
|---|---|
| `zipUpSweatpantsBundle` | 1 zip-up + 1 sweatpants |
| `hoodieSweatpantsBundle` | 1 hoodie + 1 sweatpants |
| `collection3ItemsBundle` | 3 from Made By Artist W'25 |
| `linenCrossSell` | Linen Shirt + Linen Pants |
| `crossSellDenimPolo` | 1 denim + 1 polo |
| `poloBundle2` | 2 polos |
| `poloBundle3` | 3 polos |
| `topsBundle2` | 2 tops |
| `topsBundle3` | 3 tops |
| `topsCapBundle` | 4 tops + 1 free cap |
