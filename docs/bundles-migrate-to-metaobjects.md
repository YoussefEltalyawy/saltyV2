# Migrate the ten code-defined bundles into metaobjects

Prompt to give the Shopify admin agent. It creates the **Bundle Slot** and
**Bundle Definition** entries for the ten bundles that used to live in
`app/lib/bundleConfig.ts`, so the storefront (which no longer has code-defined
bundles) shows them again.

Store: `15a94f-41.myshopify.com`

> Do this before deploying the code change that removed the hardcoded bundle
> definitions. Until these entries exist, the storefront shows only the two
> bundles already configured in Shopify.

---

## Prompt

> **Task: create metaobject entries for ten bundles so the storefront shows them again.**
>
> Work in Shopify admin for store `15a94f-41.myshopify.com`. You are **not**
> changing code or the live theme.
>
> ### Context
>
> The `Bundle Slot` and `Bundle Definition` metaobject definitions already
> exist and are correct — do **not** modify the definitions, their fields, their
> keys, or their Storefront access.
>
> Two bundles already exist and must not be touched:
> `any-hoodie-any-jeans-free-jacket` (`hoodieJeansFreeJacket`) and
> `any-jeans-sweatshirt-free-cap` (`jeansSweatshirtFreeCap`).
>
> Five Bundle Slot entries exist: `Hoodie`, `Jeans`, `Free Cap`,
> `Sweatshirt`, `Free Jacket`. **Do not edit or delete any of them.** You will
> reuse `Hoodie`, `Jeans`, and `Free Cap`.
>
> No new Shopify discounts are needed — all ten discounts already exist.
>
> ### Step 1 — create 11 Bundle Slot entries
>
> **Content → Metaobjects → Bundle Slot → Add entry.** For each row, set the
> entry's display name to the first column. Leave any field marked "—" empty.
>
> | Display name | Label field | Collection | Products | Quantity | Free gift |
> |---|---|---|---|---|---|
> | Zip Up | `Zip Up` | `Zip-ups` | — | 1 | no |
> | Sweatpants | `Sweatpants` | `Sweatpants` | — | 1 | no |
> | Artist Products | *(leave empty)* | `Made By Artist W'25` | — | 3 | no |
> | Linen Shirt | `Linen Shirt` | — | `Linen Shirt` | 1 | no |
> | Linen Pants | `Linen Pants` | — | `Linen Pants` | 1 | no |
> | Polo (single) | *(leave empty)* | `Oversized Polos` | — | 1 | no |
> | Polos (2-pack) | *(leave empty)* | `Oversized Polos` | — | 2 | no |
> | Polos (3-pack) | *(leave empty)* | `Oversized Polos` | — | 3 | no |
> | Tops (2) | *(leave empty)* | `Tops` | — | 2 | no |
> | Tops (3) | *(leave empty)* | `Tops` | — | 3 | no |
> | Tops (4) | `Top` | `Tops` | — | 4 | no |
>
> Notes:
> - Each entry uses **either** Collection **or** Products, never both.
> - `Products` is a list: add the product named exactly `Linen Shirt` /
>   `Linen Pants`.
> - The Label field is the text shown above the picker. Leaving it empty makes
>   the card use the collection's name, which is what these bundles used before.
>
> ### Step 2 — create 10 Bundle Definition entries
>
> **Content → Metaobjects → Bundle Definition → Add entry.** Set **Bundle key**
> exactly as written, leave **Hide this bundle** unticked, and add the slots
> under **Slots** in the order shown (top to bottom).
>
> | Bundle key | Title | Description | Discount % | Discount code | Sort | Slots in order |
> |---|---|---|---|---|---|---|
> | `zipUpSweatpantsBundle` | `Zip Up + Sweatpants Bundle – 10% Off!` | `Get a zip up and any sweatpants and save 10%.` | 10 | `XEENF2JK81SS` | 10 | `Zip Up`, `Sweatpants` |
> | `hoodieSweatpantsBundle` | `Hoodie + Sweatpants Bundle – 10% Off!` | `Get a hoodie and any sweatpants and save 10%.` | 10 | `H3KXGDBA3XKB` | 20 | existing `Hoodie`, `Sweatpants` |
> | `collection3ItemsBundle` | `Any 3 Products from "Made By Artist W'25" – 15% Off!` | `Pick any 3 products from the collection and save 15%.` | 15 | `3ITEMS15` | 30 | `Artist Products` |
> | `linenCrossSell` | `Linen Shirt + Pants Bundle – 15% Off!` | `Complete your linen look and save 15% on the total bundle price.` | 15 | *(leave empty)* | 40 | `Linen Shirt`, `Linen Pants` |
> | `crossSellDenimPolo` | `Denim + Polo Bundle – 10% Off!` | `Add a matching piece to complete your look and save 10%.` | 10 | *(leave empty)* | 50 | existing `Jeans`, `Polo (single)` |
> | `poloBundle2` | `2 Polos Bundle – 10% Off!` | `Pick any 2 polos (choose color and size for each) and get 10% off.` | 10 | *(leave empty)* | 60 | `Polos (2-pack)` |
> | `poloBundle3` | `3 Polos Bundle – 15% Off!` | `Pick any 3 polos (choose color and size for each) and get 15% off.` | 15 | *(leave empty)* | 70 | `Polos (3-pack)` |
> | `topsBundle2` | `2 Tops Bundle – 10% Off!` | `Pick any 2 tops (choose color and size for each) and get 10% off.` | 10 | `2TOPS10` | 80 | `Tops (2)` |
> | `topsBundle3` | `3 Tops Bundle – 15% Off!` | `Pick any 3 tops (choose color and size for each) and get 15% off.` | 15 | `3TOPS15` | 90 | `Tops (3)` |
> | `topsCapBundle` | `Buy 4 Tops Get 1 Cap Free!` | `Choose 4 tops and get a cap of your choice absolutely free.` | 100 | `4TOPSFREECAP` | 100 | `Tops (4)`, existing `Free Cap` |
>
> Use the exact punctuation in the titles (the dash is `–`, not `-`, and the
> artist title keeps its quotes). Do not let the admin "fix" them.
>
> ### Step 3 — verify and report
>
> 1. **Bundle Slot** list contains **16** entries: the 5 that already existed
>    plus the 11 you created. None of the original 5 were edited or deleted.
> 2. **Bundle Definition** list contains **12** entries: the 2 that already
>    existed plus the 10 you created.
> 3. None of the 12 is hidden (`Hide this bundle` unticked), and sort orders are
>    exactly as listed above.
> 4. Each new bundle's **Slots** list matches the order in the table.
> 5. Report the handle of every entry you created and the final counts.
>
> ### Rules
>
> - Do **not** create, edit, or delete any Shopify **Discount**. They already
>   exist.
> - Do **not** touch products, collections, orders, customers, or the theme.
> - Do **not** create entries for the two bundles that already exist.
> - Do **not** change the `Bundle Slot` / `Bundle Definition` definitions.
> - The storefront code is being updated separately; don't treat any storefront
>   state as an error.

---

## After the agent reports back (developer checklist)

1. Wait a minute for the 60-second bundle cache, then open `/bundles` on the dev
   server: 12 cards, ordered sort 1, 2, 10 … 100, plus `SALTY.` as the last
   heading.
2. Check a hoodie, a jean, a polo, and a top product page: each shows the
   expected bundles and no disabled pickers.
3. Run one cart test with a coded built-in (e.g. `2TOPS10`) and one automatic
   built-in (`poloBundle2`): code applies/removes correctly, prices change.
4. Only then deploy the code that removed `DEFAULT_BUNDLE_DEFINITIONS`.
