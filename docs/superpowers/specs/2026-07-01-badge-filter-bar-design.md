# Badge Filter Bar — Design Spec

**Date:** 2026-07-01  
**Scope:** Frontend only (`badgr-ui`). No `badgr-server` changes required.

---

## Problem

The authenticated badge list for both institutions and networks has no way to search or narrow results. Managers must scroll the full list to find a specific badge.

---

## Solution Overview

A shared `BadgeFilterComponent` (presentational) is placed above the badge datatable in both the institution and network authenticated views. Filtering runs entirely client-side — all badge data is already loaded. The filter bar supports keyword search, a date range (From / To), and a Reset button. Filters combine with AND logic.

---

## Scope

| View | Change |
|------|--------|
| Institution badge list (authenticated) | Add filter bar above datatable |
| Network badge list (authenticated) | Add filter bar above datatable |
| Public institution view | **Unchanged** |
| Public network view | **Unchanged** |

---

## New Shared Type

```typescript
// src/app/common/components/badge-filter/badge-filter.types.ts
export interface BadgeFilter {
    keyword: string;
    fromDate: Date | null;
    toDate: Date | null;
}

export const EMPTY_BADGE_FILTER: BadgeFilter = {
    keyword: '',
    fromDate: null,
    toDate: null,
};
```

`EMPTY_BADGE_FILTER` is the canonical reset value — both components and the component itself use it to reset state.

---

## New Component: `BadgeFilterComponent`

**Location:** `src/app/common/components/badge-filter/`

### Responsibility

Renders the filter bar UI. Owns no filtering logic. Emits a `BadgeFilter` object whenever any field changes or Reset is clicked.

### Interface

```typescript
@Component({ selector: 'badge-filter', ... })
export class BadgeFilterComponent {
    // Internal form state — fully initialized
    keyword: string = '';
    fromDate: string = '';   // string for <input type="date"> binding
    toDate: string = '';     // string for <input type="date"> binding

    @Output() filterChange = new EventEmitter<BadgeFilter>();

    onKeywordChange(): void { ... }   // emits on every keystroke (debounced 300ms)
    onDateChange(): void { ... }      // emits on date input change
    reset(): void { ... }             // clears fields, emits EMPTY_BADGE_FILTER
}
```

**Date handling:** `<input type="date">` binds to `string` (yyyy-MM-dd). The component converts non-empty strings to `Date` objects before emitting. Null is emitted when the field is empty.

**Debounce:** Keyword input is debounced 300 ms using `Subject` + `debounceTime` to avoid triggering on every keystroke.

**No `@Input()`:** The component is stateless from the outside — it does not accept an initial filter value. Reset always goes to `EMPTY_BADGE_FILTER`.

**Lifecycle:** The component uses a `Subject` for debounce and must implement `OnDestroy` to call `subject.complete()`, preventing memory leaks.

### Template structure

```
[filter bar]
  [keyword input]       — placeholder: "Badges durchsuchen" / "Search badges" (i18n)
  [from date picker]    — label: "Von" / "From" (i18n)
  [to date picker]      — label: "Bis" / "To" (i18n)
  [reset button]        — "Zurücksetzen" / "Reset Filters" (i18n)
```

Uses existing `hlmInput` directive and `OebButtonComponent` to match the app's design system.

### Type safety notes

- All properties explicitly typed — no implicit `any`
- `fromDate`/`toDate` stored as `string` (matching `<input type="date">`) and converted to `Date | null` only on emit
- `EventEmitter<BadgeFilter>` fully typed — no `EventEmitter<any>`

---

## Institution View Changes

### `oeb-issuer-detail.component.ts`

Add `currentFilter: BadgeFilter = { ...EMPTY_BADGE_FILTER }` property.

Extend `updateResults()` to apply date range after the existing keyword filter:

```typescript
// After existing badgeMatcher filter:
.filter((badge) => {
    if (!(badge instanceof BadgeClass)) return true;
    const created: Date = badge.createdAt;
    if (this.currentFilter.fromDate !== null && created < this.currentFilter.fromDate) return false;
    if (this.currentFilter.toDate !== null && created > endOfDay(this.currentFilter.toDate)) return false;
    return true;
})
```

Add handler:

```typescript
onFilterChange(filter: BadgeFilter): void {
    this.currentFilter = filter;
    this.updateResults();
}
```

**`endOfDay` helper** (local pure function, not a service):
```typescript
function endOfDay(d: Date): Date {
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return end;
}
```

### `oeb-issuer-detail.component.html`

Inside the `*ngIf="!public"` block, before `<badges-datatable>`:

```html
<badge-filter (filterChange)="onFilterChange($event)"></badge-filter>
```

Replace the existing "no badges" empty state check to distinguish two cases:

```html
<!-- No badges at all -->
<section *ngIf="!badgesLoading && badgeResultsReady && !badges?.length">
    ...existing message...
</section>

<!-- Badges exist but none match filters -->
<section *ngIf="!badgesLoading && badgeResultsReady && badges?.length && !badgeResults.length">
    <p>{{ 'BadgeFilter.noResults' | translate }}</p>
</section>
```

---

## Network View Changes

### `network-badges.component.ts`

Add:
```typescript
currentFilter: BadgeFilter = { ...EMPTY_BADGE_FILTER };
filteredBadgeResults: DatatableBadgeResult[] = [];
```

Add `applyFilters()` method that runs after `loadBadgesAndRequests()` completes and on every `filterChange`:

```typescript
applyFilters(): void {
    const { keyword, fromDate, toDate } = this.currentFilter;
    this.filteredBadgeResults = this.badgeResults.filter((result) => {
        const badge = result.badge;
        if (keyword && !badge.name.toLowerCase().includes(keyword.toLowerCase())) return false;
        const created: Date = badge.createdAt;
        if (fromDate !== null && created < fromDate) return false;
        if (toDate !== null && created > endOfDay(toDate)) return false;
        return true;
    });
}

onFilterChange(filter: BadgeFilter): void {
    this.currentFilter = filter;
    this.applyFilters();
}
```

The datatable receives `filteredBadgeResults` instead of `badgeResults`.

**Note:** `endOfDay` is defined as a module-level pure function (not a method) in this file too, or extracted to a shared utility if used in 3+ places.

### `network-badges.component.html`

Add `<badge-filter>` above `<badges-datatable>` in the network tab. Add the filter-empty-state block (same pattern as institution view).

---

## i18n Keys

The following keys must be added to all translation files (`en.json`, `de.json`, etc.):

| Key | English | German |
|-----|---------|--------|
| `BadgeFilter.keywordPlaceholder` | Search badges | Badges durchsuchen |
| `BadgeFilter.fromLabel` | From | Von |
| `BadgeFilter.toLabel` | To | Bis |
| `BadgeFilter.resetButton` | Reset Filters | Zurücksetzen |
| `BadgeFilter.noResults` | No badges match your current filters. | Keine Badges entsprechen deinen Filtereinstellungen. |

---

## Typecheck Ratchet Compliance

New code must not increase error counts for any tracked flag. Checklist:

- [ ] **`noImplicitAny`** — all function params, return types, and properties explicitly typed
- [ ] **`strictNullChecks`** — `Date | null` used where null is possible; null-checked before use
- [ ] **`strictPropertyInitialization`** — all class properties initialized at declaration
- [ ] **`noUnusedLocals`** — no dead imports or variables introduced
- [ ] **`strictTemplates`** — all template bindings type-safe; `$any()` cast not used in new templates

Run `npm run typecheck` before committing. If a new error appears, fix it — do not run `typecheck:update` to paper over it.

---

## Files Touched

| File | Action |
|------|--------|
| `src/app/common/components/badge-filter/badge-filter.types.ts` | New |
| `src/app/common/components/badge-filter/badge-filter.component.ts` | New |
| `src/app/common/components/badge-filter/badge-filter.component.html` | New |
| `src/app/common/components/issuer/oeb-issuer-detail.component.ts` | Modify |
| `src/app/common/components/issuer/oeb-issuer-detail.component.html` | Modify |
| `src/app/issuer/components/network-badges/network-badges.component.ts` | Modify |
| `src/app/issuer/components/network-badges/network-badges.component.html` | Modify |
| `src/assets/i18n/en.json` (and other locales) | Add i18n keys |

---

## Out of Scope

- Backend filtering / API query params
- Public views (institution or network)
- Pagination (not currently in use)
- Persisting filters across navigation
