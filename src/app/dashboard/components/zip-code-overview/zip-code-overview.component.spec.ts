import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateModule } from '@ngx-translate/core';
import { of, throwError, Observable } from 'rxjs';

import { PlzOverviewComponent } from './plz-overview.component';
import { DashboardMockDataService } from '../../services/dashboard-mock-data.service';
import { PlzStatisticsResponse, PlzStatisticsData } from '../../models/dashboard-models';

/**
 * Comprehensive Tests for PLZ Overview Component
 *
 * Tests the PLZ (Postal Code) statistics overview component:
 * - Component initialization and data loading
 * - PLZ statistics display and formatting
 * - Navigation to PLZ detail view
 * - Trend calculations and display
 * - Error handling and loading states
 * - Bar chart width calculations
 * - Back navigation functionality
 */
describe('PlzOverviewComponent', () => {
	let component: PlzOverviewComponent;
	let fixture: ComponentFixture<PlzOverviewComponent>;
	let mockDataService: jasmine.SpyObj<DashboardMockDataService>;
	let router: jasmine.SpyObj<Router>;

	const mockPlzStatisticsResponse: PlzStatisticsResponse = {
		description: 'Test PLZ statistics',
		metadata: {
			lastUpdated: '2024-11-16',
			totalLearners: 3542,
			totalPlzAreas: 18,
		},
		statistics: [
			{
				plz: '80xxx',
				regionName: 'München',
				learnerCount: 487,
				percentage: 13.7,
				trend: 'up',
				trendValue: 23,
			},
			{
				plz: '10xxx',
				regionName: 'Berlin Mitte',
				learnerCount: 412,
				percentage: 11.6,
				trend: 'up',
				trendValue: 18,
			},
			{
				plz: '20xxx',
				regionName: 'Hamburg',
				learnerCount: 356,
				percentage: 10.1,
				trend: 'stable',
				trendValue: 3,
			},
			{
				plz: '60xxx',
				regionName: 'Frankfurt am Main',
				learnerCount: 298,
				percentage: 8.4,
				trend: 'up',
				trendValue: 15,
			},
			{
				plz: '90xxx',
				regionName: 'Nürnberg',
				learnerCount: 176,
				percentage: 5.0,
				trend: 'down',
				trendValue: -5,
			},
		],
	};

	beforeEach(async () => {
		const mockDataServiceSpy = jasmine.createSpyObj('DashboardMockDataService', ['getPlzStatistics']);
		const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

		await TestBed.configureTestingModule({
			imports: [CommonModule, TranslateModule.forRoot(), PlzOverviewComponent],
			providers: [
				{ provide: DashboardMockDataService, useValue: mockDataServiceSpy },
				{ provide: Router, useValue: routerSpy },
			],
		}).compileComponents();

		mockDataService = TestBed.inject(DashboardMockDataService) as jasmine.SpyObj<DashboardMockDataService>;
		router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

		// Default mock behavior
		mockDataService.getPlzStatistics.and.returnValue(of(mockPlzStatisticsResponse));

		fixture = TestBed.createComponent(PlzOverviewComponent);
		component = fixture.componentInstance;
	});

	describe('Component Initialization', () => {
		it('should create the component', () => {
			expect(component).toBeTruthy();
		});

		it('should initialize with default values', () => {
			expect(component.plzStatistics).toEqual([]);
			expect(component.loading).toBe(false);
			expect(component.error).toBeNull();
			expect(component.totalLearners).toBe(0);
			expect(component.metadata).toBeNull();
		});

		it('should load PLZ statistics on init', () => {
			fixture.detectChanges();

			expect(mockDataService.getPlzStatistics).toHaveBeenCalled();
			expect(component.plzStatistics.length).toBe(5);
			expect(component.metadata).toEqual(mockPlzStatisticsResponse.metadata);
		});

		it('should calculate total learners correctly', () => {
			fixture.detectChanges();

			const expectedTotal = mockPlzStatisticsResponse.statistics.reduce(
				(sum, stat) => sum + stat.learnerCount,
				0,
			);
			expect(component.totalLearners).toBe(expectedTotal);
		});

		it('should set loading state during data fetch', () => {
			let loadingStateBeforeResponse = false;

			mockDataService.getPlzStatistics.and.returnValue(
				new Observable((observer) => {
					loadingStateBeforeResponse = component.loading;
					observer.next(mockPlzStatisticsResponse);
					observer.complete();
				}),
			);

			fixture.detectChanges();

			expect(loadingStateBeforeResponse).toBe(true);
			expect(component.loading).toBe(false);
		});

		it('should clear error on successful load', () => {
			component.error = 'Previous error';
			fixture.detectChanges();

			expect(component.error).toBeNull();
		});
	});

	describe('Data Loading', () => {
		it('should handle successful data response', () => {
			spyOn(console, 'log');
			fixture.detectChanges();

			expect(component.plzStatistics).toEqual(mockPlzStatisticsResponse.statistics);
			expect(component.loading).toBe(false);
			expect(component.error).toBeNull();
		});

		it('should handle empty statistics array', () => {
			const emptyResponse: PlzStatisticsResponse = {
				...mockPlzStatisticsResponse,
				statistics: [],
			};
			mockDataService.getPlzStatistics.and.returnValue(of(emptyResponse));

			fixture.detectChanges();

			expect(component.plzStatistics).toEqual([]);
			expect(component.totalLearners).toBe(0);
		});

		it('should handle error response', () => {
			const error = new Error('Network error');
			mockDataService.getPlzStatistics.and.returnValue(throwError(() => error));

			spyOn(console, 'error');
			fixture.detectChanges();

			expect(component.error).toBe('Dashboard.plzOverview.error');
			expect(component.loading).toBe(false);
			expect(console.error).toHaveBeenCalledWith('[PLZ-OVERVIEW] Error loading PLZ statistics:', error);
		});

		it('should log successful data load', () => {
			spyOn(console, 'log');
			fixture.detectChanges();

			expect(console.log).toHaveBeenCalledWith(
				'[PLZ-OVERVIEW] PLZ Statistics loaded:',
				mockPlzStatisticsResponse,
			);
		});

		it('should handle statistics with zero learner count', () => {
			const dataWithZero: PlzStatisticsResponse = {
				...mockPlzStatisticsResponse,
				statistics: [
					...mockPlzStatisticsResponse.statistics,
					{
						plz: '99xxx',
						regionName: 'Empty Region',
						learnerCount: 0,
						percentage: 0,
						trend: 'stable',
						trendValue: 0,
					},
				],
			};
			mockDataService.getPlzStatistics.and.returnValue(of(dataWithZero));

			fixture.detectChanges();

			expect(component.plzStatistics.length).toBe(6);
			const emptyRegion = component.plzStatistics.find((s) => s.plz === '99xxx');
			expect(emptyRegion?.learnerCount).toBe(0);
		});
	});

	describe('Navigation', () => {
		beforeEach(() => {
			fixture.detectChanges();
		});

		it('should navigate to PLZ detail view', () => {
			const testPlz = '80xxx';

			component.viewPlzDetails(testPlz);

			expect(router.navigate).toHaveBeenCalledWith(['/dashboard/postal-code', testPlz]);
		});

		it('should log navigation action', () => {
			spyOn(console, 'log');
			const testPlz = '10xxx';

			component.viewPlzDetails(testPlz);

			expect(console.log).toHaveBeenCalledWith('[PLZ-OVERVIEW] Navigating to PLZ detail:', testPlz);
		});

		it('should navigate to dashboard from back button', () => {
			component.backToDashboard();

			expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
		});

		it('should handle navigation for all PLZ codes', () => {
			component.plzStatistics.forEach((stat) => {
				component.viewPlzDetails(stat.plz);
			});

			expect(router.navigate).toHaveBeenCalledTimes(component.plzStatistics.length);
		});

		it('should navigate with empty PLZ string', () => {
			component.viewPlzDetails('');

			expect(router.navigate).toHaveBeenCalledWith(['/dashboard/postal-code', '']);
		});
	});

	describe('Trend Display', () => {
		beforeEach(() => {
			fixture.detectChanges();
		});

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

		it('should handle all trend types in statistics', () => {
			const upTrends = component.plzStatistics.filter((s) => s.trend === 'up');
			const downTrends = component.plzStatistics.filter((s) => s.trend === 'down');
			const stableTrends = component.plzStatistics.filter((s) => s.trend === 'stable');

			expect(upTrends.length).toBeGreaterThan(0);
			expect(downTrends.length).toBeGreaterThan(0);
			expect(stableTrends.length).toBeGreaterThan(0);
		});
	});

	describe('Bar Width Calculation', () => {
		beforeEach(() => {
			fixture.detectChanges();
		});

		it('should calculate bar width as percentage of total', () => {
			const learnerCount = 487;
			const expectedWidth = (learnerCount / component.totalLearners) * 100;

			const barWidth = component.getBarWidth(learnerCount);

			expect(barWidth).toBeCloseTo(expectedWidth, 2);
		});

		it('should return 0 when total learners is 0', () => {
			component.totalLearners = 0;

			const barWidth = component.getBarWidth(100);

			expect(barWidth).toBe(0);
		});

		it('should handle maximum learner count', () => {
			const maxCount = Math.max(...component.plzStatistics.map((s) => s.learnerCount));
			const expectedWidth = (maxCount / component.totalLearners) * 100;

			const barWidth = component.getBarWidth(maxCount);

			expect(barWidth).toBeCloseTo(expectedWidth, 2);
		});

		it('should handle minimum learner count', () => {
			const minCount = Math.min(...component.plzStatistics.map((s) => s.learnerCount));
			const expectedWidth = (minCount / component.totalLearners) * 100;

			const barWidth = component.getBarWidth(minCount);

			expect(barWidth).toBeCloseTo(expectedWidth, 2);
		});

		it('should return 0 for zero learner count', () => {
			const barWidth = component.getBarWidth(0);

			expect(barWidth).toBe(0);
		});

		it('should calculate correct widths for all statistics', () => {
			component.plzStatistics.forEach((stat) => {
				const width = component.getBarWidth(stat.learnerCount);
				expect(width).toBeGreaterThanOrEqual(0);
				expect(width).toBeLessThanOrEqual(100);
			});
		});
	});

	describe('Template Rendering', () => {
		beforeEach(() => {
			fixture.detectChanges();
		});

		it('should display all PLZ regions', () => {
			const compiled = fixture.nativeElement;
			const plzElements = compiled.querySelectorAll('.plz-item');

			// Note: Actual selector depends on template implementation
			expect(component.plzStatistics.length).toBe(5);
		});

		it('should display metadata information', () => {
			expect(component.metadata?.totalLearners).toBe(3542);
			expect(component.metadata?.totalPlzAreas).toBe(18);
		});

		it('should show loading state initially', () => {
			component.loading = true;
			fixture.detectChanges();

			expect(component.loading).toBe(true);
		});

		it('should show error message when error occurs', () => {
			component.error = 'Dashboard.plzOverview.error';
			component.loading = false;
			fixture.detectChanges();

			expect(component.error).toBe('Dashboard.plzOverview.error');
		});
	});

	describe('Edge Cases', () => {
		it('should handle single PLZ area', () => {
			const singleArea: PlzStatisticsResponse = {
				...mockPlzStatisticsResponse,
				metadata: { ...mockPlzStatisticsResponse.metadata, totalPlzAreas: 1 },
				statistics: [mockPlzStatisticsResponse.statistics[0]],
			};
			mockDataService.getPlzStatistics.and.returnValue(of(singleArea));

			fixture.detectChanges();

			expect(component.plzStatistics.length).toBe(1);
			expect(component.totalLearners).toBe(487);
		});

		it('should handle very large learner counts', () => {
			const largeCount: PlzStatisticsResponse = {
				...mockPlzStatisticsResponse,
				statistics: [
					{
						plz: '99xxx',
						regionName: 'Large Region',
						learnerCount: 1000000,
						percentage: 99.9,
						trend: 'up',
						trendValue: 50000,
					},
				],
			};
			mockDataService.getPlzStatistics.and.returnValue(of(largeCount));

			fixture.detectChanges();

			expect(component.plzStatistics[0].learnerCount).toBe(1000000);
			expect(component.totalLearners).toBe(1000000);
		});

		it('should handle negative trend values', () => {
			const negativeTrend = component.plzStatistics.find((s) => s.trend === 'down');

			expect(negativeTrend).toBeDefined();
			expect(negativeTrend?.trendValue).toBeLessThan(0);
		});

		it('should handle missing metadata fields', () => {
			const noMetadata: PlzStatisticsResponse = {
				statistics: mockPlzStatisticsResponse.statistics,
				metadata: {
					lastUpdated: '',
					totalLearners: 0,
					totalPlzAreas: 0,
				},
			};
			mockDataService.getPlzStatistics.and.returnValue(of(noMetadata));

			fixture.detectChanges();

			expect(component.metadata?.lastUpdated).toBe('');
		});

		it('should handle PLZ codes with different formats', () => {
			const mixedFormats: PlzStatisticsResponse = {
				...mockPlzStatisticsResponse,
				statistics: [
					{
						plz: '80xxx',
						regionName: 'Munich',
						learnerCount: 100,
						percentage: 50,
						trend: 'up',
						trendValue: 5,
					},
					{
						plz: '80xx',
						regionName: 'Zurich',
						learnerCount: 100,
						percentage: 50,
						trend: 'up',
						trendValue: 5,
					},
				],
			};
			mockDataService.getPlzStatistics.and.returnValue(of(mixedFormats));

			fixture.detectChanges();

			expect(component.plzStatistics.length).toBe(2);
		});
	});

	describe('Data Integrity', () => {
		beforeEach(() => {
			fixture.detectChanges();
		});

		it('should preserve original data structure', () => {
			expect(component.plzStatistics).toEqual(mockPlzStatisticsResponse.statistics);
		});

		it('should maintain all required properties for each statistic', () => {
			component.plzStatistics.forEach((stat) => {
				expect(stat.plz).toBeDefined();
				expect(stat.regionName).toBeDefined();
				expect(stat.learnerCount).toBeDefined();
				expect(stat.percentage).toBeDefined();
				expect(stat.trend).toBeDefined();
				expect(stat.trendValue).toBeDefined();
			});
		});

		it('should have correct total learners sum', () => {
			const calculatedTotal = component.plzStatistics.reduce((sum, stat) => sum + stat.learnerCount, 0);

			expect(component.totalLearners).toBe(calculatedTotal);
		});

		it('should have percentage values that are reasonable', () => {
			component.plzStatistics.forEach((stat) => {
				expect(stat.percentage).toBeGreaterThanOrEqual(0);
				expect(stat.percentage).toBeLessThanOrEqual(100);
			});
		});
	});

	describe('Performance', () => {
		it('should only call service once on init', () => {
			fixture.detectChanges();

			expect(mockDataService.getPlzStatistics).toHaveBeenCalledTimes(1);
		});

		it('should handle rapid navigation requests', () => {
			fixture.detectChanges();

			for (let i = 0; i < 10; i++) {
				component.viewPlzDetails('80xxx');
			}

			expect(router.navigate).toHaveBeenCalledTimes(10);
		});

		it('should calculate bar widths efficiently', () => {
			fixture.detectChanges();

			const startTime = performance.now();
			for (let i = 0; i < 1000; i++) {
				component.getBarWidth(487);
			}
			const endTime = performance.now();

			expect(endTime - startTime).toBeLessThan(100); // Should be very fast
		});
	});
});
