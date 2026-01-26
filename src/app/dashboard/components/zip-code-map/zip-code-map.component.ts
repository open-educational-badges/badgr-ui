import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * City entry from API (SocialspaceCityEntry format)
 */
export interface CityEntry {
	city: string;
	badges: number;
}

export interface ZipCodeRegion {
	code: string;
	name: string; // City name (e.g., "München", "Berlin")
	count: number;
	percentage: number;
}

/** @deprecated Use ZipCodeRegion instead */
export type PlzRegion = ZipCodeRegion;

/**
 * Individual learner residence ZIP code distribution entry
 */
export interface LearnerResidenceData {
	/** ZIP code or range of learner residence */
	zipCode: string;
	/** Region/district name for this ZIP code */
	regionName: string;
	/** Number of learners from this ZIP code */
	learnerCount: number;
	/** Percentage of total learners */
	percentage: number;
	/** Whether this is the "other ZIP code" aggregated category */
	isOtherCategory?: boolean;
}

export interface ZipCodeDetailMetrics {
	code: string;
	regionName: string;
	totalBadges: number;
	learnerCount?: number; // Number of unique learners in this ZIP code area
	badgesByType: {
		participation: number;
		competency: number;
		learningpath: number;
	};
	topCompetencies: Array<{
		name: string;
		count: number;
		percentage: number;
	}>;
	institutions: number;
	topInstitutions: Array<{
		name: string;
		badgeCount: number;
	}>;
	demographics: {
		genderDistribution: Array<{
			gender: string;
			count: number;
			percentage: number;
		}>;
	};
	trendData: {
		monthlyGrowth: number;
		yearlyGrowth: number;
	};
	/** Learner residence distribution */
	learnerResidence?: {
		/** Total number of learners in this learning offer area */
		totalLearners: number;
		/** Distribution by residence ZIP code */
		distribution: LearnerResidenceData[];
		/** Threshold percentage for "other" category */
		otherThreshold: number;
	};
}

/** @deprecated Use ZipCodeDetailMetrics instead */
export type PlzDetailMetrics = ZipCodeDetailMetrics;

@Component({
	selector: 'app-zip-code-map',
	standalone: true,
	imports: [CommonModule, TranslatePipe],
	templateUrl: './zip-code-map.component.html',
	styleUrls: ['./zip-code-map.component.scss'],
})
export class ZipCodeMapComponent implements OnInit, OnChanges {
	/** City data from API (preferred input) */
	@Input() cities: CityEntry[] = [];

	@Input() zipCodeData: ZipCodeRegion[] = [];
	/** @deprecated Use zipCodeData instead */
	@Input() set plzData(value: ZipCodeRegion[]) {
		this.zipCodeData = value;
	}
	@Output() zipCodeClicked = new EventEmitter<string>();
	/** @deprecated Use zipCodeClicked instead */
	@Output() plzClicked = this.zipCodeClicked;

	// City/region data for display - populated from API
	zipCodeRegions: ZipCodeRegion[] = [];

	constructor() {}

	ngOnInit(): void {
		this.updateRegionsFromData();
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['cities'] || changes['zipCodeData']) {
			this.updateRegionsFromData();
		}
	}

	/**
	 * Update regions from input data (cities or zipCodeData)
	 */
	private updateRegionsFromData(): void {
		// Priority 1: Use cities from API
		if (this.cities && this.cities.length > 0) {
			this.zipCodeRegions = this.cities.map((city) => ({
				code: city.city, // Use city name as the "code" for click handling
				name: city.city,
				count: city.badges,
				percentage: 0, // Will be calculated below
			}));
		}
		// Priority 2: Use zipCodeData if provided
		else if (this.zipCodeData && this.zipCodeData.length > 0) {
			this.zipCodeRegions = [...this.zipCodeData];
		}
		// No data available - show empty state
		else {
			this.zipCodeRegions = [];
			return;
		}

		// Sort by count (descending) for opacity calculation
		this.zipCodeRegions = [...this.zipCodeRegions].sort((a, b) => b.count - a.count);

		// Recalculate percentages based on sorted order
		const maxCount = this.zipCodeRegions[0]?.count || 1;
		this.zipCodeRegions = this.zipCodeRegions.map((region) => ({
			...region,
			percentage: (region.count / maxCount) * 100,
		}));
	}

	getColorIntensity(percentage: number): string {
		// Returns a CSS custom property with opacity based on percentage
		const opacity = Math.max(0.2, percentage / 100);
		return `rgba(73, 46, 152, ${opacity})`; // var(--color-purple) with dynamic opacity
	}

	getRegionLabel(code: string): string {
		// Find the region by code
		const region = this.zipCodeRegions.find((r) => r.code === code);
		return region ? region.name : code;
	}

	getGridSize(index: number): string {
		// Assign grid sizes from left to right, decreasing in size
		// Layout flows: left to right, then down
		if (index === 0) {
			// 1st (leftmost, top): largest - 2x2
			return 'tw-col-span-2 tw-row-span-2';
		} else if (index === 1) {
			// 2nd: medium-large - 2x1
			return 'tw-col-span-2 tw-row-span-1';
		} else if (index === 2) {
			// 3rd: single tall - 1x2
			return 'tw-col-span-1 tw-row-span-2';
		} else if (index === 3) {
			// 4th: medium width - 2x1
			return 'tw-col-span-2 tw-row-span-1';
		} else if (index === 4 || index === 5) {
			// 5th-6th: normal - 1x1
			return 'tw-col-span-1 tw-row-span-1';
		} else {
			// 7th-10th: small - 1x1
			return 'tw-col-span-1 tw-row-span-1';
		}
	}

	onZipCodeClick(code: string): void {
		console.log('[ZIP-MAP] ZIP code region clicked:', code);
		this.zipCodeClicked.emit(code);
	}

	/** @deprecated Use onZipCodeClick instead */
	onPlzClick(code: string): void {
		this.onZipCodeClick(code);
	}
}
