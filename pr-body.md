## management UX (#302)

Improve the manage-glosses interface UX with better information visibility, sorting, filtering, and batch operations.

### Changes

**Phase 0 — Parallel fetches:**
- Refactored `managedlist` template in `deer-render.js` to use `getExpandedURL()` for parallel fetches instead of sequential DEER expand calls
- Added `managedListCache` Map for caching expanded Gloss entities

**Phase 1 — New columns:**
- Added checkbox, contributor, modified date, and witness count columns to list rows
- Created `buildManagedListItem()` helper function for building complete `<li>` rows
- Added `getCreator()`, `getModifiedDate()`, `getWitnessCount()` helpers in `deer-utils.js`

**Phase 2 — Column sorting:**
- Added sortable column headers with toggle direction
- Default sort: Modified date descending
- Created `sortManagedList()` function for sorting by data attributes

**Phase 3 — Filters:**
- Added contributor text filter
- Added modified date text filter
- Added publication status facet filters (Published, Unpublished)
- Created `applyFilters()` function with AND logic between filter types

**Phase 4 — Batch operations:**
- Added select-all checkbox in column header
- Added batch action bar with Publish, Unpublish, and Delete buttons
- Added `getSelectedGlosses()` and `updateBatchSelectionCount()` helpers
- Added `unpublishGloss()` and `deleteGloss()` functions in `shared.js`

**Phase 5 — Modal enrichment:**
- Enriched `ManageGlossModal` with full expanded entity data
- Modal now displays contributor, modified date, and witness count
- Updated list click handler to pass full entity data from `managedListCache`

**Phase 6 — CSS polish:**
- Added styles for column headers, batch actions bar, filter sections
- Added styles for modal metadata rows
- Consistent typography and spacing

### Files Modified
- `js/deer-render.js` — managedlist template, sorting, filtering, batch operations
- `js/deer-utils.js` — entity metadata extraction helpers
- `js/shared.js` — unpublishGloss and deleteGloss functions
- `js/manageGlossModal.js` — modal enrichment with entity data
- `css/gloss.css` — styling for new UI elements

Closes #302
