import { Component, OnInit, Input, Output, EventEmitter, OnDestroy, signal, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, EMPTY, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIconModule } from '@spartan-ng/helm/icon';
import { lucideClockFading } from '@ng-icons/lucide';
import * as d3 from 'd3';
import { KPIData, BadgeAwardData } from '../../models/dashboard-models';
import { DashboardStatsBarComponent } from '../dashboard-stats-bar/dashboard-stats-bar.component';
import { DashboardTopBadgesComponent, Top3Badge } from '../dashboard-stats-bar/dashboard-top-badges.component';
import { DataSourceToggleComponent } from '../data-source-toggle/data-source-toggle.component';
import { KpiCardGridComponent } from '../kpi-card-grid/kpi-card-grid.component';
import { DashboardDataSourceService } from '../../services/dashboard-data-source.service';
import { DashboardOverviewApiService } from '../../services/dashboard-overview-api.service';
import { NetworkDashboardApiService } from '../../services/network-dashboard-api.service';
import { MOCK_KPI_CARDS, KpiCardData } from '../../models/kpi-card.model';
import {
	NetworkKPIData,
	NetworkKPIId,
	NetworkRecentActivityData,
	NetworkStrengthenedCompetencyData,
	NetworkBadgeAwardTimelineEntry,
	NetworkBadgeTypeDistributionEntry,
	KPI_DISPLAY_CONFIG,
	formatKPIValue,
	getCompetencyAreaDisplayConfig,
	getBadgeRankDisplayConfig,
	getBadgeTypeDisplayConfig,
	ESCORootSkill,
	SocialspaceInstitution,
	BadgeTypeStatsExtended
} from '../../models/network-dashboard-api.model';
import { RecentActivityTableComponent } from '../recent-activity-table/recent-activity-table.component';
import { RecipientSkillVisualisationComponent, CompetencyAreaClickData } from '../../../recipient/components/recipient-skill-visualisation/recipient-skill-visualisation.component';
import { HorizontalBarChartComponent, HorizontalBarItem } from '../horizontal-bar-chart/horizontal-bar-chart.component';
import { ApiRootSkill } from '../../../common/model/ai-skills.model';
import { AppConfigService } from '../../../common/app-config.service';
import { BadgeDistributionPieChartComponent, PieChartSegment } from '../badge-distribution-pie-chart/badge-distribution-pie-chart.component';
import { BadgesYearlyLineChartComponent } from '../badges-yearly-line-chart/badges-yearly-line-chart.component';

// Individual competency data interface
export interface CompetencyData {
	competency: string;
	competencyKey: string;
	translationKey?: string;
	displayTitle: string;
	count: number;
	hours: number;
	color: string;
	escoUri?: string;
}

@Component({
	selector: 'app-oeb-dashboard-overview',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TranslatePipe,
		DashboardStatsBarComponent,
		DashboardTopBadgesComponent,
		DataSourceToggleComponent,
		KpiCardGridComponent,
		RecentActivityTableComponent,
		NgIcon,
		HlmIconModule,
		RecipientSkillVisualisationComponent,
		HorizontalBarChartComponent,
		BadgeDistributionPieChartComponent,
		BadgesYearlyLineChartComponent
	],
	providers: [provideIcons({ lucideClockFading })],
	templateUrl: './oeb-dashboard-overview.component.html',
	styleUrls: ['./oeb-dashboard-overview.component.scss']
})
export class OebDashboardOverviewComponent implements OnInit, OnDestroy, OnChanges {
	private destroy$ = new Subject<void>();

	// Network slug - if provided, load network-specific data
	@Input() networkSlug?: string;

	// The 5 main KPIs that should be displayed
	@Input() kpis: KPIData[] = [];

	// Statistics for the summary bar
	// totalBadges is now computed from badgeTypeStats via getter
	@Input() totalCompetencyHours: number = 0;
	@Input() totalInstitutions: number = 0;
	@Input() totalLearners: number = 0;

	// Skill visualisation data - ESCO-compatible skills for the force-directed graph
	skillVisualisationData: ApiRootSkill[] = [];

	// Top 3 Badges data - now loaded dynamically
	top3Badges: Top3Badge[] = [];

	// Top 3 Institutions for the Institutions-Ranking section
	top3Institutions: Top3Badge[] = [];

	// Recent activities data - loaded for network dashboard
	recentActivities: NetworkRecentActivityData[] = [];

	// KPI cards data for the new grid layout
	kpiCards: KpiCardData[] = [];

	// Badge type stats for pie chart (loaded from API for network mode)
	badgeTypeStats: BadgeTypeStatsExtended[] = [];

	// Total badges count (computed from badge type stats)
	get totalBadges(): number {
		return this.badgeTypeStats.reduce((sum, stat) => sum + stat.count, 0);
	}

	/**
	 * Convert badgeTypeStats to PieChartSegment[] for the new pie chart component
	 */
	get badgeTypePieChartSegments(): PieChartSegment[] {
		return this.badgeTypeStats.map(stat => ({
			id: stat.type,
			label: stat.label,
			count: stat.count,
			percentage: stat.percentage,
			color: stat.color,
			borderColor: stat.borderColor,
		}));
	}

	// Individual competency data for bar chart (loaded from API for network mode)
	individualCompetencyData: CompetencyData[] = [];

	// Badge awards timeseries data for line chart (loaded from API for network mode)
	badgeAwardsByTime: BadgeAwardData[] = [];

	// Flag to track if initial data load is complete (prevents showing empty state during load)
	dataLoaded = false;

	// Badge awards timeline from API (for network mode)
	private badgeAwardsTimeline: NetworkBadgeAwardTimelineEntry[] = [];

	private useFallbackData(): void {
		this.individualCompetencyData = [];
		this.badgeAwardsByTime = [];
		this.badgeTypeStats = [];
	}

	// Line chart filter state
	private currentYear: number = new Date().getFullYear();
	selectedYear: number = this.currentYear;
	selectedMonth: number = 0; // 0 = all months
	selectedBadgeType: string = 'all';
	// Dynamic year list including current year
	availableYears: number[] = [this.currentYear - 2, this.currentYear - 1, this.currentYear];
	availableMonths: { value: number; label: string; shortLabel: string }[] = [
		{ value: 1, label: 'Januar', shortLabel: 'JAN' },
		{ value: 2, label: 'Februar', shortLabel: 'FEBR' },
		{ value: 3, label: 'März', shortLabel: 'MÄRZ' },
		{ value: 4, label: 'April', shortLabel: 'APRIL' },
		{ value: 5, label: 'Mai', shortLabel: 'MAI' },
		{ value: 6, label: 'Juni', shortLabel: 'JUNI' },
		{ value: 7, label: 'Juli', shortLabel: 'JULI' },
		{ value: 8, label: 'August', shortLabel: 'AUG' },
		{ value: 9, label: 'September', shortLabel: 'SEPT' },
		{ value: 10, label: 'Oktober', shortLabel: 'OKT' },
		{ value: 11, label: 'November', shortLabel: 'NOV' },
		{ value: 12, label: 'Dezember', shortLabel: 'DEZ' }
	];

	badgeTypes: { value: string; label: string }[] = [
		{ value: 'all', label: 'Alle Typen' },
		{ value: 'competency', label: 'Teilnahmezertifikat' },
		{ value: 'participation', label: 'Badge' },
		{ value: 'learningpath', label: 'Micro Degrees' }
	];

	// Loading and error states (using signals for reactive UI)
	// Start with isLoading=true to show loading spinner immediately (prevents flash of empty content)
	isLoading = signal(true);
	isLoadingTimeline = false; // Separate loading state for timeline data
	errorState = signal(false);
	errorMessage = signal<string>('');

	constructor(
		private router: Router,
		private dataSourceService: DashboardDataSourceService,
		private overviewApiService: DashboardOverviewApiService,
		private networkDashboardApi: NetworkDashboardApiService,
		private translate: TranslateService,
		private configService: AppConfigService
	) {}

	ngOnInit(): void {
		// Load initial data
		this.loadDashboardData();

		// Reload data when data source changes (only for non-network mode)
		if (!this.networkSlug) {
			this.dataSourceService.dataSource$
				.pipe(takeUntil(this.destroy$))
				.subscribe(source => {
					this.loadDashboardData();
				});
		}
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['networkSlug'] && !changes['networkSlug'].firstChange) {
			this.loadDashboardData();
		}
	}

	ngAfterViewInit(): void {
		// Chart will be rendered when data loading completes and content is visible
		// The @else block containing the chart SVG is only in DOM when !isLoading()
		// So we trigger chart rendering after loading completes
	}

	/**
	 * Schedules chart rendering after DOM is updated
	 * NOTE: Disabled - chart rendering is now handled by BadgesYearlyLineChartComponent
	 */
	private scheduleChartRender(): void {
		// Chart rendering is now handled by the reusable BadgesYearlyLineChartComponent
		// This method is kept for backwards compatibility but does nothing
	}


	/**
	 * Renders chart when DOM is ready and container has dimensions
	 * NOTE: Disabled - chart rendering is now handled by BadgesYearlyLineChartComponent
	 */
	private renderChartWhenReady(): void {
		// Chart rendering is now handled by the reusable BadgesYearlyLineChartComponent
		// This method is kept for backwards compatibility but does nothing
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	/**
	 * Load dashboard data from the active data source
	 *
	 * CRITICAL: When Live API is selected, NO mock fallback is used.
	 * Errors are shown to the user instead of silently falling back to mock data.
	 */
	private loadDashboardData(): void {
		this.isLoading.set(true);
		this.errorState.set(false);
		this.errorMessage.set('');

		// If networkSlug is provided, load network-specific data
		if (this.networkSlug) {
			this.loadNetworkData();
			return;
		}

		const isMockMode = this.dataSourceService.isMockData;

		if (isMockMode) {
			// Mock mode: Use mock data directly
			this.loadMockData();
		} else {
			// Live API mode: Use new overview API endpoints (NO FALLBACK)
			this.loadLiveApiData();
		}
	}

	/**
	 * Load network-specific dashboard data
	 */
	private loadNetworkData(): void {
		if (!this.networkSlug) return;

		// Reset data loaded flag - we're loading fresh data
		this.dataLoaded = false;

		// Load all network dashboard data in parallel
		// IMPORTANT: Use of() with default values instead of EMPTY in catchError
		// because forkJoin requires ALL observables to emit at least once
		forkJoin({
			kpis: this.networkDashboardApi.getKpis(this.networkSlug).pipe(
				catchError((error) => {
					console.error('[OEB-OVERVIEW] Error loading network KPIs:', error);
					return of({ kpis: [] });
				})
			),
			competencyAreas: this.networkDashboardApi.getCompetencyAreas(this.networkSlug, 6).pipe(
				catchError((error) => {
					console.error('[OEB-OVERVIEW] Error loading network competency areas:', error);
					return of({ data: [] });
				})
			),
			// NEW: Load competency areas as ESCO skills for visualisation
			competencySkills: this.networkDashboardApi.getCompetencyAreasSkills(this.networkSlug).pipe(
				catchError((error) => {
					console.error('[OEB-OVERVIEW] Error loading competency areas skills:', error);
					return of({ skills: [] });
				})
			),
			topBadges: this.networkDashboardApi.getTopBadges(this.networkSlug, 3).pipe(
				catchError((error) => {
					console.error('[OEB-OVERVIEW] Error loading network top badges:', error);
					return of({ badges: [] });
				})
			),
			recentActivity: this.networkDashboardApi.getRecentActivity(this.networkSlug, 4).pipe(
				catchError((error) => {
					console.error('[OEB-OVERVIEW] Error loading network recent activity:', error);
					return of({ activities: [] });
				})
			),
			// NEW: Load strengthened competencies
			strengthenedCompetencies: this.networkDashboardApi.getStrengthenedCompetencies(this.networkSlug, 8).pipe(
				catchError((error) => {
					console.error('[OEB-OVERVIEW] Error loading strengthened competencies:', error);
					return of({ competencies: [] });
				})
			),
			// NEW: Load badge awards timeline
			badgeAwardsTimeline: this.networkDashboardApi.getBadgeAwardsTimeline(this.networkSlug, {
				year: this.selectedYear,
				groupBy: 'month'
			}).pipe(
				catchError((error) => {
					console.error('[OEB-OVERVIEW] Error loading badge awards timeline:', error);
					return of({ timeline: [] });
				})
			),
			// NEW: Load badge type distribution
			badgeTypeDistribution: this.networkDashboardApi.getBadgeTypeDistribution(this.networkSlug).pipe(
				catchError((error) => {
					console.error('[OEB-OVERVIEW] Error loading badge type distribution:', error);
					return of({ distribution: [] });
				})
			),
			// Load institutions for the Institutions-Ranking section
			institutions: this.networkDashboardApi.getSocialspaceInstitutions(this.networkSlug).pipe(
				catchError((error) => {
					console.error('[OEB-OVERVIEW] Error loading institutions:', error);
					return of({ institutions: [], summary: { total: 0, newThisMonth: 0 } });
				})
			)
		}).pipe(takeUntil(this.destroy$)).subscribe({
			next: ({ kpis, competencyAreas, competencySkills, topBadges, recentActivity, strengthenedCompetencies, badgeAwardsTimeline, badgeTypeDistribution, institutions }) => {
				// Transform KPIs to KpiCardData
				if (kpis?.kpis) {
					this.kpiCards = this.transformNetworkKpisToCards(kpis.kpis);
				}

					// Transform ESCO skills data for skill visualisation
				if (competencySkills?.skills?.length > 0) {
					this.skillVisualisationData = this.transformToApiRootSkills(competencySkills.skills);
				} else {
					this.skillVisualisationData = [];
				}

				// Transform top badges - icons and colors assigned by frontend based on rank
				if (topBadges?.badges) {
					this.top3Badges = topBadges.badges.map((badge) => {
						const displayConfig = getBadgeRankDisplayConfig(badge.rank);
						return {
							rank: badge.rank as 1 | 2 | 3,
							name: badge.badgeTitle,
							count: badge.count,
							image: badge.image,
							icon: displayConfig.icon,
							color: displayConfig.color,
						};
					});
				}

				// Set recent activities directly from API
				if (recentActivity?.activities) {
					this.recentActivities = recentActivity.activities;
				}

				// NEW: Transform strengthened competencies for bar chart
				if (strengthenedCompetencies?.competencies) {
					this.individualCompetencyData = this.transformStrengthenedCompetencies(strengthenedCompetencies.competencies);
				}

				// NEW: Transform badge awards timeline for line chart
				if (badgeAwardsTimeline?.timeline) {
					this.badgeAwardsTimeline = badgeAwardsTimeline.timeline;
					this.badgeAwardsByTime = this.transformTimelineToLegacyFormat(badgeAwardsTimeline.timeline);
				}

				// NEW: Transform badge type distribution for pie chart
				if (badgeTypeDistribution?.distribution) {
					this.badgeTypeStats = this.transformBadgeTypeDistribution(badgeTypeDistribution.distribution);
				}

				// Transform institutions to Top 3 for the Institutions-Ranking section
				if (institutions?.institutions && institutions.institutions.length > 0) {
					this.top3Institutions = this.transformInstitutionsToTop3(institutions.institutions);
				}

				this.isLoading.set(false);
				this.dataLoaded = true;
				// Render chart after Angular updates the DOM with the content block
				this.scheduleChartRender();
			},
			error: (error) => {
				console.error('[OEB-OVERVIEW] Error loading network data:', error);
				this.dataLoaded = true;
				this.handleError('Netzwerk-Dashboard konnte nicht geladen werden');
			}
		});
	}

	/**
	 * Transform strengthened competencies from API to CompetencyData for bar chart
	 */
	private transformStrengthenedCompetencies(competencies: NetworkStrengthenedCompetencyData[]): CompetencyData[] {
		if (!competencies || competencies.length === 0) {
			return [];
		}

		const transformed = competencies.map((comp) => ({
			competency: comp.title,
			competencyKey: comp.competencyId,
			// titleKey is optional - only set if backend provides it for i18n
			translationKey: comp.titleKey,
			// displayTitle is the actual title to show (from API or translated)
			displayTitle: comp.title,
			count: 0, // API doesn't provide count, only hours
			hours: comp.hours,
			color: '#492E98',
			escoUri: comp.escoUri
		}));

		return transformed;
	}

	/**
	 * Transform badge awards timeline from API to legacy BadgeAwardData format
	 */
	private transformTimelineToLegacyFormat(timeline: NetworkBadgeAwardTimelineEntry[]): BadgeAwardData[] {
		if (!timeline || timeline.length === 0) {
			return [];
		}

		const result: BadgeAwardData[] = [];

		for (const entry of timeline) {
			const date = new Date(entry.date);
			const year = date.getFullYear();
			const month = date.getMonth() + 1;

			// If we have type breakdown, create separate entries for each type
			if (entry.byType) {
				if (entry.byType.participation > 0) {
					result.push({
						date,
						year,
						month,
						type: 'participation',
						count: entry.byType.participation
					});
				}
				if (entry.byType.competency > 0) {
					result.push({
						date,
						year,
						month,
						type: 'competency',
						count: entry.byType.competency
					});
				}
				if (entry.byType.learningpath > 0) {
					result.push({
						date,
						year,
						month,
						type: 'learningpath',
						count: entry.byType.learningpath
					});
				}
			} else {
				// No type breakdown, use total count
				result.push({
					date,
					year,
					month,
					type: 'all',
					count: entry.count
				});
			}
		}

		return result;
	}

	/**
	 * Transform badge type distribution from API to BadgeTypeStatsExtended for pie chart
	 */
	private transformBadgeTypeDistribution(distribution: NetworkBadgeTypeDistributionEntry[]): BadgeTypeStatsExtended[] {
		return distribution.map((entry) => {
			const displayConfig = getBadgeTypeDisplayConfig(entry.type);
			return {
				type: entry.type,
				label: displayConfig.label,
				count: entry.count,
				percentage: entry.percentage,
				color: displayConfig.color,
				borderColor: displayConfig.borderColor
			};
		});
	}

	/**
	 * Transform ESCORootSkill array to ApiRootSkill array for skill visualisation component
	 */
	private transformToApiRootSkills(skills: ESCORootSkill[]): ApiRootSkill[] {
		return skills.map(skill => ({
			preferred_label: skill.preferred_label,
			alt_labels: skill.alt_labels,
			description: skill.description,
			concept_uri: skill.concept_uri,
			type: skill.type,
			reuse_level: skill.reuse_level || '',
			studyLoad: skill.studyLoad,
			breadcrumb_paths: skill.breadcrumb_paths as [any[]]
		}));
	}

	/**
	 * Transform network KPIs from API to KpiCardData for display
	 */
	private transformNetworkKpisToCards(kpis: NetworkKPIData[]): KpiCardData[] {
		const cards: KpiCardData[] = [];

		// Sort KPIs by their display order
		const sortedKpis = [...kpis].sort((a, b) => {
			const configA = KPI_DISPLAY_CONFIG[a.id];
			const configB = KPI_DISPLAY_CONFIG[b.id];
			return (configA?.order || 99) - (configB?.order || 99);
		});

		// Find paired KPIs for dual variant cards
		const processedIds = new Set<string>();

		for (const kpi of sortedKpis) {
			if (processedIds.has(kpi.id)) continue;

			const config = KPI_DISPLAY_CONFIG[kpi.id];
			if (!config) {
				continue;
			}

			if (config.variant === 'dual' && config.pairedWith) {
				// Find the paired KPI
				const pairedKpi = kpis.find(k => k.id === config.pairedWith);
				const pairedConfig = pairedKpi ? KPI_DISPLAY_CONFIG[pairedKpi.id] : null;

				if (pairedKpi && pairedConfig) {
					// Create dual card
					cards.push({
						id: `${kpi.id}-${pairedKpi.id}`,
						variant: 'dual',
						icon: {
							name: config.icon,
							size: config.iconSize,
							color: config.iconColor,
							filled: config.iconFilled || false,
							borderColor: config.iconBorderColor
						},
						value: {
							raw: kpi.value,
							display: formatKPIValue(kpi.value)
						},
						description: this.translate.instant(config.descriptionKey),
						iconSecondary: {
							name: pairedConfig.icon,
							size: pairedConfig.iconSize,
							color: pairedConfig.iconColor,
							filled: pairedConfig.iconFilled || false,
							borderColor: pairedConfig.iconBorderColor
						},
						valueSecondary: {
							raw: pairedKpi.value,
							display: formatKPIValue(pairedKpi.value)
						},
						descriptionSecondary: this.translate.instant(pairedConfig.descriptionKey)
					});

					processedIds.add(kpi.id);
					processedIds.add(pairedKpi.id);
				}
			} else if (config.variant === 'standard') {
				// Create standard card
				const card: KpiCardData = {
					id: kpi.id,
					variant: 'standard',
					icon: {
						name: config.icon,
						size: config.iconSize,
						color: config.iconColor,
						filled: config.iconFilled || false,
						borderColor: config.iconBorderColor
					},
					value: {
						raw: kpi.value,
						display: formatKPIValue(kpi.value)
					},
					description: this.translate.instant(config.descriptionKey),
					tooltip: config.tooltipKey ? this.translate.instant(config.tooltipKey) : undefined
				};

				// Add growth indicator only if trend is positive ('up') and KPI should show trend
				if (kpi.trend === 'up' && kpi.trendValue !== undefined && kpi.trendValue > 0 && this.shouldShowTrend(kpi.id)) {
					const trendLabel = this.formatTrendLabelForKpi(kpi);

					card.growth = {
						percentage: kpi.trendValue,
						label: trendLabel,
						isPositive: true
					};
				}

				cards.push(card);
				processedIds.add(kpi.id);
			}
		}

		return cards;
	}

	/**
	 * Format trend label for a KPI
	 */
	private formatTrendLabelForKpi(kpi: NetworkKPIData): string {
		if (!kpi.trend || kpi.trendValue === undefined) return '';

		const sign = kpi.trend === 'up' ? '+' : kpi.trend === 'down' ? '-' : '';
		const absValue = Math.abs(kpi.trendValue);
		const config = KPI_DISPLAY_CONFIG[kpi.id];

		// Check if trendValue is a percentage or absolute
		if (config?.unitKey?.includes('persons')) {
			// For person-based KPIs, show "Personen diesen Monat"
			return `${sign}${absValue} ${this.translate.instant('Network.Dashboard.unit.persons')} ${this.translate.instant('Network.Dashboard.trend.thisMonth')}`;
		}

		return `${sign}${absValue}% ${this.translate.instant('Network.Dashboard.trend.thisMonth')}`;
	}

	/**
	 * Check if a KPI should show trend indicator
	 */
	private shouldShowTrend(kpiId: string): boolean {
		// Don't show trend for institutions_count
		if (kpiId === 'institutions_count') {
			return false;
		}
		return true;
	}

	/**
	 * Load data from Live API (NO mock fallback)
	 */
	private loadLiveApiData(): void {
		this.useFallbackData();
		this.kpiCards = MOCK_KPI_CARDS;

		// Load top badges from new endpoint
		this.overviewApiService.getTopBadges({ limit: 3, period: 'all_time' })
			.pipe(
				takeUntil(this.destroy$),
				catchError((error) => {
					console.error('[OEB-OVERVIEW] API Error loading top badges:', error);
					this.handleError(this.translate.instant('Dashboard.error.topBadgesLoadFailed'));
					return EMPTY;
				})
			)
			.subscribe({
				next: (response) => {
					// Map TopBadgeData to Top3Badge
					this.top3Badges = response.badges.map((badge) => ({
						rank: badge.rank as 1 | 2 | 3,
						name: badge.badgeTitle,
						count: badge.count,
						icon: badge.visualization?.icon || this.getIconForRank(badge.rank),
						color: badge.visualization?.color || this.getColorForRank(badge.rank),
					}));
					this.isLoading.set(false);
					this.dataLoaded = true;
					// Render chart after Angular updates the DOM with the content block
					this.scheduleChartRender();
				}
			});
	}

	/**
	 * Load data from mock service - no longer uses mock competency data
	 * Shows "no data available" for competency areas when no API data
	 */
	private loadMockData(): void {
		this.useFallbackData();
		this.kpiCards = MOCK_KPI_CARDS;

		// Set empty competency data - shows "no data available" in UI
		this.skillVisualisationData = [];
		this.individualCompetencyData = [];

		// Set empty top badges - shows "no data available" in UI
		this.top3Badges = [];
		this.top3Institutions = [];

		this.isLoading.set(false);
		this.dataLoaded = true;
		// Render chart after Angular updates the DOM with the content block
		this.scheduleChartRender();
	}

	/**
	 * Transform institutions list to Top 3 for the Institutions-Ranking podium display
	 */
	private transformInstitutionsToTop3(institutions: SocialspaceInstitution[]): Top3Badge[] {
		// Sort by badgesIssued descending and take top 3
		const sorted = [...institutions].sort((a, b) => b.badgesIssued - a.badgesIssued);
		const top3 = sorted.slice(0, 3);

		return top3.map((inst, index) => ({
			rank: (index + 1) as 1 | 2 | 3,
			name: inst.name,
			count: inst.badgesIssued,
			color: index === 0 ? '#FFCF0F' : index === 1 ? '#DEDEDE' : '#DEB200',
			image: this.fixImageUrl(inst.image) || undefined,
			id: inst.issuerId,
		}));
	}

	/**
	 * Fix image URL - prepend API base URL if the image URL is relative
	 */
	private fixImageUrl(imageUrl: string | null | undefined): string | undefined {
		if (!imageUrl) return undefined;

		// If already an absolute URL, return as-is
		if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
			return imageUrl;
		}

		// Get API base URL and prepend it
		const baseUrl = this.configService.apiConfig.baseUrl;

		// Remove trailing slash from base URL if present
		const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

		// Ensure image URL starts with /
		const cleanImageUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;

		return `${cleanBaseUrl}${cleanImageUrl}`;
	}

	/**
	 * Handle click on institution in the ranking - navigate to institution page
	 */
	onInstitutionRankingClick(item: Top3Badge): void {
		if (item.id) {
			this.router.navigate(['/issuer/issuers', item.id]);
		}
	}

	/**
	 * Handle API error - show error state to user
	 */
	private handleError(message: string): void {
		this.errorState.set(true);
		this.errorMessage.set(message);
		this.isLoading.set(false);
	}

	/**
	 * Retry loading data after error
	 */
	retryLoad(): void {
		this.loadDashboardData();
	}

	/**
	 * Get default color for competency area
	 */
	private getDefaultColor(index: number): string {
		const colors = ['#492E98', '#492E98', '#492E98', '#492E98', '#492E98', '#492E98'];
		return colors[index % colors.length];
	}

	/**
	 * Get icon for competency area based on name
	 */
	private getIconForCompetency(name: string): string {
		const lowerName = name.toLowerCase();
		if (lowerName.includes('digital') || lowerName.includes('it')) return 'Monitor';
		if (lowerName.includes('social') || lowerName.includes('sozial')) return 'Users';
		if (lowerName.includes('language') || lowerName.includes('sprache')) return 'Globe';
		if (lowerName.includes('craft') || lowerName.includes('handwerk')) return 'Wrench';
		if (lowerName.includes('management')) return 'BarChart3';
		return 'Star';
	}

	/**
	 * Get icon for badge rank
	 */
	private getIconForRank(rank: number): string {
		switch (rank) {
			case 1: return 'lucideTrophy';
			case 2: return 'lucideMedal';
			case 3: return 'lucideAward';
			default: return 'lucideBadge';
		}
	}

	/**
	 * Get color for badge rank
	 */
	private getColorForRank(rank: number): string {
		switch (rank) {
			case 1: return '#FFCC00';
			case 2: return '#492E98';
			case 3: return '#492E98';
			default: return '#492E98';
		}
	}

	/**
	 * Fallback top badges data if API/mock fails
	 */
	private getFallbackTopBadges(): Top3Badge[] {
		return [
			{ rank: 1, name: 'Digital Marketing Expert', count: 87, icon: 'lucideTrophy', color: '#FFCC00' },
			{ rank: 2, name: 'Web Development Fundamentals', count: 64, icon: 'lucideMedal', color: '#492E98' },
			{ rank: 3, name: 'Project Management Professional', count: 52, icon: 'lucideAward', color: '#492E98' }
		];
	}

	/**
	 * Navigate to KPI detail page
	 * @param kpi - The KPI data to view details for
	 */
	viewKpiDetails(kpi: KPIData): void {
		if (!kpi.id) {
			return;
		}

		this.router.navigate(['/dashboard/kpi-detail', kpi.id]);
	}

	/**
	 * Check if a KPI has clickable details
	 */
	hasClickableDetails(kpi: KPIData): boolean {
		return kpi.hasMonthlyDetails === true && kpi.trendValue !== undefined && kpi.trendValue > 0;
	}

	getTrendIcon(trend: string): string {
		switch (trend) {
			case 'up': return '↗';
			case 'down': return '↘';
			case 'stable': return '→';
			default: return '→';
		}
	}

	getTrendColor(trend: string): string {
		switch (trend) {
			case 'up': return 'var(--color-green)';
			case 'down': return 'var(--color-red)';
			case 'stable': return 'var(--color-darkgray)';
			default: return 'var(--color-darkgray)';
		}
	}

	/**
	 * Handle KPI card click
	 */
	onKpiCardClick(cardId: string): void {
		// Navigation can be added here if needed
		// this.router.navigate(['/dashboard/kpi-detail', cardId]);
	}

	/**
	 * Get maximum competency count for scaling bar widths
	 */
	getMaxCompetencyCount(): number {
		if (!this.individualCompetencyData || this.individualCompetencyData.length === 0) {
			return 1; // Avoid division by zero
		}
		return Math.max(...this.individualCompetencyData.map(c => c.count)) || 1;
	}

	/**
	 * Get maximum competency hours for scaling bar widths
	 */
	getMaxCompetencyHours(): number {
		if (!this.individualCompetencyData || this.individualCompetencyData.length === 0) {
			return 1; // Avoid division by zero
		}
		return Math.max(...this.individualCompetencyData.map(c => c.hours)) || 1;
	}

	/**
	 * Get dynamic font size for competency title based on text length
	 * Ensures text fits within bar height (32px = 2 lines max)
	 * @param text - The competency title text
	 * @returns Font size in pixels
	 */
	getCompetencyFontSize(text: string): number {
		const length = text?.length || 0;
		if (length <= 20) return 14;      // tw-text-sm equivalent
		if (length <= 30) return 13;
		if (length <= 40) return 12;      // tw-text-xs equivalent
		if (length <= 50) return 11;
		if (length <= 60) return 10;
		return 9;                          // Very long text
	}

	/**
	 * Get dynamic line height for competency title
	 * @param text - The competency title text
	 * @returns Line height value
	 */
	getCompetencyLineHeight(text: string): number {
		const length = text?.length || 0;
		if (length <= 30) return 1.25;    // tight
		return 1.2;                        // tighter for longer text
	}

	// Gap between segments in pixels (converted to angle)
	private readonly SEGMENT_GAP = 4; // 4px visual gap

	/**
	 * Calculate stroke-dasharray for SVG donut chart segment
	 * @param percentage - The percentage of the segment
	 * @param radius - The radius of the circle (default 128.5 for main donut)
	 */
	getStrokeDasharray(percentage: number, radius: number = 128.5): string {
		const circumference = 2 * Math.PI * radius;
		const segmentLength = (percentage / 100) * circumference;
		return `${segmentLength} ${circumference}`;
	}

	/**
	 * Calculate stroke-dashoffset for SVG donut chart segment positioning
	 * @param index - The index of the segment
	 * @param radius - The radius of the circle (default 128.5 for main donut)
	 */
	getStrokeDashoffset(index: number, radius: number = 128.5): number {
		const circumference = 2 * Math.PI * radius;
		let offset = 0;
		for (let i = 0; i < index; i++) {
			offset += (this.badgeTypeStats[i].percentage / 100) * circumference;
		}
		return -offset;
	}

	/**
	 * Calculate stroke-dasharray with gap between segments
	 * @param percentage - The percentage of the segment
	 * @param radius - The radius of the circle (default 128.5 for main donut)
	 */
	getStrokeDasharrayWithGap(percentage: number, radius: number = 128.5): string {
		const circumference = 2 * Math.PI * radius;
		const segmentLength = (percentage / 100) * circumference;
		const gapLength = this.SEGMENT_GAP;
		const adjustedLength = Math.max(0, segmentLength - gapLength);
		return `${adjustedLength} ${circumference}`;
	}

	/**
	 * Calculate stroke-dashoffset with gap adjustment
	 * @param index - The index of the segment
	 * @param radius - The radius of the circle (default 128.5 for main donut)
	 */
	getStrokeDashoffsetWithGap(index: number, radius: number = 128.5): number {
		const circumference = 2 * Math.PI * radius;
		let offset = 0;
		for (let i = 0; i < index; i++) {
			offset += (this.badgeTypeStats[i].percentage / 100) * circumference;
		}
		// Add half gap to center the segment
		return -(offset + this.SEGMENT_GAP / 2);
	}

	/**
	 * Calculate coordinates for radial lines at segment boundaries
	 * @param index - The index of the segment
	 * @param radius - The radius for the point
	 * @param coord - 'x' or 'y' coordinate
	 * @param isEnd - If true, calculate end of segment; if false, calculate start
	 */
	getRadialLineCoord(index: number, radius: number, coord: 'x' | 'y', isEnd: boolean = false): number {
		const centerX = 153.5;
		const centerY = 153.5;

		// Calculate the angle in radians
		let anglePercent = 0;
		for (let i = 0; i < index; i++) {
			anglePercent += this.badgeTypeStats[i].percentage;
		}
		if (isEnd) {
			anglePercent += this.badgeTypeStats[index].percentage;
		}

		// Add small offset for gap
		const gapAngle = (this.SEGMENT_GAP / (2 * Math.PI * 128.5)) * 360;
		if (isEnd) {
			anglePercent -= gapAngle / 3.6 / 2;
		} else {
			anglePercent += gapAngle / 3.6 / 2;
		}

		const angleRad = (anglePercent / 100) * 2 * Math.PI;

		if (coord === 'x') {
			return centerX + radius * Math.cos(angleRad);
		} else {
			return centerY + radius * Math.sin(angleRad);
		}
	}

	/**
	 * Navigate to individual competency detail page
	 */
	openCompetencyDetail(competency: CompetencyData): void {
		if (this.networkSlug) {
			this.router.navigate(['/issuer/networks', this.networkSlug, 'competency-tracking', competency.competencyKey]);
		}
	}

	/**
	 * Transform individual competency data to HorizontalBarItem format for the reusable component
	 */
	getCompetencyBarItems(): HorizontalBarItem[] {
		return this.individualCompetencyData.map(comp => ({
			id: comp.competencyKey,
			label: comp.displayTitle,
			value: comp.hours,
			barDisplayValue: comp.hours,
			escoUri: comp.escoUri,
			data: comp
		}));
	}

	/**
	 * Handle click on competency bar from the reusable component
	 */
	onCompetencyBarClick(item: HorizontalBarItem): void {
		if (item.data) {
			this.openCompetencyDetail(item.data);
		}
	}

	/**
	 * Navigate to Badge-Analyse detail page for the current network
	 */
	navigateToBadgeAnalysis(): void {
		if (this.networkSlug) {
			this.router.navigate(['/issuer/networks', this.networkSlug, 'badge-analysis']);
		}
	}

	/**
	 * Navigate to Kompetenzen-Tracking detail page for the current network
	 */
	navigateToCompetencyTracking(): void {
		if (this.networkSlug) {
			this.router.navigate(['/issuer/networks', this.networkSlug, 'competency-tracking']);
		}
	}

	/**
	 * Handle click on competency area bubble in skill visualisation
	 * Navigates to competency tracking page with area data in router state
	 */
	onCompetencyAreaClick(areaData: CompetencyAreaClickData): void {
		if (!this.networkSlug) {
			return;
		}

		if (!areaData.competencyUris || areaData.competencyUris.length === 0) {
			return;
		}

		// Navigate to competency tracking page with area data in router state
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
	 * Handle year change for line chart
	 */
	onYearChange(year: number): void {
		this.selectedYear = year;

		// In network mode, reload timeline data from API for the selected year
		if (this.networkSlug) {
			this.loadBadgeAwardsTimelineForYear(year);
		}
		// Chart rendering is now handled by the reusable BadgesYearlyLineChartComponent
	}

	/**
	 * Load badge awards timeline for a specific year (network mode only)
	 */
	private loadBadgeAwardsTimelineForYear(year: number): void {
		if (!this.networkSlug) return;

		this.isLoadingTimeline = true;

		this.networkDashboardApi.getBadgeAwardsTimeline(this.networkSlug, {
			year: year,
			groupBy: 'month'
		}).pipe(
			takeUntil(this.destroy$),
			catchError((error) => {
				console.error('[OEB-OVERVIEW] Error loading badge awards timeline for year:', year, error);
				this.isLoadingTimeline = false;
				return EMPTY;
			})
		).subscribe({
			next: (response) => {
				// Always update the data - even if empty - to ensure chart reflects current year
				const timeline = response?.timeline || [];
				this.badgeAwardsTimeline = timeline;
				this.badgeAwardsByTime = this.transformTimelineToLegacyFormat(timeline);
				this.isLoadingTimeline = false;
				// Chart rendering is now handled by the reusable BadgesYearlyLineChartComponent
			}
		});
	}

	/**
	 * Handle filter change for line chart (month or badge type)
	 * NOTE: Disabled - chart rendering is now handled by BadgesYearlyLineChartComponent
	 */
	onFilterChange(): void {
		// Chart rendering is now handled by the reusable BadgesYearlyLineChartComponent
	}

	/**
	 * Handle badge type filter change from the line chart component
	 */
	onBadgeTypeFilterChange(type: string): void {
		this.selectedBadgeType = type;
	}

}
