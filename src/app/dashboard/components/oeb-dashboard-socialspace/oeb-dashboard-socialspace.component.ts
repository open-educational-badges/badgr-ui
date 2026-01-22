import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NetworkDashboardApiService } from '../../services/network-dashboard-api.service';
import { AppConfigService } from '../../../common/app-config.service';
import { IssuerManager } from '../../../issuer/services/issuer-manager.service';
import {
	SocialspaceInstitution,
	SocialspaceCityDetailResponse,
	SocialspaceLearnersResponse,
	SocialspaceCompetenciesResponse,
	SocialspaceTopInstitution,
	SocialspaceCityEntry,
	BadgeTypeStatsExtended,
} from '../../models/network-dashboard-api.model';
import { ZipCodeMapComponent } from '../zip-code-map/zip-code-map.component';
import { InstitutionsTableComponent, InstitutionTableData } from '../institutions-table/institutions-table.component';
import { HorizontalBarChartComponent, HorizontalBarItem } from '../horizontal-bar-chart/horizontal-bar-chart.component';
import { DashboardTopBadgesComponent, Top3Badge } from '../dashboard-stats-bar/dashboard-top-badges.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAward, lucideSchool, lucideUserStar, lucideClock, lucideClockFading } from '@ng-icons/lucide';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { BadgeDistributionPieChartComponent, PieChartSegment } from '../badge-distribution-pie-chart/badge-distribution-pie-chart.component';
import { InfoIcon } from '../../../common/components/info-icon.component';

export interface Institution {
	id: number;
	name: string;
	type: string;
	address: string;
	zipCode: string;
	city?: string;
	badgesIssued: number;
	activeUsers: number;
	joinedDate: string;
	isNew?: boolean;
	image?: string;
}

/** View state for socialspace component */
export type SocialspaceViewState = 'overview' | 'city-detail' | 'city-learner-detail' | 'city-competency-detail';

@Component({
	selector: 'app-oeb-dashboard-socialspace',
	standalone: true,
	imports: [
		CommonModule,
		TranslateModule,
		ZipCodeMapComponent,
		InstitutionsTableComponent,
		HorizontalBarChartComponent,
		DashboardTopBadgesComponent,
		NgIcon,
		OebButtonComponent,
		BadgeDistributionPieChartComponent,
		InfoIcon,
	],
	providers: [provideIcons({ lucideAward, lucideSchool, lucideUserStar, lucideClock, lucideClockFading })],
	templateUrl: './oeb-dashboard-socialspace.component.html',
	styleUrls: ['./oeb-dashboard-socialspace.component.scss']
})
export class OebDashboardSocialspaceComponent implements OnInit, OnDestroy {
	private destroy$ = new Subject<void>();

	/** Network slug for API calls */
	@Input() networkSlug: string = '';

	/** Emit view state changes to parent for hiding tabs */
	@Output() viewStateChange = new EventEmitter<{ state: SocialspaceViewState; city?: string }>();

	institutions: SocialspaceInstitution[] = [];
	institutionsTableData: InstitutionTableData[] = [];
	loading = false;

	totalInstitutions = 0;
	newInstitutionsCount = 0;

	citiesData = signal<SocialspaceCityEntry[]>([]);

	selectedCity = signal<string | null>(null);
	cityDetailData = signal<SocialspaceCityDetailResponse | null>(null);
	cityLearnersData = signal<SocialspaceLearnersResponse | null>(null);
	cityCompetenciesData = signal<SocialspaceCompetenciesResponse | null>(null);
	detailLoading = signal<boolean>(false);

	top3Institutions = signal<Top3Badge[]>([]);
	additionalInstitutions = signal<SocialspaceTopInstitution[]>([]);

	showCompetencyDetail = signal<boolean>(false);

	showLearnerDetail = signal<boolean>(false);

	/** User's issuers for checking membership */
	private userIssuerSlugs: Set<string> = new Set();

	constructor(
		private networkDashboardApi: NetworkDashboardApiService,
		private configService: AppConfigService,
		private router: Router,
		private translate: TranslateService,
		private issuerManager: IssuerManager,
	) {}

	ngOnInit(): void {
		// Load user's issuers to check membership for institution clicks
		this.issuerManager.myIssuers$
			.pipe(takeUntil(this.destroy$))
			.subscribe(issuers => {
				this.userIssuerSlugs = new Set(issuers.map(i => i.slug));
			});

		this.loadInstitutions();
		this.loadCities();
	}

	/**
	 * Handle click on institution in the ranking - navigate to institution page
	 * If user is a member of the institution, show member view; otherwise show public view
	 */
	onInstitutionRankingClick(item: Top3Badge): void {
		if (item.id) {
			// Check if user is a member of this institution
			if (this.userIssuerSlugs.has(item.id)) {
				// User is a member - navigate to member view
				this.router.navigate(['/issuer/issuers', item.id]);
			} else {
				// User is not a member - navigate to public view
				this.router.navigate(['/public/issuers', item.id]);
			}
		}
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	private loadInstitutions(): void {
		if (!this.networkSlug) {
			console.warn('[SOCIALSPACE] No networkSlug provided');
			return;
		}

		this.loading = true;

		this.networkDashboardApi.getSocialspaceInstitutions(this.networkSlug).pipe(
			takeUntil(this.destroy$)
		).subscribe({
			next: (response) => {
				this.institutions = response.institutions;
				this.totalInstitutions = response.summary.total;
				this.newInstitutionsCount = response.summary.newThisMonth;

				this.institutionsTableData = response.institutions.map(inst => ({
					id: inst.id,
					name: inst.name,
					type: inst.type,
					image: this.fixImageUrl(inst.image),
					city: inst.city,
					badgesIssued: inst.badgesIssued,
					activeUsers: inst.activeUsers || 0,
					joinedDate: inst.joinedDate || '',
					issuerId: inst.issuerId
				}));

				this.loading = false;
			},
			error: (error) => {
				console.error('[SOCIALSPACE] Error loading institutions:', error);
				this.loading = false;
			}
		});
	}

	/**
	 * Load cities from API for the grid/map display
	 */
	private loadCities(): void {
		if (!this.networkSlug) {
			console.warn('[SOCIALSPACE] No networkSlug provided for cities');
			return;
		}

		this.networkDashboardApi.getSocialspaceCities(this.networkSlug).pipe(
			takeUntil(this.destroy$)
		).subscribe({
			next: (response) => {
				this.citiesData.set(response.cities);
			},
			error: (error) => {
				console.error('[SOCIALSPACE] Error loading cities:', error);
			}
		});
	}

	/**
	 * Format date for display
	 */
	formatDate(dateString: string): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	/**
	 * Fix image URL - prepend API base URL if the image URL is relative
	 */
	private fixImageUrl(imageUrl: string | null | undefined): string | undefined {
		if (!imageUrl) return undefined;

		if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
			return imageUrl;
		}

		const baseUrl = this.configService.apiConfig.baseUrl;

		const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

		const cleanImageUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;

		return `${cleanBaseUrl}${cleanImageUrl}`;
	}

	/**
	 * Handle city selection - show detail inline within this component
	 */
	onCityClick(city: string): void {
		this.selectedCity.set(city);
		this.loadCityData(city);
		this.viewStateChange.emit({ state: 'city-detail', city });
	}

	/**
	 * Handle ZIP Code region click - for backwards compatibility, maps to city
	 */
	onZipCodeRegionClick(zipCode: string): void {
		// For now, treat ZIP code click as city click
		// The backend will handle the mapping
		this.onCityClick(zipCode);
	}

	/**
	 * Go back to the overview (hide detail view)
	 */
	goBackToOverview(): void {
		if (this.showCompetencyDetail()) {
			this.showCompetencyDetail.set(false);
			this.viewStateChange.emit({ state: 'city-detail', city: this.selectedCity() || undefined });
			return;
		}
		if (this.showLearnerDetail()) {
			this.showLearnerDetail.set(false);
			this.viewStateChange.emit({ state: 'city-detail', city: this.selectedCity() || undefined });
			return;
		}
		this.selectedCity.set(null);
		this.cityDetailData.set(null);
		this.cityLearnersData.set(null);
		this.cityCompetenciesData.set(null);
		this.top3Institutions.set([]);
		this.additionalInstitutions.set([]);
		this.viewStateChange.emit({ state: 'overview' });
	}

	/**
	 * Navigate to competency detail view
	 */
	navigateToCompetencyDetail(): void {
		this.showCompetencyDetail.set(true);
		this.viewStateChange.emit({ state: 'city-competency-detail', city: this.selectedCity() || undefined });
	}

	/**
	 * Go back from competency detail to city detail
	 */
	goBackFromCompetencyDetail(): void {
		this.showCompetencyDetail.set(false);
		this.viewStateChange.emit({ state: 'city-detail', city: this.selectedCity() || undefined });
	}

	/**
	 * Navigate to learner detail view
	 */
	navigateToLearnerDetail(): void {
		this.showLearnerDetail.set(true);
		this.viewStateChange.emit({ state: 'city-learner-detail', city: this.selectedCity() || undefined });
	}

	/**
	 * Go back from learner detail to city detail
	 */
	goBackFromLearnerDetail(): void {
		this.showLearnerDetail.set(false);
		this.viewStateChange.emit({ state: 'city-detail', city: this.selectedCity() || undefined });
	}

	/**
	 * Go back from any detail view to overview (called by parent component)
	 */
	onBackFromDetailView(): void {
		this.goBackToOverview();
	}

	/**
	 * Load city detail data from API
	 */
	private loadCityData(city: string): void {
		if (!this.networkSlug) {
			console.warn('[SOCIALSPACE] No networkSlug provided');
			return;
		}

		this.detailLoading.set(true);

		this.networkDashboardApi.getSocialspaceCityDetail(this.networkSlug, city).pipe(
			takeUntil(this.destroy$)
		).subscribe({
			next: (data) => {
				this.cityDetailData.set(data);

				// Transform top institutions to podium format
				if (data.topInstitutions && data.topInstitutions.length > 0) {
					const top3 = data.topInstitutions.slice(0, 3).map((inst, index) => ({
						rank: (index + 1) as 1 | 2 | 3,
						name: inst.name,
						count: inst.badgeCount,
						color: index === 0 ? '#FFCF0F' : index === 1 ? '#DEDEDE' : '#DEB200',
						image: this.fixImageUrl(inst.image) || null,
						id: inst.issuerId || undefined,
					}));
					this.top3Institutions.set(top3);

					if (data.topInstitutions.length > 3) {
						const additionalWithFixedImages = data.topInstitutions.slice(3).map(inst => ({
							...inst,
							image: this.fixImageUrl(inst.image)
						}));
						this.additionalInstitutions.set(additionalWithFixedImages);
					}
				}
			},
			error: (error) => {
				console.error('[SOCIALSPACE] Error loading city detail:', error);
			}
		});

		this.networkDashboardApi.getSocialspaceLearners(this.networkSlug, city).pipe(
			takeUntil(this.destroy$)
		).subscribe({
			next: (data) => {
				this.cityLearnersData.set(data);
			},
			error: (error) => {
				console.error('[SOCIALSPACE] Error loading learners data:', error);
			}
		});

		this.networkDashboardApi.getSocialspaceCompetencies(this.networkSlug, city).pipe(
			takeUntil(this.destroy$)
		).subscribe({
			next: (data) => {
				this.cityCompetenciesData.set(data);
				this.detailLoading.set(false);
			},
			error: (error) => {
				console.error('[SOCIALSPACE] Error loading competencies:', error);
				this.detailLoading.set(false);
			}
		});
	}

	/**
	 * Get badge type distribution as horizontal bar items
	 */
	getBadgeTypeBarItems(): HorizontalBarItem[] {
		const data = this.cityDetailData();
		if (!data || !data.badgesByType) return [];

		return [
			{
				label: this.translate.instant('Dashboard.zipCodeDetail.participation'),
				value: data.badgesByType.participation,
			},
			{
				label: this.translate.instant('Dashboard.zipCodeDetail.competency'),
				value: data.badgesByType.competency,
			},
			{
				label: this.translate.instant('Dashboard.zipCodeDetail.learningPath'),
				value: data.badgesByType.learningpath,
			},
		];
	}

	/**
	 * Get strengthened competencies as horizontal bar items
	 */
	getStrengthenedCompetencyBarItems(): HorizontalBarItem[] {
		const competencies = this.cityCompetenciesData();
		if (!competencies || !competencies.competencies) return [];

		return competencies.competencies.map((comp) => {
			let label = comp.name || '';
			if (!label && comp.competencyKey) {
				label = this.translate.instant('Dashboard.' + comp.competencyKey);
			}
			if (!label) {
				label = 'Unbekannte Kompetenz';
			}

			return {
				label: label,
				value: comp.hours,
				barDisplayValue: `${comp.hours}h`,
				escoUri: comp.escoUri,
			};
		});
	}

	/**
	 * Get total competency hours from the competencies API endpoint
	 */
	getTotalCompetencyHours(): number {
		const competenciesData = this.cityCompetenciesData();
		if (!competenciesData) return 0;
		return competenciesData.totalCompetencyHours || 0;
	}

	/**
	 * Get gender distribution as horizontal bar items
	 */
	getGenderDistributionBarItems(): HorizontalBarItem[] {
		const data = this.cityLearnersData();
		if (!data || !data.genderDistribution) return [];

		return data.genderDistribution.map((gender) => {
			let label = gender.gender;
			if (gender.gender === 'male') {
				label = this.translate.instant('Dashboard.zipCodeDetail.male');
			} else if (gender.gender === 'female') {
				label = this.translate.instant('Dashboard.zipCodeDetail.female');
			} else if (gender.gender === 'diverse' || gender.gender === 'noAnswer') {
				label = this.translate.instant('Dashboard.zipCodeDetail.noAnswer');
			}

			return {
				id: gender.gender,
				label: label,
				value: gender.percentage,
				barDisplayValue: `${gender.percentage.toFixed(1)}%`,
				afterBarText: `${gender.count} ${this.translate.instant('Dashboard.unit.learners')}`,
			};
		});
	}

	/**
	 * Get learner residence distribution as horizontal bar items
	 */
	getLearnerResidenceBarItems(): HorizontalBarItem[] {
		const data = this.cityLearnersData();
		if (!data || !data.residenceDistribution) return [];

		return data.residenceDistribution.map((residence) => {
			let label = residence.district;
			if (residence.district?.toLowerCase() === 'other' || residence.isOtherCategory) {
				label = this.translate.instant('Dashboard.zipCodeDetail.learnerResidence.otherResidences');
			}

			return {
				id: residence.district,
				label: label,
				value: residence.percentage,
				barDisplayValue: `${residence.percentage.toFixed(1)}%`,
				afterBarText: `${residence.learnerCount} ${this.translate.instant('Dashboard.zipCodeDetail.learnerResidence.learners')}`,
				data: residence,
			};
		});
	}

	private readonly SEGMENT_GAP = 4;

	/**
	 * Get badge type statistics for pie chart from city data
	 */
	getBadgeTypeStatsForPieChart(): BadgeTypeStatsExtended[] {
		const data = this.cityDetailData();
		if (!data || !data.badgesByType) return [];

		const total = (data.badgesByType.participation || 0) +
			(data.badgesByType.competency || 0) +
			(data.badgesByType.learningpath || 0);

		if (total === 0) return [];

		return [
			{
				type: 'participation' as const,
				label: this.translate.instant('Dashboard.zipCodeDetail.participationBadges'),
				count: data.badgesByType.participation || 0,
				percentage: Math.round(((data.badgesByType.participation || 0) / total) * 100 * 10) / 10,
				color: '#E4FFE4',
				borderColor: '#93F993'
			},
			{
				type: 'competency' as const,
				label: this.translate.instant('Dashboard.zipCodeDetail.competencyBadges'),
				count: data.badgesByType.competency || 0,
				percentage: Math.round(((data.badgesByType.competency || 0) / total) * 100 * 10) / 10,
				color: '#F1F0FF',
				borderColor: '#CCD7FF'
			},
			{
				type: 'learningpath' as const,
				label: this.translate.instant('Dashboard.zipCodeDetail.learningPathBadges'),
				count: data.badgesByType.learningpath || 0,
				percentage: Math.round(((data.badgesByType.learningpath || 0) / total) * 100 * 10) / 10,
				color: '#FFEAEA',
				borderColor: '#FFBAB9'
			}
		].filter(stat => stat.count > 0);
	}

	/**
	 * Get total badges count for pie chart center
	 */
	getTotalBadgesForPieChart(): number {
		const data = this.cityDetailData();
		if (!data || !data.badgesByType) return 0;
		return (data.badgesByType.participation || 0) +
			(data.badgesByType.competency || 0) +
			(data.badgesByType.learningpath || 0);
	}

	/**
	 * Convert badge type stats to PieChartSegment[] for the new pie chart component
	 */
	getBadgeTypePieChartSegments(): PieChartSegment[] {
		return this.getBadgeTypeStatsForPieChart().map(stat => ({
			id: stat.type,
			label: stat.label,
			count: stat.count,
			percentage: stat.percentage,
			color: stat.color,
			borderColor: stat.borderColor,
		}));
	}

	/**
	 * Calculate stroke-dasharray with gap between segments
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
	 */
	getStrokeDashoffsetWithGap(index: number, radius: number = 128.5): number {
		const stats = this.getBadgeTypeStatsForPieChart();
		const circumference = 2 * Math.PI * radius;
		let offset = 0;
		for (let i = 0; i < index; i++) {
			offset += (stats[i].percentage / 100) * circumference;
		}
		return -(offset + this.SEGMENT_GAP / 2);
	}

	/**
	 * Calculate coordinates for radial lines at segment boundaries
	 */
	getRadialLineCoord(index: number, radius: number, coord: 'x' | 'y', isEnd: boolean = false): number {
		const stats = this.getBadgeTypeStatsForPieChart();
		const centerX = 153.5;
		const centerY = 153.5;

		let anglePercent = 0;
		for (let i = 0; i < index; i++) {
			anglePercent += stats[i].percentage;
		}
		if (isEnd) {
			anglePercent += stats[index].percentage;
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
	 * Get postal data for backwards compatibility with template
	 * Maps cityDetailData to the expected postalData structure
	 */
	get postalData() {
		return this.cityDetailData;
	}

	/**
	 * Get selected postal code for backwards compatibility with template
	 */
	get selectedPostalCode() {
		return this.selectedCity;
	}

	/**
	 * Get strengthened competencies for backwards compatibility with template
	 * Maps cityCompetenciesData to the expected zipCodeStrengthenedCompetencies structure
	 */
	get zipCodeStrengthenedCompetencies() {
		return this.cityCompetenciesData;
	}

	/**
	 * Get learners data for backwards compatibility with template
	 */
	get learnersData() {
		return this.cityLearnersData;
	}
}
