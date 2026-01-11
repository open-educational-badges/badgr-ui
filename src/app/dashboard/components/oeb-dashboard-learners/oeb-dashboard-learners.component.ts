import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ChartData } from '../../models/dashboard-models';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GenderCompetencyAnalysisComponent } from '../gender-competency-analysis/gender-competency-analysis.component';
import { ResidenceDetailComponent } from '../residence-detail/residence-detail.component';
import { HorizontalBarChartComponent, HorizontalBarItem } from '../horizontal-bar-chart/horizontal-bar-chart.component';
import { NetworkDashboardApiService } from '../../services/network-dashboard-api.service';
import {
	LearnerResidenceStatistic,
	LearnerGenderStatistic,
	LearnerKPIData,
	mapGenderTypeToLabel
} from '../../models/network-dashboard-api.model';
import { CompetencyAreaClickData } from '../../../recipient/components/recipient-skill-visualisation/recipient-skill-visualisation.component';
import { InfoIcon } from '../../../common/components/info-icon.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideUserStar, lucideClock } from '@ng-icons/lucide';

/**
 * Learner Residence Data Interface
 * Represents the distribution of learners by their residence (Wohnort)
 * Note: Data is aggregated by city, not ZIP code
 */
export interface LearnerResidenceData {
	city: string;
	learnerCount: number;
	percentage: number;
	isOtherCategory?: boolean;
}

/**
 * Gender Distribution Interface
 * Represents learner distribution by gender
 */
export interface GenderDistributionData {
	gender: string;
	count: number;
	percentage: number;
	color: string;
}

/**
 * View State for Lernende Component
 * 'overview' = main learners overview
 * 'gender-detail' = gender competency analysis sub-view
 * 'residence-detail' = residence competency analysis sub-view
 */
export type LernendeViewState = 'overview' | 'gender-detail' | 'residence-detail';

@Component({
	selector: 'app-oeb-dashboard-learners',
	standalone: true,
	imports: [CommonModule, TranslateModule, GenderCompetencyAnalysisComponent, ResidenceDetailComponent, HorizontalBarChartComponent, InfoIcon, NgIcon],
	providers: [provideIcons({ lucideUserStar, lucideClock })],
	templateUrl: './oeb-dashboard-learners.component.html',
	styleUrls: ['./oeb-dashboard-learners.component.scss']
})
export class OebDashboardLearnersComponent implements OnInit, OnDestroy {
	private destroy$ = new Subject<void>();

	/** Network slug for API calls */
	@Input() networkSlug: string = '';

	/** Total number of learners */
	totalLearners = 0;

	/** Trend data for total learners KPI */
	totalLearnersTrend?: 'up' | 'down' | 'stable';
	totalLearnersTrendValue?: number;
	totalLearnersTrendPeriod?: string;

	/** Total competency hours */
	totalCompetencyHours = 0;

	/** Trend data for competency hours KPI */
	competencyHoursTrend?: 'up' | 'down' | 'stable';
	competencyHoursTrendValue?: number;
	competencyHoursTrendPeriod?: string;

	/**
	 * Get the i18n translation key for a trend period
	 * Always returns 'thisMonth' as per business requirement
	 */
	getTrendPeriodTranslationKey(period?: string): string {
		// Always show "diesen Monat" / "this month" for learner KPIs
		return 'Network.Dashboard.trend.thisMonth';
	}

	/** Learner residence (Wohnort) distribution data */
	learnerResidenceData: LearnerResidenceData[] = [];

	/** Gender distribution data for chart */
	@Input() genderDistributionData: ChartData = {
		labels: ['Männlich', 'Weiblich'],
		values: [52.2, 47.8],
		backgroundColor: ['#492E98', '#CCD7FF'] // OEB Purple and KI Lila
	};

	/** Detailed gender statistics */
	genderStatistics: GenderDistributionData[] = [];

	/** Total learners for the selected PLZ/region */
	selectedRegionLearners = 3542;

	/** Loading states */
	loadingResidence = false;
	loadingGender = false;
	loadingOverview = false;

	/** Current view state */
	viewState: LernendeViewState = 'overview';

	/** Currently selected gender for detail view */
	selectedGender: string | null = null;

	/** Currently selected residence for detail view */
	selectedResidence: LearnerResidenceData | null = null;

	/** Event emitted when view state changes (for breadcrumb updates) */
	@Output() viewStateChange = new EventEmitter<{ state: LernendeViewState; gender?: string; residence?: LearnerResidenceData }>();

	constructor(
		private networkDashboardApi: NetworkDashboardApiService,
		private router: Router,
		private translate: TranslateService
	) {}

	ngOnInit(): void {
		this.loadLearnerData();
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	/**
	 * Load all learner-related data
	 * Tries the aggregated overview endpoint first, falls back to individual endpoints
	 */
	private loadLearnerData(): void {
		if (!this.networkSlug) {
			console.warn('[LEARNERS] No networkSlug provided, falling back to mock data');
			this.loadMockData();
			return;
		}

		this.loadFromOverviewApi();
	}

	/**
	 * Load data from the aggregated learners overview API
	 */
	private loadFromOverviewApi(): void {
		this.loadingOverview = true;
		this.loadingResidence = true;
		this.loadingGender = true;

		this.networkDashboardApi.getLearnersOverview(this.networkSlug).pipe(
			takeUntil(this.destroy$),
			catchError((error) => {
				console.warn('[LEARNERS] Overview API failed, trying individual endpoints:', error);
				// Fallback to individual endpoints
				this.loadFromIndividualApis();
				return of(null);
			})
		).subscribe({
			next: (response) => {
				if (!response) return;

				const learnersKpi = response.kpis.totalLearners;
				if (typeof learnersKpi === 'object' && learnersKpi !== null) {
					this.totalLearners = learnersKpi.value;
					this.totalLearnersTrend = learnersKpi.trend;
					this.totalLearnersTrendValue = learnersKpi.trendValue;
					this.totalLearnersTrendPeriod = learnersKpi.trendPeriod;
				} else {
					this.totalLearners = learnersKpi as unknown as number;
				}

				const hoursKpi = response.kpis.totalCompetencyHours;
				if (typeof hoursKpi === 'object' && hoursKpi !== null) {
					this.totalCompetencyHours = hoursKpi.value;
					this.competencyHoursTrend = hoursKpi.trend;
					this.competencyHoursTrendValue = hoursKpi.trendValue;
					this.competencyHoursTrendPeriod = hoursKpi.trendPeriod;
				} else {
					this.totalCompetencyHours = hoursKpi as unknown as number;
				}

				this.learnerResidenceData = this.transformResidenceData(response.residenceDistribution);

				this.transformGenderData(response.genderDistribution);

				this.loadingOverview = false;
				this.loadingResidence = false;
				this.loadingGender = false;
			},
			error: (error) => {
				console.error('[LEARNERS] Error in overview subscription:', error);
				this.loadMockData();
			}
		});
	}

	/**
	 * Load data from individual API endpoints (fallback)
	 */
	private loadFromIndividualApis(): void {
		this.loadResidenceFromApi();
		this.loadGenderFromApi();
		this.loadKpisFromApi();
	}

	/**
	 * Load learner residence distribution from API
	 */
	private loadResidenceFromApi(): void {
		this.loadingResidence = true;

		this.networkDashboardApi.getLearnersResidence(this.networkSlug, 5, true).pipe(
			takeUntil(this.destroy$),
			catchError((error) => {
				console.error('[LEARNERS] Residence API failed:', error);
				return of(null);
			})
		).subscribe({
			next: (response) => {
				if (response) {
					this.learnerResidenceData = this.transformResidenceData(response.statistics);
					if (response.metadata?.totalLearners) {
						this.totalLearners = response.metadata.totalLearners;
					}
				} else {
					this.loadResidenceMockData();
				}
				this.loadingResidence = false;
			}
		});
	}

	/**
	 * Load gender distribution from API
	 */
	private loadGenderFromApi(): void {
		this.loadingGender = true;

		this.networkDashboardApi.getLearnersGender(this.networkSlug).pipe(
			takeUntil(this.destroy$),
			catchError((error) => {
				console.error('[LEARNERS] Gender API failed:', error);
				return of(null);
			})
		).subscribe({
			next: (response) => {
				if (response) {
					this.transformGenderData(response.distribution);
				} else {
					this.loadGenderMockData();
				}
				this.loadingGender = false;
			}
		});
	}

	/**
	 * Load KPIs from API (for competency hours)
	 */
	private loadKpisFromApi(): void {
		this.networkDashboardApi.getKpis(this.networkSlug).pipe(
			takeUntil(this.destroy$),
			catchError((error) => {
				console.error('[LEARNERS] KPIs API failed:', error);
				return of(null);
			})
		).subscribe({
			next: (response) => {
				if (response) {
					const competencyHoursKpi = response.kpis.find(kpi => kpi.id === 'competency_hours');
					if (competencyHoursKpi) {
						this.totalCompetencyHours = competencyHoursKpi.value;
					}
					const learnersKpi = response.kpis.find(kpi => kpi.id === 'learners_count');
					if (learnersKpi && !this.totalLearners) {
						this.totalLearners = learnersKpi.value;
					}
				}
			}
		});
	}

	/**
	 * Transform residence data from API format to component format
	 * Note: city="other" identifies the aggregation category
	 * Supports multiple API formats for backwards compatibility
	 */
	private transformResidenceData(statistics: LearnerResidenceStatistic[]): LearnerResidenceData[] {
		const data = statistics.map(stat => {
			const statAny = stat as any;

			const cityName = statAny.city ||
				statAny.name ||
				statAny.regionName ||
				statAny.region ||
				statAny.zipCode ||
				'unknown';

			const learnerCount = statAny.learnerCount ?? statAny.count ?? statAny.learners ?? 0;

			const percentage = statAny.percentage ?? statAny.percent ?? 0;

			return {
				city: cityName,
				learnerCount: learnerCount,
				percentage: percentage,
				isOtherCategory: cityName === 'other' || cityName === 'Andere Wohnorte'
			};
		});

		data.sort((a, b) => {
			if (a.isOtherCategory) return 1;
			if (b.isOtherCategory) return -1;
			return b.learnerCount - a.learnerCount;
		});

		return data.slice(0, 6);
	}

	/**
	 * Transform gender data from API format to component format
	 * Note: Use i18n via mapGenderTypeToLabel for display labels
	 */
	private transformGenderData(distribution: LearnerGenderStatistic[]): void {
		const genderColors: Record<string, string> = {
			'male': '#492E98',
			'female': '#CCD7FF',
			'diverse': '#93F993',
			'noAnswer': '#FFBAB9'
		};

		this.genderStatistics = distribution.map(stat => ({
			gender: mapGenderTypeToLabel(stat.gender),
			count: stat.count,
			percentage: stat.percentage,
			color: genderColors[stat.gender] || '#492E98'
		}));

		this.genderDistributionData = {
			labels: this.genderStatistics.map(g => g.gender),
			values: this.genderStatistics.map(g => g.percentage),
			backgroundColor: this.genderStatistics.map(g => g.color)
		};
	}

	/**
	 * Load all data from mock service (complete fallback)
	 */
	private loadMockData(): void {
		this.loadResidenceMockData();
		this.loadGenderMockData();
		this.loadKpisMockData();
	}

	/**
	 * Load residence data fallback (no data available)
	 */
	private loadResidenceMockData(): void {
		this.learnerResidenceData = [];
		this.loadingResidence = false;
	}

	/**
	 * Load gender data fallback (no data available)
	 */
	private loadGenderMockData(): void {
		this.genderStatistics = [];
		this.genderDistributionData = {
			labels: [],
			values: [],
			backgroundColor: []
		};
		this.loadingGender = false;
	}

	/**
	 * Load KPIs fallback (no data available)
	 */
	private loadKpisMockData(): void {
		this.totalCompetencyHours = 0;
	}

	/**
	 * Show residence competency analysis sub-component when clicking on a residence location
	 */
	onResidenceClick(city: string): void {
		const residence = this.learnerResidenceData.find(r => r.city === city);
		if (residence) {
			this.selectedResidence = residence;
			this.viewState = 'residence-detail';
			this.viewStateChange.emit({ state: 'residence-detail', residence });
		} else {
			console.error('[LEARNERS] No residence found for city:', city);
		}
	}

	/**
	 * Return to overview from residence detail view
	 */
	onBackFromResidenceDetail(): void {
		this.viewState = 'overview';
		this.selectedResidence = null;
		this.viewStateChange.emit({ state: 'overview' });
	}

	/**
	 * Show gender competency analysis sub-component
	 */
	onGenderClick(gender: string): void {
		this.selectedGender = gender;
		this.viewState = 'gender-detail';
		this.viewStateChange.emit({ state: 'gender-detail', gender });
	}

	/**
	 * Return to overview from gender detail view
	 */
	onBackFromGenderDetail(): void {
		this.viewState = 'overview';
		this.selectedGender = null;
		this.viewStateChange.emit({ state: 'overview' });
	}

	/**
	 * Handle competency area click from residence-detail or gender-competency-analysis
	 * Navigates to competency tracking page with area detail data
	 */
	onCompetencyAreaClick(areaData: CompetencyAreaClickData): void {
		if (!this.networkSlug) {
			console.warn('[LEARNERS] No networkSlug available for navigation');
			return;
		}
		if (!areaData.competencyUris || areaData.competencyUris.length === 0) {
			console.warn('[LEARNERS] No competency URIs in area data');
			return;
		}
		this.router.navigate(
			['/issuer/networks', this.networkSlug, 'competency-tracking'],
			{
				state: {
					openAreaDetail: true,
					areaData: areaData
				}
			}
		);
	}

	/**
	 * Get the maximum learner count for scaling bars
	 */
	getMaxLearnerCount(): number {
		if (this.learnerResidenceData.length === 0) return 100;
		return Math.max(...this.learnerResidenceData.map(r => r.learnerCount));
	}

	/**
	 * Calculate bar width based on the actual percentage value
	 * Scales so that the maximum percentage fills the bar area
	 * @param percentage - The actual percentage value (e.g., 70.8, 10.2, etc.)
	 */
	getBarWidth(percentage: number): number {
		if (!this.learnerResidenceData || this.learnerResidenceData.length === 0) return 5;

		const maxPercentage = Math.max(...this.learnerResidenceData.map(r => r.percentage));
		if (maxPercentage === 0) return 5;

		const scaledWidth = (percentage / maxPercentage) * 100;

		return Math.max(3, scaledWidth);
	}

	/**
	 * Calculate bar width for gender chart based on the percentage value
	 * Scales so that the maximum percentage fills the bar area
	 * @param percentage - The actual percentage value (e.g., 52.2, 47.8)
	 */
	getGenderBarWidth(percentage: number): number {
		if (!this.genderStatistics || this.genderStatistics.length === 0) return 5;

		const maxPercentage = Math.max(...this.genderStatistics.map(g => g.percentage));
		if (maxPercentage === 0) return 5;

		const scaledWidth = (percentage / maxPercentage) * 100;

		return Math.max(3, scaledWidth);
	}

	/**
	 * Transform residence data to HorizontalBarItem format for the reusable component
	 */
	getResidenceBarItems(): HorizontalBarItem[] {
		return this.learnerResidenceData.map(residence => ({
			id: residence.city,
			label: residence.city === 'other'
				? this.translate.instant('Dashboard.Learners.otherResidences')
				: residence.city,
			value: residence.percentage,
			barDisplayValue: residence.percentage,
			afterBarText: `${residence.learnerCount} `,
			data: residence
		}));
	}

	/**
	 * Transform gender data to HorizontalBarItem format for the reusable component
	 */
	getGenderBarItems(): HorizontalBarItem[] {
		return this.genderStatistics.map(gender => ({
			id: gender.gender,
			label: gender.gender,
			value: gender.percentage,
			barDisplayValue: gender.percentage,
			afterBarText: `${gender.count} `,
			data: gender
		}));
	}

	/**
	 * Handle click on residence bar from the reusable component
	 */
	onResidenceBarClick(item: HorizontalBarItem): void {
		const city = item.data?.city || item.id;
		if (city) {
			this.onResidenceClick(city);
		}
	}

	/**
	 * Handle click on gender bar from the reusable component
	 */
	onGenderBarClick(item: HorizontalBarItem): void {
		const gender = item.data?.gender || item.id;
		if (gender) {
			this.onGenderClick(gender);
		}
	}

	/**
	 * Calculate stroke-dasharray for SVG donut chart segment (gender chart)
	 * @param percentage - The percentage of the segment
	 */
	getGenderStrokeDasharray(percentage: number): string {
		const radius = 40;
		const circumference = 2 * Math.PI * radius;
		const segmentLength = (percentage / 100) * circumference;
		return `${segmentLength} ${circumference}`;
	}

	/**
	 * Calculate stroke-dashoffset for SVG donut chart segment positioning (gender chart)
	 * @param index - The index of the segment
	 */
	getGenderStrokeDashoffset(index: number): number {
		const radius = 40;
		const circumference = 2 * Math.PI * radius;
		let offset = 0;
		for (let i = 0; i < index; i++) {
			offset += (this.genderStatistics[i].percentage / 100) * circumference;
		}
		return -offset;
	}
}
