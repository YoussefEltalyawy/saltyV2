# Managing bundles in Shopify (no code)

Bundles are configured with **two metaobject types**:

| Object | What one entry is |
|---|---|
| **Bundle Slot** (`salty_bundle_slot`) | One picker group: a collection or a few products, how many the customer picks, and whether it is free. |
| **Bundle Definition** (`salty_bundle`) | One bundle: title, discount, and an ordered list of slots. |

A bundle can have **any number of slots**, so the same model covers a 2-piece
outfit, a 3-product set, a “pick any 5” bundle, and a buy-N-get-one-free offer.

There are no bundles in code: these two lists are the only source, so the
storefront shows exactly the entries you create. Changes appear within about a
minute.

---

## The idea in one sentence

A bundle is an **ordered list of slots**, and each slot is a pool the customer
picks from (a collection, or specific products) plus how many they pick.

```
Zip Up + Sweatpants bundle
  Slot 1: pick 1 from the "zip-ups" collection
  Slot 2: pick 1 from the "sweatpants" collection
```

```
Buy 4 Tops, Get 1 Cap Free
  Slot 1: pick 4 from the "tops" collection
  Slot 2: pick 1 from the "caps" collection   ← marked free
```

```
Three-product set
  Slot 1: one specific product (the shirt)
  Slot 2: one specific product (the pants)
  Slot 3: one specific product (the cap)
```

The bundle card, the product pickers, which product pages show the bundle, and
the cart discount check are all derived from the slots.

---

## One-time setup

You only do this once, and **order matters**: create **Bundle Slot** first, then
**Bundle Definition** (because the bundle points at the slot definition).

### Option A — run the setup script

With an Admin API token that has `write_metaobject_definitions`:

```bash
npm run setup:bundles -- --dry-run   # preview both definitions
npm run setup:bundles                # create, or add any missing fields
```

The script is safe to re-run. If the definitions already exist, it adds any
fields that are missing and leaves the rest alone.

### Option B — create them by hand

Shopify admin → **Settings → Custom data → Metaobjects**.

#### 1. Create the **Bundle Slot** definition

Click **Add definition**. Name: `Bundle Slot`. API type: `salty_bundle_slot`.

Add these fields (the **key** must match exactly):

| Field name | Key | Type | Notes |
|---|---|---|---|
| **Label** | `label` | Single line text | Recommended. Shown above the picker and used as the slot name in Shopify admin, e.g. “Free Cap”. |
| **Collection** | `collection` | Collection | Pick from a collection. |
| **Products** | `products` | Product → **List of values** | Pick from specific products instead of a collection. |
| **Quantity** | `quantity` | Integer | How many the customer picks. Leave blank for 1. |
| **Free gift** | `free` | Boolean | Show this slot as free. |

Set **Storefront access** to **Read access** for the definition, then save.

#### 2. Create the **Bundle Definition** definition

Click **Add definition**. Name: `Bundle Definition`. API type: `salty_bundle`.

Add these fields:

| Field name | Key | Type | Notes |
|---|---|---|---|
| **Bundle key** | `bundle_key` | Single line text | Required. Built-in key to edit it, or a new word for a new bundle. |
| **Title** | `title` | Single line text | Heading on the card. |
| **Description** | `description` | Multi-line text | Sentence under the heading. |
| **Hide this bundle** | `hidden` | Boolean | Tick to hide without deleting. |
| **Discount percent** | `discount_percent` | Decimal | Percent off, e.g. `10`. Use `100` for a free item. |
| **Discount code** | `discount_code` | Single line text | Optional Shopify code. Leave blank for an automatic discount. |
| **Discount applies to** | `discount_applies_to` | Single line text | `last` for Buy X Get Y codes, `all` when the code reduces every item. Blank = `all`. |
| **Sort order** | `sort_order` | Integer | Lower numbers appear first on `/bundles`. |
| **Slots** | `slots` | Metaobject → **List of values** | Select the **Bundle Slot** definition as the allowed type. |

Set **Storefront access** to **Read access** for the definition too, then save.

> When adding the **Slots** field, choose **Metaobject** as the type, turn on
> **List of values**, and pick the **Bundle Slot** definition. The store reads
> the slots in the order they are listed.

---

## Add a bundle

1. Shopify admin → **Content → Metaobjects → Bundle Slot → Add entry**.
2. Create one slot for each picker group. Save each one.
3. Go to **Bundle Definition → Add entry**.
4. Fill in the bundle fields and add the slots under **Slots**, in the order
   customers should see them (drag to reorder).
5. Save. Changes appear on the storefront within about a minute.

Every bundle on the store comes from an entry here. Create one entry per bundle
you want to show.

---

## Offer recipes

### Fixed / classic bundle (one of each product)

Use **one slot per product**.

| Slot | Collection or products | Quantity | Free |
|---|---|---|---|
| 1 | specific product: Linen Shirt | 1 | no |
| 2 | specific product: Linen Pants | 1 | no |
| 3 | specific product: Linen Cap | 1 | no |

The customer gets three independent pickers and must choose one from each.

### Mix & match / “pick any N”

Use **one slot** and set the quantity.

| Slot | Collection or products | Quantity |
|---|---|---|
| 1 | collection: Tops | 3 |

That renders three top pickers that all draw from the same collection. Use the
same pattern for “build your own box” bundles.

### Multipack

Same as mix & match: one slot, quantity N (for example 3, 5, or 10). Title it
“3-Pack”, “5-Pack”, and so on.

### BOGO / buy N, get M free

Add the paid picks as normal slots, then add a slot marked **Free gift**.

**Buy 2 Tops, Get 1 Cap Free**

| Slot | Collection or products | Quantity | Free |
|---|---|---|---|
| 1 | collection: Tops | 2 | no |
| 2 | collection: Caps | 1 | **yes** |

**Buy 1 Get 1 Free (same collection)**

| Slot | Collection or products | Quantity | Free |
|---|---|---|---|
| 1 | collection: Hoodies | 1 | no |
| 2 | collection: Hoodies | 1 | **yes** |

Set **Discount percent** to `100` when the only discount is the free item.

### Quantity breaks / tiers

Create **one Bundle Definition per tier**, each with a different
`discount_percent` and `discount_code` (or automatic discount):

| Bundle key | Title | Percent | Slot |
|---|---|---|---|
| `poloBundle2` | 2 Polos – 10% Off | 10 | Polos, quantity 2 |
| `poloBundle3` | 3 Polos – 15% Off | 15 | Polos, quantity 3 |

This is how the polo and top bundles work, and it lets each tier have its own
Shopify discount.

### Collection pool vs specific products

- **Collection**: the picker lists the first 50 products in that collection.
  Best for “any hoodie”, “any top”, or a seasonal collection.
- **Products**: the picker lists only the products you add. Best for a fixed set
  (shirt + pants + cap) or a small curated group. Supports up to 20 products per
  slot.

Use one or the other per slot. If both are set, the picker shows both pools
combined.

---

## Bundle fields

`Bundle key` is the only required field. Anything you leave blank gets a
sensible default.

| Field name | Key | Type | What it does |
|---|---|---|---|
| **Bundle key** | `bundle_key` | Single line text | Stable id, e.g. `winterSet`. Used internally by the product page and cart. |
| **Title** | `title` | Single line text | Heading on the bundle card. |
| **Description** | `description` | Multi-line text | Sentence under the heading. |
| **Hide this bundle** | `hidden` | Boolean | Tick to hide the bundle. |
| **Discount percent** | `discount_percent` | Decimal | Percent off, e.g. `10`. Use `100` when the bundle is only a free gift. |
| **Discount code** | `discount_code` | Single line text | Optional Shopify code. Leave blank to rely on an automatic discount. |
| **Sort order** | `sort_order` | Integer | Lower numbers appear first on `/bundles`. |
| **Slots** | `slots` | List of Bundle Slot entries | Ordered picker groups. |

### Slot fields

| Field name | Key | Type | What it does |
|---|---|---|---|
| **Label** | `label` | Single line text | Recommended. Defaults to the collection title or first product title. |
| **Collection** | `collection` | Collection | Pull products from this collection. |
| **Products** | `products` | Product list | Use these specific products instead. |
| **Quantity** | `quantity` | Integer | Number of pickers in this group. Defaults to 1. |
| **Free gift** | `free` | Boolean | Show the picks as free. |

---

## Bundle keys in use

Keys carried over from the original code definitions during migration. Keep
them if you want continuity; new bundles can use any short word.

```
hoodieJeansFreeJacket      Any Hoodie + Any Jeans + Free Jacket
jeansSweatshirtFreeCap     Any Jeans + Sweatshirt + Free Cap
zipUpSweatpantsBundle      Zip Up + Sweatpants, 10%
hoodieSweatpantsBundle     Hoodie + Sweatpants, 10%
collection3ItemsBundle     Any 3 from Made By Artist W'25, 15%
linenCrossSell             Linen Shirt + Linen Pants, 15% (automatic)
crossSellDenimPolo         Denim + Polo, 10% (automatic)
poloBundle2                2 Polos, 10% (automatic)
poloBundle3                3 Polos, 15% (automatic)
topsBundle2                2 Tops, 10%
topsBundle3                3 Tops, 15%
topsCapBundle              4 Tops + 1 Free Cap
```

---

## Discounts

The metaobjects only control what customers see. The actual money off is a
Shopify discount.

- **With a discount code:** paste the code into **Discount code**. The store
  applies it when the bundle is added, and the cart removes it again if the
  customer breaks the bundle.
- **Without a code:** create an automatic discount in **Discounts** with the same
  conditions (e.g. “Buy 2 from Oversized Polos, get 10% off”). Leave **Discount
  code** blank.

A bundle can look set up and still give no money off if no matching discount
exists. Check **Discounts** whenever you add or change a bundle. For a free-gift
slot, the discount must make that item 100% off.

---

## Upgrading from the older two-slot entries

Earlier entries stored slot 1 and slot 2 directly on the bundle
(`collection`, `products`, `quantity`, `second_collection`, `second_products`,
`second_quantity`, `second_free`). Those entries **still work**.

To move an old entry to the new model:

1. Create **Bundle Slot** entries for each of its pickers.
2. Edit the bundle entry and add them under **Slots**.
3. Leave the old flat fields blank; the store prefers **Slots** when it has
   entries.

You can then remove the old flat fields from the definition if you no longer
need them.

---

## Troubleshooting

**The bundle does not appear.**

1. Check that **Storefront access** is set to **Read** on both definitions.
2. Check that every slot has either a **Collection** or at least one **Product**.
3. Check that the bundle has at least one slot and is not ticked as **Hide this
   bundle**.
4. Wait a minute for the 60-second cache, then refresh.
5. If you edited the definition, confirm the **Slots** field still points at the
   **Bundle Slot** definition.

**The bundle appears but there is no money off.**

Create the matching Shopify discount (code or automatic). See **Discounts**
above. The metaobject only controls the storefront cards.

**A product page does not show the bundle.**

The product must be in one of the bundle's slot collections, or listed directly
in one of its slots.

---

## Notes

- **Caching:** definitions are cached for 60 seconds per server instance. Wait a
  minute after saving.
- **Deleting an entry** removes the bundle from the storefront. To take a
  bundle off the site temporarily, tick **Hide this bundle** instead.
- **Storefront access** on both definitions must stay **Read**. The metaobjects
  are the only source of bundles; without access, no bundles render.
- **Limits:** up to 20 slots per bundle, 20 specific products per slot, 50
  products per collection slot, and 100 variants per product.
- **Slot order:** drag slots in the **Slots** field to set the order customers
  see. The first slot is the main picker.
- **Free slots** must still be added to the cart; the free one is priced at zero
  by the Shopify discount, not by the cart.
