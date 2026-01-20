import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AppConfigService } from '~/common/app-config.service';
import { AUTH_PROVIDER, AuthenticationService } from '~/common/services/authentication-service';
import { BaseHttpApiService } from '~/common/services/base-http-api.service';
import { MessageService } from '~/common/services/message.service';
import { BadgeClassV3, IBadgeClassV3 } from '~/issuer/models/badgeclassv3.model';
import { IIssuerV3, IssuerV3 } from '~/issuer/models/issuerv3.model';
import { LearningPathV3 } from '~/issuer/models/learningpathv3.model';
import { INetworkV3, NetworkV3 } from '~/issuer/models/networkv3.model';

const ENDPOINT = 'v3/issuer';

@Injectable({
	providedIn: 'root',
})
export class CatalogService extends BaseHttpApiService {
	protected sessionService: AuthenticationService;
	protected httpClient: HttpClient;
	protected configService: AppConfigService;
	protected messageService: MessageService;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const sessionService = inject(AUTH_PROVIDER);
		const httpClient = inject(HttpClient);
		const configService = inject(AppConfigService);
		const messageService = inject(MessageService);

		super(sessionService, httpClient, configService, messageService);

		this.sessionService = sessionService;
		this.httpClient = httpClient;
		this.configService = configService;
		this.messageService = messageService;
	}

	/**
	 * Gets a list of tags for a given entity type
	 * @param entityType The type of entity to get tags for (e.g., 'badges', 'learningpaths')
	 * @returns An array of available tags to filter by
	 */
	private async getEntityTags(entityType: 'badges' | 'learningpaths'): Promise<string[]> {
		try {
			const response = await this.get<string[]>(`${this.baseUrl}/${ENDPOINT}/${entityType}/tags`);

			if (response.ok) return response.body;
			else {
				console.warn(
					`Request for ${entityType} tags did not return ok, got ${response.status}: ${response.statusText}`,
				);
				return [];
			}
		} catch (e) {
			console.warn(e);
			return [];
		}
	}

	/**
	 * Gets a list of tags, whose entries may be used as input for
	 * the tags parameter of the {@link getBadges} method
	 * @returns An array of available tags to filter badges by
	 */
	async getBadgeTags(): Promise<string[]> {
		return this.getEntityTags('badges');
	}

	/**
	 * Gets a list of tags, whose entries may be used as input for
	 * the tags parameter of the {@link getLearningPaths} method
	 * @returns An array of available tags to filter learning paths by
	 */
	async getLearningPathTags(): Promise<string[]> {
		return this.getEntityTags('learningpaths');
	}

	/**
	 * Gets a paginated list of badges, optionally filtered by name and/or tags.
	 * Offset-based pagination is used, so pagination is achieved by setting the limit and offset
	 * by multiples of the limit to go through pages (e.g. limit = 3, offset = 6 results in a request
	 * for page 3, giving you the values from 7 to 9)
	 * @param offset Offset for offset-based pagination
	 * @param limit Limit for offset-based pagination
	 * @param nameQuery Filter to apply to the name of badges pre application of offset and limit
	 * @param tags A list of tags that all badges must contain pre application of offset and limit
	 * @param orderBy Order of the returned list
	 * @returns An object containing the url of the next and previous page
	 * (if any) and the contents of the given page as array of badge objects
	 */
	async getBadges(
		offset: number = 0,
		limit: number = 20,
		nameQuery?: string,
		tags?: string[],
		orderBy?: 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc',
	): Promise<PaginatedBadgeClass | null> {
		try {
			let params = new HttpParams({
				fromObject: {
					offset: offset,
					limit: limit,
				},
			});

			if (nameQuery) params = params.append('name', nameQuery);
			if (tags && tags.length > 0) params = params.append('tags', tags.join(','));
			if (orderBy) {
				const ascOrDesc = orderBy.indexOf('asc') > -1 ? '' : '-';
				const nameOrDate = orderBy.indexOf('name') > -1 ? 'name' : 'created_at';
				// backend expects e.g. a '-name' for descending ordering of the name property and
				// e.g. 'name' or ascending ordering. Same for 'created_at'
				params = params.append('ordering', `${ascOrDesc}${nameOrDate}`);
			}

			const response = await this.get<PaginatedBadgeClass & { results: IBadgeClassV3[] }>(
				`${this.baseUrl}/${ENDPOINT}/badges/`,
				params,
			);

			if (response.ok)
				return { ...response.body, results: response.body.results.map((r) => new BadgeClassV3(r)) };
			else {
				console.warn(
					`Paginated request to get badge classes did not return ok, got ${response.status}: ${response.statusText}`,
				);
				return null;
			}
		} catch (e) {
			console.warn(e);
			return null;
		}
	}

	async getIssuers(
		offset = 0,
		limit = 30,
		nameQuery?: string,
		category?: string,
		minBadges?: number,
		orderBy?: 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc' | 'badges_desc',
	): Promise<PaginatedIssuer | null> {
		try {
			let params = new HttpParams({
				fromObject: { offset, limit },
			});

			if (nameQuery) params = params.append('name', nameQuery);
			if (category) params = params.append('category', category);
			if (minBadges !== undefined) params = params.append('min_badges', minBadges);

			if (orderBy) {
				switch (orderBy) {
					case 'name_asc':
						params = params.append('ordering', 'name');
						break;
					case 'name_desc':
						params = params.append('ordering', '-name');
						break;
					case 'date_asc':
						params = params.append('ordering', 'created_at');
						break;
					case 'date_desc':
						params = params.append('ordering', '-created_at');
						break;
					case 'badges_desc':
						params = params.append('ordering', '-badge_count');
						break;
				}
			}

			const response = await this.get<PaginatedIssuer & { results: IIssuerV3[] }>(
				`${this.baseUrl}/${ENDPOINT}/issuers/`,
				params,
			);

			if (!response.ok) return null;

			return {
				...response.body,
				results: response.body.results.map((i) => new IssuerV3(i)),
			};
		} catch (e) {
			console.warn(e);
			return null;
		}
	}

	/**
	 * Gets a paginated list of learning paths, optionally filtered by name and/or tags.
	 * Offset-based pagination is used, so pagination is achieved by setting the limit and offset
	 * by multiples of the limit to go through pages (e.g. limit = 3, offset = 6 results in a request
	 * for page 3, giving you the values from 7 to 9)
	 * @param offset Offset for offset-based pagination
	 * @param limit Limit for offset-based pagination
	 * @param nameQuery Filter to apply to the name of learning paths pre application of offset and limit
	 * @param tags A list of tags that all learning paths must contain pre application of offset and limit
	 * @param orderBy Order of the returned list
	 * @param issuerId Optional filter by issuer entity_id
	 * @param activated Optional filter by activation status (only applicable for staff users)
	 * @returns An object containing the url of the next and previous page
	 * (if any) and the contents of the given page as array of learning path objects
	 */
	async getLearningPaths(
		offset: number = 0,
		limit: number = 20,
		nameQuery?: string,
		tags?: string[],
		orderBy?: 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc',
		issuerId?: string,
		activated?: boolean,
	): Promise<PaginatedLearningPath | null> {
		try {
			let params = new HttpParams({
				fromObject: {
					offset: offset,
					limit: limit,
				},
			});

			if (nameQuery) params = params.append('name', nameQuery);
			if (tags && tags.length > 0) params = params.append('tags', tags.join(','));
			if (orderBy) {
				const ascOrDesc = orderBy.indexOf('asc') > -1 ? '' : '-';
				const nameOrDate = orderBy.indexOf('name') > -1 ? 'name' : 'created_at';
				// backend expects e.g. a '-name' for descending ordering of the name property and
				// e.g. 'name' for ascending ordering. Same for 'created_at'
				params = params.append('ordering', `${ascOrDesc}${nameOrDate}`);
			}
			if (issuerId) params = params.append('issuer_id', issuerId);
			if (activated !== undefined) params = params.append('activated', activated.toString());

			const response = await this.get<PaginatedLearningPath>(
				`${this.baseUrl}/${ENDPOINT}/learningpaths/`,
				params,
			);

			if (response.ok)
				return {
					...response.body,
					results: response.body.results.map((r) => new LearningPathV3(r)),
				};
			else {
				console.warn(
					`Paginated request to get learning paths did not return ok, got ${response.status}: ${response.statusText}`,
				);
				return null;
			}
		} catch (e) {
			console.warn(e);
			return null;
		}
	}

	/**
	 * Gets a paginated list of networks, optionally filtered by name.
	 * Offset-based pagination is used, so pagination is achieved by setting the limit and offset
	 * by multiples of the limit to go through pages (e.g. limit = 3, offset = 6 results in a request
	 * for page 3, giving you the values from 7 to 9)
	 * @param offset Offset for offset-based pagination
	 * @param limit Limit for offset-based pagination
	 * @param nameQuery Filter to apply to the name of networks pre application of offset and limit
	 * @param orderBy Order of the returned list
	 * @returns An object containing the url of the next and previous page
	 * (if any) and the contents of the given page as array of network objects
	 */
	async getNetworks(
		offset: number = 0,
		limit: number = 20,
		nameQuery?: string,
		orderBy?: 'name_asc' | 'name_desc',
	): Promise<PaginatedNetwork | null> {
		try {
			let params = new HttpParams({
				fromObject: {
					offset: offset,
					limit: limit,
				},
			});

			if (nameQuery) params = params.append('name', nameQuery);
			if (orderBy) {
				const ascOrDesc = orderBy.indexOf('asc') > -1 ? '' : '-';
				const nameOrDate = orderBy.indexOf('name') > -1 ? 'name' : 'created_at';
				params = params.append('ordering', `${ascOrDesc}${nameOrDate}`);
			}

			const response = await this.get<PaginatedNetwork & { results: INetworkV3[] }>(
				`${this.baseUrl}/${ENDPOINT}/networks/`,
				params,
			);

			if (response.ok && response.body) {
				return {
					...response.body,
					results: response.body.results.map((r) => new NetworkV3(r)),
				};
			} else {
				return null;
			}
		} catch (e) {
			return null;
		}
	}
}

export interface Paginated<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}

export type PaginatedBadgeClass = Paginated<BadgeClassV3>;
export type PaginatedIssuer = Paginated<IssuerV3>;
export type PaginatedLearningPath = Paginated<LearningPathV3>;
export type PaginatedNetwork = Paginated<NetworkV3>;
