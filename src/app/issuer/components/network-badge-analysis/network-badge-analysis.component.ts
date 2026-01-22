import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, forkJoin, of, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { lucideTrophy, lucideMedal, lucideAward, lucideChevronUp, lucideChevronDown, lucideChevronsUpDown, lucideMonitor, lucideMapPin, lucideUsers, lucideClock, lucideArrowLeft, lucideTarget } from '@ng-icons/lucide';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { BadgeTypeStats, BadgeAwardData, BadgeDeliveryMethod, PlzStatisticsData } from '../../../dashboard/models/dashboard-models';
import { HlmTableImports } from '../../../components/spartan/ui-table-helm/src';
import { OebTableImports } from '../../../components/oeb-table';
import { HlmIconModule } from '@spartan-ng/helm/icon';
import {
	ColumnDef,
	createAngularTable,
	FlexRenderDirective,
	getCoreRowModel,
	getSortedRowModel,
	SortingState,
} from '@tanstack/angular-table';
import { formatDate } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { SessionService } from '../../../common/services/session.service';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { AppConfigService } from '../../../common/app-config.service';
import { NetworkManager } from '../../../issuer/services/network-manager.service';
import { Network } from '../../../issuer/network.model';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { HlmH1 } from '@spartan-ng/helm/typography';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { DashboardTopBadgesComponent, Top3Badge } from '../../../dashboard/components/dashboard-stats-bar/dashboard-top-badges.component';
import { RecipientSkillVisualisationComponent, CompetencyAreaClickData } from '../../../recipient/components/recipient-skill-visualisation/recipient-skill-visualisation.component';
import { ApiRootSkill } from '../../../common/model/ai-skills.model';
import { ESCORootSkill } from '../../../dashboard/models/network-dashboard-api.model';
import { NetworkDashboardApiService } from '../../../dashboard/services/network-dashboard-api.service';
import { OebTabsComponent, Tab } from '../../../components/oeb-tabs.component';
import { BadgesYearlyLineChartComponent, BadgeTypeOption } from '../../../dashboard/components/badges-yearly-line-chart/badges-yearly-line-chart.component';
import { HorizontalBarChartComponent, HorizontalBarItem } from '../../../dashboard/components/horizontal-bar-chart/horizontal-bar-chart.component';
import {
	NetworkBadgeAwardTimelineEntry,
	NetworkBadgeTypeDistributionEntry,
	NetworkRecentActivityData,
	NetworkRecentBadgeAwardEntry,
	NetworkCompetencyAreaData,
	NetworkStrengthenedCompetencyData,
	NetworkBadgeLocationsResponse,
	DeliveryMethodType,
	BadgeLocation,
	getBadgeRankDisplayConfig,
	getBadgeTypeDisplayConfig,
	getCompetencyAreaDisplayConfig,
	BadgeTypeStatsExtended
} from '../../../dashboard/models/network-dashboard-api.model';

// Re-export Top3Badge from dashboard component for consistency
export { Top3Badge } from '../../../dashboard/components/dashboard-stats-bar/dashboard-top-badges.component';

export interface BadgeActivity {
	type: string;
	title: string;
	count: number;
	date: Date;
	icon: string;
}

// View state type for switching between default view and delivery method detail
export type BadgeAnalysisViewState = 'default' | 'delivery-method-detail';

// Delivery method detail data interfaces
export interface CompetencyAreaData {
	name: string;
	areaKey: string;
	count: number;
	hours: number;
	percentage: number;
	color: string;
	icon?: string;
	escoUri?: string;
}

export interface DeliveryMethodDetailData {
	method: BadgeDeliveryMethod;
	methodLabel: string;
	totalBadges: number;
	totalHours: number;
	topCompetencyAreas: CompetencyAreaData[];
	individualCompetencies?: CompetencyAreaData[]; // Individual competencies with ESCO URIs for hours tab
	plzDistribution?: PlzStatisticsData[];
}

// Individual competency with ESCO URI
export interface EscoSkill {
	name: string;
	escoUri: string;
}

// Monthly badge data for table display
export interface MonthlyBadgeData {
	badgeKey: string;
	title: string;
	image?: string;
	issuerId?: string;  // Issuer slug for navigation
	categoryKey: string;
	category: string;
	badgeType: 'participation' | 'competency' | 'learningpath';
	competencyAreas: string[];
	skills?: EscoSkill[];  // Individual competencies with ESCO links
	value: number;
	date: string;
}

@Component({
	selector: 'app-network-badge-analysis',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		TranslateModule,
		TranslatePipe,
		RouterLink,
		NgIcon,
		BgBreadcrumbsComponent,
		BgAwaitPromises,
		HlmH1,
		OebButtonComponent,
		DashboardTopBadgesComponent,
		RecipientSkillVisualisationComponent,
		OebTabsComponent,
		BadgesYearlyLineChartComponent,
		HorizontalBarChartComponent,
		...HlmTableImports,
		...OebTableImports,
		FlexRenderDirective,
		HlmIconModule,
	],
	providers: [provideIcons({ lucideTrophy, lucideMedal, lucideAward, lucideChevronUp, lucideChevronDown, lucideChevronsUpDown, lucideMonitor, lucideMapPin, lucideUsers, lucideClock, lucideArrowLeft, lucideTarget })],
	templateUrl: './network-badge-analysis.component.html',
	styleUrls: ['./network-badge-analysis.component.scss'],
})
export class NetworkBadgeAnalysisComponent
	extends BaseAuthenticatedRoutableComponent
	implements OnInit, AfterViewInit, OnDestroy
{
	private networkManager = inject(NetworkManager);
	protected title = inject(Title);
	protected translate = inject(TranslateService);
	private configService = inject(AppConfigService);
	private networkDashboardApi = inject(NetworkDashboardApiService);

	networkSlug: string = '';

	currentView: BadgeAnalysisViewState = 'default';
	selectedDeliveryMethod: 'online' | 'in-person' | null = null;
	deliveryMethodData = signal<DeliveryMethodDetailData | null>(null);
	isLoadingDeliveryMethod = false;

	deliveryMethodTabs: Tab[] = [];
	activeDeliveryMethodTab = 'competencyAreas';

	skillVisualisationData: ApiRootSkill[] = [];

	private lucideIcons: { [key: string]: string } = {
		'Monitor': 'M20 14H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2ZM8 21h8M12 17v4',
		'Users': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
		'Globe': 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10ZM2 12h20',
		'Wrench': 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
		'BarChart3': 'M3 3v18h18M18 17V9M13 17V5M8 17v-3',
		'MapPin': 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z'
	};
	networkLoaded: Promise<unknown>;
	network = signal<Network | null>(null);
	crumbs: LinkEntry[];

	private destroy$ = new Subject<void>();

	isLoading = true;
	isLoadingTimeline = false;

	badgeTypeStats: BadgeTypeStatsExtended[] = [];

	get totalBadges(): number {
		return this.badgeTypeStats.reduce((sum, stat) => sum + stat.count, 0);
	}

	/**
	 * Check if delivery method chart has any data (online or in-person > 0)
	 */
	get hasDeliveryMethodData(): boolean {
		return this.deliveryMethodStats.online.count > 0 || this.deliveryMethodStats.inPerson.count > 0;
	}

	/**
	 * Check if badge type chart has any data (any badge type > 0)
	 */
	get hasBadgeTypeData(): boolean {
		return this.badgeTypeStats.some(stat => stat.count > 0);
	}

	badgeDensity: number = 0;
	badgeDensityTrend: 'up' | 'down' | 'stable' = 'stable';
	badgeDensityTrendValue: number = 0;

	offeringDiversityIndex: number = 0;
	diversityIndexTrend: 'up' | 'down' | 'stable' = 'stable';
	diversityIndexTrendValue: number = 0;

	deliveryMethodStats: {
		online: { count: number; percentage: number; color: string };
		inPerson: { count: number; percentage: number; color: string };
	} = {
		online: { count: 0, percentage: 50, color: '#F1F0FF' },
		inPerson: { count: 0, percentage: 50, color: '#E4FFE4' }
	};

	get deliveryMethodChartData(): { type: string; label: string; count: number; percentage: number; color: string; borderColor: string }[] {
		return [
			{
				type: 'online',
				label: this.translate.instant('Network.Dashboard.badgeAnalysis.deliveryMethod.online'),
				count: this.deliveryMethodStats.online.count,
				percentage: this.deliveryMethodStats.online.percentage,
				color: '#F1F0FF',
				borderColor: '#CCD7FF'
			},
			{
				type: 'inPerson',
				label: this.translate.instant('Network.Dashboard.badgeAnalysis.deliveryMethod.inPerson'),
				count: this.deliveryMethodStats.inPerson.count,
				percentage: this.deliveryMethodStats.inPerson.percentage,
				color: '#E4FFE4',
				borderColor: '#93F993'
			}
		];
	}

	top3Badges: Top3Badge[] = [];

	private readonly SEGMENT_GAP = 4;

	private _badgeAwardsByTime: BadgeAwardData[] = [];

	get badgeAwardsByTime(): BadgeAwardData[] {
		return this._badgeAwardsByTime;
	}

	private currentYear: number = new Date().getFullYear();
	selectedYear: number = this.currentYear;
	selectedMonth: number | null = null;
	selectedBadgeType: string = 'all';

	availableYears: number[] = [this.currentYear - 2, this.currentYear - 1, this.currentYear];

	badgeTypes: BadgeTypeOption[] = [
		{ value: 'all', label: 'Alle Typen' },
		{ value: 'competency', label: 'Teilnahmezertifikat' },
		{ value: 'participation', label: 'Badge' },
		{ value: 'learningpath', label: 'Micro Degrees' },
	];

	monthlyBadges: MonthlyBadgeData[] = [];

	readonly monthlyBadgesSorting = signal<SortingState>([
		{ id: 'Badge.createdOn', desc: true }
	]);

	private readonly monthlyBadgesColumnDefs: ColumnDef<MonthlyBadgeData>[] = [
		{
			id: 'Badge.createdOn',
			header: 'Badge.createdOn',
			accessorFn: (row) => new Date(row.date),
			cell: (info) => formatDate(info.getValue() as Date, 'dd.MM.yyyy', 'de-DE'),
			sortDescFirst: true,
		},
		{
			id: 'Network.Dashboard.recentActivity.badge',
			header: 'Network.Dashboard.recentActivity.badge',
			accessorFn: (row) => row.title,
			sortDescFirst: false,
		},
		{
			id: 'General.count',
			header: 'General.count',
			accessorFn: (row) => row.value,
			sortDescFirst: true,
		},
	];

	monthlyBadgesTable = createAngularTable(() => ({
		data: this.monthlyBadges,
		columns: this.monthlyBadgesColumnDefs,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		state: {
			sorting: this.monthlyBadgesSorting(),
		},
		onSortingChange: (updater) =>
			updater instanceof Function
				? this.monthlyBadgesSorting.update(updater)
				: this.monthlyBadgesSorting.set(updater),
		enableSortingRemoval: false,
	}));

	constructor() {
		const loginService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, loginService);

		this.networkSlug = this.route.snapshot.params['networkSlug'];

		this.networkLoaded = this.networkManager.networkBySlug(this.networkSlug).then((network) => {
			this.network.set(network);
			this.title.setTitle(
				`Badge-Analyse - ${this.network().name} - ${this.configService.theme['serviceName'] || 'Badgr'}`
			);
			this.crumbs = [
				{ title: this.translate.instant('NavItems.myInstitutions'), routerLink: ['/issuer/issuers'] },
				{
					title: this.translate.instant('General.networks'),
					routerLink: ['/issuer'],
					queryParams: { tab: 'networks' },
				},
				{ title: this.network().name, routerLink: ['/issuer/networks/' + this.network().slug] },
				{ title: 'Badge-Analyse', routerLink: [] },
			];
		});
	}

	ngOnInit(): void {
		this.loadNetworkData();
	}

	/**
	 * Load network-specific dashboard data from API
	 */
	private loadNetworkData(): void {
		if (!this.networkSlug) return;

		this.isLoading = true;

		forkJoin({
			competencySkills: this.networkDashboardApi.getCompetencyAreasSkills(this.networkSlug).pipe(
				catchError((error) => {
					console.error('[NETWORK-BADGE-ANALYSIS] Error loading competency skills:', error);
					return of({ skills: [] });
				})
			),
			topBadges: this.networkDashboardApi.getTopBadges(this.networkSlug, 3).pipe(
				catchError((error) => {
					console.error('[NETWORK-BADGE-ANALYSIS] Error loading network top badges:', error);
					return of({ badges: [] });
				})
			),
			badgeAwardsTimeline: this.networkDashboardApi.getBadgeAwardsTimeline(this.networkSlug, {
				year: this.selectedYear,
				groupBy: 'month'
			}).pipe(
				catchError((error) => {
					console.error('[NETWORK-BADGE-ANALYSIS] Error loading badge awards timeline:', error);
					return of({ timeline: [] });
				})
			),
			badgeTypeDistribution: this.networkDashboardApi.getBadgeTypeDistribution(this.networkSlug).pipe(
				catchError((error) => {
					console.error('[NETWORK-BADGE-ANALYSIS] Error loading badge type distribution:', error);
					return of({ distribution: [] });
				})
			),
			recentBadgeAwards: this.networkDashboardApi.getRecentBadgeAwards(this.networkSlug, { limit: 50 }).pipe(
				catchError((error) => {
					console.error('[NETWORK-BADGE-ANALYSIS] Error loading recent badge awards:', error);
					return of({ awards: [] });
				})
			),
			deliveryMethodDistribution: this.networkDashboardApi.getDeliveryMethodDistribution(this.networkSlug).pipe(
				catchError((error) => {
					console.error('[NETWORK-BADGE-ANALYSIS] Error loading delivery method distribution:', error);
					return of({ total: 0, online: { value: 0, percentage: 0 }, inPerson: { value: 0, percentage: 0 } });
				})
			)
		}).pipe(takeUntil(this.destroy$)).subscribe({
			next: ({ competencySkills, topBadges, badgeAwardsTimeline, badgeTypeDistribution, recentBadgeAwards, deliveryMethodDistribution }) => {
				if (competencySkills?.skills?.length > 0) {
					this.skillVisualisationData = this.transformToApiRootSkills(competencySkills.skills);
				} else {
					this.skillVisualisationData = [];
				}

				if (topBadges?.badges && topBadges.badges.length > 0) {
					this.top3Badges = topBadges.badges.map((badge) => {
						const displayConfig = getBadgeRankDisplayConfig(badge.rank);
						return {
							rank: badge.rank as 1 | 2 | 3,
							name: badge.badgeTitle,
							count: badge.count,
							image: badge.image,
							icon: displayConfig.icon,
							color: displayConfig.color,
							id: badge.badgeId,
						};
					});
				}

				if (badgeAwardsTimeline?.timeline && badgeAwardsTimeline.timeline.length > 0) {
					this._badgeAwardsByTime = this.transformTimelineToLegacyFormat(badgeAwardsTimeline.timeline);
				}

				if (badgeTypeDistribution?.distribution && badgeTypeDistribution.distribution.length > 0) {
					this.badgeTypeStats = this.transformBadgeTypeDistribution(badgeTypeDistribution.distribution);
				}

				if (recentBadgeAwards?.awards && recentBadgeAwards.awards.length > 0) {
					this.monthlyBadges = this.transformRecentBadgeAwardsToMonthlyBadges(recentBadgeAwards.awards);
				}

				if (deliveryMethodDistribution) {
					this.deliveryMethodStats = {
						online: {
							count: deliveryMethodDistribution.online?.value || 0,
							percentage: deliveryMethodDistribution.online?.percentage || 0,
							color: '#F1F0FF'
						},
						inPerson: {
							count: deliveryMethodDistribution.inPerson?.value || 0,
							percentage: deliveryMethodDistribution.inPerson?.percentage || 0,
							color: '#E4FFE4'
						}
					};
				}

				this.isLoading = false;
			},
			error: (error) => {
				console.error('[NETWORK-BADGE-ANALYSIS] Error loading network data:', error);
				this.isLoading = false;
			}
		});
	}

	/**
	 * Transform recent badge awards from API to MonthlyBadgeData format for table
	 */
	private transformRecentBadgeAwardsToMonthlyBadges(awards: NetworkRecentBadgeAwardEntry[]): MonthlyBadgeData[] {
		const apiBaseUrl = this.configService.apiConfig.baseUrl;
		return awards.map((award) => ({
			badgeKey: award.badgeId,
			title: award.badgeName,
			image: award.badgeImage ? `${apiBaseUrl}${award.badgeImage}` : '',
			issuerId: award.issuerId || '',
			categoryKey: 'badge_award',
			category: 'Badge-Vergabe',
			badgeType: (award.badgeType || 'participation') as 'participation' | 'competency' | 'learningpath',
			competencyAreas: [],
			skills: award.competencies?.map(comp => ({
				name: comp.name,
				escoUri: comp.escoUri || ''
			})) || [],
			value: award.count,
			date: award.date
		}));
	}

	/**
	 * Transform badge awards timeline from API to legacy BadgeAwardData format
	 * @param timeline - API timeline entries
	 * @param selectedMonth - If provided, include day in the result for daily view
	 */
	private transformTimelineToLegacyFormat(timeline: NetworkBadgeAwardTimelineEntry[], selectedMonth?: number | null): BadgeAwardData[] {
		const result: BadgeAwardData[] = [];

		for (const entry of timeline) {
			const date = new Date(entry.date);
			const year = date.getFullYear();
			const month = date.getMonth() + 1;
			const day = selectedMonth ? date.getDate() : undefined;

			if (entry.byType) {
				if (entry.byType.participation > 0) {
					result.push({
						date,
						year,
						month,
						day,
						type: 'participation',
						count: entry.byType.participation
					});
				}
				if (entry.byType.competency > 0) {
					result.push({
						date,
						year,
						month,
						day,
						type: 'competency',
						count: entry.byType.competency
					});
				}
				if (entry.byType.learningpath > 0) {
					result.push({
						date,
						year,
						month,
						day,
						type: 'learningpath',
						count: entry.byType.learningpath
					});
				}
			} else {
				result.push({
					date,
					year,
					month,
					day,
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

	ngAfterViewInit(): void {
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	navigateBack(): void {
		this.router.navigate(['/issuer/networks', this.networkSlug]);
	}

	/**
	 * Navigate to badge detail page
	 * @param badgeSlug - Badge class slug/id
	 */
	navigateToBadgeDetail(badgeSlug: string): void {
		const badge = this.monthlyBadges.find(b => b.badgeKey === badgeSlug);
		if (badge?.issuerId) {
			this.router.navigate(['/issuer/issuers', badge.issuerId, 'badges', badgeSlug]);
		}
	}

	get role() {
		if (this.network()?.currentUserStaffMember) {
			return this.network().currentUserStaffMember.roleSlug;
		} else {
			return this.network()?.current_user_network_role;
		}
	}

	onYearChange(year: number): void {
		this.selectedYear = year;
		this.selectedMonth = null; // Reset month when year changes

		this.loadBadgeAwardsTimeline(year, null);
	}

	onMonthChange(month: number | null): void {
		this.selectedMonth = month;

		this.loadBadgeAwardsTimeline(this.selectedYear, month);
	}

	/**
	 * Load badge awards timeline for a specific year and optionally a month
	 */
	private loadBadgeAwardsTimeline(year: number, month: number | null): void {
		if (!this.networkSlug) return;

		this.isLoadingTimeline = true;

		const groupBy = month ? 'day' : 'month';

		// Build params - if month is selected, use startDate/endDate for the month range
		const params: { year?: number; startDate?: string; endDate?: string; groupBy: 'day' | 'month' } = {
			groupBy: groupBy
		};

		if (month) {
			// Calculate start and end dates for the selected month
			const startDate = new Date(year, month - 1, 1);
			const endDate = new Date(year, month, 0); // Last day of the month
			params.startDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
			params.endDate = endDate.toISOString().split('T')[0]; // YYYY-MM-DD
		} else {
			params.year = year;
		}

		this.networkDashboardApi.getBadgeAwardsTimeline(this.networkSlug, params).pipe(
			takeUntil(this.destroy$),
			catchError((error) => {
				console.error('[NETWORK-BADGE-ANALYSIS] Error loading badge awards timeline:', { year, month }, error);
				this.isLoadingTimeline = false;
				return EMPTY;
			})
		).subscribe({
			next: (response) => {
				const timeline = response?.timeline || [];
				this._badgeAwardsByTime = this.transformTimelineToLegacyFormat(timeline, month);
				this.isLoadingTimeline = false;
			}
		});
	}

	onBadgeTypeChange(type: string): void {
		this.selectedBadgeType = type;
	}

	getPodiumClass(rank: number): string {
		switch (rank) {
			case 1:
				return 'tw-order-2 tw-h-64';
			case 2:
				return 'tw-order-1 tw-h-56';
			case 3:
				return 'tw-order-3 tw-h-48';
			default:
				return '';
		}
	}

	getTrendSymbol(trend: string): string {
		switch (trend) {
			case 'up':
				return '↗';
			case 'down':
				return '↘';
			case 'stable':
				return '→';
			default:
				return '→';
		}
	}

	getTrendColorClass(trend: string): string {
		switch (trend) {
			case 'up':
				return 'tw-text-green-500';
			case 'down':
				return 'tw-text-red-500';
			case 'stable':
				return 'tw-text-gray-500';
			default:
				return 'tw-text-gray-500';
		}
	}

	formatDate(date: Date | string | undefined): string {
		if (!date) return '';
		const dateObj = typeof date === 'string' ? new Date(date) : date;
		return dateObj.toLocaleDateString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		});
	}

	/**
	 * Get appropriate title for monthly detail item based on its structure
	 */
	getMonthlyDetailTitle(item: any): string {
		if (item.title) return item.title;
		if (item.areaKey) {
			const areaKeyMap: Record<string, string> = {
				it_digital: 'Network.Dashboard.competencyAreas.itDigital',
				social: 'Network.Dashboard.competencyAreas.socialCompetencies',
				languages: 'Network.Dashboard.competencyAreas.languages',
				management: 'Network.Dashboard.competencyAreas.management',
				handwerk: 'Network.Dashboard.competencyAreas.crafts',
			};
			const translationKey = areaKeyMap[item.areaKey];
			return translationKey ? this.translate.instant(translationKey) : item.areaKey;
		}
		return this.translate.instant('General.unknown');
	}

	/**
	 * Get appropriate category for monthly detail item
	 */
	getMonthlyDetailCategory(item: any): string {
		if (item.category) return item.category;
		if (item.categoryKey) {
			const categoryMap: Record<string, string> = {
				competency_badge: 'Kompetenz-Badge',
				participation_badge: 'Teilnahme-Badge',
				course: 'Kurs',
			};
			return categoryMap[item.categoryKey] || item.categoryKey;
		}
		return '';
	}

	/**
	 * Get appropriate value display for monthly detail item
	 */
	getMonthlyDetailValue(item: any): string {
		if (item.value === 'new' || item.value === 'neu') return 'NEU';
		if (typeof item.value === 'number') return item.value.toString();
		return item.value?.toString() || '—';
	}

	/**
	 * Get total count of all badges in monthly badges
	 */
	get totalMonthlyBadges(): number {
		if (!this.monthlyBadges || this.monthlyBadges.length === 0) return 0;
		return this.monthlyBadges.reduce((sum, item) => sum + item.value, 0);
	}

	/**
	 * Format date string for display (DD.MM.YYYY)
	 */
	formatBadgeDate(dateString: string): string {
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('de-DE', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric'
			});
		} catch {
			return dateString;
		}
	}

	navigateToDeliveryMethod(method: 'online' | 'in-person'): void {
		this.selectedDeliveryMethod = method;
		this.loadDeliveryMethodData(method);
	}

	private loadDeliveryMethodData(method: 'online' | 'in-person'): void {
		this.isLoadingDeliveryMethod = true;

		const apiDeliveryMethod: DeliveryMethodType = method;

		forkJoin({
			kpis: this.networkDashboardApi.getKpis(this.networkSlug, apiDeliveryMethod).pipe(
				catchError((error) => {
					console.error('[NETWORK-BADGE-ANALYSIS] Error loading KPIs:', error);
					return of({ kpis: [] });
				})
			),
			competencyAreas: this.networkDashboardApi.getCompetencyAreas(this.networkSlug, 10, apiDeliveryMethod).pipe(
				catchError((error) => {
					console.error('[NETWORK-BADGE-ANALYSIS] Error loading competency areas:', error);
					return of({ data: [] });
				})
			),
			strengthenedCompetencies: this.networkDashboardApi.getStrengthenedCompetencies(this.networkSlug, 10, 'hours', 'desc', apiDeliveryMethod).pipe(
				catchError((error) => {
					console.error('[NETWORK-BADGE-ANALYSIS] Error loading strengthened competencies:', error);
					return of({ competencies: [] });
				})
			),
			badgeLocations: method === 'in-person'
				? this.networkDashboardApi.getBadgeLocations(this.networkSlug, apiDeliveryMethod, 20).pipe(
					catchError((error) => {
						console.error('[NETWORK-BADGE-ANALYSIS] Error loading badge locations:', error);
						return of({ locations: [] } as NetworkBadgeLocationsResponse);
					})
				)
				: of({ locations: [] } as NetworkBadgeLocationsResponse),
			competencySkills: this.networkDashboardApi.getCompetencyAreasSkills(this.networkSlug, { deliveryMethod: apiDeliveryMethod }).pipe(
				catchError((error) => {
					console.error('[NETWORK-BADGE-ANALYSIS] Error loading competency skills:', error);
					return of({ skills: [] });
				})
			)
		}).pipe(takeUntil(this.destroy$)).subscribe({
			next: ({ kpis, competencyAreas, strengthenedCompetencies, badgeLocations, competencySkills }) => {
				const topCompetencyAreas = competencyAreas?.data
					? this.transformCompetencyAreasToDetailData(competencyAreas.data)
					: [];

				const individualCompetencies = strengthenedCompetencies?.competencies
					? this.transformStrengthenedCompetenciesToDetailData(strengthenedCompetencies.competencies)
					: [];

				const plzDistribution = method === 'in-person' && badgeLocations?.locations
					? this.transformBadgeLocationsToPlzStats(badgeLocations.locations)
					: undefined;

				if (competencySkills?.skills?.length > 0) {
					this.skillVisualisationData = this.transformToApiRootSkills(competencySkills.skills);
				} else {
					this.skillVisualisationData = [];
				}

				const badgesAwardedKpi = kpis?.kpis?.find(k => k.id === 'badges_awarded');
				const competencyHoursKpi = kpis?.kpis?.find(k => k.id === 'competency_hours');

				const totalBadges = badgesAwardedKpi?.value ?? topCompetencyAreas.reduce((sum, area) => sum + area.count, 0);
				const totalHours = competencyHoursKpi?.value ?? individualCompetencies.reduce((sum, area) => sum + area.hours, 0);

				const deliveryData: DeliveryMethodDetailData = {
					method: method,
					methodLabel: method === 'online'
						? this.translate.instant('Network.Dashboard.badgeAnalysis.deliveryMethod.online')
						: this.translate.instant('Network.Dashboard.badgeAnalysis.deliveryMethod.inPerson'),
					totalBadges: totalBadges,
					totalHours: totalHours,
					topCompetencyAreas: topCompetencyAreas,
					individualCompetencies: individualCompetencies,
					plzDistribution: plzDistribution
				};

				this.deliveryMethodData.set(deliveryData);
				this.currentView = 'delivery-method-detail';
				this.setupDeliveryMethodTabs(method);
				this.isLoadingDeliveryMethod = false;
			},
			error: (error) => {
				console.error('[NETWORK-BADGE-ANALYSIS] Error loading delivery method data:', error);
				this.isLoadingDeliveryMethod = false;
			}
		});
	}

	/**
	 * Transform BadgeLocation from API to PlzStatisticsData format
	 * Translates "other" to "Andere" and keeps original order (sorted by badgeCount from API)
	 */
	private transformBadgeLocationsToPlzStats(locations: BadgeLocation[]): PlzStatisticsData[] {
		return locations.map(location => ({
			zipCode: location.city,
			regionName: location.city.toLowerCase() === 'other'
				? this.translate.instant('Network.Dashboard.badgeAnalysis.regions.other')
				: location.city,
			learnerCount: location.badgeCount,
			percentage: location.badgePercentage,
			trend: 'stable' as const,
			trendValue: 0
		}));
	}

	/**
	 * Check if a PLZ entry is the "other" category (aggregated data from other regions)
	 */
	isOtherPlzCategory(regionName: string): boolean {
		return regionName === 'Andere';
	}

	/**
	 * Transform NetworkCompetencyAreaData to CompetencyAreaData for delivery method detail view
	 */
	private transformCompetencyAreasToDetailData(areas: NetworkCompetencyAreaData[]): CompetencyAreaData[] {
		return areas.map(area => {
			const displayConfig = getCompetencyAreaDisplayConfig(area.id);

			return {
				name: area.name,
				areaKey: area.id,
				count: area.weight,
				hours: Math.round(area.weight * 4), // Estimate hours based on count (average 4h per badge)
				percentage: area.value,
				color: displayConfig.color,
				icon: displayConfig.icon,
				escoUri: area.escoUri
			};
		});
	}

	/**
	 * Transform NetworkStrengthenedCompetencyData to CompetencyAreaData for delivery method detail view (Einzelstunden)
	 * This uses the strengthened competencies endpoint which provides ESCO URIs
	 */
	private transformStrengthenedCompetenciesToDetailData(competencies: NetworkStrengthenedCompetencyData[]): CompetencyAreaData[] {
		const maxHours = Math.max(...competencies.map(c => c.hours), 1);

		return competencies.map(comp => ({
			name: comp.title,
			areaKey: comp.competencyId,
			count: 0, // Not provided by this endpoint
			hours: comp.hours,
			percentage: Math.round((comp.hours / maxHours) * 100),
			color: '#492E98', // OEB Purple
			icon: undefined, // No icons for individual competencies
			escoUri: comp.escoUri
		}));
	}

	// Setup tabs for delivery method detail view
	private setupDeliveryMethodTabs(method: 'online' | 'in-person'): void {
		this.deliveryMethodTabs = [
			{
				key: 'competencyAreas',
				title: this.translate.instant('Network.Dashboard.badgeAnalysis.tabs.topCompetencyAreas'),
				component: null,
			},
			{
				key: 'topIndividualCompetencies',
				title: this.translate.instant('Network.Dashboard.badgeAnalysis.tabs.topIndividualCompetencies'),
				component: null,
			},
		];

		if (method === 'in-person') {
			this.deliveryMethodTabs.push({
				key: 'regions',
				title: this.translate.instant('Network.Dashboard.badgeAnalysis.tabs.regions'),
				component: null,
			});
		}

		this.activeDeliveryMethodTab = 'competencyAreas';
	}

	onDeliveryMethodTabChange(tab: string): void {
		this.activeDeliveryMethodTab = tab;
	}

	backToDefaultView(): void {
		this.currentView = 'default';
		this.selectedDeliveryMethod = null;
		this.deliveryMethodData.set(null);
		this.activeDeliveryMethodTab = 'competencyAreas';
	}

	getMaxCompetencyCount(): number {
		const data = this.deliveryMethodData();
		if (!data) return 0;
		return Math.max(...data.topCompetencyAreas.map(c => c.count));
	}

	getMaxCompetencyHours(): number {
		const data = this.deliveryMethodData();
		if (!data) return 0;
		return Math.max(...data.topCompetencyAreas.map(c => c.hours));
	}

	getMaxPlzCount(): number {
		const data = this.deliveryMethodData();
		if (!data?.plzDistribution || data.plzDistribution.length === 0) return 1;
		return Math.max(...data.plzDistribution.map(p => p.learnerCount)) || 1;
	}

	/**
	 * Calculate PLZ bar width with scaled proportional display
	 * Uses a scaled range from 30% to 100% to ensure text fits and proportional differences are visible
	 * @param learnerCount - Number of learners for this PLZ
	 * @returns Width percentage (30% to 100%)
	 */
	getPlzBarWidth(learnerCount: number): number {
		const maxCount = this.getMaxPlzCount();
		const ratio = learnerCount / maxCount;
		const minWidth = 30;
		const maxWidth = 100;
		return minWidth + (ratio * (maxWidth - minWidth));
	}

	getIconSvg(iconName: string): string {
		const iconPath = this.lucideIcons[iconName];
		if (!iconPath) return '';

		return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="${iconPath}"></path>
		</svg>`;
	}

	/**
	 * Get dynamic font size for competency title based on text length
	 * Ensures text fits within available space
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
	 * Get maximum hours from individual competencies for scaling bar widths
	 */
	getMaxIndividualCompetencyHours(): number {
		const data = this.deliveryMethodData();
		if (!data?.individualCompetencies || data.individualCompetencies.length === 0) return 1;
		return Math.max(...data.individualCompetencies.map(c => c.hours)) || 1;
	}

	/**
	 * Transform individual competencies to HorizontalBarItem[] for the horizontal bar chart
	 */
	getIndividualCompetenciesAsBarItems(): HorizontalBarItem[] {
		const data = this.deliveryMethodData();
		if (!data?.individualCompetencies) return [];

		return data.individualCompetencies.map(comp => ({
			id: comp.areaKey,
			label: comp.name,
			value: comp.hours,
			escoUri: comp.escoUri
		}));
	}

	/**
	 * Get dynamic font size for PLZ/city name based on text length
	 */
	getPlzFontSize(text: string): number {
		const length = text?.length || 0;
		if (length <= 15) return 14;
		if (length <= 25) return 13;
		if (length <= 35) return 12;
		if (length <= 45) return 11;
		return 10;
	}

	navigateToPlzDetail(plz: string): void {
		this.router.navigate(['/dashboard/postal-code', plz]);
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

		let anglePercent = 0;
		for (let i = 0; i < index; i++) {
			anglePercent += this.badgeTypeStats[i].percentage;
		}
		if (isEnd) {
			anglePercent += this.badgeTypeStats[index].percentage;
		}

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
	 * Check if any delivery method segment is 100% (full circle)
	 */
	isDeliveryMethodFullCircle(): boolean {
		return this.deliveryMethodChartData.some(stat => stat.percentage >= 99.9);
	}

	/**
	 * Calculate stroke-dasharray for delivery method chart
	 * No gap when segment is 100% (full circle)
	 */
	getDeliveryMethodDasharray(percentage: number, radius: number = 128.5): string {
		const circumference = 2 * Math.PI * radius;
		const segmentLength = (percentage / 100) * circumference;

		if (percentage >= 99.9) {
			return `${circumference} ${circumference}`;
		}

		const gapLength = this.SEGMENT_GAP;
		const adjustedLength = Math.max(0, segmentLength - gapLength);
		return `${adjustedLength} ${circumference}`;
	}

	/**
	 * Calculate stroke-dashoffset for delivery method chart
	 * No offset adjustment for full circle (100%)
	 */
	getDeliveryMethodDashoffset(index: number, radius: number = 128.5): number {
		const circumference = 2 * Math.PI * radius;
		const data = this.deliveryMethodChartData;

		if (data[index]?.percentage >= 99.9) {
			return 0;
		}

		let offset = 0;
		for (let i = 0; i < index; i++) {
			offset += (data[i].percentage / 100) * circumference;
		}
		return -(offset + this.SEGMENT_GAP / 2);
	}

	/**
	 * Calculate radial line coordinates for delivery method chart
	 */
	getDeliveryMethodRadialCoord(index: number, radius: number, coord: 'x' | 'y', isEnd: boolean = false): number {
		const centerX = 153.5;
		const centerY = 153.5;
		const data = this.deliveryMethodChartData;

		let anglePercent = 0;
		for (let i = 0; i < index; i++) {
			anglePercent += data[i].percentage;
		}
		if (isEnd) {
			anglePercent += data[index].percentage;
		}

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
	 * Transform ESCO skills to ApiRootSkill format for skill visualisation component
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

	onCompetencyAreaClick(areaData: CompetencyAreaClickData): void {
	}
}
