import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClockFading } from '@ng-icons/lucide';
import { Subject, of, forkJoin } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { DashboardTopBadgesComponent, Top3Badge } from '../dashboard-stats-bar/dashboard-top-badges.component';
import { HorizontalBarChartComponent, HorizontalBarItem } from '../horizontal-bar-chart/horizontal-bar-chart.component';
import { NetworkDashboardApiService } from '../../services/network-dashboard-api.service';
import {
	getCompetencyAreaDisplayConfig,
	GenderType,
	mapGenderLabelToType,
	GenderIndividualCompetency,
	GenderTopBadge,
	NetworkCompetencyAreaData,
	ESCORootSkill,
} from '../../models/network-dashboard-api.model';
import {
	RecipientSkillVisualisationComponent,
	CompetencyAreaClickData,
} from '../../../recipient/components/recipient-skill-visualisation/recipient-skill-visualisation.component';
import { ApiRootSkill } from '../../../common/model/ai-skills.model';

/**
 * Competency Area Data
 */
export interface CompetencyAreaData {
	name: string;
	value: number;
	weight: number;
	color: string;
	icon?: string;
}

/**
 * Individual Competency Data
 */
export interface IndividualCompetencyData {
	name: string;
	count: number;
	hours: number;
	escoUri?: string;
}

/**
 * Badge Data for Top Badges
 */
export interface TopBadgeData {
	badgeId: string;
	name: string;
	count: number;
	hours: number;
	image?: string;
}

/**
 * Gender Detail Data - Full competency analysis for a gender
 */
export interface GenderCompetencyData {
	gender: string;
	totalBadges: number;
	topKompetenzbereiche: CompetencyAreaData[];
	topEinzelkompetenzen: IndividualCompetencyData[];
	topBadges: TopBadgeData[];
}

@Component({
	selector: 'app-gender-competency-analysis',
	standalone: true,
	imports: [
		CommonModule,
		TranslateModule,
		NgIcon,
		DashboardTopBadgesComponent,
		RouterLink,
		RecipientSkillVisualisationComponent,
		HorizontalBarChartComponent,
	],
	providers: [provideIcons({ lucideClockFading })],
	templateUrl: './gender-competency-analysis.component.html',
	styleUrls: ['./gender-competency-analysis.component.scss'],
})
export class GenderCompetencyAnalysisComponent implements OnInit, OnDestroy {
	private destroy$ = new Subject<void>();

	/** Gender type to display */
	@Input() gender: string = '';

	/** Network slug for API calls */
	@Input() networkSlug: string = '';

	/** Event emitted when back button is clicked */
	@Output() back = new EventEmitter<void>();

	/** Event emitted when a competency area bubble is clicked */
	@Output() areaClick = new EventEmitter<CompetencyAreaClickData>();

	/** Loading state */
	loading = true;

	/** Gender competency data */
	data: GenderCompetencyData | null = null;

	/** Skill visualisation data - ESCO-compatible skills for the force-directed graph */
	skillVisualisationData: ApiRootSkill[] = [];

	/** Top 3 badges for podium display */
	top3BadgesForDisplay: Top3Badge[] = [];

	/** Additional badges beyond top 3 (for list display below podium) */
	additionalBadges: TopBadgeData[] = [];

	constructor(private networkDashboardApi: NetworkDashboardApiService) {}

	ngOnInit(): void {
		this.loadGenderData();
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	/**
	 * Load gender competency data from API
	 * Falls back to mock data if API fails or networkSlug not provided
	 */
	private loadGenderData(): void {
		this.loading = true;

		if (!this.networkSlug) {
			console.warn('[GENDER-ANALYSIS] No networkSlug provided');
			this.setFallbackData();
			return;
		}

		// Load from gender detail API AND competency areas skills API in parallel
		const genderType = mapGenderLabelToType(this.gender);

		forkJoin({
			genderDetail: this.networkDashboardApi
				.getLearnersGenderDetail(
					this.networkSlug,
					this.gender as GenderType,
					5, // competencyLimit only, no badgeLimit
				)
				.pipe(
					catchError((error) => {
						console.warn('[GENDER-ANALYSIS] Gender detail API failed:', error);
						return of(null);
					}),
				),
			competencySkills: this.networkDashboardApi
				.getCompetencyAreasSkills(this.networkSlug, { gender: genderType })
				.pipe(
					catchError((error) => {
						console.warn('[GENDER-ANALYSIS] Competency areas skills API failed:', error);
						return of(null);
					}),
				),
		})
			.pipe(takeUntil(this.destroy$))
			.subscribe({
				next: ({ genderDetail, competencySkills }) => {
					if (!genderDetail) {
						console.warn('[GENDER-ANALYSIS] No gender detail data available');
						this.setFallbackData();
						return;
					}

					console.log('[GENDER-ANALYSIS] Data loaded from API:', genderDetail);
					console.log('[GENDER-ANALYSIS] Skills data loaded:', competencySkills);

					// Transform API data to component format
					// Note: API uses topCompetencyAreas and topStrengthenedCompetencies
					const transformedKompetenzbereiche = this.transformCompetencyAreas(genderDetail.topCompetencyAreas);
					const transformedEinzelkompetenzen = this.transformIndividualCompetencies(
						genderDetail.topStrengthenedCompetencies,
					);
					const transformedBadges = this.transformTopBadges(genderDetail.topBadges);

					// Transform ESCO skills data for skill visualisation
					if (competencySkills?.skills?.length > 0) {
						this.skillVisualisationData = this.transformToApiRootSkills(competencySkills.skills);
						console.log('[GENDER-ANALYSIS] Skill visualisation data:', this.skillVisualisationData);
					} else {
						this.skillVisualisationData = [];
					}

					this.data = {
						gender: this.gender, // Use i18n label from parent component
						totalBadges: genderDetail.metadata.totalBadges,
						topKompetenzbereiche: transformedKompetenzbereiche,
						topEinzelkompetenzen: transformedEinzelkompetenzen,
						topBadges: transformedBadges,
					};

					// Transform top badges for podium display (top 3 only)
					this.top3BadgesForDisplay = this.transformToTop3Badges(transformedBadges);
					// Store additional badges beyond top 3 for list display
					this.additionalBadges = transformedBadges.slice(3);

					this.loading = false;
					console.log('[GENDER-ANALYSIS] Data transformed:', this.data);
				},
				error: (error) => {
					console.error('[GENDER-ANALYSIS] Error in subscription:', error);
					this.setFallbackData();
				},
			});
	}

	/**
	 * Transform ESCORootSkill array to ApiRootSkill array for skill visualisation component
	 */
	private transformToApiRootSkills(skills: ESCORootSkill[]): ApiRootSkill[] {
		return skills.map((skill) => ({
			preferred_label: skill.preferred_label,
			alt_labels: skill.alt_labels,
			description: skill.description,
			concept_uri: skill.concept_uri,
			type: skill.type,
			reuse_level: skill.reuse_level || '',
			studyLoad: skill.studyLoad,
			breadcrumb_paths: skill.breadcrumb_paths as [any[]],
		}));
	}

	/**
	 * Transform competency areas from API format
	 */
	private transformCompetencyAreas(areas: NetworkCompetencyAreaData[]): CompetencyAreaData[] {
		return areas.map((item) => {
			const displayConfig = getCompetencyAreaDisplayConfig(item.id);
			return {
				name: item.name,
				value: item.value,
				weight: item.weight,
				color: displayConfig.color,
				icon: displayConfig.icon,
			};
		});
	}

	/**
	 * Transform individual competencies from API format
	 */
	private transformIndividualCompetencies(competencies: GenderIndividualCompetency[]): IndividualCompetencyData[] {
		return competencies.map((comp) => ({
			name: comp.name,
			count: comp.count,
			hours: comp.hours,
			escoUri: comp.escoUri,
		}));
	}

	/**
	 * Transform top badges from API format
	 */
	private transformTopBadges(badges: GenderTopBadge[]): TopBadgeData[] {
		return badges.map((badge) => ({
			badgeId: badge.badgeId,
			name: badge.name,
			count: badge.count,
			hours: badge.hours || 0,
			image: badge.image,
		}));
	}

	/**
	 * Load data fallback (no data available - removed mock service)
	 */
	private loadMockData(): void {
		this.setFallbackData();
	}

	/**
	 * Calculate total badges from competency weights
	 */
	private calculateTotalBadges(kompetenzbereiche: CompetencyAreaData[]): number {
		return kompetenzbereiche.reduce((sum, k) => sum + k.weight, 0);
	}

	/**
	 * Get mock Einzelkompetenzen data
	 */
	private getMockEinzelkompetenzen(): IndividualCompetencyData[] {
		const mockDataByGender: { [key: string]: IndividualCompetencyData[] } = {
			Männlich: [
				{ name: 'Web Development', count: 52, hours: 208 },
				{ name: 'Project Management', count: 38, hours: 152 },
				{ name: 'Data Analytics', count: 31, hours: 124 },
				{ name: 'Leadership', count: 27, hours: 108 },
				{ name: 'Communication Skills', count: 24, hours: 96 },
			],
			Weiblich: [
				{ name: 'Digital Marketing', count: 64, hours: 256 },
				{ name: 'Communication Skills', count: 47, hours: 188 },
				{ name: 'Leadership', count: 35, hours: 140 },
				{ name: 'Teamwork', count: 29, hours: 116 },
				{ name: 'Project Management', count: 25, hours: 100 },
			],
		};
		return mockDataByGender[this.gender] || mockDataByGender['Männlich'];
	}

	/**
	 * Get mock Top Badges data
	 */
	private getMockTopBadges(): TopBadgeData[] {
		const mockDataByGender: { [key: string]: TopBadgeData[] } = {
			Männlich: [
				{ badgeId: 'mock-badge-1', name: 'Full Stack Developer', count: 45, hours: 180 },
				{ badgeId: 'mock-badge-2', name: 'Agile Practitioner', count: 32, hours: 128 },
				{ badgeId: 'mock-badge-3', name: 'Data Scientist', count: 28, hours: 112 },
				{ badgeId: 'mock-badge-4', name: 'Technical Lead', count: 22, hours: 88 },
			],
			Weiblich: [
				{ badgeId: 'mock-badge-5', name: 'Digital Marketing Expert', count: 58, hours: 232 },
				{ badgeId: 'mock-badge-6', name: 'Team Leader', count: 41, hours: 164 },
				{ badgeId: 'mock-badge-7', name: 'Language Specialist', count: 36, hours: 144 },
				{ badgeId: 'mock-badge-8', name: 'Communication Pro', count: 30, hours: 120 },
			],
		};
		return mockDataByGender[this.gender] || mockDataByGender['Männlich'];
	}

	/**
	 * Set fallback data in case of errors
	 */
	private setFallbackData(): void {
		this.data = {
			gender: this.gender,
			totalBadges: 0,
			topKompetenzbereiche: [],
			topEinzelkompetenzen: [],
			topBadges: [],
		};
		this.top3BadgesForDisplay = [];
		this.additionalBadges = [];
		this.loading = false;
	}

	/**
	 * Transform TopBadgeData array to Top3Badge array for podium display
	 * Takes the first 3 badges and assigns ranks
	 */
	private transformToTop3Badges(badges: TopBadgeData[]): Top3Badge[] {
		const colors = ['#FFCF0F', '#DEDEDE', '#DEB200']; // 1st, 2nd, 3rd place colors
		return badges.slice(0, 3).map((badge, index) => ({
			rank: (index + 1) as 1 | 2 | 3,
			name: badge.name,
			count: badge.count,
			color: colors[index],
			image: badge.image,
			badgeId: badge.badgeId,
		}));
	}

	/**
	 * Handle back button click
	 */
	onBackClick(): void {
		this.back.emit();
	}

	/**
	 * Handle competency area bubble click
	 * Emits the area data to parent component for navigation/API call
	 */
	onCompetencyAreaClick(areaData: CompetencyAreaClickData): void {
		console.log('[GENDER-ANALYSIS] Competency area clicked:', areaData);
		this.areaClick.emit(areaData);
	}

	/**
	 * Calculate bar width for competency based on count
	 */
	getCompetencyBarWidth(count: number): number {
		if (!this.data || this.data.topEinzelkompetenzen.length === 0) return 5;
		const maxCount = Math.max(...this.data.topEinzelkompetenzen.map((c) => c.count));
		if (maxCount === 0) return 5;
		return Math.max(3, (count / maxCount) * 100);
	}

	/**
	 * Calculate bar width for competency based on hours
	 */
	getCompetencyBarWidthByHours(hours: number): number {
		if (!this.data || this.data.topEinzelkompetenzen.length === 0) return 5;
		const maxHours = Math.max(...this.data.topEinzelkompetenzen.map((c) => c.hours));
		if (maxHours === 0) return 5;
		return Math.max(3, (hours / maxHours) * 100);
	}

	/**
	 * Calculate percentage for competency
	 */
	getCompetencyPercentage(count: number): number {
		if (!this.data) return 0;
		const total = this.data.topEinzelkompetenzen.reduce((sum, c) => sum + c.count, 0);
		if (total === 0) return 0;
		return parseFloat(((count / total) * 100).toFixed(1));
	}

	/**
	 * Calculate bar width for badge based on count
	 */
	getBadgeBarWidth(count: number): number {
		if (!this.data || this.data.topBadges.length === 0) return 5;
		const maxCount = Math.max(...this.data.topBadges.map((b) => b.count));
		if (maxCount === 0) return 5;
		return Math.max(3, (count / maxCount) * 100);
	}

	/**
	 * Calculate bar width for badge based on hours
	 */
	getBadgeBarWidthByHours(hours: number): number {
		if (!this.data || this.data.topBadges.length === 0) return 5;
		const maxHours = Math.max(...this.data.topBadges.map((b) => b.hours));
		if (maxHours === 0) return 5;
		return Math.max(3, (hours / maxHours) * 100);
	}

	/**
	 * Calculate percentage for badge
	 */
	getBadgePercentage(count: number): number {
		if (!this.data) return 0;
		const total = this.data.topBadges.reduce((sum, b) => sum + b.count, 0);
		if (total === 0) return 0;
		return parseFloat(((count / total) * 100).toFixed(1));
	}

	/**
	 * Generate ESCO URI from competency name
	 */
	getEscoUri(competencyName: string): string {
		// Generate a consistent ESCO URI based on competency name
		// Format: http://data.europa.eu/esco/skill/{skill-id}
		const skillMap: { [key: string]: string } = {
			'Web Development': 'http://data.europa.eu/esco/skill/2468ace0-1357-bdf9-8642-0eca8642dbf0',
			'Project Management': 'http://data.europa.eu/esco/skill/f8e7d6c5-b4a3-2109-8765-432109876543',
			'Data Analytics': 'http://data.europa.eu/esco/skill/a1b2c3d4-e5f6-7890-abcd-ef1234567890',
			Leadership: 'http://data.europa.eu/esco/skill/9876fedc-ba09-8765-4321-0fedcba98765',
			'Communication Skills': 'http://data.europa.eu/esco/skill/8ac4e016-79bd-f035-ca86-42edb1975320',
			'Digital Marketing': 'http://data.europa.eu/esco/skill/1a2b3c4d-5e6f-7890-1234-567890abcdef',
			Teamwork: 'http://data.europa.eu/esco/skill/5791bde3-468a-cf02-9753-fdb086420eca',
			Programming: 'http://data.europa.eu/esco/skill/d45c7b4e-5c1d-4b67-a2e6-9c2b5f3d8e7f',
		};
		const key = competencyName.replace('Dashboard.competency.', '');
		return (
			skillMap[competencyName] ||
			skillMap[key] ||
			`http://data.europa.eu/esco/skill/${encodeURIComponent(competencyName.toLowerCase().replace(/\s+/g, '-'))}`
		);
	}

	/**
	 * Transform individual competency data to HorizontalBarItem format for the reusable component
	 */
	getCompetencyBarItems(): HorizontalBarItem[] {
		if (!this.data) return [];
		return this.data.topEinzelkompetenzen.map((comp) => ({
			id: comp.name,
			label: comp.name,
			value: comp.hours,
			barDisplayValue: comp.hours,
			escoUri: comp.escoUri || this.getEscoUri(comp.name),
			data: comp,
		}));
	}
}
