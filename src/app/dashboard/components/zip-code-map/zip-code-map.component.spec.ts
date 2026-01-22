import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { PlzMapComponent, PlzRegion, PlzDetailMetrics } from './plz-map.component';
import { By } from '@angular/platform-browser';

/**
 * Component Tests for PLZ Map
 *
 * Tests the PLZ (Postal Code) map visualization component:
 * - Component initialization and rendering
 * - Data processing and sorting
 * - Click interactions and event emission
 * - Visual styling and color intensity calculations
 * - Grid layout logic
 * - Edge cases and error handling
 */
describe('PlzMapComponent', () => {
	let component: PlzMapComponent;
	let fixture: ComponentFixture<PlzMapComponent>;

	const mockPlzData: PlzRegion[] = [
		{ code: '80331-80339', name: 'Altstadt/Lehel', count: 245, percentage: 100 },
		{ code: '80469-80539', name: 'Isarvorstadt/Haidhausen', count: 198, percentage: 81 },
		{ code: '80634-80639', name: 'Neuhausen/Nymphenburg', count: 167, percentage: 68 },
		{ code: '80796-80809', name: 'Schwabing/Maxvorstadt', count: 221, percentage: 90 },
		{ code: '80933-80999', name: 'Milbertshofen/Freimann/Feldmoching', count: 143, percentage: 58 },
	];

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CommonModule, PlzMapComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(PlzMapComponent);
		component = fixture.componentInstance;
	});

	describe('Component Initialization', () => {
		it('should create the component', () => {
			expect(component).toBeTruthy();
		});

		it('should initialize with default Munich PLZ regions when no input provided', () => {
			fixture.detectChanges();

			expect(component.plzRegions).toBeDefined();
			expect(component.plzRegions.length).toBe(10);
			expect(component.plzRegions[0].name).toBeTruthy();
		});

		it('should use input plzData when provided', () => {
			component.plzData = mockPlzData;
			fixture.detectChanges();

			expect(component.plzRegions.length).toBe(mockPlzData.length);
		});

		it('should sort regions by count in descending order on init', () => {
			component.plzData = mockPlzData;
			fixture.detectChanges();

			const counts = component.plzRegions.map((r) => r.count);
			const sortedCounts = [...counts].sort((a, b) => b - a);
			expect(counts).toEqual(sortedCounts);
		});

		it('should recalculate percentages based on max count', () => {
			component.plzData = mockPlzData;
			fixture.detectChanges();

			const maxCount = component.plzRegions[0].count;
			expect(component.plzRegions[0].percentage).toBe(100);

			component.plzRegions.forEach((region) => {
				const expectedPercentage = (region.count / maxCount) * 100;
				expect(region.percentage).toBeCloseTo(expectedPercentage, 1);
			});
		});
	});

	describe('Rendering and Display', () => {
		beforeEach(() => {
			component.plzData = mockPlzData;
			fixture.detectChanges();
		});

		it('should render all PLZ regions', () => {
			const regionElements = fixture.debugElement.queryAll(By.css('[title]'));
			expect(regionElements.length).toBe(mockPlzData.length);
		});

		it('should display PLZ codes', () => {
			const compiled = fixture.nativeElement;
			const codeElements = compiled.querySelectorAll('.tw-font-bold');

			expect(codeElements.length).toBeGreaterThan(0);
			expect(codeElements[0].textContent.trim()).toBeTruthy();
		});

		it('should display badge counts', () => {
			const compiled = fixture.nativeElement;
			const countElements = compiled.querySelectorAll('.tw-text-sm');

			expect(countElements.length).toBeGreaterThan(0);
			const firstCount = parseInt(countElements[0].textContent.trim());
			expect(firstCount).toBeGreaterThan(0);
		});

		it('should render legend with gradient', () => {
			const compiled = fixture.nativeElement;
			const legendBlocks = compiled.querySelectorAll('.tw-w-6.tw-h-4');

			expect(legendBlocks.length).toBe(5);
		});

		it('should display instruction text', () => {
			const compiled = fixture.nativeElement;
			const text = compiled.textContent;

			expect(text).toContain('Klick auf PLZ-Bereiche');
		});
	});

	describe('Click Interactions', () => {
		beforeEach(() => {
			component.plzData = mockPlzData;
			fixture.detectChanges();
		});

		it('should emit plzClicked event when region is clicked', (done) => {
			const testCode = '80331-80339';

			component.plzClicked.subscribe((code: string) => {
				expect(code).toBe(testCode);
				done();
			});

			component.onPlzClick(testCode);
		});

		it('should handle click on first region', () => {
			spyOn(component.plzClicked, 'emit');

			const firstRegion = component.plzRegions[0];
			component.onPlzClick(firstRegion.code);

			expect(component.plzClicked.emit).toHaveBeenCalledWith(firstRegion.code);
		});

		it('should handle click on last region', () => {
			spyOn(component.plzClicked, 'emit');

			const lastRegion = component.plzRegions[component.plzRegions.length - 1];
			component.onPlzClick(lastRegion.code);

			expect(component.plzClicked.emit).toHaveBeenCalledWith(lastRegion.code);
		});

		it('should trigger click via DOM interaction', () => {
			spyOn(component.plzClicked, 'emit');

			const regionElement = fixture.debugElement.query(By.css('[title]'));
			regionElement.nativeElement.click();

			expect(component.plzClicked.emit).toHaveBeenCalled();
		});

		it('should log click events to console', () => {
			spyOn(console, 'log');

			const testCode = '80331-80339';
			component.onPlzClick(testCode);

			expect(console.log).toHaveBeenCalledWith('[PLZ-MAP] PLZ region clicked:', testCode);
		});
	});

	describe('Color Intensity Calculation', () => {
		it('should calculate color intensity with correct opacity', () => {
			const color100 = component.getColorIntensity(100);
			expect(color100).toBe('rgba(73, 46, 152, 1)');
		});

		it('should calculate color intensity for 50%', () => {
			const color50 = component.getColorIntensity(50);
			expect(color50).toBe('rgba(73, 46, 152, 0.5)');
		});

		it('should have minimum opacity of 0.2', () => {
			const color0 = component.getColorIntensity(0);
			expect(color0).toBe('rgba(73, 46, 152, 0.2)');
		});

		it('should handle very low percentages with minimum opacity', () => {
			const color5 = component.getColorIntensity(5);
			expect(color5).toBe('rgba(73, 46, 152, 0.2)');
		});

		it('should handle percentages above 100', () => {
			const color150 = component.getColorIntensity(150);
			expect(color150).toBe('rgba(73, 46, 152, 1.5)');
		});
	});

	describe('Grid Layout Logic', () => {
		it('should assign 2x2 grid for index 0', () => {
			const gridSize = component.getGridSize(0);
			expect(gridSize).toBe('tw-col-span-2 tw-row-span-2');
		});

		it('should assign 2x1 grid for index 1', () => {
			const gridSize = component.getGridSize(1);
			expect(gridSize).toBe('tw-col-span-2 tw-row-span-1');
		});

		it('should assign 1x2 grid for index 2', () => {
			const gridSize = component.getGridSize(2);
			expect(gridSize).toBe('tw-col-span-1 tw-row-span-2');
		});

		it('should assign 2x1 grid for index 3', () => {
			const gridSize = component.getGridSize(3);
			expect(gridSize).toBe('tw-col-span-2 tw-row-span-1');
		});

		it('should assign 1x1 grid for indices 4-5', () => {
			const gridSize4 = component.getGridSize(4);
			const gridSize5 = component.getGridSize(5);

			expect(gridSize4).toBe('tw-col-span-1 tw-row-span-1');
			expect(gridSize5).toBe('tw-col-span-1 tw-row-span-1');
		});

		it('should assign 1x1 grid for indices 7-10', () => {
			const gridSize7 = component.getGridSize(7);
			const gridSize10 = component.getGridSize(10);

			expect(gridSize7).toBe('tw-col-span-1 tw-row-span-1');
			expect(gridSize10).toBe('tw-col-span-1 tw-row-span-1');
		});
	});

	describe('Region Label Resolution', () => {
		beforeEach(() => {
			component.plzData = mockPlzData;
			fixture.detectChanges();
		});

		it('should return region name for valid code', () => {
			const label = component.getRegionLabel('80331-80339');
			expect(label).toBe('Altstadt/Lehel');
		});

		it('should return code when region not found', () => {
			const unknownCode = '99999-99999';
			const label = component.getRegionLabel(unknownCode);
			expect(label).toBe(unknownCode);
		});

		it('should handle empty code', () => {
			const label = component.getRegionLabel('');
			expect(label).toBe('');
		});

		it('should find label for all regions', () => {
			component.plzRegions.forEach((region) => {
				const label = component.getRegionLabel(region.code);
				expect(label).toBe(region.name);
			});
		});
	});

	describe('Edge Cases and Error Handling', () => {
		it('should handle empty plzData input', () => {
			component.plzData = [];
			fixture.detectChanges();

			// Should fall back to default Munich regions
			expect(component.plzRegions.length).toBe(10);
		});

		it('should handle single region', () => {
			component.plzData = [mockPlzData[0]];
			fixture.detectChanges();

			expect(component.plzRegions.length).toBe(1);
			expect(component.plzRegions[0].percentage).toBe(100);
		});

		it('should handle regions with zero count', () => {
			const dataWithZero: PlzRegion[] = [
				{ code: '80331', name: 'Test', count: 100, percentage: 100 },
				{ code: '80332', name: 'Zero', count: 0, percentage: 0 },
			];
			component.plzData = dataWithZero;
			fixture.detectChanges();

			expect(component.plzRegions[1].count).toBe(0);
			expect(component.plzRegions[1].percentage).toBe(0);
		});

		it('should handle equal counts across regions', () => {
			const equalData: PlzRegion[] = [
				{ code: '80331', name: 'Region 1', count: 100, percentage: 100 },
				{ code: '80332', name: 'Region 2', count: 100, percentage: 100 },
				{ code: '80333', name: 'Region 3', count: 100, percentage: 100 },
			];
			component.plzData = equalData;
			fixture.detectChanges();

			component.plzRegions.forEach((region) => {
				expect(region.percentage).toBe(100);
			});
		});

		it('should not break when maxCount is zero', () => {
			const zeroData: PlzRegion[] = [{ code: '80331', name: 'Zero Region', count: 0, percentage: 0 }];
			component.plzData = zeroData;
			fixture.detectChanges();

			// Should use fallback value of 1 for maxCount
			expect(component.plzRegions[0].percentage).toBe(0);
		});
	});

	describe('Data Integrity', () => {
		it('should preserve original data structure', () => {
			const originalData = [...mockPlzData];
			component.plzData = mockPlzData;
			fixture.detectChanges();

			// Input should not be mutated
			expect(mockPlzData).toEqual(originalData);
		});

		it('should maintain all required properties', () => {
			component.plzData = mockPlzData;
			fixture.detectChanges();

			component.plzRegions.forEach((region) => {
				expect(region.code).toBeDefined();
				expect(region.name).toBeDefined();
				expect(region.count).toBeDefined();
				expect(region.percentage).toBeDefined();
			});
		});

		it('should handle percentage recalculation correctly', () => {
			component.plzData = mockPlzData;
			fixture.detectChanges();

			const maxCount = Math.max(...component.plzRegions.map((r) => r.count));
			expect(maxCount).toBeGreaterThan(0);

			component.plzRegions.forEach((region) => {
				const expectedPercentage = (region.count / maxCount) * 100;
				expect(region.percentage).toBeCloseTo(expectedPercentage, 1);
			});
		});
	});

	describe('Accessibility and UX', () => {
		beforeEach(() => {
			component.plzData = mockPlzData;
			fixture.detectChanges();
		});

		it('should have title attributes for tooltips', () => {
			const regionElements = fixture.debugElement.queryAll(By.css('[title]'));

			regionElements.forEach((element) => {
				const title = element.nativeElement.getAttribute('title');
				expect(title).toBeTruthy();
				expect(title).toContain('Badges');
			});
		});

		it('should have cursor-pointer class for clickable regions', () => {
			const regionElements = fixture.debugElement.queryAll(By.css('[title]'));

			regionElements.forEach((element) => {
				const classes = element.nativeElement.className;
				expect(classes).toContain('tw-cursor-pointer');
			});
		});

		it('should have hover effects', () => {
			const regionElements = fixture.debugElement.queryAll(By.css('[title]'));

			regionElements.forEach((element) => {
				const classes = element.nativeElement.className;
				expect(classes).toContain('hover:tw-opacity-80');
				expect(classes).toContain('hover:tw-scale-105');
			});
		});

		it('should have smooth transitions', () => {
			const regionElements = fixture.debugElement.queryAll(By.css('[title]'));

			regionElements.forEach((element) => {
				const classes = element.nativeElement.className;
				expect(classes).toContain('tw-transition-all');
			});
		});

		it('should provide helpful title with region name and count', () => {
			const firstElement = fixture.debugElement.query(By.css('[title]'));
			const title = firstElement.nativeElement.getAttribute('title');

			expect(title).toContain(':');
			expect(title).toContain('Badges');
			expect(title).toContain('Klick für Details');
		});
	});

	describe('TypeScript Interface Compliance', () => {
		it('PlzRegion interface should have all required properties', () => {
			const validRegion: PlzRegion = {
				code: '80331',
				name: 'Test Region',
				count: 100,
				percentage: 100,
			};

			expect(validRegion.code).toBeDefined();
			expect(validRegion.name).toBeDefined();
			expect(validRegion.count).toBeDefined();
			expect(validRegion.percentage).toBeDefined();
		});

		it('PlzDetailMetrics interface should support all detail fields', () => {
			const validMetrics: PlzDetailMetrics = {
				code: '80331',
				regionName: 'Test',
				totalBadges: 100,
				badgesByType: {
					participation: 40,
					competency: 50,
					learningpath: 10,
				},
				topCompetencies: [{ name: 'Test', count: 10, percentage: 10 }],
				institutions: 5,
				topInstitutions: [{ name: 'Test Uni', badgeCount: 50 }],
				demographics: {
					genderDistribution: [{ gender: 'Weiblich', count: 50, percentage: 50 }],
				},
				trendData: {
					monthlyGrowth: 10,
					yearlyGrowth: 50,
				},
			};

			expect(validMetrics.code).toBeDefined();
			expect(validMetrics.badgesByType).toBeDefined();
			expect(validMetrics.demographics).toBeDefined();
		});
	});
});
