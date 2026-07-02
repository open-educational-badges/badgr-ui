# Badge Filter Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a keyword + date-range filter bar above the authenticated badge datatable in both the institution view (`oeb-issuer-detail`) and the network view (`network-badges`).

**Architecture:** A new dumb `BadgeFilterComponent` owns the filter bar UI and emits a typed `BadgeFilter` event. Both consumer components store `currentFilter` state and re-run their existing filtering logic (extended with date range) whenever the filter changes. All filtering is client-side — no API changes.

**Tech Stack:** Angular 18 standalone components, RxJS `debounceTime`, `@spartan-ng/helm/input`, `@ngx-translate/core`, Karma/Jasmine tests.

## Global Constraints

- Must not increase error counts for any flag in `typecheck-baseline.json` (`strictNullChecks: 1022`, `noImplicitAny: 557`, `strictPropertyInitialization: 1653`, `cheapFlags: 54`, `noUnusedLocals: 272`). Run `npm run typecheck` after each task.
- All class properties must be explicitly typed and initialized at declaration (covers `strictPropertyInitialization` + `noImplicitAny`).
- Nullable values use `T | null` union — never assign `null` to a non-nullable type.
- No `$any()` casts in new templates (`strictTemplates: true`).
- No unused imports or local variables.
- Public view (`*ngIf="public"` in `oeb-issuer-detail`) is **unchanged**.
- i18n keys must be added to both `src/assets/i18n/en.json` and `src/assets/i18n/de.json`.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/common/components/badge-filter/badge-filter.types.ts` | Create | `BadgeFilter` interface + `EMPTY_BADGE_FILTER` constant |
| `src/app/common/components/badge-filter/badge-filter.component.ts` | Create | Presentational filter bar — owns UI state, emits `BadgeFilter` |
| `src/app/common/components/badge-filter/badge-filter.component.html` | Create | Filter bar template |
| `src/app/common/components/badge-filter/badge-filter.component.spec.ts` | Create | Unit tests for emit, debounce, date parsing, reset |
| `src/app/common/components/issuer/oeb-issuer-detail.component.ts` | Modify | Add `currentFilter`, `onFilterChange()`, extend `updateResults()` with date range |
| `src/app/common/components/issuer/oeb-issuer-detail.component.html` | Modify | Add `<badge-filter>` + filter empty state in private section |
| `src/app/issuer/components/network-badges/network-badges.component.ts` | Modify | Add `filteredBadgeResults`, `currentFilter`, `applyFilters()`, `onFilterChange()` |
| `src/app/issuer/components/network-badges/network-badges.component.html` | Modify | Add `<badge-filter>` + filter empty state in network tab |
| `src/assets/i18n/en.json` | Modify | Add `BadgeFilter` i18n section |
| `src/assets/i18n/de.json` | Modify | Add `BadgeFilter` i18n section |

---

## Task 1: BadgeFilter types + BadgeFilterComponent

**Files:**
- Create: `src/app/common/components/badge-filter/badge-filter.types.ts`
- Create: `src/app/common/components/badge-filter/badge-filter.component.ts`
- Create: `src/app/common/components/badge-filter/badge-filter.component.html`
- Create: `src/app/common/components/badge-filter/badge-filter.component.spec.ts`

**Interfaces:**
- Produces: `BadgeFilter { keyword: string; fromDate: Date | null; toDate: Date | null }`
- Produces: `EMPTY_BADGE_FILTER: BadgeFilter`
- Produces: `BadgeFilterComponent` with `@Output() filterChange: EventEmitter<BadgeFilter>`

- [ ] **Step 1.1: Write the failing tests**

Create `src/app/common/components/badge-filter/badge-filter.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BadgeFilterComponent } from './badge-filter.component';
import { TranslateModule } from '@ngx-translate/core';
import { BadgeFilter, EMPTY_BADGE_FILTER } from './badge-filter.types';

describe('BadgeFilterComponent', () => {
    let component: BadgeFilterComponent;
    let fixture: ComponentFixture<BadgeFilterComponent>;
    let emitted: BadgeFilter[];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [BadgeFilterComponent, TranslateModule.forRoot()],
        }).compileComponents();

        fixture = TestBed.createComponent(BadgeFilterComponent);
        component = fixture.componentInstance;
        emitted = [];
        component.filterChange.subscribe((f: BadgeFilter) => emitted.push(f));
        fixture.detectChanges();
    });

    afterEach(() => TestBed.resetTestingModule());

    it('emits nothing immediately when keyword is typed (debounce pending)', fakeAsync(() => {
        const input = fixture.nativeElement.querySelector('[data-testid="keyword-input"]') as HTMLInputElement;
        input.value = 'foo';
        input.dispatchEvent(new Event('input'));
        expect(emitted.length).toBe(0);
        tick(300);
    }));

    it('emits keyword after 300ms debounce', fakeAsync(() => {
        const input = fixture.nativeElement.querySelector('[data-testid="keyword-input"]') as HTMLInputElement;
        input.value = 'foo';
        input.dispatchEvent(new Event('input'));
        tick(300);
        expect(emitted.length).toBe(1);
        expect(emitted[0].keyword).toBe('foo');
        expect(emitted[0].fromDate).toBeNull();
        expect(emitted[0].toDate).toBeNull();
    }));

    it('emits fromDate as local start-of-day when set', fakeAsync(() => {
        const input = fixture.nativeElement.querySelector('[data-testid="from-date"]') as HTMLInputElement;
        input.value = '2024-03-15';
        input.dispatchEvent(new Event('change'));
        expect(emitted.length).toBe(1);
        const d = emitted[0].fromDate as Date;
        expect(d).not.toBeNull();
        expect(d.getFullYear()).toBe(2024);
        expect(d.getMonth()).toBe(2);   // 0-indexed: March = 2
        expect(d.getDate()).toBe(15);
        expect(d.getHours()).toBe(0);
        expect(d.getMinutes()).toBe(0);
    }));

    it('emits toDate as local end-of-day when set', fakeAsync(() => {
        const input = fixture.nativeElement.querySelector('[data-testid="to-date"]') as HTMLInputElement;
        input.value = '2024-03-15';
        input.dispatchEvent(new Event('change'));
        expect(emitted.length).toBe(1);
        const d = emitted[0].toDate as Date;
        expect(d).not.toBeNull();
        expect(d.getFullYear()).toBe(2024);
        expect(d.getMonth()).toBe(2);
        expect(d.getDate()).toBe(15);
        expect(d.getHours()).toBe(23);
        expect(d.getMinutes()).toBe(59);
        expect(d.getSeconds()).toBe(59);
    }));

    it('emits EMPTY_BADGE_FILTER immediately on reset (no debounce)', fakeAsync(() => {
        component.keyword = 'test';
        component.fromDate = '2024-01-01';
        component.toDate = '2024-12-31';
        const btn = fixture.nativeElement.querySelector('[data-testid="reset-button"]') as HTMLElement;
        btn.click();
        // Immediate — no tick needed
        expect(emitted.length).toBe(1);
        expect(emitted[0]).toEqual(EMPTY_BADGE_FILTER);
        expect(component.keyword).toBe('');
        expect(component.fromDate).toBe('');
        expect(component.toDate).toBe('');
    }));

    it('clears field values on reset', fakeAsync(() => {
        component.keyword = 'test';
        component.fromDate = '2024-01-01';
        component.toDate = '2024-12-31';
        fixture.detectChanges();
        component.reset();
        fixture.detectChanges();
        const kwInput = fixture.nativeElement.querySelector('[data-testid="keyword-input"]') as HTMLInputElement;
        expect(kwInput.value).toBe('');
    }));
});
```

- [ ] **Step 1.2: Run tests — verify they fail with "cannot find module"**

```bash
cd /Users/fatimakay/Projects/oeb/badgr-ui
npx ng test --include="**/badge-filter.component.spec.ts" --watch=false --browsers=ChromeHeadless
```

Expected: compile error — `badge-filter.component` and `badge-filter.types` do not exist yet.

- [ ] **Step 1.3: Create the types file**

Create `src/app/common/components/badge-filter/badge-filter.types.ts`:

```typescript
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

- [ ] **Step 1.4: Create the component**

Create `src/app/common/components/badge-filter/badge-filter.component.ts`:

```typescript
import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmInput } from '@spartan-ng/helm/input';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { BadgeFilter, EMPTY_BADGE_FILTER } from './badge-filter.types';

function parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

@Component({
    selector: 'badge-filter',
    templateUrl: './badge-filter.component.html',
    imports: [TranslatePipe, HlmInput, OebButtonComponent],
})
export class BadgeFilterComponent implements OnDestroy {
    keyword: string = '';
    fromDate: string = '';
    toDate: string = '';

    @Output() filterChange = new EventEmitter<BadgeFilter>();

    private readonly keywordSubject = new Subject<string>();

    constructor() {
        this.keywordSubject.pipe(debounceTime(300)).subscribe(() => this.emit());
    }

    ngOnDestroy(): void {
        this.keywordSubject.complete();
    }

    onKeywordInput(event: Event): void {
        this.keyword = (event.target as HTMLInputElement).value;
        this.keywordSubject.next(this.keyword);
    }

    onFromDateChange(event: Event): void {
        this.fromDate = (event.target as HTMLInputElement).value;
        this.emit();
    }

    onToDateChange(event: Event): void {
        this.toDate = (event.target as HTMLInputElement).value;
        this.emit();
    }

    reset(): void {
        this.keyword = '';
        this.fromDate = '';
        this.toDate = '';
        this.filterChange.emit({ ...EMPTY_BADGE_FILTER });
    }

    private emit(): void {
        this.filterChange.emit({
            keyword: this.keyword,
            fromDate: this.fromDate ? parseLocalDate(this.fromDate) : null,
            toDate: this.toDate ? endOfDay(parseLocalDate(this.toDate)) : null,
        });
    }
}
```

- [ ] **Step 1.5: Create the template**

Create `src/app/common/components/badge-filter/badge-filter.component.html`:

```html
<div class="tw-flex tw-flex-wrap tw-items-center tw-gap-4 tw-mb-6">
    <input
        type="text"
        [value]="keyword"
        (input)="onKeywordInput($event)"
        [placeholder]="'BadgeFilter.keywordPlaceholder' | translate"
        class="tw-w-[300px]"
        hlmInput
        data-testid="keyword-input"
    />
    <div class="tw-flex tw-items-center tw-gap-2">
        <label class="tw-text-sm tw-text-oebblack">{{ 'BadgeFilter.fromLabel' | translate }}</label>
        <input
            type="date"
            [value]="fromDate"
            (change)="onFromDateChange($event)"
            hlmInput
            data-testid="from-date"
        />
    </div>
    <div class="tw-flex tw-items-center tw-gap-2">
        <label class="tw-text-sm tw-text-oebblack">{{ 'BadgeFilter.toLabel' | translate }}</label>
        <input
            type="date"
            [value]="toDate"
            (change)="onToDateChange($event)"
            hlmInput
            data-testid="to-date"
        />
    </div>
    <oeb-button
        variant="secondary"
        size="sm"
        [text]="'BadgeFilter.resetButton' | translate"
        (click)="reset()"
        data-testid="reset-button"
    ></oeb-button>
</div>
```

- [ ] **Step 1.6: Run tests — verify they pass**

```bash
npx ng test --include="**/badge-filter.component.spec.ts" --watch=false --browsers=ChromeHeadless
```

Expected: all 6 tests PASS.

- [ ] **Step 1.7: Run typecheck**

```bash
npm run typecheck
```

Expected: counts unchanged from baseline (no regressions).

- [ ] **Step 1.8: Commit**

```bash
git add src/app/common/components/badge-filter/
git commit -m "feat(badge-filter): add BadgeFilterComponent with keyword debounce and date range"
```

---

## Task 2: Add i18n keys

**Files:**
- Modify: `src/assets/i18n/en.json`
- Modify: `src/assets/i18n/de.json`

**Interfaces:**
- Consumes: nothing
- Produces: `BadgeFilter.keywordPlaceholder`, `BadgeFilter.fromLabel`, `BadgeFilter.toLabel`, `BadgeFilter.resetButton`, `BadgeFilter.noResults` in both locale files

- [ ] **Step 2.1: Add keys to en.json**

Open `src/assets/i18n/en.json`. The file uses a top-level object with namespace keys like `"General"`, `"Issuer"`, `"Network"`. Add a new `"BadgeFilter"` section at the top level (alphabetical order — after `"Badge"`, before `"BadgeRequest"` or wherever it fits):

```json
"BadgeFilter": {
    "fromLabel": "From",
    "keywordPlaceholder": "Search badges",
    "noResults": "No badges match your current filters.",
    "resetButton": "Reset Filters",
    "toLabel": "To"
},
```

- [ ] **Step 2.2: Add keys to de.json**

Open `src/assets/i18n/de.json`. Add the same `"BadgeFilter"` section in the same relative position:

```json
"BadgeFilter": {
    "fromLabel": "Von",
    "keywordPlaceholder": "Badges durchsuchen",
    "noResults": "Keine Badges entsprechen deinen Filtereinstellungen.",
    "resetButton": "Zurücksetzen",
    "toLabel": "Bis"
},
```

- [ ] **Step 2.3: Commit**

```bash
git add src/assets/i18n/en.json src/assets/i18n/de.json
git commit -m "feat(badge-filter): add i18n keys for filter bar (en + de)"
```

---

## Task 3: Integrate BadgeFilterComponent into institution view

**Files:**
- Modify: `src/app/common/components/issuer/oeb-issuer-detail.component.ts`
- Modify: `src/app/common/components/issuer/oeb-issuer-detail.component.html`

**Interfaces:**
- Consumes: `BadgeFilterComponent` (selector: `badge-filter`), `BadgeFilter`, `EMPTY_BADGE_FILTER` from Task 1
- Produces: `onFilterChange(filter: BadgeFilter): void` method on `OebIssuerDetailComponent`

- [ ] **Step 3.1: Write failing tests**

Open `src/app/common/components/issuer/oeb-issuer-detail.component.spec.ts`. Add a new describe block at the bottom of the file (after the existing Dashboard tab tests).

The `setupAuthenticatedIssuerDetail` helper does not mock `QrCodeApiService`. The new tests call `onFilterChange` → `updateResults()` which uses it. Add the mock and a new setup function:

```typescript
import { BadgeClass } from '../../../issuer/models/badgeclass.model';
import { BadgeFilter } from '../badge-filter/badge-filter.types';
import { QrCodeApiService } from '../../../issuer/services/qrcode-api.service';

// Creates a minimal badge-shaped object with a real `createdAt` Date.
// Uses `createdAt instanceof Date` check in matchesDateRange — plain object works fine.
function makeMockBadge(name: string, createdAt: Date): BadgeClass {
    return {
        name,
        slug: name.toLowerCase().replace(/ /g, '-'),
        createdAt,
        isNetworkBadge: false,
        sharedOnNetwork: null,
        recipientCount: 0,
        issuerSlug: 'test-issuer',
        extension: { 'extensions:CategoryExtension': { Category: 'badge' } },
    } as unknown as BadgeClass;
}

async function setupIssuerDetailWithQrMock(): Promise<ComponentFixture<OebIssuerDetailComponent>> {
    await TestBed.configureTestingModule({
        imports: [RouterTestingModule, OebIssuerDetailComponent, TranslateModule.forRoot(), HttpClientTestingModule],
        providers: [
            ...createCommonProviders(),
            {
                provide: ActivatedRoute,
                useValue: { snapshot: { params: {} }, params: of({}), queryParams: of({}), data: of({}) },
            },
            { provide: IssuerManager, useValue: { myIssuers$: myIssuers$.asObservable() } },
            { provide: LearningPathApiService, useValue: { getLearningPathsForIssuer: () => Promise.resolve([]) } },
            { provide: IssuerApiService, useValue: { listSharedNetworkBadges: () => Promise.resolve([]) } },
            { provide: NetworkApiService, useValue: { getIssuerNetworkBadges: () => Promise.resolve([]) } },
            {
                provide: PublicApiService,
                useValue: {
                    getPublicLearningPaths: () => Promise.resolve([]),
                    getIssuerLearningPaths: () => Promise.resolve([]),
                },
            },
            { provide: PDFTemplateManager, useValue: { pdfEditorAvailable: () => false } },
            { provide: HlmDialogService, useValue: {} },
            { provide: QrCodeApiService, useValue: { getQrCodesForIssuerByBadgeClass: () => Promise.resolve([]) } },
        ],
    }).compileComponents();

    const fixture = TestBed.createComponent(OebIssuerDetailComponent);
    const component = fixture.componentInstance;
    component.issuer = { ...mockPublicIssuer, currentUserStaffMember: null, canUpdateDeleteIssuer: false, canCreateBadge: false, apiModel: { verified: true } } as any;
    component.public = false;
    component.networks = [];
    component.partner_issuers = [];
    component.badges = [];
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
}

describe('OebIssuerDetailComponent — badge date filter', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('onFilterChange: badges outside fromDate are excluded', async () => {
        const fixture = await setupIssuerDetailWithQrMock();
        const component = fixture.componentInstance;

        component.badges = [
            makeMockBadge('January Badge', new Date(2024, 0, 15)),
            makeMockBadge('March Badge',   new Date(2024, 2, 15)),
        ];

        component.onFilterChange({
            keyword: '',
            fromDate: new Date(2024, 1, 1, 0, 0, 0, 0),  // Feb 1 start-of-day
            toDate: null,
        });
        await fixture.whenStable();

        const resultNames = component.badgeResults.map((r) => r.badge.name);
        expect(resultNames).not.toContain('January Badge');
        expect(resultNames).toContain('March Badge');
    });

    it('onFilterChange: badges outside toDate are excluded', async () => {
        const fixture = await setupIssuerDetailWithQrMock();
        const component = fixture.componentInstance;

        component.badges = [
            makeMockBadge('January Badge', new Date(2024, 0, 15)),
            makeMockBadge('March Badge',   new Date(2024, 2, 15)),
        ];

        component.onFilterChange({
            keyword: '',
            fromDate: null,
            toDate: new Date(2024, 1, 28, 23, 59, 59, 999),  // Feb 28 end-of-day
        });
        await fixture.whenStable();

        const resultNames = component.badgeResults.map((r) => r.badge.name);
        expect(resultNames).toContain('January Badge');
        expect(resultNames).not.toContain('March Badge');
    });

    it('onFilterChange: keyword + date combined use AND logic', async () => {
        const fixture = await setupIssuerDetailWithQrMock();
        const component = fixture.componentInstance;

        component.badges = [
            makeMockBadge('Alpha Badge', new Date(2024, 0, 15)),
            makeMockBadge('Beta Badge',  new Date(2024, 2, 15)),
            makeMockBadge('Alpha Old',   new Date(2023, 0, 1)),
        ];

        component.onFilterChange({
            keyword: 'alpha',
            fromDate: new Date(2024, 0, 1, 0, 0, 0, 0),
            toDate: null,
        });
        await fixture.whenStable();

        const resultNames = component.badgeResults.map((r) => r.badge.name);
        expect(resultNames).toContain('Alpha Badge');
        expect(resultNames).not.toContain('Beta Badge');   // name doesn't match keyword
        expect(resultNames).not.toContain('Alpha Old');    // name matches but date too old
    });
});
```

- [ ] **Step 3.2: Run tests — verify they fail**

```bash
npx ng test --include="**/oeb-issuer-detail.component.spec.ts" --watch=false --browsers=ChromeHeadless
```

Expected: compile error — `onFilterChange` does not exist on `OebIssuerDetailComponent`.

- [ ] **Step 3.3: Update oeb-issuer-detail.component.ts**

**3.3a — Add imports** at the top of the file alongside the existing imports:

```typescript
import { BadgeFilter, EMPTY_BADGE_FILTER } from '../badge-filter/badge-filter.types';
import { BadgeFilterComponent } from '../badge-filter/badge-filter.component';
```

**3.3b — Add `BadgeFilterComponent` to the `@Component` `imports` array** (around line 82, after `DatatableComponent`):

```typescript
imports: [
    // ...existing imports...
    DatatableComponent,
    BadgeFilterComponent,  // <-- add this
    // ...rest of existing imports...
],
```

**3.3c — Add `currentFilter` property** after the existing `maxDisplayedResults` property (around line 209):

```typescript
currentFilter: BadgeFilter = { ...EMPTY_BADGE_FILTER };
```

**3.3d — Add `onFilterChange` method** after the existing `set searchQuery` setter (after line 218):

```typescript
onFilterChange(filter: BadgeFilter): void {
    this.currentFilter = filter;
    this._searchQuery = filter.keyword;
    this.updateResults();
}
```

**3.3e — Extend `updateResults()` with date range filter.**

Find this line in `updateResults()` (currently line 269):

```typescript
this.badges.filter(MatchingAlgorithm.badgeMatcher(this._searchQuery)).forEach(addBadgeToResults);
```

Replace it with:

```typescript
this.badges
    .filter(MatchingAlgorithm.badgeMatcher(this._searchQuery))
    .filter((badge) => this.matchesDateRange(badge))
    .forEach(addBadgeToResults);
```

**3.3f — Add `matchesDateRange` private method** directly after the closing brace of `updateResults()`:

```typescript
private matchesDateRange(badge: BadgeClass | PublicApiBadgeClass): boolean {
    const created = (badge as BadgeClass).createdAt;
    if (!(created instanceof Date)) return true;
    if (this.currentFilter.fromDate !== null && created < this.currentFilter.fromDate) return false;
    if (this.currentFilter.toDate !== null && created > this.currentFilter.toDate) return false;
    return true;
}
```

Using `created instanceof Date` instead of `badge instanceof BadgeClass` keeps the check robust for both real `BadgeClass` instances and any future badge types that carry a `createdAt` field.

- [ ] **Step 3.4: Update oeb-issuer-detail.component.html**

Find the private-view block (around line 513). The current code is:

```html
<ng-template [bgAwaitPromises]="requestsLoaded">
    <badges-datatable
        *ngIf="!public"
        [badges]="$any(badgeResults)"
        (directBadgeAward)="routeToBadgeAward($event, issuer)"
        (qrCodeAward)="routeToQRCodeAward($event, issuer)"
        (redirectToBadgeDetail)="routeToBadgeDetail($event.badge, issuer, $event.focusRequests)"
    ></badges-datatable>
</ng-template>
```

Replace with:

```html
<ng-template [bgAwaitPromises]="requestsLoaded">
    <ng-container *ngIf="!public">
        <badge-filter (filterChange)="onFilterChange($event)"></badge-filter>
        <p
            *ngIf="!badgeResults.length"
            class="tw-text-lg tw-text-oebblack tw-my-6"
        >
            {{ 'BadgeFilter.noResults' | translate }}
        </p>
        <badges-datatable
            *ngIf="badgeResults.length"
            [badges]="badgeResults"
            (directBadgeAward)="routeToBadgeAward($event, issuer)"
            (qrCodeAward)="routeToQRCodeAward($event, issuer)"
            (redirectToBadgeDetail)="routeToBadgeDetail($event.badge, issuer, $event.focusRequests)"
        ></badges-datatable>
    </ng-container>
</ng-template>
```

Note: the `$any()` cast on `[badges]` is removed — `badgeResults` is `BadgeResult[]` and `badges-datatable` expects `DatatableBadgeResult[]`. Verify the types are compatible; if `BadgeResult` doesn't satisfy `DatatableBadgeResult`, keep `$any()` on this line only.

- [ ] **Step 3.5: Run tests — verify they pass**

```bash
npx ng test --include="**/oeb-issuer-detail.component.spec.ts" --watch=false --browsers=ChromeHeadless
```

Expected: all tests PASS (existing + new date filter tests).

- [ ] **Step 3.6: Run typecheck**

```bash
npm run typecheck
```

Expected: counts unchanged. If `strictNullChecks` count increased, check `matchesDateRange` for any unchecked nullable. If `noImplicitAny` increased, add explicit return type annotations.

- [ ] **Step 3.7: Commit**

```bash
git add src/app/common/components/issuer/oeb-issuer-detail.component.ts \
        src/app/common/components/issuer/oeb-issuer-detail.component.html
git commit -m "feat(badge-filter): integrate filter bar into institution badge list"
```

---

## Task 4: Integrate BadgeFilterComponent into network view

**Files:**
- Modify: `src/app/issuer/components/network-badges/network-badges.component.ts`
- Modify: `src/app/issuer/components/network-badges/network-badges.component.html`
- Create: `src/app/issuer/components/network-badges/network-badges.component.spec.ts`

**Interfaces:**
- Consumes: `BadgeFilterComponent`, `BadgeFilter`, `EMPTY_BADGE_FILTER`, `DatatableBadgeResult`, `MatchingAlgorithm`
- Produces: `filteredBadgeResults: DatatableBadgeResult[]`, `onFilterChange(filter: BadgeFilter): void`

- [ ] **Step 4.1: Write failing tests**

Create `src/app/issuer/components/network-badges/network-badges.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { NetworkBadgesComponent } from './network-badges.component';
import { BadgeFilter, EMPTY_BADGE_FILTER } from '~/common/components/badge-filter/badge-filter.types';
import { DatatableBadgeResult } from '~/components/datatable-badges.component';
import { BadgeClass } from '~/issuer/models/badgeclass.model';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { NetworkApiService } from '~/issuer/services/network-api.service';
import { BadgeClassManager } from '~/issuer/services/badgeclass-manager.service';
import { MessageService } from '~/common/services/message.service';
import { QrCodeApiService } from '~/issuer/services/qrcode-api.service';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { NetworkManager } from '~/issuer/services/network-manager.service';
import { CommonEntityManager } from '~/entity-manager/services/common-entity-manager.service';
import { HlmDialogService } from '~/components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { of } from 'rxjs';
import { createCommonProviders } from '~/testing/common-providers';

// `applyFilters` uses `createdAt instanceof Date` — plain object with a real Date works.
function makeDatatableResult(name: string, createdAt: Date): DatatableBadgeResult {
    return {
        badge: { name, slug: name.toLowerCase().replace(/ /g, '-'), createdAt } as unknown as BadgeClass,
        requestCount: 0,
        awardedCount: 0,
    };
}

describe('NetworkBadgesComponent — applyFilters', () => {
    let component: NetworkBadgesComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                NetworkBadgesComponent,
                TranslateModule.forRoot(),
                RouterTestingModule,
            ],
            providers: [
                ...createCommonProviders(),
                { provide: NetworkApiService, useValue: { getNetworkSharedBadges: () => Promise.resolve([]) } },
                { provide: BadgeClassManager, useValue: { getNetworkBadgesByIssuerUrl$: () => of({}) } },
                { provide: MessageService, useValue: { reportAndThrowError: () => {} } },
                { provide: QrCodeApiService, useValue: {} },
                { provide: TranslateService, useValue: { instant: (k: string) => k } },
                { provide: NetworkManager, useValue: {} },
                { provide: CommonEntityManager, useValue: {} },
                { provide: HlmDialogService, useValue: {} },
                {
                    provide: ActivatedRoute,
                    useValue: { queryParams: of({}) },
                },
            ],
        }).compileComponents();

        const fixture = TestBed.createComponent(NetworkBadgesComponent);
        component = fixture.componentInstance;
        // Bypass ngOnInit by setting badgeResults directly
        component.badgeResults = [
            makeDatatableResult('Alpha Badge', new Date(2024, 0, 15)),
            makeDatatableResult('Beta Badge',  new Date(2024, 2, 15)),
            makeDatatableResult('Gamma Badge', new Date(2024, 5, 1)),
        ];
    });

    afterEach(() => TestBed.resetTestingModule());

    it('shows all badges when filter is empty', () => {
        component.onFilterChange({ ...EMPTY_BADGE_FILTER });
        expect(component.filteredBadgeResults.length).toBe(3);
    });

    it('filters by keyword (case-insensitive partial match)', () => {
        component.onFilterChange({ ...EMPTY_BADGE_FILTER, keyword: 'alpha' });
        expect(component.filteredBadgeResults.length).toBe(1);
        expect(component.filteredBadgeResults[0].badge.name).toBe('Alpha Badge');
    });

    it('filters by fromDate — excludes badges before the date', () => {
        component.onFilterChange({
            ...EMPTY_BADGE_FILTER,
            fromDate: new Date(2024, 1, 1, 0, 0, 0, 0),  // Feb 1
        });
        const names = component.filteredBadgeResults.map((r) => r.badge.name);
        expect(names).not.toContain('Alpha Badge');  // Jan — excluded
        expect(names).toContain('Beta Badge');
        expect(names).toContain('Gamma Badge');
    });

    it('filters by toDate — excludes badges after the date', () => {
        component.onFilterChange({
            ...EMPTY_BADGE_FILTER,
            toDate: new Date(2024, 1, 28, 23, 59, 59, 999),  // Feb 28 end-of-day
        });
        const names = component.filteredBadgeResults.map((r) => r.badge.name);
        expect(names).toContain('Alpha Badge');
        expect(names).not.toContain('Beta Badge');  // Mar — excluded
        expect(names).not.toContain('Gamma Badge');
    });

    it('combines keyword + date range with AND logic', () => {
        component.onFilterChange({
            keyword: 'badge',  // matches all
            fromDate: new Date(2024, 1, 1, 0, 0, 0, 0),   // from Feb 1
            toDate: new Date(2024, 3, 30, 23, 59, 59, 999), // to Apr 30
        });
        const names = component.filteredBadgeResults.map((r) => r.badge.name);
        expect(names).not.toContain('Alpha Badge');  // before Feb
        expect(names).toContain('Beta Badge');       // Mar — in range + matches
        expect(names).not.toContain('Gamma Badge');  // Jun — after Apr
    });
});
```

- [ ] **Step 4.2: Run tests — verify they fail**

```bash
npx ng test --include="**/network-badges.component.spec.ts" --watch=false --browsers=ChromeHeadless
```

Expected: compile error — `filteredBadgeResults` and `onFilterChange` do not exist.

- [ ] **Step 4.3: Update network-badges.component.ts**

**4.3a — Add imports** at the top:

```typescript
import { BadgeFilter, EMPTY_BADGE_FILTER } from '~/common/components/badge-filter/badge-filter.types';
import { BadgeFilterComponent } from '~/common/components/badge-filter/badge-filter.component';
import { MatchingAlgorithm } from '~/common/util/matching-algorithm';
```

**4.3b — Add `BadgeFilterComponent` to `imports` array** (around line 38, after `DatatableComponent`):

```typescript
imports: [
    // ...existing imports...
    DatatableComponent,
    BadgeFilterComponent,  // <-- add this
    // ...rest of existing imports...
],
```

**4.3c — Add new properties** after `sharedBadgeResults` (after line 100):

```typescript
filteredBadgeResults: DatatableBadgeResult[] = [];
currentFilter: BadgeFilter = { ...EMPTY_BADGE_FILTER };
```

**4.3d — Add `applyFilters` and `onFilterChange` methods** after `getRequestCount` (after line 237):

```typescript
applyFilters(): void {
    const { keyword, fromDate, toDate } = this.currentFilter;
    this.filteredBadgeResults = this.badgeResults.filter((result) => {
        if (!MatchingAlgorithm.badgeMatcher(keyword)(result.badge)) return false;
        const created = (result.badge as BadgeClass).createdAt;
        if (created instanceof Date) {
            if (fromDate !== null && created < fromDate) return false;
            if (toDate !== null && created > toDate) return false;
        }
        return true;
    });
}

onFilterChange(filter: BadgeFilter): void {
    this.currentFilter = filter;
    this.applyFilters();
}
```

**4.3e — Call `applyFilters()` at the end of `loadBadgesAndRequests()`**, after `this.badgeResults = ...` (line 165):

```typescript
private async loadBadgesAndRequests() {
    // ...existing code unchanged...
    this.badgeResults = this.badges.map((badge) => ({
        badge,
        requestCount: this.getRequestCount(badge, requestMap),
        awardedCount: badge.recipientCount,
    }));
    this.applyFilters();  // <-- add this line
}
```

- [ ] **Step 4.4: Update network-badges.component.html**

Replace the entire `#networkTemplate` block (lines 13–38 in the current file):

Current:
```html
<ng-template #networkTemplate>
    @if (badgeResults.length) {
        <div class="tw-mt-12">
            <badges-datatable
                [badges]="badgeResults"
                (directBadgeAward)="routeToBadgeAward($event)"
                (qrCodeAward)="routeToQRCodeAward($event)"
                (redirectToBadgeDetail)="routeToBadgeDetail($event.badge, network().slug, $event.focusRequests)"
            ></badges-datatable>
        </div>
    } @else {
        <span
            class="tw-text-lg tw-text-oebblack tw-my-6 tw-block"
            [innerHTML]="'Network.noBadgesYet' | translate: { network: network().name }"
        ></span>
        @if (
            network().current_user_network_role &&
            network().current_user_network_role !== 'staff' &&
            !badgeResults.length
        ) {
            <oeb-button
                [text]="'Network.createBadge' | translate"
                [routerLink]="[`/issuer/issuers/${network().slug}/badges/select/`]"
            ></oeb-button>
        }
    }
</ng-template>
```

Replace with:

```html
<ng-template #networkTemplate>
    @if (badges.length) {
        <badge-filter (filterChange)="onFilterChange($event)"></badge-filter>
        @if (filteredBadgeResults.length) {
            <div class="tw-mt-12">
                <badges-datatable
                    [badges]="filteredBadgeResults"
                    (directBadgeAward)="routeToBadgeAward($event)"
                    (qrCodeAward)="routeToQRCodeAward($event)"
                    (redirectToBadgeDetail)="routeToBadgeDetail($event.badge, network().slug, $event.focusRequests)"
                ></badges-datatable>
            </div>
        } @else {
            <span class="tw-text-lg tw-text-oebblack tw-my-6 tw-block">
                {{ 'BadgeFilter.noResults' | translate }}
            </span>
        }
    } @else {
        <span
            class="tw-text-lg tw-text-oebblack tw-my-6 tw-block"
            [innerHTML]="'Network.noBadgesYet' | translate: { network: network().name }"
        ></span>
        @if (network().current_user_network_role && network().current_user_network_role !== 'staff') {
            <oeb-button
                [text]="'Network.createBadge' | translate"
                [routerLink]="[`/issuer/issuers/${network().slug}/badges/select/`]"
            ></oeb-button>
        }
    }
</ng-template>
```

- [ ] **Step 4.5: Run tests — verify they pass**

```bash
npx ng test --include="**/network-badges.component.spec.ts" --watch=false --browsers=ChromeHeadless
```

Expected: all tests PASS.

- [ ] **Step 4.6: Run typecheck**

```bash
npm run typecheck
```

Expected: counts unchanged. If `noImplicitAny` increases, check `applyFilters` — add explicit return type `: void`. If `strictNullChecks` increases, check that `fromDate`/`toDate` null checks are present before comparisons.

- [ ] **Step 4.7: Commit**

```bash
git add src/app/issuer/components/network-badges/network-badges.component.ts \
        src/app/issuer/components/network-badges/network-badges.component.html \
        src/app/issuer/components/network-badges/network-badges.component.spec.ts
git commit -m "feat(badge-filter): integrate filter bar into network badge list"
```

---

## Task 5: Final typecheck and build verification

**Files:** none created/modified — verification only.

- [ ] **Step 5.1: Run all new specs together**

```bash
npx ng test --include="**/badge-filter/**" --include="**/oeb-issuer-detail.component.spec.ts" --include="**/network-badges.component.spec.ts" --watch=false --browsers=ChromeHeadless
```

Expected: all tests PASS with no failures.

- [ ] **Step 5.2: Run the full typecheck ratchet**

```bash
npm run typecheck
```

Expected output example (all counts equal to or less than baseline):
```
strictNullChecks:          1022 errors (baseline: 1022) ✓
noImplicitAny:              557 errors (baseline: 557)  ✓
strictPropertyInitialization: 1653 errors (baseline: 1653) ✓
cheapFlags:                  54 errors (baseline: 54)   ✓
noUnusedLocals:             272 errors (baseline: 272)  ✓
```

If any count increased: fix before proceeding (do NOT run `typecheck:update`).

- [ ] **Step 5.3: Run a production build to catch template errors**

```bash
npx ng build --configuration=production 2>&1 | tail -20
```

Expected: build succeeds with no errors. Template errors (strict bindings) surface here even if typecheck passes.

- [ ] **Step 5.4: Final commit (if any fixups were needed)**

If Steps 5.1–5.3 required small fixes, commit them:

```bash
git add -p  # stage only the fixup changes
git commit -m "fix(badge-filter): address typecheck and build issues"
```

---

## Quick Reference: Key types and signatures

```typescript
// badge-filter.types.ts
interface BadgeFilter { keyword: string; fromDate: Date | null; toDate: Date | null; }
const EMPTY_BADGE_FILTER: BadgeFilter;

// badge-filter.component.ts
class BadgeFilterComponent implements OnDestroy {
    keyword: string;
    fromDate: string;   // yyyy-MM-dd string for <input type="date">
    toDate: string;
    @Output() filterChange: EventEmitter<BadgeFilter>;
    reset(): void;
    // emitted fromDate = local start-of-day; toDate = local end-of-day (23:59:59.999)
}

// oeb-issuer-detail.component.ts (additions)
currentFilter: BadgeFilter;
onFilterChange(filter: BadgeFilter): void;
private matchesDateRange(badge: BadgeClass | PublicApiBadgeClass): boolean;

// network-badges.component.ts (additions)
filteredBadgeResults: DatatableBadgeResult[];
currentFilter: BadgeFilter;
applyFilters(): void;
onFilterChange(filter: BadgeFilter): void;
```
