import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseHttpApiService } from '../../common/services/base-http-api.service';
import { SessionService } from '../../common/services/session.service';
import { AppConfigService } from '../../common/app-config.service';
import { MessageService } from '../../common/services/message.service';
import {
	NetworkKPIsResponse,
	NetworkCompetencyAreasResponse,
	NetworkTopBadgesResponse,
	NetworkRecentActivityResponse,
	NetworkStrengthenedCompetenciesResponse,
	NetworkBadgeAwardsTimelineResponse,
	NetworkBadgeAwardsTimelineParams,
	NetworkBadgeTypeDistributionResponse,
	NetworkDeliveryMethodDistributionResponse,
	NetworkRecentBadgeAwardsResponse,
	NetworkRecentBadgeAwardsParams,
	NetworkBadgeLocationsResponse,
	DeliveryMethodType,
	// Competency Detail API types
	NetworkCompetencyDetailResponse,
	NetworkCompetencyDetailParams,
	// Competency Area Detail API types (POST)
	CompetencyAreaDetailRequest,
	CompetencyAreaDetailResponse,
	CompetencyAreaTopCompetency,
	// Learners API types
	NetworkLearnersOverviewResponse,
	NetworkLearnersResidenceResponse,
	NetworkLearnersResidenceDetailResponse,
	NetworkLearnersGenderResponse,
	NetworkLearnersGenderDetailResponse,
	GenderType,
	mapGenderLabelToType,
	// Competency Areas Skills API types (for Skill Visualisation)
	CompetencyAreasSkillsResponse,
	CompetencyAreasSkillsParams,
	// Sozialraum API types
	SocialspaceInstitutionsResponse,
	SocialspaceCitiesResponse,
	SocialspaceCityDetailResponse,
	SocialspaceLearnersResponse,
	SocialspaceCompetenciesResponse,
} from '../models/network-dashboard-api.model';
import { ApiErrorResponse } from '../models/dashboard-overview-api.model';

/**
 * Network Dashboard API Service
 *
 * Provides access to network-specific dashboard endpoints.
 * Base URL Pattern: /v1/issuer/networks/{networkSlug}/dashboard/*
 *
 * Endpoints:
 * - GET /v1/issuer/networks/{networkSlug}/dashboard/kpis - Network KPI data
 * - GET /v1/issuer/networks/{networkSlug}/dashboard/competency-areas - Network competency areas
 * - GET /v1/issuer/networks/{networkSlug}/dashboard/top-badges - Network top badges
 */
@Injectable({ providedIn: 'root' })
export class NetworkDashboardApiService extends BaseHttpApiService {
	constructor(
		protected loginService: SessionService,
		protected http: HttpClient,
		protected configService: AppConfigService,
		protected messageService: MessageService,
	) {
		super(loginService, http, configService, messageService);
	}

	// ==========================================
	// Network KPIs Endpoint
	// ==========================================

	/**
	 * Get Network Dashboard KPIs
	 *
	 * Returns aggregated key performance indicators for a specific network.
	 *
	 * @param networkSlug - Network identifier
	 * @param deliveryMethod - Optional filter by delivery method (online or in-person)
	 * @returns Observable with KPI data
	 *
	 * @example
	 * ```typescript
	 * // Get all KPIs
	 * this.networkDashboardApi.getKpis('my-network').subscribe({
	 *   next: (response) => this.displayKpis(response.kpis),
	 *   error: (err) => this.showError('KPIs konnten nicht geladen werden')
	 * });
	 *
	 * // Get KPIs for in-person badges only
	 * this.networkDashboardApi.getKpis('my-network', 'in-person').subscribe({
	 *   next: (response) => this.displayInPersonKpis(response.kpis)
	 * });
	 * ```
	 */
	getKpis(networkSlug: string, deliveryMethod?: DeliveryMethodType): Observable<NetworkKPIsResponse> {
		let params = new HttpParams();
		if (deliveryMethod) {
			params = params.set('deliveryMethod', deliveryMethod);
		}

		return this.http
			.get<NetworkKPIsResponse>(this.buildNetworkUrl(networkSlug, 'kpis'), { params, withCredentials: true })
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/kpis failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getKpis'));
				}),
			);
	}

	// ==========================================
	// Network Competency Areas Endpoint
	// ==========================================

	/**
	 * Get Network Top Competency Areas
	 *
	 * Returns the top competency areas for a specific network.
	 *
	 * @param networkSlug - Network identifier
	 * @param limit - Maximum number of areas to return (default: 6)
	 * @param deliveryMethod - Optional filter by delivery method (online or in-person)
	 * @returns Observable with competency areas data
	 */
	getCompetencyAreas(
		networkSlug: string,
		limit: number = 6,
		deliveryMethod?: DeliveryMethodType,
	): Observable<NetworkCompetencyAreasResponse> {
		let params = new HttpParams();
		if (limit) {
			params = params.set('limit', limit.toString());
		}
		if (deliveryMethod) {
			params = params.set('deliveryMethod', deliveryMethod);
		}

		return this.http
			.get<NetworkCompetencyAreasResponse>(this.buildNetworkUrl(networkSlug, 'competency-areas'), {
				params,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/competency-areas failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getCompetencyAreas'));
				}),
			);
	}

	// ==========================================
	// Network Competency Areas Skills Endpoint
	// (for Skill Visualisation Component)
	// ==========================================

	/**
	 * Get Competency Areas as ESCO Skills for Visualisation
	 *
	 * Returns competency areas in ESCO-compatible skill format for the interactive
	 * skill visualisation component (recipient-skill-visualisation).
	 *
	 * This endpoint supports multiple dashboard views with optional filters:
	 * - Dashboard Overview: No filters - shows all competency areas for the network
	 * - Residence Detail: Filter by `city` - shows competency areas for learners from a specific city
	 * - Gender Detail: Filter by `gender` - shows competency areas for a specific gender
	 *
	 * @param networkSlug - Network identifier
	 * @param params - Optional query parameters (city, gender, limit, deliveryMethod)
	 * @returns Observable with ESCO-compatible skill data
	 *
	 * @example
	 * ```typescript
	 * // Dashboard Overview - all competency areas
	 * this.networkDashboardApi.getCompetencyAreasSkills('my-network').subscribe({
	 *   next: (response) => this.skillVisualisation.skills = response.skills
	 * });
	 *
	 * // Residence Detail - competency areas for München learners
	 * this.networkDashboardApi.getCompetencyAreasSkills('my-network', { city: 'München' }).subscribe({
	 *   next: (response) => this.skillVisualisation.skills = response.skills
	 * });
	 *
	 * // Gender Detail - competency areas for female learners
	 * this.networkDashboardApi.getCompetencyAreasSkills('my-network', { gender: 'female' }).subscribe({
	 *   next: (response) => this.skillVisualisation.skills = response.skills
	 * });
	 * ```
	 */
	getCompetencyAreasSkills(
		networkSlug: string,
		params?: CompetencyAreasSkillsParams,
	): Observable<CompetencyAreasSkillsResponse> {
		let httpParams = new HttpParams();

		if (params?.city) {
			httpParams = httpParams.set('city', params.city);
		}
		if (params?.gender) {
			httpParams = httpParams.set('gender', mapGenderLabelToType(params.gender));
		}
		if (params?.limit) {
			httpParams = httpParams.set('limit', params.limit.toString());
		}
		if (params?.deliveryMethod) {
			httpParams = httpParams.set('deliveryMethod', params.deliveryMethod);
		}

		return this.http
			.get<CompetencyAreasSkillsResponse>(this.buildNetworkUrl(networkSlug, 'competency-areas/skills'), {
				params: httpParams,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/competency-areas/skills failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getCompetencyAreasSkills'));
				}),
			);
	}

	// ==========================================
	// Network Top Badges Endpoint
	// ==========================================

	/**
	 * Get Network Top Badges
	 *
	 * Returns the top most awarded badges within a specific network.
	 *
	 * @param networkSlug - Network identifier
	 * @param limit - Number of top badges to return (default: 3)
	 * @returns Observable with top badges data
	 */
	getTopBadges(networkSlug: string, limit: number = 3): Observable<NetworkTopBadgesResponse> {
		let params = new HttpParams();
		if (limit) {
			params = params.set('limit', limit.toString());
		}

		return this.http
			.get<NetworkTopBadgesResponse>(this.buildNetworkUrl(networkSlug, 'top-badges'), {
				params,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/top-badges failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getTopBadges'));
				}),
			);
	}

	// ==========================================
	// Network Recent Activity Endpoint
	// ==========================================

	/**
	 * Get Network Recent Activity
	 *
	 * Returns the most recent badge award activities within a specific network.
	 *
	 * @param networkSlug - Network identifier
	 * @param limit - Number of recent activities to return (default: 4)
	 * @returns Observable with recent activities data
	 */
	getRecentActivity(networkSlug: string, limit: number = 4): Observable<NetworkRecentActivityResponse> {
		let params = new HttpParams();
		if (limit) {
			params = params.set('limit', limit.toString());
		}

		return this.http
			.get<NetworkRecentActivityResponse>(this.buildNetworkUrl(networkSlug, 'recent-activity'), {
				params,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/recent-activity failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getRecentActivity'));
				}),
			);
	}

	// ==========================================
	// Network Strengthened Competencies Endpoint
	// ==========================================

	/**
	 * Get Most Strengthened Individual Competencies
	 *
	 * Returns the individual competencies (Einzelkompetenzen) that have been
	 * strengthened the most within a network, ordered by competency hours.
	 *
	 * @param networkSlug - Network identifier
	 * @param limit - Maximum number of competencies to return (default: 8)
	 * @param sortBy - Field to sort by (default: hours)
	 * @param sortOrder - Sort direction (default: desc)
	 * @param deliveryMethod - Optional filter by delivery method (online or in-person)
	 * @returns Observable with strengthened competencies data
	 */
	getStrengthenedCompetencies(
		networkSlug: string,
		limit: number = 8,
		sortBy: 'hours' | 'count' | 'title' = 'hours',
		sortOrder: 'asc' | 'desc' = 'desc',
		deliveryMethod?: DeliveryMethodType,
	): Observable<NetworkStrengthenedCompetenciesResponse> {
		let params = new HttpParams();
		if (limit) {
			params = params.set('limit', limit.toString());
		}
		if (sortBy) {
			params = params.set('sortBy', sortBy);
		}
		if (sortOrder) {
			params = params.set('sortOrder', sortOrder);
		}
		if (deliveryMethod) {
			params = params.set('deliveryMethod', deliveryMethod);
		}

		return this.http
			.get<NetworkStrengthenedCompetenciesResponse>(
				this.buildNetworkUrl(networkSlug, 'strengthened-competencies'),
				{ params, withCredentials: true },
			)
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/strengthened-competencies failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getStrengthenedCompetencies'));
				}),
			);
	}

	// ==========================================
	// Network Competency Detail Endpoint
	// ==========================================

	/**
	 * Get Competency Detail Information
	 *
	 * Returns detailed information about a specific competency within a network,
	 * including statistics about badges, learners, and institutions.
	 *
	 * @param networkSlug - Network identifier
	 * @param competencyId - Competency identifier
	 * @param params - Optional query parameters (institutionLimit, deliveryMethod)
	 * @returns Observable with competency detail data
	 *
	 * @example
	 * ```typescript
	 * this.networkDashboardApi.getCompetencyDetail('my-network', 'comp_123').subscribe({
	 *   next: (response) => this.displayCompetencyDetail(response),
	 *   error: (err) => this.showError('Kompetenz-Details konnten nicht geladen werden')
	 * });
	 * ```
	 */
	getCompetencyDetail(
		networkSlug: string,
		competencyId: string,
		params?: NetworkCompetencyDetailParams,
	): Observable<NetworkCompetencyDetailResponse> {
		let httpParams = new HttpParams();

		if (params?.institutionLimit) {
			httpParams = httpParams.set('institutionLimit', params.institutionLimit.toString());
		}
		if (params?.deliveryMethod) {
			httpParams = httpParams.set('deliveryMethod', params.deliveryMethod);
		}

		return this.http
			.get<NetworkCompetencyDetailResponse>(
				this.buildNetworkUrl(networkSlug, `strengthened-competencies/${encodeURIComponent(competencyId)}`),
				{ params: httpParams, withCredentials: true },
			)
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/strengthened-competencies/${competencyId} failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getCompetencyDetail'));
				}),
			);
	}

	// ==========================================
	// Network Competency Area Detail Endpoint (POST)
	// ==========================================

	/**
	 * Get Competency Area Detail Information
	 *
	 * Returns aggregated statistics for a competency area (Kompetenzbereich) based on
	 * the provided ESCO URIs of individual competencies belonging to that area.
	 *
	 * **Why POST instead of GET:**
	 * Since the database only stores individual competencies (not competency areas/categories),
	 * the frontend must send the list of ESCO URIs that belong to the clicked competency area.
	 * The backend then aggregates statistics for all those competencies.
	 *
	 * @param networkSlug - Network identifier
	 * @param request - Request body with area name and competency URIs
	 * @returns Observable with aggregated competency area statistics
	 *
	 * @example
	 * ```typescript
	 * const request: CompetencyAreaDetailRequest = {
	 *   areaName: 'Kommunikation, Zusammenarbeit und Kreativität',
	 *   areaConceptUri: '/esco/skill/communication-collaboration',
	 *   competencyUris: [
	 *     'http://data.europa.eu/esco/skill/dialoge-schreiben',
	 *     'http://data.europa.eu/esco/skill/storylines-schreiben'
	 *   ],
	 *   topCompetenciesLimit: 10,
	 *   institutionLimit: 10
	 * };
	 * this.networkDashboardApi.getCompetencyAreaDetail('my-network', request).subscribe({
	 *   next: (response) => this.displayAreaDetail(response),
	 *   error: (err) => this.showError('Kompetenzbereich-Details konnten nicht geladen werden')
	 * });
	 * ```
	 */
	getCompetencyAreaDetail(
		networkSlug: string,
		request: CompetencyAreaDetailRequest,
	): Observable<CompetencyAreaDetailResponse> {
		return this.http
			.post<CompetencyAreaDetailResponse>(this.buildNetworkUrl(networkSlug, 'competency-area-detail'), request, {
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] POST /issuer/networks/${networkSlug}/dashboard/competency-area-detail failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getCompetencyAreaDetail'));
				}),
			);
	}

	// ==========================================
	// Network Badge Awards Timeline Endpoint
	// ==========================================

	/**
	 * Get Badge Awards Timeline
	 *
	 * Returns badge awards grouped by date for timeline/chart visualization.
	 *
	 * @param networkSlug - Network identifier
	 * @param params - Query parameters (year, startDate, endDate, groupBy, badgeType)
	 * @returns Observable with badge awards timeline data
	 */
	getBadgeAwardsTimeline(
		networkSlug: string,
		params?: NetworkBadgeAwardsTimelineParams,
	): Observable<NetworkBadgeAwardsTimelineResponse> {
		let httpParams = new HttpParams();

		if (params?.year) {
			httpParams = httpParams.set('year', params.year.toString());
		}
		if (params?.startDate) {
			httpParams = httpParams.set('startDate', params.startDate);
		}
		if (params?.endDate) {
			httpParams = httpParams.set('endDate', params.endDate);
		}
		if (params?.groupBy) {
			httpParams = httpParams.set('groupBy', params.groupBy);
		}
		if (params?.badgeType && params.badgeType !== 'all') {
			httpParams = httpParams.set('badgeType', params.badgeType);
		}

		return this.http
			.get<NetworkBadgeAwardsTimelineResponse>(this.buildNetworkUrl(networkSlug, 'badge-awards-timeline'), {
				params: httpParams,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/badge-awards-timeline failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getBadgeAwardsTimeline'));
				}),
			);
	}

	// ==========================================
	// Network Badge Type Distribution Endpoint
	// ==========================================

	/**
	 * Get Badge Distribution by Type
	 *
	 * Returns the distribution of badges by type for pie/donut chart visualization.
	 *
	 * @param networkSlug - Network identifier
	 * @param year - Optional year filter
	 * @returns Observable with badge type distribution data
	 */
	getBadgeTypeDistribution(networkSlug: string, year?: number): Observable<NetworkBadgeTypeDistributionResponse> {
		let params = new HttpParams();
		if (year) {
			params = params.set('year', year.toString());
		}

		return this.http
			.get<NetworkBadgeTypeDistributionResponse>(this.buildNetworkUrl(networkSlug, 'badge-type-distribution'), {
				params,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/badge-type-distribution failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getBadgeTypeDistribution'));
				}),
			);
	}

	// ==========================================
	// Network Delivery Method Distribution Endpoint
	// ==========================================

	/**
	 * Get Delivery Method Distribution
	 *
	 * Returns the distribution of badges by delivery method (online vs in-person).
	 *
	 * @param networkSlug - Network identifier
	 * @param year - Optional year filter
	 * @returns Observable with delivery method distribution data
	 */
	getDeliveryMethodDistribution(
		networkSlug: string,
		year?: number,
	): Observable<NetworkDeliveryMethodDistributionResponse> {
		let params = new HttpParams();
		if (year) {
			params = params.set('year', year.toString());
		}

		return this.http
			.get<NetworkDeliveryMethodDistributionResponse>(
				this.buildNetworkUrl(networkSlug, 'delivery-method-distribution'),
				{ params, withCredentials: true },
			)
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/delivery-method-distribution failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getDeliveryMethodDistribution'));
				}),
			);
	}

	// ==========================================
	// Network Recent Badge Awards Endpoint
	// ==========================================

	/**
	 * Get Recent Badge Awards (Last Month)
	 *
	 * Returns badges awarded in the last month within the network,
	 * grouped by badge with competency details.
	 *
	 * @param networkSlug - Network identifier
	 * @param params - Query parameters (limit, days, sortBy, sortOrder)
	 * @returns Observable with recent badge awards data
	 */
	getRecentBadgeAwards(
		networkSlug: string,
		params?: NetworkRecentBadgeAwardsParams,
	): Observable<NetworkRecentBadgeAwardsResponse> {
		let httpParams = new HttpParams();

		if (params?.limit) {
			httpParams = httpParams.set('limit', params.limit.toString());
		}
		if (params?.days) {
			httpParams = httpParams.set('days', params.days.toString());
		}
		if (params?.sortBy) {
			httpParams = httpParams.set('sortBy', params.sortBy);
		}
		if (params?.sortOrder) {
			httpParams = httpParams.set('sortOrder', params.sortOrder);
		}

		return this.http
			.get<NetworkRecentBadgeAwardsResponse>(this.buildNetworkUrl(networkSlug, 'recent-badge-awards'), {
				params: httpParams,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/recent-badge-awards failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getRecentBadgeAwards'));
				}),
			);
	}

	// ==========================================
	// Network Badge Locations Endpoint
	// ==========================================

	/**
	 * Get Badge Geographic Distribution
	 *
	 * Returns the geographic distribution of badges by city and ZIP code area.
	 * Particularly useful for analyzing in-person badge delivery patterns.
	 *
	 * @param networkSlug - Network identifier
	 * @param deliveryMethod - Optional filter by delivery method (online or in-person)
	 * @param limit - Maximum number of locations to return (default: 20)
	 * @returns Observable with badge locations data
	 *
	 * @example
	 * ```typescript
	 * // Get badge locations for in-person badges
	 * this.networkDashboardApi.getBadgeLocations('my-network', 'in-person').subscribe({
	 *   next: (response) => this.displayLocations(response.locations)
	 * });
	 * ```
	 */
	getBadgeLocations(
		networkSlug: string,
		deliveryMethod?: DeliveryMethodType,
		limit: number = 20,
	): Observable<NetworkBadgeLocationsResponse> {
		let params = new HttpParams();
		if (deliveryMethod) {
			params = params.set('deliveryMethod', deliveryMethod);
		}
		if (limit) {
			params = params.set('limit', limit.toString());
		}

		return this.http
			.get<NetworkBadgeLocationsResponse>(this.buildNetworkUrl(networkSlug, 'badge-locations'), {
				params,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/badge-locations failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getBadgeLocations'));
				}),
			);
	}

	// ==========================================
	// LERNENDE (LEARNERS) ENDPOINTS
	// ==========================================

	/**
	 * Get Learners Overview Data
	 *
	 * Returns comprehensive learner statistics for the Lernende tab.
	 * Aggregates KPIs, residence distribution, and gender distribution.
	 *
	 * @param networkSlug - Network identifier
	 * @returns Observable with learners overview data
	 *
	 * @example
	 * ```typescript
	 * this.networkDashboardApi.getLearnersOverview('my-network').subscribe({
	 *   next: (response) => {
	 *     this.totalLearners = response.kpis.totalLearners;
	 *     this.residenceData = response.residenceDistribution;
	 *     this.genderData = response.genderDistribution;
	 *   }
	 * });
	 * ```
	 */
	getLearnersOverview(networkSlug: string): Observable<NetworkLearnersOverviewResponse> {
		return this.http
			.get<NetworkLearnersOverviewResponse>(this.buildNetworkUrl(networkSlug, 'learners'), {
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/learners failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getLearnersOverview'));
				}),
			);
	}

	/**
	 * Get Learners Residence Distribution
	 *
	 * Returns the distribution of learners by their residence (Wohnort der Lernenden).
	 *
	 * @param networkSlug - Network identifier
	 * @param limit - Maximum number of regions before grouping into "Other" (default: 5)
	 * @param includeOther - Whether to include "Andere Wohnorte" category (default: true)
	 * @returns Observable with learner residence distribution
	 */
	getLearnersResidence(
		networkSlug: string,
		limit: number = 5,
		includeOther: boolean = true,
	): Observable<NetworkLearnersResidenceResponse> {
		let params = new HttpParams();
		if (limit) {
			params = params.set('limit', limit.toString());
		}
		params = params.set('includeOther', includeOther.toString());

		return this.http
			.get<NetworkLearnersResidenceResponse>(this.buildNetworkUrl(networkSlug, 'learners/residence'), {
				params,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/learners/residence failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getLearnersResidence'));
				}),
			);
	}

	/**
	 * Get Learner Residence Detail (Regionsdetail)
	 *
	 * Returns detailed competency analysis for learners from a specific residence/region.
	 * Note: Uses city name instead of ZIP code because a city can have multiple ZIP codes.
	 *
	 * @param networkSlug - Network identifier
	 * @param city - City name (e.g., "München") or "other" for aggregated category
	 * @param competencyLimit - Maximum number of strengthened competencies (optional, omit for no limit)
	 * @returns Observable with residence detail data
	 */
	getLearnersResidenceDetail(
		networkSlug: string,
		city: string,
		competencyLimit?: number,
	): Observable<NetworkLearnersResidenceDetailResponse> {
		let params = new HttpParams();
		if (competencyLimit !== undefined && competencyLimit > 0) {
			params = params.set('competencyLimit', competencyLimit.toString());
		}

		return this.http
			.get<NetworkLearnersResidenceDetailResponse>(
				this.buildNetworkUrl(networkSlug, `learners/residence/${encodeURIComponent(city)}`),
				{ params, withCredentials: true },
			)
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/learners/residence/${city} failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getLearnersResidenceDetail'));
				}),
			);
	}

	/**
	 * Get Learners Gender Distribution
	 *
	 * Returns the distribution of learners by gender (Verteilung Geschlecht).
	 *
	 * @param networkSlug - Network identifier
	 * @returns Observable with learner gender distribution
	 */
	getLearnersGender(networkSlug: string): Observable<NetworkLearnersGenderResponse> {
		return this.http
			.get<NetworkLearnersGenderResponse>(this.buildNetworkUrl(networkSlug, 'learners/gender'), {
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/learners/gender failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getLearnersGender'));
				}),
			);
	}

	/**
	 * Get Learner Gender Detail (Geschlechtverteilungsdetails)
	 *
	 * Returns detailed competency analysis for learners of a specific gender.
	 *
	 * @param networkSlug - Network identifier
	 * @param gender - Gender category (male, female, diverse, noAnswer) or localized label
	 * @param competencyLimit - Maximum number of individual competencies (default: 5)
	 * @param badgeLimit - Maximum number of top badges (optional, omit for no limit)
	 * @returns Observable with gender detail data
	 */
	getLearnersGenderDetail(
		networkSlug: string,
		gender: GenderType,
		competencyLimit: number = 5,
		badgeLimit?: number,
	): Observable<NetworkLearnersGenderDetailResponse> {
		let params = new HttpParams();
		if (competencyLimit) {
			params = params.set('competencyLimit', competencyLimit.toString());
		}
		if (badgeLimit !== undefined && badgeLimit > 0) {
			params = params.set('badgeLimit', badgeLimit.toString());
		}

		// Map localized label to API gender type
		const genderType = mapGenderLabelToType(gender);

		return this.http
			.get<NetworkLearnersGenderDetailResponse>(
				this.buildNetworkUrl(networkSlug, `learners/gender/${encodeURIComponent(genderType)}`),
				{ params, withCredentials: true },
			)
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/learners/gender/${genderType} failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getLearnersGenderDetail'));
				}),
			);
	}

	// ==========================================
	// SOZIALRAUM (SOCIAL SPACE) ENDPOINTS
	// ==========================================

	/**
	 * Get Socialspace Institutions
	 *
	 * Returns institutions list for a specific network, optionally filtered by city.
	 *
	 * @param networkSlug - Network identifier
	 * @param city - Optional city filter
	 * @param type - Optional institution type filter
	 * @returns Observable with institutions data
	 */
	getSocialspaceInstitutions(
		networkSlug: string,
		city?: string,
		type?: string,
	): Observable<SocialspaceInstitutionsResponse> {
		let params = new HttpParams();
		if (city) {
			params = params.set('city', city);
		}
		if (type) {
			params = params.set('type', type);
		}

		return this.http
			.get<SocialspaceInstitutionsResponse>(this.buildNetworkUrl(networkSlug, 'socialspace/institutions'), {
				params,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/socialspace/institutions failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getSocialspaceInstitutions'));
				}),
			);
	}

	/**
	 * Get Available Cities for Socialspace
	 *
	 * Returns list of available cities for the socialspace dashboard.
	 *
	 * @param networkSlug - Network identifier
	 * @returns Observable with cities data
	 */
	getSocialspaceCities(networkSlug: string): Observable<SocialspaceCitiesResponse> {
		return this.http
			.get<SocialspaceCitiesResponse>(this.buildNetworkUrl(networkSlug, 'socialspace/cities'), {
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/socialspace/cities failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getSocialspaceCities'));
				}),
			);
	}

	/**
	 * Get City Detail Metrics
	 *
	 * Returns detailed metrics for a specific city.
	 *
	 * @param networkSlug - Network identifier
	 * @param city - City name
	 * @returns Observable with city detail data
	 */
	getSocialspaceCityDetail(networkSlug: string, city: string): Observable<SocialspaceCityDetailResponse> {
		let params = new HttpParams();
		params = params.set('city', city);

		return this.http
			.get<SocialspaceCityDetailResponse>(this.buildNetworkUrl(networkSlug, 'socialspace/city-detail'), {
				params,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/socialspace/city-detail failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getSocialspaceCityDetail'));
				}),
			);
	}

	/**
	 * Get Learner Demographics for City
	 *
	 * Returns learner demographics for a specific city.
	 *
	 * @param networkSlug - Network identifier
	 * @param city - City name
	 * @returns Observable with learner demographics data
	 */
	getSocialspaceLearners(networkSlug: string, city: string): Observable<SocialspaceLearnersResponse> {
		let params = new HttpParams();
		params = params.set('city', city);

		return this.http
			.get<SocialspaceLearnersResponse>(this.buildNetworkUrl(networkSlug, 'socialspace/learners'), {
				params,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/socialspace/learners failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getSocialspaceLearners'));
				}),
			);
	}

	/**
	 * Get Strengthened Competencies for City
	 *
	 * Returns strengthened competencies for a specific city.
	 *
	 * @param networkSlug - Network identifier
	 * @param city - City name
	 * @param limit - Maximum competencies to return (default: 20)
	 * @returns Observable with competencies data
	 */
	getSocialspaceCompetencies(
		networkSlug: string,
		city: string,
		limit: number = 20,
	): Observable<SocialspaceCompetenciesResponse> {
		let params = new HttpParams();
		params = params.set('city', city);
		if (limit) {
			params = params.set('limit', limit.toString());
		}

		return this.http
			.get<SocialspaceCompetenciesResponse>(this.buildNetworkUrl(networkSlug, 'socialspace/competencies'), {
				params,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(
						`[NetworkDashboardApiService] GET /issuer/networks/${networkSlug}/dashboard/socialspace/competencies failed:`,
						error,
					);
					return throwError(() => this.mapError(error, 'getSocialspaceCompetencies'));
				}),
			);
	}

	// ==========================================
	// Private Helper Methods
	// ==========================================

	/**
	 * Build full API URL for network dashboard endpoint
	 */
	private buildNetworkUrl(networkSlug: string, endpoint: string): string {
		return `${this.configService.apiConfig.baseUrl}/v1/issuer/networks/${networkSlug}/dashboard/${endpoint}`;
	}

	/**
	 * Map HTTP error to ApiErrorResponse
	 */
	private mapError(error: any, context: string): ApiErrorResponse {
		return {
			error: error.error?.error || error.statusText || 'Unknown Error',
			message: error.error?.message || error.message || `${context} failed`,
			details: error.error?.details,
			requestId: error.error?.requestId,
		};
	}
}
