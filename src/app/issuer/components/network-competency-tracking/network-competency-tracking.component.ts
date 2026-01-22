import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
import { NetworkDashboardApiService } from '../../../dashboard/services/network-dashboard-api.service';
import { HorizontalBarChartComponent, HorizontalBarItem } from '../../../dashboard/components/horizontal-bar-chart/horizontal-bar-chart.component';
import { RecipientSkillVisualisationComponent } from '../../../recipient/components/recipient-skill-visualisation/recipient-skill-visualisation.component';
import { GenderCompetencyAnalysisComponent } from '../../../dashboard/components/gender-competency-analysis/gender-competency-analysis.component';
import { ApiRootSkill } from '../../../common/model/ai-skills.model';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBookOpen, lucideUserStar, lucideClock, lucideClockFading, lucideAward, lucideSchool, lucideCircleSlash2 } from '@ng-icons/lucide';
import { InfoIcon } from '../../../common/components/info-icon.component';
import {
	NetworkStrengthenedCompetencyData,
	ESCORootSkill,
	LearnerGenderStatistic,
	mapGenderTypeToLabel,
	BadgeCompetencyWithEsco,
	NetworkCompetencyDetailResponse,
	NetworkCompetencyInstitution,
	CompetencyAreaDetailRequest,
	CompetencyAreaDetailResponse,
	CompetencyAreaTopCompetency,
	NetworkKPIsResponse,
	NetworkKPIData,
} from '../../../dashboard/models/network-dashboard-api.model';
import { CompetencyAreaClickData } from '../../../recipient/components/recipient-skill-visualisation/recipient-skill-visualisation.component';

// Interface for gender competency hours
interface GenderCompetencyHours {
	gender: string;
	label: string;
	hours: number;
}

// Interface for last month competency
interface LastMonthCompetency {
	name: string;
	count: number;
	escoUri?: string;
}

// Interface for competency detail data (mapped from API response)
interface CompetencyDetailData {
	competencyId: string;
	title: string;
	hours: number;
	badgeCount: number;
	userCount: number;
	institutionCount: number;
	escoUri?: string;
	institutions: CompetencyInstitution[];
}

// Interface for institution offering a competency (mapped from API)
interface CompetencyInstitution {
	id: string;
	name: string;
	image?: string;
	badgeCount: number;
	userCount: number;
	issuerId?: string;
	slug?: string;
}

// Interface for competency area detail data (mapped from API response)
interface CompetencyAreaDetailData {
	areaName: string;
	areaConceptUri?: string;
	totalHours: number;
	totalCompetencies: number;
	matchedCompetencies: number;
	badgeCount: number;
	userCount: number;
	institutionCount: number;
	topCompetencies: CompetencyAreaTopCompetency[];
	institutions: CompetencyInstitution[];
}

@Component({
	selector: 'app-network-competency-tracking',
	standalone: true,
	imports: [
		CommonModule,
		TranslateModule,
		TranslatePipe,
		RouterLink,
		BgBreadcrumbsComponent,
		BgAwaitPromises,
		HlmH1,
		OebButtonComponent,
		HorizontalBarChartComponent,
		RecipientSkillVisualisationComponent,
		GenderCompetencyAnalysisComponent,
		NgIcon,
		InfoIcon,
	],
	providers: [provideIcons({ lucideArrowLeft, lucideBookOpen, lucideUserStar, lucideClock, lucideClockFading, lucideAward, lucideSchool, lucideCircleSlash2 })],
	templateUrl: './network-competency-tracking.component.html',
	styleUrls: ['./network-competency-tracking.component.scss'],
})
export class NetworkCompetencyTrackingComponent
	extends BaseAuthenticatedRoutableComponent
	implements OnInit, OnDestroy
{
	private networkManager = inject(NetworkManager);
	protected title = inject(Title);
	protected translate = inject(TranslateService);
	private configService = inject(AppConfigService);
	private networkDashboardApi = inject(NetworkDashboardApiService);

	networkSlug: string = '';
	initialCompetencyId: string | null = null;
	networkLoaded: Promise<unknown>;
	network = signal<Network | null>(null);
	crumbs: LinkEntry[];

	private destroy$ = new Subject<void>();

	// Loading states
	isLoading = true;

	// KPI Data
	totalCompetencyHours = signal<number>(0);
	averageCompetencyHours = signal<number>(0);
	totalCompetencies = signal<number>(0);
	competencyHoursTrend = signal<{ trend: 'up' | 'down' | 'stable'; trendValue: number; trendPeriod?: string } | null>(null);

	// Skill visualisation data for ESCO bubbles (ApiRootSkill format)
	skillVisualisationData: ApiRootSkill[] = [];

	// Individual competency data for bar chart
	individualCompetencyData: NetworkStrengthenedCompetencyData[] = [];

	// Gender distribution data
	genderDistribution: LearnerGenderStatistic[] = [];
	genderCompetencyHours: GenderCompetencyHours[] = [];

	// Last month competencies data
	lastMonthCompetencies: LastMonthCompetency[] = [];

	// View state management
	viewState: 'overview' | 'gender-detail' | 'competency-detail' | 'area-detail' = 'overview';
	selectedGender: string | null = null;
	selectedCompetency: CompetencyDetailData | null = null;
	competencyDetailLoading = false;
	selectedCompetencyArea: CompetencyAreaDetailData | null = null;
	areaDetailLoading = false;

	// For navigation from dashboard overview with area detail data
	initialAreaData: CompetencyAreaClickData | null = null;

	// Gender color mapping
	private genderColors: Record<string, { color: string; borderColor: string }> = {
		male: { color: '#E0F2FE', borderColor: '#3B82F6' },
		female: { color: '#FCE7F3', borderColor: '#EC4899' },
		diverse: { color: '#F3E8FF', borderColor: '#A855F7' },
		noAnswer: { color: '#F3F4F6', borderColor: '#9CA3AF' },
	};

	constructor(
		route: ActivatedRoute,
		router: Router,
		sessionService: SessionService
	) {
		super(router, route, sessionService);

		// Get network slug and optional competencyId from route
		this.networkSlug = this.route.snapshot.params['networkSlug'];
		this.initialCompetencyId = this.route.snapshot.params['competencyId'];

		// Check for router state with area detail data (from dashboard overview click)
		const navigation = this.router.getCurrentNavigation();
		const state = navigation?.extras?.state as { openAreaDetail?: boolean; areaData?: CompetencyAreaClickData };
		if (state?.openAreaDetail && state?.areaData) {
			this.initialAreaData = state.areaData;
		}

		// Initialize breadcrumbs
		this.crumbs = [
			{ title: this.translate.instant('General.networks'), routerLink: ['/issuer/networks'] },
			{
				title: 'Loading...',
				routerLink: ['/issuer/networks', this.networkSlug],
			},
			{
				title: this.translate.instant('Network.Dashboard.competencyTracking.title'),
				routerLink: [],
			},
		];

		// Load network data using networkBySlug (not loadNetwork)
		this.networkLoaded = this.networkManager.networkBySlug(this.networkSlug).then(
			(network) => {
				this.network.set(network);
				// Update breadcrumb with network name
				this.crumbs[1] = {
					title: network.name,
					routerLink: ['/issuer/networks', this.networkSlug],
				};
				this.title.setTitle(this.translate.instant('Dashboard.pageTitle.competencyTracking', { network: network.name }));
			},
			(error) => {
				console.error('[NETWORK-COMPETENCY-TRACKING] Error loading network:', error);
			}
		);
	}

	ngOnInit(): void {
		this.networkLoaded.then(() => {
			if (!this.hasDashboardAccess()) {
				this.router.navigate(['/issuer/networks', this.networkSlug]);
				return;
			}
			this.loadCompetencyData();
		});
	}

	private hasDashboardAccess(): boolean {
		const userRole = this.network()?.current_user_network_role;
		return userRole === 'owner' || userRole === 'creator' || userRole === 'editor';
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	/**
	 * Load all competency data from API
	 */
	private loadCompetencyData(): void {
		this.isLoading = true;

		// Load all data in parallel
		forkJoin({
			competencySkills: this.networkDashboardApi.getCompetencyAreasSkills(this.networkSlug).pipe(
				catchError((error) => {
					console.error('[NETWORK-COMPETENCY-TRACKING] Error loading competency skills:', error);
					return of({ skills: [] });
				})
			),
			strengthenedCompetencies: this.networkDashboardApi.getStrengthenedCompetencies(this.networkSlug, 20).pipe(
				catchError((error) => {
					console.error('[NETWORK-COMPETENCY-TRACKING] Error loading strengthened competencies:', error);
					return of({ competencies: [], metadata: { totalCompetencies: 0, totalHours: 0, lastUpdated: '' } });
				})
			),
			genderData: this.networkDashboardApi.getLearnersGender(this.networkSlug).pipe(
				catchError((error) => {
					console.error('[NETWORK-COMPETENCY-TRACKING] Error loading gender data:', error);
					return of({ distribution: [] });
				})
			),
			recentBadgeAwards: this.networkDashboardApi.getRecentBadgeAwards(this.networkSlug, { days: 30, limit: 100 }).pipe(
				catchError((error) => {
					console.error('[NETWORK-COMPETENCY-TRACKING] Error loading recent badge awards:', error);
					return of({ awards: [] });
				})
			),
			kpis: this.networkDashboardApi.getKpis(this.networkSlug).pipe(
				catchError((error) => {
					console.error('[NETWORK-COMPETENCY-TRACKING] Error loading KPIs:', error);
					return of({ kpis: [] } as NetworkKPIsResponse);
				})
			),
		})
			.pipe(takeUntil(this.destroy$))
			.subscribe({
				next: ({ competencySkills, strengthenedCompetencies, genderData, recentBadgeAwards, kpis }) => {
					// Process competency skills for skill visualisation (ESCO bubbles)
					if (competencySkills?.skills?.length > 0) {
						this.skillVisualisationData = this.transformToApiRootSkills(competencySkills.skills);
					} else {
						this.skillVisualisationData = [];
					}

					// Process strengthened competencies for bar chart
					if (strengthenedCompetencies?.competencies) {
						this.individualCompetencyData = strengthenedCompetencies.competencies;
					}

					// Calculate KPIs from metadata
					const totalHours = strengthenedCompetencies?.metadata?.totalHours || 0;
					const totalCount = strengthenedCompetencies?.metadata?.totalCompetencies || strengthenedCompetencies?.competencies?.length || 0;

					this.totalCompetencyHours.set(totalHours);
					this.totalCompetencies.set(totalCount);

					// Calculate average hours per competency
					if (totalCount > 0 && totalHours > 0) {
						const avgHours = totalHours / totalCount;
						this.averageCompetencyHours.set(Math.round(avgHours * 10) / 10);
					}

					// Process gender data
					if (genderData?.distribution) {
						this.genderDistribution = genderData.distribution;
						this.processGenderData(genderData.distribution);
					}

					// Process recent badge awards to get last month competencies
					if (recentBadgeAwards?.awards) {
						this.processLastMonthCompetencies(recentBadgeAwards.awards);
					}

					// Process KPIs to extract trend data for competency hours
					if (kpis?.kpis?.length > 0) {
						const competencyHoursKpi = kpis.kpis.find((kpi: NetworkKPIData) => kpi.id === 'competency_hours');
						if (competencyHoursKpi && competencyHoursKpi.trend && competencyHoursKpi.trendValue !== undefined) {
							this.competencyHoursTrend.set({
								trend: competencyHoursKpi.trend,
								trendValue: competencyHoursKpi.trendValue,
								trendPeriod: competencyHoursKpi.trendPeriod,
							});
						}
					}

					this.isLoading = false;

					// If we have an initial competencyId from route, open its detail view
					if (this.initialCompetencyId) {
						this.openCompetencyDetailById(this.initialCompetencyId);
					}

					// If we have initial area data from navigation state, open area detail
					if (this.initialAreaData) {
						this.onCompetencyAreaClick(this.initialAreaData);
					}
				},
				error: (error) => {
					console.error('[NETWORK-COMPETENCY-TRACKING] Error loading data:', error);
					this.isLoading = false;
				},
			});
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

	/**
	 * Process gender data for bar chart
	 */
	private processGenderData(distribution: LearnerGenderStatistic[]): void {
		// Load gender competency hours (placeholder - API will provide actual data)
		// For now, we estimate based on distribution ratio
		const totalHours = this.totalCompetencyHours();
		this.genderCompetencyHours = distribution.map((stat) => ({
			gender: stat.gender,
			label: mapGenderTypeToLabel(stat.gender),
			hours: Math.round((stat.percentage / 100) * totalHours),
		}));
	}

	/**
	 * Process recent badge awards to extract competencies from last month
	 */
	private processLastMonthCompetencies(awards: any[]): void {
		// Aggregate competencies from all recent badge awards
		const competencyMap = new Map<string, { name: string; count: number; escoUri?: string }>();

		for (const award of awards) {
			if (award.competencies && Array.isArray(award.competencies)) {
				for (const comp of award.competencies as BadgeCompetencyWithEsco[]) {
					const key = comp.name;
					if (competencyMap.has(key)) {
						const existing = competencyMap.get(key)!;
						existing.count += award.count || 1;
					} else {
						competencyMap.set(key, {
							name: comp.name,
							count: award.count || 1,
							escoUri: comp.escoUri,
						});
					}
				}
			}
		}

		// Convert to array and sort by count
		this.lastMonthCompetencies = Array.from(competencyMap.values())
			.sort((a, b) => b.count - a.count)
			.slice(0, 20);
	}

	/**
	 * Get competency bar items for horizontal bar chart
	 */
	getCompetencyBarItems(): HorizontalBarItem[] {
		return this.individualCompetencyData.map((comp) => ({
			id: comp.competencyId,
			label: comp.title,
			value: comp.hours,
			barDisplayValue: `${comp.hours}h`,
			escoUri: comp.escoUri,
			data: comp,
		}));
	}

	/**
	 * Get maximum competency hours for bar scaling
	 */
	getMaxCompetencyHours(): number {
		if (this.individualCompetencyData.length === 0) return 0;
		return Math.max(...this.individualCompetencyData.map((c) => c.hours));
	}

	/**
	 * Get user's role in the network
	 */
	get role() {
		if (this.network()?.currentUserStaffMember) {
			return this.network().currentUserStaffMember.roleSlug;
		} else {
			return this.network()?.current_user_network_role;
		}
	}

	/**
	 * Navigate back to network dashboard
	 */
	goBack(): void {
		this.router.navigate(['/issuer/networks', this.networkSlug]);
	}

	/**
	 * Handle competency bar click - open competency detail view
	 * Note: ESCO link is handled separately via (E) link click
	 */
	onCompetencyBarClick(item: HorizontalBarItem): void {
		const competencyData = item.data as NetworkStrengthenedCompetencyData;
		if (competencyData) {
			this.openCompetencyDetail(competencyData);
		}
	}

	/**
	 * Open competency detail by ID (used when navigating directly via URL)
	 */
	openCompetencyDetailById(competencyId: string): void {
		// Try to find the competency in already loaded data
		const existingCompetency = this.individualCompetencyData.find(
			(c) => c.competencyId === competencyId
		);

		if (existingCompetency) {
			// Use existing data to open detail
			this.openCompetencyDetail(existingCompetency);
		} else {
			// Competency not in loaded list, create minimal object and let API fill details
			const minimalCompetency: NetworkStrengthenedCompetencyData = {
				competencyId: competencyId,
				title: '',
				hours: 0,
			};
			this.openCompetencyDetail(minimalCompetency);
		}
	}

	/**
	 * Open competency detail view
	 * Fetches real data from the API
	 */
	openCompetencyDetail(competency: NetworkStrengthenedCompetencyData): void {
		const networkSlug = this.network()?.slug || this.networkSlug;
		if (!networkSlug) {
			console.error('[NetworkCompetencyTracking] No network slug available');
			return;
		}

		this.competencyDetailLoading = true;

		// Fetch real competency details from API
		this.networkDashboardApi.getCompetencyDetail(
			networkSlug,
			competency.competencyId
		).pipe(
			takeUntil(this.destroy$),
			catchError((error) => {
				console.error('[NetworkCompetencyTracking] Failed to load competency details:', error);
				this.competencyDetailLoading = false;
				return of(null);
			})
		).subscribe((response: NetworkCompetencyDetailResponse | null) => {
			if (response) {
				// Map API response to component's CompetencyDetailData format
				const detailData: CompetencyDetailData = {
					competencyId: response.competencyId,
					title: response.title,
					hours: response.hours,
					badgeCount: response.badgeCount,
					userCount: response.userCount,
					institutionCount: response.institutionCount,
					escoUri: response.escoUri,
					institutions: this.mapInstitutionsFromApi(response.institutions),
				};

				this.selectedCompetency = detailData;
				this.viewState = 'competency-detail';
			}
			this.competencyDetailLoading = false;
		});
	}

	/**
	 * Map institutions from API response to component format
	 */
	private mapInstitutionsFromApi(apiInstitutions: NetworkCompetencyInstitution[]): CompetencyInstitution[] {
		const apiBaseUrl = this.configService.apiConfig.baseUrl;
		// Remove trailing slash from base URL if present
		const cleanBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;

		return apiInstitutions.map((inst) => ({
			id: inst.institutionId,
			name: inst.name,
			// Convert relative image path to absolute URL
			image: inst.logoUrl ? this.buildImageUrl(cleanBaseUrl, inst.logoUrl) : undefined,
			badgeCount: inst.badgeCount,
			userCount: inst.userCount,
			issuerId: inst.institutionId,
			slug: inst.slug,
		}));
	}

	/**
	 * Build full image URL from base URL and relative path
	 */
	private buildImageUrl(baseUrl: string, relativePath: string): string {
		// If the path is already a full URL, return as-is
		if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
			return relativePath;
		}
		// Ensure path starts with /
		const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
		return `${baseUrl}${cleanPath}`;
	}

	/**
	 * Handle back from competency detail view
	 * If user came directly via URL (initialCompetencyId), navigate back in history
	 * Otherwise just switch back to overview state
	 */
	onBackFromCompetencyDetail(): void {
		if (this.initialCompetencyId) {
			// User came directly via URL - use browser history to go back
			window.history.back();
		} else {
			// User clicked from within the component - just switch view state
			this.viewState = 'overview';
			this.selectedCompetency = null;
		}
	}

	/**
	 * Get max institution badge count for bar scaling
	 */
	getMaxInstitutionBadgeCount(): number {
		if (!this.selectedCompetency?.institutions?.length) return 0;
		return Math.max(...this.selectedCompetency.institutions.map(i => i.badgeCount));
	}

	/**
	 * Get gender bar items for horizontal bar chart
	 */
	getGenderBarItems(): HorizontalBarItem[] {
		return this.genderCompetencyHours.map((item) => ({
			id: item.gender,
			label: item.label,
			value: item.hours,
			barDisplayValue: `${item.hours}h`,
			data: { gender: item.gender },
		}));
	}

	/**
	 * Handle click on gender bar - navigate to gender detail view
	 */
	onGenderBarClick(item: HorizontalBarItem): void {
		const gender = item.data?.gender || item.id;
		if (gender) {
			this.selectedGender = gender;
			this.viewState = 'gender-detail';
		}
	}

	/**
	 * Handle back from gender detail view
	 */
	onBackFromGenderDetail(): void {
		this.viewState = 'overview';
		this.selectedGender = null;
	}

	/**
	 * Handle click on competency area bubble in skill visualisation
	 * Fetches aggregated statistics for the clicked area from the backend
	 */
	onCompetencyAreaClick(areaData: CompetencyAreaClickData): void {
		const networkSlug = this.network()?.slug || this.networkSlug;
		if (!networkSlug) {
			console.error('[NetworkCompetencyTracking] No network slug available');
			return;
		}

		// Don't proceed if there are no competency URIs
		if (!areaData.competencyUris || areaData.competencyUris.length === 0) {
			console.warn('[NetworkCompetencyTracking] No competency URIs for area:', areaData.areaName);
			return;
		}

		this.areaDetailLoading = true;

		// Build the POST request body
		const request: CompetencyAreaDetailRequest = {
			areaName: areaData.areaName,
			areaConceptUri: areaData.areaConceptUri,
			competencyUris: areaData.competencyUris,
			topCompetenciesLimit: 10,
			institutionLimit: 10,
		};

		this.networkDashboardApi.getCompetencyAreaDetail(networkSlug, request).pipe(
			takeUntil(this.destroy$),
			catchError((error) => {
				console.error('[NetworkCompetencyTracking] Failed to load competency area details:', error);
				this.areaDetailLoading = false;
				return of(null);
			})
		).subscribe((response: CompetencyAreaDetailResponse | null) => {
			if (response) {
				// Map API response to component format
				const detailData: CompetencyAreaDetailData = {
					areaName: response.areaName,
					areaConceptUri: response.areaConceptUri,
					totalHours: response.totalHours,
					totalCompetencies: response.totalCompetencies,
					matchedCompetencies: response.matchedCompetencies,
					badgeCount: response.badgeCount,
					userCount: response.userCount,
					institutionCount: response.institutionCount,
					topCompetencies: response.topCompetencies,
					institutions: this.mapInstitutionsFromApi(response.institutions),
				};

				this.selectedCompetencyArea = detailData;
				this.viewState = 'area-detail';
			}
			this.areaDetailLoading = false;
		});
	}

	/**
	 * Handle back from competency area detail view
	 * If user came from dashboard overview (initialAreaData), navigate back in history
	 * Otherwise just switch back to overview state
	 */
	onBackFromAreaDetail(): void {
		if (this.initialAreaData) {
			// User came from dashboard overview - use browser history to go back
			window.history.back();
		} else {
			// User clicked from within the component - just switch view state
			this.viewState = 'overview';
			this.selectedCompetencyArea = null;
		}
	}

	/**
	 * Handle click on a top competency within the area detail view
	 * Opens the individual competency detail
	 */
	onTopCompetencyClick(competency: CompetencyAreaTopCompetency): void {
		const minimalCompetency: NetworkStrengthenedCompetencyData = {
			competencyId: competency.competencyId,
			title: competency.title,
			hours: competency.hours,
			escoUri: competency.escoUri,
		};
		this.openCompetencyDetail(minimalCompetency);
	}

	/**
	 * Get bar items for area top competencies (for horizontal bar chart)
	 */
	getAreaTopCompetencyBarItems(): HorizontalBarItem[] {
		if (!this.selectedCompetencyArea?.topCompetencies) return [];
		return this.selectedCompetencyArea.topCompetencies.map((comp) => ({
			id: comp.competencyId,
			label: comp.title,
			value: comp.hours,
			barDisplayValue: `${comp.hours}h`,
			escoUri: comp.escoUri,
			data: comp,
		}));
	}

	/**
	 * Handle click on area top competency bar item
	 */
	onAreaTopCompetencyBarClick(item: HorizontalBarItem): void {
		const competency = item.data as CompetencyAreaTopCompetency;
		if (competency) {
			this.onTopCompetencyClick(competency);
		}
	}

	/**
	 * Get translated gender label from raw type
	 */
	getGenderLabel(genderType: string): string {
		return mapGenderTypeToLabel(genderType);
	}

	/**
	 * Get bar width for last month competency
	 */
	getLastMonthCompetencyBarWidth(count: number): number {
		const maxCount = Math.max(...this.lastMonthCompetencies.map((c) => c.count));
		if (maxCount === 0) return 0;
		return (count / maxCount) * 100;
	}

	/**
	 * Get font size for competency name based on length
	 */
	getCompetencyFontSize(name: string): number {
		if (name.length > 50) return 12;
		if (name.length > 30) return 13;
		return 14;
	}
}
