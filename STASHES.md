# Git Stashes Documentation

This document tracks all saved git stashes for the bundle refactoring work. Use this as a reference when you want to retrieve or review these changes later.

**Last Updated:** December 2024  
**Current Branch:** `main` (up to date with `origin/main`)

---

## Stash List

To view all stashes:
```bash
git stash list
```

---

## Stash 0: "maybe commit: untracked files"

**Stash Reference:** `stash@{0}`  
**Message:** "maybe commit: untracked files (useBundle.ts, tsc_output_2.txt)"  
**Type:** Untracked files only

### Contents
- `app/hooks/useBundle.ts` - New hook file (181 lines)
- `tsc_output_2.txt` - TypeScript compilation output (144 lines)

### Purpose
These are untracked files that were part of the "maybe" commit but weren't included in the main stash because they were never committed to git.

### How to Retrieve
```bash
# Apply this stash (keeps it in stash list)
git stash apply stash@{0}

# Or apply and remove from stash
git stash pop stash@{0}
```

### Notes
- This should be applied **after** stash@{1} if you want to restore the complete "maybe" commit state
- The `useBundle.ts` hook is a key part of the bundle refactoring

---

## Stash 1: "maybe commit: bundle refactoring attempt"

**Stash Reference:** `stash@{1}`  
**Message:** "maybe commit: bundle refactoring attempt"  
**Type:** Modified and deleted files

### Summary
Major bundle system refactoring that consolidated bundle logic into reusable components and hooks. This was an earlier attempt at refactoring the bundle system.

### Files Changed (9 files)

#### Modified Files:
1. **`app/components/BundleRenderer.tsx`** (275 lines changed)
   - Refactored to use `useBundle` hook
   - Added support for slot-based configuration
   - Improved bundle type handling (BUNDLE, CROSS_SELL, TOPS_CAP_BUNDLE)
   - Added validation and disabled state handling

2. **`app/components/ProductBundleCard.tsx`** (54 lines changed)
   - Added `compact` and `hideOptions` props
   - Improved variant selection UI

3. **`app/components/UpsellSection.tsx`** (214 lines changed)
   - Major simplification: removed hardcoded bundle logic
   - Now uses `getBundleProps()` helper function
   - Consolidated bundle rendering logic

4. **`app/lib/bundleConfig.ts`** (21 lines changed)
   - Added `handle` property to all bundle definitions
   - Fixed type safety issues with `eligibleProducts` and `eligibleCollections`

5. **`app/lib/bundleDataService.ts`** (21 lines changed)
   - Minor formatting and whitespace fixes

6. **`app/lib/bundleUtils.ts`** (42 lines added)
   - New utility functions for bundle handling

7. **`app/routes/($locale).bundles.tsx`** (865 lines removed, significant simplification)
   - Removed hardcoded bundle rendering logic
   - Simplified to use generic `BundleRenderer` component
   - Removed individual bundle card components

8. **`app/routes/($locale).products.$handle.tsx`** (69 lines changed)
   - Removed individual bundle card imports
   - Added manual bundle addition logic for specific conditions
   - Fixed type issues with image and metafield handling

#### Deleted Files:
9. **`bundle-upsell-card-fixed.tsx`** (440 lines deleted)
   - Removed old bundle upsell card component
   - Functionality moved to `BundleRenderer`

### Key Changes
- **Consolidation**: Moved from multiple specialized components to a unified `BundleRenderer`
- **Hook-based**: Introduced `useBundle` hook for state management
- **Type Safety**: Improved TypeScript type handling
- **Code Reduction**: Removed ~865 lines of repetitive code

### Net Impact
- **Total Changes:** 907 insertions, 1419 deletions
- **Net:** -512 lines (significant code reduction)

### How to Retrieve
```bash
# Apply this stash (keeps it in stash list)
git stash apply stash@{1}

# Or apply and remove from stash
git stash pop stash@{1}
```

### Notes
- This was committed as "maybe" on Nov 20, 2025
- Contains a more complete refactoring than stash@{2}
- Includes the `useBundle` hook implementation
- May have some unfinished or experimental code

---

## Stash 2: "Bundle refactoring: slot-based configuration system"

**Stash Reference:** `stash@{2}`  
**Message:** "Bundle refactoring: slot-based configuration system"  
**Type:** Modified files

### Summary
Refactored bundle configuration to use a declarative slot-based system. This is a cleaner, more maintainable approach that makes bundle definitions more flexible.

### Files Changed (8 files)

#### Modified Files:
1. **`app/components/BundleRenderer.tsx`** (2 lines changed)
   - Updated button text to show "Selection Unavailable" when invalid

2. **`app/components/UpsellSection.tsx`** (179 lines removed, 40 lines added)
   - **Major simplification**: Removed all hardcoded bundle logic (~175 lines)
   - Now uses `resolveBundleData()` utility function
   - Much cleaner and more maintainable

3. **`app/hooks/useBundle.ts`** (6 lines changed)
   - Enhanced validation to check variant availability (`availableForSale`)
   - Better error handling for out-of-stock variants

4. **`app/lib/bundleConfig.ts`** (128 lines changed)
   - **Major refactor**: Converted all bundles to use `slots` array
   - Replaced `productIds`, `complementaryProductIds`, `collectionRestriction` with slot-based config
   - Each slot defines:
     - `sourceType`: `'collection'`, `'product_handle'`, or `'product_list'`
     - `sourceValue`: collection ID/handle or product IDs/handles
     - `title`: display title
     - `quantity`: number of slots (for multi-quantity bundles)

5. **`app/lib/bundleDataService.ts`** (99 lines added)
   - New `fetchBundleResources()` method
   - Fetches all needed products/collections in parallel
   - Optimized data fetching

6. **`app/lib/bundleUtils.ts`** (37 lines added)
   - New `resolveBundleData()` function
   - Resolves products from slot configurations
   - Handles all slot source types

7. **`app/routes/($locale).bundles.tsx`** (136 lines removed, 45 lines added)
   - Removed hardcoded product mapping
   - Now uses generic `resolveBundleData()` function
   - Much simpler and more maintainable

8. **`app/routes/($locale).products.$handle.tsx`** (24 lines added)
   - Added `resources` object construction
   - Passes product/collection data to `UpsellSection`

### Key Changes
- **Slot-based Configuration**: Bundles now defined declaratively with slots
- **Dynamic Resolution**: Products resolved at runtime from slot configs
- **Parallel Fetching**: Optimized data loading with `fetchBundleResources()`
- **Better Validation**: Checks variant availability before allowing add to cart
- **Code Simplification**: Removed ~300 lines of repetitive code

### Net Impact
- **Total Changes:** 307 insertions, 304 deletions
- **Net:** +3 lines (essentially neutral, but much cleaner code)

### How to Retrieve
```bash
# Apply this stash (keeps it in stash list)
git stash apply stash@{2}

# Or apply and remove from stash
git stash pop stash@{2}
```

### Notes
- This is the **newer** refactoring approach
- More focused on configuration-driven design
- Better separation of concerns
- Easier to add new bundle types

---

## Comparison: Stash 1 vs Stash 2

| Aspect | Stash 1 ("maybe") | Stash 2 (Slot-based) |
|--------|-------------------|----------------------|
| **Approach** | Component consolidation | Configuration-driven |
| **Hook** | Includes `useBundle` hook | Uses existing hooks |
| **Configuration** | Still uses old config format | New slot-based config |
| **Code Reduction** | -512 lines | +3 lines (cleaner) |
| **Completeness** | More complete (includes hook) | More focused on config |
| **Maintainability** | Good | Excellent |
| **Flexibility** | Good | Excellent |

---

## Recommended Workflow

### To Review Stash 1 ("maybe" commit):
```bash
# Apply the main changes
git stash apply stash@{1}

# Then apply the untracked files
git stash apply stash@{0}

# Review the changes
git status
git diff

# If you want to keep working on it
# Make your changes and commit

# If you want to discard
git reset --hard HEAD
```

### To Review Stash 2 (Slot-based):
```bash
# Apply the changes
git stash apply stash@{2}

# Review the changes
git status
git diff

# If you want to keep working on it
# Make your changes and commit

# If you want to discard
git reset --hard HEAD
```

### To Combine Both Approaches:
You might want to:
1. Apply stash@{2} first (slot-based config)
2. Then selectively apply parts of stash@{1} (like the `useBundle` hook)
3. Merge the best of both approaches

---

## Useful Git Stash Commands

```bash
# List all stashes
git stash list

# View what's in a stash (without applying)
git stash show stash@{0}
git stash show -p stash@{0}  # With full diff

# Apply a stash (keeps it in stash list)
git stash apply stash@{0}

# Apply and remove from stash list
git stash pop stash@{0}

# Delete a stash without applying
git stash drop stash@{0}

# Clear all stashes (be careful!)
git stash clear
```

---

## Notes

- All stashes are safe and won't be lost unless you explicitly delete them
- You can apply stashes multiple times if needed
- Stashes are branch-independent (you can apply them on any branch)
- Consider creating a branch before applying stashes if you want to experiment:
  ```bash
  git checkout -b experiment-bundle-refactor
  git stash apply stash@{2}
  ```

---

## Questions to Consider

Before applying these stashes, consider:

1. **Do you want the slot-based configuration system?** (Stash 2)
   - More maintainable
   - Easier to add new bundles
   - Better separation of concerns

2. **Do you need the `useBundle` hook?** (Stash 1)
   - More complete state management
   - Better validation
   - Could be combined with Stash 2

3. **Which approach aligns better with your goals?**
   - Stash 1: More complete but potentially more complex
   - Stash 2: Cleaner, more focused, but might need the hook from Stash 1

---

**Remember:** These stashes are your safety net. Take your time to review and decide which approach works best for your project!
