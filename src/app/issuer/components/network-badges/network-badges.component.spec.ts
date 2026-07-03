import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
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
import { ActivatedRoute } from '@angular/router';
import { NetworkManager } from '~/issuer/services/network-manager.service';
import { CommonEntityManager } from '~/entity-manager/services/common-entity-manager.service';
import { HlmDialogService } from '~/components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { of } from 'rxjs';
import { createCommonProviders } from '~/testing/common-providers';

// applyFilters uses `createdAt instanceof Date` — plain object with a real Date works.
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
			imports: [NetworkBadgesComponent, TranslateModule.forRoot(), RouterTestingModule],
			providers: [
				...createCommonProviders(),
				{ provide: NetworkApiService, useValue: { getNetworkSharedBadges: () => Promise.resolve([]) } },
				{ provide: BadgeClassManager, useValue: { getNetworkBadgesByIssuerUrl$: () => of({}) } },
				{ provide: MessageService, useValue: { reportAndThrowError: () => {} } },
				{ provide: QrCodeApiService, useValue: {} },
				{ provide: NetworkManager, useValue: {} },
				{ provide: CommonEntityManager, useValue: {} },
				{ provide: HlmDialogService, useValue: {} },
				{ provide: ActivatedRoute, useValue: { queryParams: of({}) } },
			],
		}).compileComponents();

		const fixture: ComponentFixture<NetworkBadgesComponent> = TestBed.createComponent(NetworkBadgesComponent);
		component = fixture.componentInstance;
		// Set badgeResults directly to bypass ngOnInit API calls
		component.badgeResults = [
			makeDatatableResult('Alpha Badge', new Date(2024, 0, 15)),
			makeDatatableResult('Beta Badge', new Date(2024, 2, 15)),
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
			fromDate: new Date(2024, 1, 1, 0, 0, 0, 0), // Feb 1
		});
		const names = component.filteredBadgeResults.map((r) => r.badge.name);
		expect(names).not.toContain('Alpha Badge'); // Jan — excluded
		expect(names).toContain('Beta Badge');
		expect(names).toContain('Gamma Badge');
	});

	it('filters by toDate — excludes badges after the date', () => {
		component.onFilterChange({
			...EMPTY_BADGE_FILTER,
			toDate: new Date(2024, 1, 28, 23, 59, 59, 999), // Feb 28 end-of-day
		});
		const names = component.filteredBadgeResults.map((r) => r.badge.name);
		expect(names).toContain('Alpha Badge');
		expect(names).not.toContain('Beta Badge'); // Mar — excluded
		expect(names).not.toContain('Gamma Badge');
	});

	it('combines keyword + date range with AND logic', () => {
		component.onFilterChange({
			keyword: 'badge',
			fromDate: new Date(2024, 1, 1, 0, 0, 0, 0), // from Feb 1
			toDate: new Date(2024, 3, 30, 23, 59, 59, 999), // to Apr 30
		});
		const names = component.filteredBadgeResults.map((r) => r.badge.name);
		expect(names).not.toContain('Alpha Badge'); // before Feb
		expect(names).toContain('Beta Badge'); // Mar — in range + matches
		expect(names).not.toContain('Gamma Badge'); // Jun — after Apr
	});
});
