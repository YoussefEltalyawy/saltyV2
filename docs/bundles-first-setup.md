# First bundle setup — runbook for the Shopify agent

> **Historical (already executed).** This runbook was carried out on
> 2026-11-18. The ten bundles it calls "built-in" have since been migrated to
> metaobject entries — the storefront no longer falls back to code. For the
> current model see [bundles-metaobject.md](./bundles-metaobject.md); for the
> migration see [bundles-migrate-to-metaobjects.md](./bundles-migrate-to-metaobjects.md).

Store: `15a94f-41.myshopify.com`
Prepared: 2026-11-18

This file is the instruction sheet to hand to the computer-use agent. It removes
the six test bundles and creates the client's first two real bundles, plus the
Shopify discounts that make them actually reduce the price.

## Before he starts

**Assumptions baked into this runbook — correct these first if they are wrong:**

| Client wording | What this runbook uses | Why |
|---|---|---|
| "jeans" | `Denim` collection (3 products: Salty Dune Jeans, Baggy Jeans, Washed Baggy Jeans) | The `New Winter + Jeans` collection is a mixed pool that also contains sweaters, zip-ups and sweatpants. |
| "sweatshirt" | Product list: `Crewneck`, `Made By Artist Crewneck`, `FW26 Crewneck`, `Basic Sweatshirt` | The `Crewnecks` collection also contains t-shirts, polos and two zip-ups, so it is not a clean sweatshirt pool. |
| "zipper jacket" | `Zip-ups` collection | 4 products: Basic, Studio, Salty, Core Zip-up. |

Nothing here needs the two metaobject definitions to be changed — they already
exist and are correct.

**Context the agent needs:**

- The production site (`saltyeg.com`) will **not** show these bundles yet. The
  new bundle code is not deployed. That is expected, not an error.
- The ten built-in bundles live in code and need no metaobject entries. Do not
  create entries for them.
- Free-gift bundles are priced by a **Shopify Buy X Get Y discount**, not by the
  metaobject. The entries only control what appears on the storefront.

---

## Step 1 — delete the test data (in this order)

1. **Content → Metaobjects → Bundle Definition** — delete these 6 entries:

   - `testCaps2`
   - `testHoodieCap`
   - `testCrewneck3`
   - `testTopsFreeCap`
   - `testProductPicks`
   - `testHidden`

   Open each entry → **⋯** → **Delete**.

2. Then **Content → Metaobjects → Bundle Slot** — delete **all 9 remaining
   entries** (labels: Cap ×4, Hoodie ×2, Free Cap, Top, Crewneck). They existed
   only for the tests.

Both lists should be empty when this step is done. Do not delete or edit
anything else.

## Step 2 — create 5 Bundle Slot entries

**Content → Metaobjects → Bundle Slot → Add entry** for each row:

| Label (display name) | Collection | Products | Quantity | Free gift |
|---|---|---|---|---|
| `Hoodie` | `Hoodies` | — | 1 | no |
| `Free Zip-Up` | `Zip-ups` | — | 1 | **yes** |
| `Jeans` | `Denim` | — | 1 | no |
| `Sweatshirt` | — | see below | 1 | no |
| `Free Cap` | `Caps` | — | 1 | **yes** |

For `Sweatshirt`, leave **Collection empty** and add these **4 products**
exactly, by title:

- `Crewneck`
- `Made By Artist Crewneck`
- `FW26 Crewneck`
- `Basic Sweatshirt`

Do **not** add knit sweaters or zip-ups to this slot.

## Step 3 — create 2 Bundle Definition entries

**Content → Metaobjects → Bundle Definition → Add entry**.

### Entry 1

| Field | Value |
|---|---|
| Bundle key | `hoodieFreeZipUp` |
| Title | `Any Hoodie + Free Zip-Up` |
| Description | `Buy any hoodie and choose any zip-up on us.` |
| Discount percent | `100` |
| Discount code | *leave empty* (automatic discount) |
| Sort order | `1` |
| Hide this bundle | unticked |
| Slots (in order) | `Hoodie`, then `Free Zip-Up` |

### Entry 2

| Field | Value |
|---|---|
| Bundle key | `jeansSweatshirtFreeCap` |
| Title | `Any Jeans + Sweatshirt + Free Cap` |
| Description | `Buy any jeans and any sweatshirt, and pick any cap free.` |
| Discount percent | `100` |
| Discount code | `JEANSCAP` |
| Sort order | `2` |
| Hide this bundle | unticked |
| Slots (in order) | `Jeans`, `Sweatshirt`, `Free Cap` |

## Step 4 — create the two Shopify discounts

**Discounts → Create discount.**

### Discount 1 — automatic Buy X Get Y

- Type: **Buy X get Y**
- Method: **Automatic discount**
- Name: `Free Zip-Up with any Hoodie`
- Customer buys: **1 item** from **Collection → Hoodies**
- Customer gets: **1 item** from **Collection → Zip-ups**, at **100% off**
- Maximum uses per order: **1**
- Leave the **Combinations** settings at their defaults (do not enable combining)

### Discount 2 — discount code, Buy X Get Y

- Type: **Buy X get Y**
- Method: **Discount code**
- Code: `JEANSCAP`
- Customer buys: **2 items** from `Denim` **plus** the four sweatshirt products
  (`Crewneck`, `Made By Artist Crewneck`, `FW26 Crewneck`, `Basic Sweatshirt`) —
  add them as one combined product/collection list
- Customer gets: **1 item** from **Collection → Caps**, at **100% off**
- Maximum uses per order: **1**
- Leave **Combinations** at defaults

Why a code here: Shopify cannot require "jeans **and** a sweatshirt" in a single
automatic rule. The storefront adds `JEANSCAP` automatically only when the exact
bundle is in the cart, and removes it when the bundle is broken, so customers
never type it.

## Step 5 — verify and report

1. Bundle Definition list shows **exactly 2** entries; Bundle Slot list shows
   **exactly 5**.
2. Neither entry is hidden, and the Slots order matches the tables above.
3. Both discounts exist and are active — screenshot the "Customer buys / gets"
   summary of each.
4. Report the handle of each of the 7 entries created, and the two discount
   names.

## Rules

- Do **not** create entries for the other bundles — the ten built-in ones live in
  code and need no entries.
- Do **not** alter the metaobject definitions, field keys or API types.
- Do **not** change any Theme, product, collection, order or customer.
- The production site will not show these yet; the bundle code is not deployed.

---

## After he reports back (developer checklist)

Not for the agent — this is what still has to be proven once the entries exist.

1. On the dev server (`localhost:3000`), `/bundles` shows exactly the two new
   bundles at the top (sort 1 and 2), then the ten built-ins, and no `TEST`
   entries. Wait up to 60s for the bundle cache.
2. A hoodie product page offers **Any Hoodie + Free Zip-Up**; jeans/sweatshirt
   pages offer **Any Jeans + Sweatshirt + Free Cap**.
3. Add each bundle to a real cart and confirm the free item lands at zero. The
   metaobject cannot prove this — only checkout can.
4. Break the bundle (remove the hoodie or jeans) and confirm the code is removed
   from the cart for `JEANSCAP`.
5. Decide with the client whether the automatic hoodie/zip-up discount should
   also apply to carts built outside the bundle page. If not, move it to a code
   (`HOODIEZIP`) and put that code on the bundle entry so the app gates it.
