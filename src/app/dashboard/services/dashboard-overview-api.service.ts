import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseHttpApiService } from '../../common/services/base-http-api.service';
import { SessionService } from '../../common/services/session.service';
import { AppConfigService } from '../../common/app-config.service';
import { MessageService } from '../../common/services/message.service';
import {
	DashboardKPIsResponse,
	CompetencyAreasResponse,
	CompetencyAreaDetails,
	TopBadgesResponse,
	OverviewKPIsParams,
	CompetencyAreasParams,
	CompetencyAreaDetailsParams,
	TopBadgesParams,
	ApiErrorResponse,
} from '../models/dashboard-overview-api.model';

/**
 * Dashboard Overview API Service
 *
 * Provides access to the Dashboard Overview endpoints as defined in the OpenAPI specification.
 * Base URL Pattern: /v1/dashboard/overview/*
 *
 * **IMPORTANT:** This service does NOT provide mock fallbacks.
 * - All endpoints require Bearer JWT authentication
 * - Errors are propagated to the caller for proper error handling
 * - Use DashboardDataSourceService to switch between API and mock data sources
 *
 * Endpoints:
 * - GET /v1/dashboard/overview/kpis - KPI data
 * - GET /v1/dashboard/overview/competency-areas - Top competency areas
 * - GET /v1/dashboard/overview/competency-areas/{areaId} - Competency area details
 * - GET /v1/dashboard/overview/top-badges - Top 3 badges
 */
@Injectable({ providedIn: 'root' })
export class DashboardOverviewApiService extends BaseHttpApiService {
	private readonly BASE_PATH = '/v1/dashboard/overview';

	constructor(
		protected loginService: SessionService,
		protected http: HttpClient,
		protected configService: AppConfigService,
		protected messageService: MessageService,
	) {
		super(loginService, http, configService, messageService);
	}

	// ==========================================
	// KPIs Endpoint
	// ==========================================

	/**
	 * Get Dashboard Overview KPIs
	 *
	 * Returns aggregated key performance indicators for the dashboard overview.
	 * Includes top 3 KPIs (institutions, badges, hours) and secondary KPIs.
	 *
	 * **NO FALLBACK:** Errors are thrown to caller for proper error handling.
	 *
	 * @param params - Optional filters (zipCode, includeMonthlyDetails)
	 * @returns Observable with KPI data
	 *
	 * @throws ApiErrorResponse on HTTP errors (401, 404, 500, etc.)
	 *
	 * @example
	 * ```typescript
	 * // Get KPIs for all regions
	 * this.overviewApi.getKpis().subscribe({
	 *   next: (kpis) => this.displayKpis(kpis),
	 *   error: (err) => this.showError('KPIs konnten nicht geladen werden')
	 * });
	 *
	 * // Get KPIs for München region
	 * this.overviewApi.getKpis({ zipCode: '8' }).subscribe(...);
	 * ```
	 */
	getKpis(params?: OverviewKPIsParams): Observable<DashboardKPIsResponse> {
		let httpParams = new HttpParams();

		if (params) {
			if (params.zipCode) {
				httpParams = httpParams.set('zipCode', params.zipCode);
			}
			if (params.includeMonthlyDetails !== undefined) {
				httpParams = httpParams.set('includeMonthlyDetails', params.includeMonthlyDetails.toString());
			}
		}

		return this.http
			.get<DashboardKPIsResponse>(`${this.buildApiUrl(this.BASE_PATH)}/kpis`, {
				params: httpParams,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error('[DashboardOverviewApiService] GET /kpis failed:', error);
					return throwError(() => this.mapError(error, 'getKpis'));
				}),
			);
	}

	// ==========================================
	// Competency Areas Endpoints
	// ==========================================

	/**
	 * Get Top Competency Areas
	 *
	 * Returns the top competency areas with distribution statistics.
	 * Data is optimized for bubble chart visualization.
	 *
	 * **NO FALLBACK:** Errors are thrown to caller for proper error handling.
	 *
	 * @param params - Optional filters (zipCode, limit, sortBy)
	 * @returns Observable with competency areas data
	 *
	 * @throws ApiErrorResponse on HTTP errors
	 *
	 * @example
	 * ```typescript
	 * // Get top 10 competency areas
	 * this.overviewApi.getCompetencyAreas().subscribe({
	 *   next: (areas) => this.renderBubbleChart(areas.data),
	 *   error: (err) => this.showError('Kompetenzbereiche konnten nicht geladen werden')
	 * });
	 *
	 * // Get top 6 sorted by percentage for München
	 * this.overviewApi.getCompetencyAreas({
	 *   zipCode: '8',
	 *   limit: 6,
	 *   sortBy: 'percentage'
	 * }).subscribe(...);
	 * ```
	 */
	getCompetencyAreas(params?: CompetencyAreasParams): Observable<CompetencyAreasResponse> {
		let httpParams = new HttpParams();

		if (params) {
			if (params.zipCode) {
				httpParams = httpParams.set('zipCode', params.zipCode);
			}
			if (params.limit) {
				httpParams = httpParams.set('limit', params.limit.toString());
			}
			if (params.sortBy) {
				httpParams = httpParams.set('sortBy', params.sortBy);
			}
		}

		return this.http
			.get<CompetencyAreasResponse>(`${this.buildApiUrl(this.BASE_PATH)}/competency-areas`, {
				params: httpParams,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error('[DashboardOverviewApiService] GET /competency-areas failed:', error);
					return throwError(() => this.mapError(error, 'getCompetencyAreas'));
				}),
			);
	}

	/**
	 * Get Competency Area Details
	 *
	 * Returns detailed information for a specific competency area.
	 * Used for drill-down from bubble chart click.
	 *
	 * **NO FALLBACK:** Errors are thrown to caller for proper error handling.
	 *
	 * @param areaId - Competency area identifier (e.g., "it_digital")
	 * @param params - Optional filters (zipCode, includeSubCompetencies)
	 * @returns Observable with competency area details
	 *
	 * @throws ApiErrorResponse on HTTP errors (404 if area not found)
	 *
	 * @example
	 * ```typescript
	 * this.overviewApi.getCompetencyAreaDetail('it_digital').subscribe({
	 *   next: (details) => this.showDetailModal(details),
	 *   error: (err) => this.showError('Details konnten nicht geladen werden')
	 * });
	 * ```
	 */
	getCompetencyAreaDetail(areaId: string, params?: CompetencyAreaDetailsParams): Observable<CompetencyAreaDetails> {
		let httpParams = new HttpParams();

		if (params) {
			if (params.zipCode) {
				httpParams = httpParams.set('zipCode', params.zipCode);
			}
			if (params.includeSubCompetencies !== undefined) {
				httpParams = httpParams.set('includeSubCompetencies', params.includeSubCompetencies.toString());
			}
		}

		return this.http
			.get<CompetencyAreaDetails>(`${this.buildApiUrl(this.BASE_PATH)}/competency-areas/${areaId}`, {
				params: httpParams,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error(`[DashboardOverviewApiService] GET /competency-areas/${areaId} failed:`, error);
					return throwError(() => this.mapError(error, 'getCompetencyAreaDetail'));
				}),
			);
	}

	// ==========================================
	// Top Badges Endpoint
	// ==========================================

	/**
	 * Get Top 3 Awarded Badges
	 *
	 * Returns the top 3 most awarded badges with comprehensive details.
	 * Includes ranking, counts, competencies, and visualization data.
	 *
	 * **NO FALLBACK:** Errors are thrown to caller for proper error handling.
	 *
	 * @param params - Optional filters (zipCode, limit, period)
	 * @returns Observable with top badges data
	 *
	 * @throws ApiErrorResponse on HTTP errors
	 *
	 * @example
	 * ```typescript
	 * // Get top 3 badges (default)
	 * this.overviewApi.getTopBadges().subscribe({
	 *   next: (response) => this.displayTopBadges(response.badges),
	 *   error: (err) => this.showError('Top Badges konnten nicht geladen werden')
	 * });
	 *
	 * // Get top 5 badges from last month for München
	 * this.overviewApi.getTopBadges({
	 *   zipCode: '8',
	 *   limit: 5,
	 *   period: 'last_month'
	 * }).subscribe(...);
	 * ```
	 */
	getTopBadges(params?: TopBadgesParams): Observable<TopBadgesResponse> {
		let httpParams = new HttpParams();

		if (params) {
			if (params.zipCode) {
				httpParams = httpParams.set('zipCode', params.zipCode);
			}
			if (params.limit) {
				httpParams = httpParams.set('limit', params.limit.toString());
			}
			if (params.period) {
				httpParams = httpParams.set('period', params.period);
			}
		}

		return this.http
			.get<TopBadgesResponse>(`${this.buildApiUrl(this.BASE_PATH)}/top-badges`, {
				params: httpParams,
				withCredentials: true,
			})
			.pipe(
				catchError((error) => {
					console.error('[DashboardOverviewApiService] GET /top-badges failed:', error);
					return throwError(() => this.mapError(error, 'getTopBadges'));
				}),
			);
	}

	// ==========================================
	// Private Helper Methods
	// ==========================================

	/**
	 * Build full API URL from path
	 */
	private buildApiUrl(path: string): string {
		return `${this.configService.apiConfig.baseUrl}${path}`;
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
