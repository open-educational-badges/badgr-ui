import { Injectable, inject } from '@angular/core';
import { BaseHttpApiService } from '../../common/services/base-http-api.service';
import { AppConfigService } from '../../common/app-config.service';
import { IssuerSlug } from '../models/issuer-api.model';
import { BadgeClassSlug } from '../models/badgeclass-api.model';
import {
	ApiBadgeInstance,
	ApiBadgeInstanceForBatchCreation,
	ApiBadgeInstanceForCreation,
	BadgeInstanceResultSetV3,
} from '../models/badgeinstance-api.model';
import { MessageService } from '../../common/services/message.service';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { AUTH_PROVIDER, AuthenticationService } from '~/common/services/authentication-service';

export class PaginationResults {
	private _links = {};

	constructor(linkHeader?: string) {
		if (linkHeader) {
			this.parseLinkHeader(linkHeader);
		}
	}
	parseLinkHeader(linkHeader: string) {
		const re = /<([^>]+)>; rel="([^"]+)"/g;
		let match;
		do {
			match = re.exec(linkHeader);
			if (match) {
				this._links[match[2]] = match[1];
			}
		} while (match);
	}

	get hasNext(): boolean {
		return 'next' in this._links;
	}
	get hasPrev(): boolean {
		return 'prev' in this._links;
	}
	get nextUrl() {
		return this._links['next'];
	}
	get prevUrl() {
		return this._links['prev'];
	}
}
export class BadgeInstanceResultSet {
	instances: ApiBadgeInstance[];
	links: PaginationResults;
}

@Injectable({ providedIn: 'root' })
export class BadgeInstanceApiService extends BaseHttpApiService {
	protected loginService: AuthenticationService;
	protected http: HttpClient;
	protected configService: AppConfigService;
	protected messageService: MessageService;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const loginService = inject(AUTH_PROVIDER);
		const http = inject(HttpClient);
		const configService = inject(AppConfigService);
		const messageService = inject(MessageService);

		super(loginService, http, configService, messageService);

		this.loginService = loginService;
		this.http = http;
		this.configService = configService;
		this.messageService = messageService;
	}

	createBadgeInstance(
		issuerSlug: IssuerSlug,
		badgeSlug: BadgeClassSlug,
		creationInstance: ApiBadgeInstanceForCreation,
	) {
		return this.post<ApiBadgeInstance>(
			`/v1/issuer/issuers/${issuerSlug}/badges/${badgeSlug}/assertions`,
			creationInstance,
		).then((r) => r.body);
	}

	createBadgeInstanceBatched(
		issuerSlug: IssuerSlug,
		badgeSlug: BadgeClassSlug,
		batchCreationInstance: ApiBadgeInstanceForBatchCreation,
	) {
		return this.post<ApiBadgeInstance[]>(
			`/v1/issuer/issuers/${issuerSlug}/badges/${badgeSlug}/batchAssertions`,
			batchCreationInstance,
		).then((r) => r.body);
	}

	createBadgeInstanceBatchedAsync(
		issuerSlug: IssuerSlug,
		badgeSlug: BadgeClassSlug,
		batchCreationInstance: ApiBadgeInstanceForBatchCreation,
	) {
		return this.post<any>(
			`/v1/issuer/issuers/${issuerSlug}/badges/${badgeSlug}/batchAssertions`,
			batchCreationInstance,
		);
	}

	listBadgeInstances(
		issuerSlug: string,
		badgeSlug: string,
		query?: string,
		num = 500,
	): Promise<BadgeInstanceResultSet> {
		let url = `/v1/issuer/issuers/${issuerSlug}/badges/${badgeSlug}/assertions?num=${num}`;
		if (query) {
			url += `&recipient=${query}`;
		}
		return this.get<ApiBadgeInstance[]>(url).then(this.handleAssertionResult);
	}

	listBadgeInstancesV3(
		issuerSlug?: string,
		badgeSlug?: string,
		query?: string,
		limit = 15,
		offset = 0,
		ordering = '-created_at',
	): Promise<BadgeInstanceResultSetV3> {
		const params = new URLSearchParams();

		if (issuerSlug) params.append('issuer', issuerSlug);
		if (badgeSlug) params.append('badgeclass', badgeSlug);
		if (query) params.append('recipient', query);
		params.append('limit', limit.toString());
		params.append('offset', offset.toString());
		params.append('ordering', ordering);

		const url = `/v3/badgeinstances?${params.toString()}`;
		return this.get(url).then((r) => r.body as BadgeInstanceResultSetV3);
	}

	listNetworkBadgeInstances(networkSlug: string, badgeSlug: string, num = 500): Promise<any> {
		let url = `/v1/issuer/issuers/${networkSlug}/badges/${badgeSlug}/network-assertions?num=${num}`;
		return this.get(url).then((r) => r.body);
	}

	getBadgeInstancePage(paginationUrl: string): Promise<BadgeInstanceResultSet> {
		return this.get<ApiBadgeInstance[]>(paginationUrl).then(this.handleAssertionResult);
	}

	revokeBadgeInstance(issuerSlug: string, badgeSlug: string, badgeInstanceSlug: string, revocationReason: string) {
		return this.delete(`/v1/issuer/issuers/${issuerSlug}/badges/${badgeSlug}/assertions/${badgeInstanceSlug}`, {
			revocation_reason: revocationReason,
		});
	}

	private handleAssertionResult = (r: HttpResponse<ApiBadgeInstance[]>) => {
		const resultset = new BadgeInstanceResultSet();

		if (r.headers.has('link')) {
			const link = r.headers.get('link');

			resultset.links = new PaginationResults(link);
		}

		resultset.instances = r.body || [];

		return resultset;
	};

	listPartnerIssuerBadgeInstances(issuerSlug: string, badgeSlug: string) {
		return this.get<ApiBadgeInstance[]>(`/v1/issuer/issuers/${issuerSlug}/badges/${badgeSlug}/partner-awards`).then(
			(r) => r.body,
		);
	}
}
