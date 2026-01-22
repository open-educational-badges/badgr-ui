import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { OebDashboardOverviewComponent } from './oeb-dashboard-overview.component';
import { KPIData } from '../../models/dashboard-models';

/**
 * Tests for OEB Dashboard Overview Component - PLZ KPI Focus
 *
 * Tests the display and interaction of KPIs including the PLZ breadth (competencyBreadth) KPI:
 * - KPI rendering and display
 * - Click navigation to KPI detail page
 * - Clickable details detection
 * - Trend display for PLZ KPI
 * - Navigation for PLZ-related KPIs
 */
describe('OebDashboardOverviewComponent - PLZ KPI Tests', () => {
	let component: OebDashboardOverviewComponent;
	let fixture: ComponentFixture<OebDashboardOverviewComponent>;
	let router: jasmine.SpyObj<Router>;

	const mockPlzKpi: KPIData = {
		id: 'competencyBreadth',
		label: 'Dashboard.kpi.portfolioWidth',
		value: 85,
		unit: 'Dashboard.unit.plzAreas',
		trend: 'stable',
		trendValue: 2,
		hasMonthlyDetails: true,
		monthlyDetails: [
			{
				postalCodePrefix: '01',
				cityName: 'Dresden',
				value: 42,
				date: '2024-10-25T00:00:00.000Z',
				categoryKey: 'new_postal_area',
			},
			{
				postalCodePrefix: '50',
				cityName: 'Köln',
				value: 38,
				date: '2024-10-15T00:00:00.000Z',
				categoryKey: 'new_postal_area',
			},
		],
	};

	const mockKpis: KPIData[] = [
		{
			id: 'institutions',
			label: 'Dashboard.kpi.institutions',
			value: 127,
			unit: 'Dashboard.unit.institutions',
			trend: 'up',
			trendValue: 15,
		},
		{
			id: 'badges',
			label: 'Dashboard.kpi.totalBadges',
			value: 342,
			unit: 'Dashboard.unit.badges',
			trend: 'up',
			trendValue: 28,
			hasMonthlyDetails: true,
		},
		mockPlzKpi,
		{
			id: 'diversityIndex',
			label: 'Dashboard.kpi.diversityIndex',
			value: 73.2,
			unit: 'Dashboard.unit.index',
			trend: 'up',
			trendValue: 5,
		},
	];

	beforeEach(async () => {
		const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

		await TestBed.configureTestingModule({
			imports: [CommonModule, TranslateModule.forRoot(), OebDashboardOverviewComponent],
			providers: [{ provide: Router, useValue: routerSpy }],
		}).compileComponents();

		router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

		fixture = TestBed.createComponent(OebDashboardOverviewComponent);
		component = fixture.componentInstance;
	});

	describe('Component Initialization', () => {
		it('should create the component', () => {
			expect(component).toBeTruthy();
		});

		it('should initialize with empty KPIs array', () => {
			expect(component.kpis).toEqual([]);
		});

		it('should accept KPIs input', () => {
			component.kpis = mockKpis;
			fixture.detectChanges();

			expect(component.kpis.length).toBe(4);
		});
	});

	describe('PLZ KPI Display', () => {
		beforeEach(() => {
			component.kpis = mockKpis;
			fixture.detectChanges();
		});

		it('should display PLZ breadth KPI', () => {
			const plzKpi = component.kpis.find((k) => k.id === 'competencyBreadth');

			expect(plzKpi).toBeDefined();
			expect(plzKpi?.value).toBe(85);
			expect(plzKpi?.label).toBe('Dashboard.kpi.portfolioWidth');
		});

		it('should show PLZ KPI unit correctly', () => {
			const plzKpi = component.kpis.find((k) => k.id === 'competencyBreadth');

			expect(plzKpi?.unit).toBe('Dashboard.unit.plzAreas');
		});

		it('should display PLZ KPI trend', () => {
			const plzKpi = component.kpis.find((k) => k.id === 'competencyBreadth');

			expect(plzKpi?.trend).toBe('stable');
			expect(plzKpi?.trendValue).toBe(2);
		});

		it('should have monthly details for PLZ KPI', () => {
			const plzKpi = component.kpis.find((k) => k.id === 'competencyBreadth');

			expect(plzKpi?.hasMonthlyDetails).toBe(true);
			expect(plzKpi?.monthlyDetails).toBeDefined();
			expect(plzKpi?.monthlyDetails?.length).toBe(2);
		});

		it('should show postal code prefixes in monthly details', () => {
			const plzKpi = component.kpis.find((k) => k.id === 'competencyBreadth');
			const details = plzKpi?.monthlyDetails;

			expect(details?.[0].postalCodePrefix).toBe('01');
			expect(details?.[0].cityName).toBe('Dresden');
			expect(details?.[1].postalCodePrefix).toBe('50');
			expect(details?.[1].cityName).toBe('Köln');
		});
	});

	describe('Navigation to PLZ KPI Details', () => {
		beforeEach(() => {
			component.kpis = mockKpis;
			fixture.detectChanges();
		});

		it('should navigate to PLZ KPI detail page', () => {
			const plzKpi = component.kpis.find((k) => k.id === 'competencyBreadth')!;

			component.viewKpiDetails(plzKpi);

			expect(router.navigate).toHaveBeenCalledWith(['/dashboard/kpi-detail', 'competencyBreadth']);
		});

		it('should log navigation action for PLZ KPI', () => {
			spyOn(console, 'log');
			const plzKpi = component.kpis.find((k) => k.id === 'competencyBreadth')!;

			component.viewKpiDetails(plzKpi);

			expect(console.log).toHaveBeenCalledWith('[OEB-OVERVIEW] Navigating to KPI detail:', 'competencyBreadth');
		});

		it('should not navigate when KPI has no ID', () => {
			spyOn(console, 'warn');
			const kpiWithoutId: KPIData = { ...mockPlzKpi, id: undefined };

			component.viewKpiDetails(kpiWithoutId);

			expect(router.navigate).not.toHaveBeenCalled();
			expect(console.warn).toHaveBeenCalledWith('[OEB-OVERVIEW] KPI missing ID, cannot navigate to details');
		});

		it('should navigate to all KPI details including PLZ', () => {
			component.kpis.forEach((kpi) => {
				component.viewKpiDetails(kpi);
			});

			expect(router.navigate).toHaveBeenCalledTimes(4);
			expect(router.navigate).toHaveBeenCalledWith(['/dashboard/kpi-detail', 'competencyBreadth']);
		});
	});

	describe('Clickable Details Detection', () => {
		beforeEach(() => {
			component.kpis = mockKpis;
			fixture.detectChanges();
		});

		it('should detect PLZ KPI as clickable when has details and positive trend', () => {
			const plzKpi = component.kpis.find((k) => k.id === 'competencyBreadth')!;

			const isClickable = component.hasClickableDetails(plzKpi);

			expect(isClickable).toBe(true);
		});

		it('should detect KPI as not clickable without monthly details', () => {
			const kpiWithoutDetails: KPIData = {
				id: 'test',
				value: 100,
				trend: 'up',
				trendValue: 5,
				hasMonthlyDetails: false,
			};

			const isClickable = component.hasClickableDetails(kpiWithoutDetails);

			expect(isClickable).toBe(false);
		});

		it('should detect KPI as not clickable with zero trend value', () => {
			const kpiWithZeroTrend: KPIData = {
				id: 'test',
				value: 100,
				trend: 'stable',
				trendValue: 0,
				hasMonthlyDetails: true,
			};

			const isClickable = component.hasClickableDetails(kpiWithZeroTrend);

			expect(isClickable).toBe(false);
		});

		it('should detect KPI as not clickable with negative trend value', () => {
			const kpiWithNegativeTrend: KPIData = {
				id: 'test',
				value: 100,
				trend: 'down',
				trendValue: -5,
				hasMonthlyDetails: true,
			};

			const isClickable = component.hasClickableDetails(kpiWithNegativeTrend);

			expect(isClickable).toBe(false);
		});

		it('should detect KPI as not clickable without trend value', () => {
			const kpiWithoutTrend: KPIData = {
				id: 'test',
				value: 100,
				trend: 'stable',
				hasMonthlyDetails: true,
			};

			const isClickable = component.hasClickableDetails(kpiWithoutTrend);

			expect(isClickable).toBe(false);
		});
	});

	describe('Trend Display for PLZ KPI', () => {
		it('should return up arrow for up trend', () => {
			expect(component.getTrendIcon('up')).toBe('↗');
		});

		it('should return down arrow for down trend', () => {
			expect(component.getTrendIcon('down')).toBe('↘');
		});

		it('should return right arrow for stable trend', () => {
			expect(component.getTrendIcon('stable')).toBe('→');
		});

		it('should return right arrow for unknown trend', () => {
			expect(component.getTrendIcon('unknown')).toBe('→');
		});

		it('should return green color for up trend', () => {
			expect(component.getTrendColor('up')).toBe('var(--color-green)');
		});

		it('should return red color for down trend', () => {
			expect(component.getTrendColor('down')).toBe('var(--color-red)');
		});

		it('should return dark gray color for stable trend', () => {
			expect(component.getTrendColor('stable')).toBe('var(--color-darkgray)');
		});

		it('should return dark gray color for unknown trend', () => {
			expect(component.getTrendColor('unknown')).toBe('var(--color-darkgray)');
		});

		it('should display correct trend for PLZ KPI', () => {
			component.kpis = mockKpis;
			const plzKpi = component.kpis.find((k) => k.id === 'competencyBreadth')!;

			const icon = component.getTrendIcon(plzKpi.trend!);
			const color = component.getTrendColor(plzKpi.trend!);

			expect(icon).toBe('→');
			expect(color).toBe('var(--color-darkgray)');
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty KPIs array', () => {
			component.kpis = [];
			fixture.detectChanges();

			expect(component.kpis.length).toBe(0);
		});

		it('should handle KPI with missing trend', () => {
			const kpiWithoutTrend: KPIData = {
				id: 'test',
				value: 100,
			};
			component.kpis = [kpiWithoutTrend];

			const icon = component.getTrendIcon(kpiWithoutTrend.trend || '');
			expect(icon).toBe('→');
		});

		it('should handle KPI with undefined hasMonthlyDetails', () => {
			const kpi: KPIData = {
				id: 'test',
				value: 100,
				trendValue: 5,
			};

			const isClickable = component.hasClickableDetails(kpi);

			expect(isClickable).toBe(false);
		});

		it('should handle very large PLZ area count', () => {
			const largePlzKpi: KPIData = {
				...mockPlzKpi,
				value: 999999,
			};
			component.kpis = [largePlzKpi];
			fixture.detectChanges();

			expect(largePlzKpi.value).toBe(999999);
		});

		it('should handle PLZ KPI with many monthly details', () => {
			const manyDetails: KPIData = {
				...mockPlzKpi,
				monthlyDetails: Array(50)
					.fill(null)
					.map((_, i) => ({
						postalCodePrefix: `${i}`,
						cityName: `City ${i}`,
						value: i,
						categoryKey: 'new_postal_area',
					})),
			};
			component.kpis = [manyDetails];
			fixture.detectChanges();

			expect(manyDetails.monthlyDetails?.length).toBe(50);
		});
	});

	describe('Data Integrity', () => {
		beforeEach(() => {
			component.kpis = mockKpis;
			fixture.detectChanges();
		});

		it('should preserve all KPI properties', () => {
			const plzKpi = component.kpis.find((k) => k.id === 'competencyBreadth')!;

			expect(plzKpi.id).toBe('competencyBreadth');
			expect(plzKpi.label).toBe('Dashboard.kpi.portfolioWidth');
			expect(plzKpi.value).toBe(85);
			expect(plzKpi.unit).toBe('Dashboard.unit.plzAreas');
			expect(plzKpi.trend).toBe('stable');
			expect(plzKpi.trendValue).toBe(2);
			expect(plzKpi.hasMonthlyDetails).toBe(true);
		});

		it('should maintain monthly details structure', () => {
			const plzKpi = component.kpis.find((k) => k.id === 'competencyBreadth')!;
			const detail = plzKpi.monthlyDetails?.[0];

			expect(detail?.postalCodePrefix).toBeDefined();
			expect(detail?.cityName).toBeDefined();
			expect(detail?.value).toBeDefined();
			expect(detail?.categoryKey).toBeDefined();
		});

		it('should not mutate input KPIs', () => {
			const originalKpis = JSON.parse(JSON.stringify(mockKpis));

			component.viewKpiDetails(component.kpis[2]);

			expect(component.kpis).toEqual(originalKpis);
		});
	});

	describe('Performance', () => {
		it('should handle rapid navigation clicks', () => {
			component.kpis = mockKpis;
			const plzKpi = component.kpis.find((k) => k.id === 'competencyBreadth')!;

			for (let i = 0; i < 100; i++) {
				component.viewKpiDetails(plzKpi);
			}

			expect(router.navigate).toHaveBeenCalledTimes(100);
		});

		it('should efficiently check clickable details', () => {
			component.kpis = mockKpis;

			const startTime = performance.now();
			for (let i = 0; i < 1000; i++) {
				component.kpis.forEach((kpi) => {
					component.hasClickableDetails(kpi);
				});
			}
			const endTime = performance.now();

			expect(endTime - startTime).toBeLessThan(100);
		});
	});
});
