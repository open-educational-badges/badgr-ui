import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClockFading } from '@ng-icons/lucide';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { NetworkDashboardApiService } from '../../services/network-dashboard-api.service';
import {
	getCompetencyAreaDisplayConfig,
	ResidenceStrengthenedCompetency,
	NetworkCompetencyAreaData,
	ESCORootSkill,
} from '../../models/network-dashboard-api.model';
import { HorizontalBarChartComponent, HorizontalBarItem } from '../horizontal-bar-chart/horizontal-bar-chart.component';
import {
	RecipientSkillVisualisationComponent,
	CompetencyAreaClickData,
} from '../../../recipient/components/recipient-skill-visualisation/recipient-skill-visualisation.component';
import { ApiRootSkill } from '../../../common/model/ai-skills.model';

/**
 * Competency Area Data for Bubble View
 */
export interface ResidenceCompetencyAreaData {
	id: string;
	nameKey: string;
	count: number;
	percentage: number;
	hours: number;
	color?: string;
}

/**
 * Strengthened Competency Data
 */
export interface ResidenceStrengthenedCompetencyData {
	competencyKey: string;
	title: string; // Human-readable title from API
	areaKey: string;
	count: number;
	hours: number;
	badges: number;
	trend: 'up' | 'down' | 'stable';
	trendValue: number;
	escoUri?: string;
}

/**
 * Residence Detail Data - Full competency analysis for a city/region
 */
export interface ResidenceDetailData {
	city: string;
	learnerCount: number;
	topCompetencyAreas: ResidenceCompetencyAreaData[];
	topStrengthenedCompetencies: ResidenceStrengthenedCompetencyData[];
}

@Component({
	selector: 'app-residence-detail',
	standalone: true,
	imports: [CommonModule, TranslateModule, NgIcon, RecipientSkillVisualisationComponent, HorizontalBarChartComponent],
	providers: [provideIcons({ lucideClockFading })],
	templateUrl: './residence-detail.component.html',
	styleUrls: ['./residence-detail.component.scss'],
})
export class ResidenceDetailComponent implements OnInit, OnDestroy {
	private destroy$ = new Subject<void>();

	/** City name to display */
	@Input() city: string = '';

	/** Network slug for API calls */
	@Input() networkSlug: string = '';

	/** Event emitted when back button is clicked */
	@Output() back = new EventEmitter<void>();

	/** Event emitted when a competency area is clicked in the skill visualisation */
	@Output() areaClick = new EventEmitter<CompetencyAreaClickData>();

	/** Loading state */
	loading = true;

	/** Residence detail data */
	data: ResidenceDetailData | null = null;

	/** Skill visualisation data - ESCO-compatible skills for the force-directed graph */
	skillVisualisationData: ApiRootSkill[] = [];

	constructor(
		private networkDashboardApi: NetworkDashboardApiService,
		private translate: TranslateService,
	) {}

	ngOnInit(): void {
		console.log(
			'[RESIDENCE-DETAIL] Component initialized with city:',
			this.city,
			', networkSlug:',
			this.networkSlug,
		);
		this.loadResidenceData();
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	/**
	 * Load residence competency data from API
	 * Shows "no data available" when API fails or networkSlug not provided
	 */
	private loadResidenceData(): void {
		this.loading = true;

		console.log(
			'[RESIDENCE-DETAIL] loadResidenceData called with city:',
			this.city,
			', networkSlug:',
			this.networkSlug,
		);

		if (!this.networkSlug) {
			console.warn('[RESIDENCE-DETAIL] No networkSlug provided');
			this.setFallbackData();
			return;
		}

		if (!this.city) {
			console.error('[RESIDENCE-DETAIL] No city provided');
			this.setFallbackData();
			return;
		}

		// Load from residence detail API AND competency areas skills API in parallel
		console.log('[RESIDENCE-DETAIL] Calling APIs with city:', this.city);

		forkJoin({
			residenceDetail: this.networkDashboardApi.getLearnersResidenceDetail(this.networkSlug, this.city).pipe(
				catchError((error) => {
					console.warn('[RESIDENCE-DETAIL] Residence detail API failed:', error);
					return of(null);
				}),
			),
			competencySkills: this.networkDashboardApi
				.getCompetencyAreasSkills(this.networkSlug, { city: this.city })
				.pipe(
					catchError((error) => {
						console.warn('[RESIDENCE-DETAIL] Competency areas skills API failed:', error);
						return of(null);
					}),
				),
		})
			.pipe(takeUntil(this.destroy$))
			.subscribe({
				next: ({ residenceDetail, competencySkills }) => {
					if (!residenceDetail) {
						console.warn('[RESIDENCE-DETAIL] No residence detail data available');
						this.setFallbackData();
						return;
					}

					console.log('[RESIDENCE-DETAIL] Data loaded from API:', residenceDetail);
					console.log('[RESIDENCE-DETAIL] Skills data loaded:', competencySkills);

					// Transform ESCO skills data for skill visualisation
					if (competencySkills?.skills?.length > 0) {
						this.skillVisualisationData = this.transformToApiRootSkills(competencySkills.skills);
						console.log('[RESIDENCE-DETAIL] Skill visualisation data:', this.skillVisualisationData);
					} else {
						this.skillVisualisationData = [];
					}

					// Transform strengthened competencies
					const strengthenedCompetencies = this.transformStrengthenedCompetencies(
						residenceDetail.topStrengthenedCompetencies,
					);

					this.data = {
						city: residenceDetail.metadata.city,
						learnerCount: residenceDetail.metadata.totalLearners,
						topCompetencyAreas: [],
						topStrengthenedCompetencies: strengthenedCompetencies,
					};

					this.loading = false;
					console.log('[RESIDENCE-DETAIL] Data transformed:', this.data);
				},
				error: (error) => {
					console.error('[RESIDENCE-DETAIL] Error in subscription:', error);
					this.setFallbackData();
				},
			});
	}

	/**
	 * Transform ESCORootSkill array to ApiRootSkill array for skill visualisation component
	 * The structures are compatible, but we need to cast the types
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
	 * Transform strengthened competencies from API format
	 */
	private transformStrengthenedCompetencies(
		competencies: ResidenceStrengthenedCompetency[],
	): ResidenceStrengthenedCompetencyData[] {
		return competencies.map((comp) => ({
			competencyKey: comp.competencyKey || comp.competencyId || '',
			title: comp.title || comp.competencyKey || '', // Use title for display, fallback to competencyKey
			areaKey: comp.areaKey || '',
			count: comp.count,
			hours: comp.hours,
			badges: comp.badges || 0,
			trend: comp.trend || 'stable',
			trendValue: comp.trendValue || 0,
			escoUri: comp.escoUri,
		}));
	}

	/**
	 * City to ZIP code mapping for mock data lookup
	 * Since mock data uses ZIP codes but we now use city names,
	 * we need to map city names back to ZIP codes for mock data
	 */
	private readonly cityToZipCodeMap: { [city: string]: string } = {
		München: '8000',
		Augsburg: '8600',
		Ingolstadt: '8500',
		Landshut: '8400',
		Rosenheim: '8300',
		Zürich: '8000',
		Basel: '4000',
		Bern: '3000',
		other: 'other',
	};

	/**
	 * Get ZIP code for city (for mock data lookup)
	 */
	private getZipCodeForCity(city: string): string {
		return this.cityToZipCodeMap[city] || '8000'; // Default to 8000 if not found
	}

	/**
	 * Load data fallback (no data available - removed mock service)
	 */
	private loadMockData(): void {
		this.setFallbackData();
	}

	/**
	 * Set fallback data in case of errors
	 */
	private setFallbackData(): void {
		this.data = {
			city: this.city,
			learnerCount: 0,
			topCompetencyAreas: [],
			topStrengthenedCompetencies: [],
		};
		this.loading = false;
	}

	/**
	 * Handle back button click
	 */
	onBackClick(): void {
		this.back.emit();
	}

	/**
	 * Handle competency area click from skill visualisation
	 * Emits event to parent for navigation to area detail
	 */
	onCompetencyAreaClick(areaData: CompetencyAreaClickData): void {
		console.log('[RESIDENCE-DETAIL] Competency area clicked:', areaData);
		this.areaClick.emit(areaData);
	}

	/**
	 * Calculate bar width for competency area
	 */
	getCompetencyAreaBarWidth(count: number): number {
		if (!this.data || this.data.topCompetencyAreas.length === 0) return 5;
		const maxCount = Math.max(...this.data.topCompetencyAreas.map((a) => a.count));
		if (maxCount === 0) return 5;
		return Math.max(3, (count / maxCount) * 100);
	}

	/**
	 * Calculate bar width for strengthened competency
	 */
	getStrengthenedCompetencyBarWidth(count: number): number {
		if (!this.data || this.data.topStrengthenedCompetencies.length === 0) return 5;
		const maxCount = Math.max(...this.data.topStrengthenedCompetencies.map((c) => c.count));
		if (maxCount === 0) return 5;
		return Math.max(3, (count / maxCount) * 100);
	}

	/**
	 * Calculate percentage for strengthened competency
	 */
	getStrengthenedCompetencyPercentage(count: number): number {
		if (!this.data) return 0;
		const total = this.data.topStrengthenedCompetencies.reduce((sum, c) => sum + c.count, 0);
		if (total === 0) return 0;
		return parseFloat(((count / total) * 100).toFixed(1));
	}

	/**
	 * Calculate percentage for competency area
	 */
	getCompetencyAreaPercentage(count: number): number {
		if (!this.data) return 0;
		const total = this.data.topCompetencyAreas.reduce((sum, a) => sum + a.count, 0);
		if (total === 0) return 0;
		return parseFloat(((count / total) * 100).toFixed(1));
	}

	/**
	 * Generate ESCO URI from competency key
	 */
	getEscoUri(competencyKey: string): string {
		// Generate a consistent ESCO URI based on competency key
		// Format: http://data.europa.eu/esco/skill/{skill-id}
		const skillMap: { [key: string]: string } = {
			'competency.programming': 'http://data.europa.eu/esco/skill/d45c7b4e-5c1d-4b67-a2e6-9c2b5f3d8e7f',
			'competency.dataAnalysis': 'http://data.europa.eu/esco/skill/a1b2c3d4-e5f6-7890-abcd-ef1234567890',
			'competency.projectManagement': 'http://data.europa.eu/esco/skill/f8e7d6c5-b4a3-2109-8765-432109876543',
			'competency.digitalMarketing': 'http://data.europa.eu/esco/skill/1a2b3c4d-5e6f-7890-1234-567890abcdef',
			'competency.teamLeadership': 'http://data.europa.eu/esco/skill/9876fedc-ba09-8765-4321-0fedcba98765',
			'competency.webDevelopment': 'http://data.europa.eu/esco/skill/2468ace0-1357-bdf9-8642-0eca8642dbf0',
			'competency.graphicDesign': 'http://data.europa.eu/esco/skill/3579bdf1-2468-ace0-7531-fdb97531eca8',
			'competency.uxUiDesign': 'http://data.europa.eu/esco/skill/4680acf2-3579-bdf1-8642-eca86420dbf9',
			'competency.sustainableDevelopment':
				'http://data.europa.eu/esco/skill/5791bde3-468a-cf02-9753-fdb086420eca',
			'competency.french': 'http://data.europa.eu/esco/skill/68a2cef4-579b-de13-a864-20ecb97531fd',
			'competency.english': 'http://data.europa.eu/esco/skill/79b3df05-68ac-ef24-b975-31fdc08642ea',
			'competency.publicSpeaking': 'http://data.europa.eu/esco/skill/8ac4e016-79bd-f035-ca86-42edb1975320',
			'competency.socialMedia': 'http://data.europa.eu/esco/skill/9bd5f127-8ace-0146-db97-53fec2a86431',
			'competency.strategicPlanning': 'http://data.europa.eu/esco/skill/ace60238-9bdf-1257-eca8-64fd3b975420',
			'competency.changeManagement': 'http://data.europa.eu/esco/skill/bdf71349-ace0-2368-fdb9-75e04ca86531',
			'competency.cloudComputing': 'http://data.europa.eu/esco/skill/ce082450-bdf1-3479-0eca-86f15db97642',
			'competency.healthcareManagement': 'http://data.europa.eu/esco/skill/df19356a-ce02-458a-1fdb-97026eca8753',
			'competency.environmentalPolicy': 'http://data.europa.eu/esco/skill/e02a467b-df13-569b-20ec-a8137fdb9864',
		};
		return (
			skillMap[competencyKey] || `http://data.europa.eu/esco/skill/${competencyKey.replace('competency.', '')}`
		);
	}

	/**
	 * Get icon name for competency area
	 */
	private getIconForArea(areaId: string): string {
		const iconMap: { [key: string]: string } = {
			it_digital: 'Monitor',
			management_leadership: 'BarChart3',
			communication: 'Users',
			creative_design: 'Star',
			languages: 'Globe',
			health_social: 'Heart',
			sustainability: 'Leaf',
			handwerk: 'Wrench',
		};
		return iconMap[areaId] || 'Star';
	}

	/**
	 * Transform strengthened competency data to HorizontalBarItem format for the reusable component
	 */
	getCompetencyBarItems(): HorizontalBarItem[] {
		if (!this.data) return [];
		return this.data.topStrengthenedCompetencies.map((comp) => ({
			id: comp.competencyKey,
			label: comp.title,
			value: comp.count,
			barDisplayValue: comp.hours,
			afterBarText: `${comp.count} `,
			escoUri: comp.escoUri,
			data: comp,
		}));
	}
}
