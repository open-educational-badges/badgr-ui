import { Injectable, inject } from '@angular/core';
import { BaseHttpApiService } from '../../common/services/base-http-api.service';
import { AppConfigService } from '../../common/app-config.service';
import { BadgeClass } from '../models/badgeclass.model';
import { StandaloneEntitySet } from '../../common/model/managed-entity-set';
import {
	ApiBadgeClass,
	ApiBadgeClassForCreation,
	BadgeClassRef,
	BadgeClassSlug,
	BadgeClassUrl,
} from '../models/badgeclass-api.model';
import { CommonEntityManager } from '../../entity-manager/services/common-entity-manager.service';
import { BadgeClassApiService } from './badgeclass-api.service';
import { IssuerUrl } from '../models/issuer-api.model';
import { AnyRefType, EntityRef } from '../../common/model/entity-ref';
import { ManagedEntityGrouping } from '../../common/model/entity-set';
import { MessageService } from '../../common/services/message.service';
import { firstValueFrom, from, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { first, map } from 'rxjs/operators';
import { AUTH_PROVIDER, AuthenticationService } from '~/common/services/authentication-service';

@Injectable({ providedIn: 'root' })
export class BadgeClassManager extends BaseHttpApiService {
	protected loginService: AuthenticationService;
	protected http: HttpClient;
	protected configService: AppConfigService;
	protected commonEntityManager = inject(CommonEntityManager);
	badgeClassApi = inject(BadgeClassApiService);
	protected messageService: MessageService;

	private _networkBadgesBySlug = new Map<string, StandaloneEntitySet<BadgeClass, ApiBadgeClass>>();

	badgesList = new StandaloneEntitySet<BadgeClass, ApiBadgeClass>(
		(apiModel) => new BadgeClass(this.commonEntityManager),
		(apiModel) => apiModel.json.id,
		() => this.badgeClassApi.getAllUserBadgeClasses(),
	);
	allBadgesList = new StandaloneEntitySet<BadgeClass, ApiBadgeClass>(
		(apiModel) => new BadgeClass(this.commonEntityManager),
		(apiModel) => apiModel.json.id,
		() => this.badgeClassApi.getAllBadgeClasses(),
	);

	badgesByIssuerUrl = new ManagedEntityGrouping<BadgeClass>(this.badgesList, (badgeClass) => badgeClass.issuerUrl);

	get badgeClasses() {
		return this.badgesList.entities;
	}

	get badgeClassesByIssuerUrl(): { [issuerUrl: string]: BadgeClass[] } {
		return this.badgesByIssuerUrl.grouped;
	}

	get badgesByIssuerUrl$(): Observable<{ [issuerUrl: string]: BadgeClass[] }> {
		return this.badgesByIssuerUrl.loaded$;
	}

	get allBadges$(): Observable<BadgeClass[]> {
		return this.badgesList.loaded$.pipe(map((l) => l.entities));
	}

	get allPublicBadges$(): Observable<BadgeClass[]> {
		return this.allBadgesList.loaded$.pipe(map((l) => l.entities));
	}

	get loadedBadges$(): Observable<BadgeClass[]> {
		return this.badgesList.loaded$.pipe(map((l) => l.entities));
	}

	private getNetworkBadgesEntitySet(networkSlug: string): StandaloneEntitySet<BadgeClass, ApiBadgeClass> {
		if (!this._networkBadgesBySlug.has(networkSlug)) {
			const entitySet = new StandaloneEntitySet<BadgeClass, ApiBadgeClass>(
				(apiModel) => new BadgeClass(this.commonEntityManager),
				(apiModel) => apiModel.json.id,
				() => this.badgeClassApi.getNetworkBadgeClasses(networkSlug),
			);
			this._networkBadgesBySlug.set(networkSlug, entitySet);
		}
		return this._networkBadgesBySlug.get(networkSlug)!;
	}

	getNetworkBadgeClassesByIssuerUrl(networkSlug: string): { [issuerUrl: string]: BadgeClass[] } {
		const entitySet = this.getNetworkBadgesEntitySet(networkSlug);
		return entitySet.entities.reduce(
			(grouped, badge) => {
				const issuerUrl = badge.issuerUrl;
				if (!grouped[issuerUrl]) {
					grouped[issuerUrl] = [];
				}
				grouped[issuerUrl].push(badge);
				return grouped;
			},
			{} as { [issuerUrl: string]: BadgeClass[] },
		);
	}

	getNetworkBadgesByIssuerUrl$(networkSlug: string): Observable<{ [issuerUrl: string]: BadgeClass[] }> {
		const entitySet = this.getNetworkBadgesEntitySet(networkSlug);
		return entitySet.loaded$.pipe(map(() => this.getNetworkBadgeClassesByIssuerUrl(networkSlug)));
	}

	async getAwardableBadgesForIssuer(issuerSlug: string): Promise<BadgeClass[]> {
		const promise = this.badgeClassApi.getAwardableBadgesForIssuer(issuerSlug).then((apiBadges) =>
			apiBadges.map((apiModel) => {
				const badge = new BadgeClass(this.commonEntityManager);
				badge.applyApiModel(apiModel);
				return badge;
			}),
		);
		return promise;
	}

	getAwardableBadges$(issuerSlug: string): Observable<BadgeClass[]> {
		return from(this.getAwardableBadgesForIssuer(issuerSlug));
	}

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

	removeBadgeClass(badge: BadgeClass) {
		return this.badgeClassApi.deleteBadgeClass(badge.issuerSlug, badge.slug).then((response) => {
			this.allBadgesList.remove(badge);
			this.badgesList.remove(badge);
			this._networkBadgesBySlug.forEach((entitySet) => {
				entitySet.remove(badge);
			});
			return response;
		});
	}

	createBadgeClass(issuerSlug: string, newBadge: ApiBadgeClassForCreation): Promise<BadgeClass> {
		return this.badgeClassApi.createBadgeClass(issuerSlug, newBadge).then((retNewBadge) => {
			this.allBadgesList.addOrUpdate(retNewBadge);
			return this.badgesList.addOrUpdate(retNewBadge);
		});
	}

	createBadgeImage(issuerSlug: string, badgeSlug: string, category: string, useIssuerImage: boolean) {
		return this.badgeClassApi.createBadgeImage(issuerSlug, badgeSlug, category, useIssuerImage);
	}

	async badgeByIssuerSlugAndSlug(issuerSlug: string, badgeSlug: string): Promise<BadgeClass | null> {
		const badges = await this.getAwardableBadgesForIssuer(issuerSlug);
		return badges.find((badge) => badge.slug === badgeSlug) || null;
	}

	async badgeByIssuerUrlAndSlug(issuerId: IssuerUrl, badgeSlug: BadgeClassSlug): Promise<BadgeClass> {
		const badges = await firstValueFrom(this.allBadges$);

		const badgeOwnedByIssuer = badges.find((b) => b.issuerUrl === issuerId && b.slug === badgeSlug);
		if (badgeOwnedByIssuer) {
			return badgeOwnedByIssuer;
		}

		// If not found, check if it's a network badge this issuer can award
		const issuerSlug = (issuerId.match(/\/public\/issuers\/([^\/]+)/) || [])[1];

		if (!issuerSlug) {
			return this.throwError(`Invalid issuer URL format: '${issuerId}'`);
		}

		try {
			const awardableBadges = await this.getAwardableBadgesForIssuer(issuerSlug);
			const networkBadge = awardableBadges.find((b) => b.slug === badgeSlug);

			if (networkBadge) {
				return networkBadge;
			}
		} catch (error) {
			console.error('Error fetching awardable badges:', error);
		}

		return this.throwError(`Issuer ID '${issuerId}' has no badge with slug '${badgeSlug}'`);
	}

	badgeBySlug(badgeSlug: BadgeClassSlug): Promise<BadgeClass> {
		return this.allPublicBadges$
			.pipe(first())
			.toPromise()
			.then(
				(badges) =>
					badges.find((b) => b.slug === badgeSlug) ||
					this.throwError(`Badge with ID '${badgeSlug}' not found.'`),
			);
	}

	loadedBadgeByRef(badgeRef: BadgeClassRef | BadgeClassUrl): BadgeClass {
		const badgeUrl = EntityRef.urlForRef(badgeRef);

		return this.badgeClasses.find((b) => b.badgeUrl === badgeUrl);
	}

	loadedBadgeByIssuerIdAndSlug(issuerId: string, badgeSlug: string): BadgeClass {
		return this.badgeClasses.find((b) => b.issuerUrl === issuerId && b.slug === badgeSlug);
	}

	badgeByRef(badgeRef: AnyRefType): Promise<BadgeClass> {
		// TODO: How do we load a particular badge by ID... potentially one not local to this system?
		const badgeUrl = EntityRef.urlForRef(badgeRef);

		return this.allBadges$
			.pipe(first())
			.toPromise()
			.then(
				(badges) =>
					badges.find((b) => b.badgeUrl === badgeUrl) || this.throwError(`No badge with URL ${badgeUrl}`),
			);
	}

	badgesByUrls(badgeUrls: string[]): Promise<BadgeClass[]> {
		if (!badgeUrls || badgeUrls.length === 0) {
			return Promise.resolve([]);
		}

		return this.allBadges$
			.pipe(first())
			.toPromise()
			.then((badges) => badges.filter((b) => badgeUrls.indexOf(b.badgeUrl) >= 0));
	}

	publicBadgesByUrls(badgeUrls: string[]): Promise<BadgeClass[]> {
		if (!badgeUrls || badgeUrls.length === 0) {
			return Promise.resolve([]);
		}

		return this.allPublicBadges$
			.pipe(first())
			.toPromise()
			.then((badges) => badges.filter((b) => badgeUrls.indexOf(b.badgeUrl) >= 0));
	}

	issuerBadgeById(id: string): Promise<BadgeClass> {
		return this.badgeClassApi.getBadgeById(id).then((apiBadge) => {
			return new BadgeClass(this.commonEntityManager, apiBadge);
		});
	}

	private throwError(message: string): never {
		throw new Error(message);
	}
}
