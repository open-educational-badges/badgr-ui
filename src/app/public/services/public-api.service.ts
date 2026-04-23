import { Injectable, inject } from '@angular/core';
import { BaseHttpApiService } from '../../common/services/base-http-api.service';
import { AppConfigService } from '../../common/app-config.service';
import { MessageService } from '../../common/services/message.service';
import {
	PublicApiBadgeAssertion,
	PublicApiBadgeAssertionWithBadgeClass,
	PublicApiBadgeClass,
	PublicApiBadgeClassWithIssuer,
	PublicApiBadgeCollectionWithBadgeClassAndIssuer,
	PublicApiIssuer,
	PublicApiLearningPath,
} from '../models/public-api.model';
import { stripQueryParamsFromUrl } from '../../common/util/url-util';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApiV2Wrapper } from '../../common/model/api-v2-wrapper';
import { Issuer } from '../../issuer/models/issuer.model';
import { AUTH_PROVIDER, AuthenticationService } from '~/common/services/authentication-service';

@Injectable({ providedIn: 'root' })
export class PublicApiService extends BaseHttpApiService {
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

	getBadgeAssertion(assertionId: string) {
		const url = assertionId.startsWith('http')
			? assertionId
			: `/public/assertions/${assertionId}.json?expand=badge&expand=badge.issuer`;

		return this.get<PublicApiBadgeAssertionWithBadgeClass>(url, null, false, false)
			.then((r) => r.body)
			.then((assertion) =>
				typeof assertion.badge === 'string'
					? this.getBadgeClass(assertion.badge).then((badge) => ({ ...assertion, badge }))
					: assertion,
			);
	}

	verifyBadgeAssertion(entityId: string): Promise<ApiV2Wrapper<PublicApiBadgeAssertion>> {
		const payload = { entity_id: entityId };
		return this.post<ApiV2Wrapper<PublicApiBadgeAssertion>>(
			'/public/verify?json_format=plain',
			payload,
			null,
			new HttpHeaders(),
			false,
			false,
		).then((r) => r.body);
	}

	getBadgeClass(badgeId: string): Promise<PublicApiBadgeClassWithIssuer> {
		const url = badgeId.startsWith('http') ? badgeId : `/public/badges/${badgeId}?expand=issuer`;

		return this.get<PublicApiBadgeClassWithIssuer>(url, null, false, false)
			.then((r) => r.body)
			.then((badge) =>
				typeof badge.issuer === 'string'
					? this.getIssuer(badge.issuer).then((issuer) => ({ ...badge, issuer }))
					: badge,
			);
	}

	getIssuer(issuerId: string): Promise<PublicApiIssuer> {
		const url = issuerId.startsWith('http') ? issuerId : `/public/issuers/${issuerId}`;

		return this.get<PublicApiIssuer>(url, null, false, false).then((r) => r.body);
	}

	getNetworkWithIssuers(networkId: string): Promise<{ network: PublicApiIssuer; issuers: PublicApiIssuer[] }> {
		return Promise.all([this.getIssuer(networkId), this.getNetworkIssuers(networkId)]).then(
			([network, issuers]) => ({
				network,
				issuers,
			}),
		);
	}

	getIssuerBadges(issuerId: string): Promise<PublicApiBadgeClass[]> {
		const url = issuerId.startsWith('http')
			? stripQueryParamsFromUrl(issuerId) + '/badges'
			: `/public/issuers/${issuerId}/badges`;

		return this.get<PublicApiBadgeClass[]>(url, null, false, false).then((r) => r.body);
	}

	getIssuerLearningPaths(issuerId: string): Promise<PublicApiLearningPath[]> {
		const url = issuerId.startsWith('http')
			? stripQueryParamsFromUrl(issuerId) + '/learningpaths'
			: `/public/issuers/${issuerId}/learningpaths`;

		return this.get<PublicApiLearningPath[]>(url, null, false, false).then((r) => r.body);
	}

	getIssuerNetworks(issuerId: string): Promise<PublicApiIssuer[]> {
		const url = issuerId.startsWith('http')
			? stripQueryParamsFromUrl(issuerId) + '/networks'
			: `/public/issuers/${issuerId}/networks`;

		return this.get<PublicApiIssuer[]>(url, null, false, false).then((r) => r.body);
	}

	getNetworkIssuers(networkId: string): Promise<PublicApiIssuer[]> {
		const url = networkId.startsWith('http')
			? stripQueryParamsFromUrl(networkId) + '/issuers'
			: `/public/networks/${networkId}/issuers`;

		return this.get<PublicApiIssuer[]>(url, null, false, false).then((r) => r.body);
	}

	getIssuerWithRelations(issuerId: string): Promise<{
		issuer: PublicApiIssuer;
		badges: PublicApiBadgeClass[];
		learningpaths: PublicApiLearningPath[];
		networks: PublicApiIssuer[];
		partner_issuers: PublicApiIssuer[];
	}> {
		return Promise.all([
			this.getIssuer(issuerId),
			this.getIssuerBadges(issuerId),
			this.getIssuerLearningPaths(issuerId),
			this.getIssuerNetworks(issuerId),
			this.getNetworkIssuers(issuerId),
		]).then(([issuer, badges, learningpaths, networks, partner_issuers]) => ({
			issuer,
			badges,
			learningpaths,
			networks,
			partner_issuers,
		}));
	}

	getIssuerWithlearningPaths(
		issuerId: string,
	): Promise<{ issuer: PublicApiIssuer; learningPaths: PublicApiLearningPath[] }> {
		return Promise.all([this.getIssuer(issuerId), this.getIssuerLearningPaths(issuerId)]).then(
			([issuer, learningPaths]) => ({
				issuer,
				learningPaths,
			}),
		);
	}

	getBadgeCollection(shareHash: string): Promise<PublicApiBadgeCollectionWithBadgeClassAndIssuer> {
		return this.get<PublicApiBadgeCollectionWithBadgeClassAndIssuer>(
			`/public/collections/${shareHash}.json?expand=badges.badge&expand=badges.badge.issuer`,
			null,
			false,
			false,
		).then((r) => r.body);
	}

	getLearningPath(lpId: string) {
		const url = lpId.startsWith('http') ? lpId : `/public/learningpaths/${lpId}`;

		return this.get<PublicApiLearningPath>(url, null, false, true).then((r) => r.body);
	}

	getLearningPathsForBadgeClass(badgeClassSlug: string) {
		const url = badgeClassSlug.startsWith('http')
			? badgeClassSlug
			: `/public/badges/${badgeClassSlug}/learningpaths`;

		return this.get<PublicApiLearningPath[]>(url, null, false, true).then((r) => r.body);
	}

	getQrCode(qrCodeSlug: string) {
		return this.get(`/public/qrcode/${qrCodeSlug}`).then((response) => response.body);
	}

	searchIssuers(searchterm: string) {
		return this.get<Issuer[]>(`/public/issuers/search/${searchterm}`).then((response) => response.body);
	}
}
