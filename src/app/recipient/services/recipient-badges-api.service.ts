import { Injectable, inject } from '@angular/core';
import { AppConfigService } from '../../common/app-config.service';
import { BaseHttpApiService } from '../../common/services/base-http-api.service';
import {
	ApiImportedBadgeInstance,
	ApiRecipientBadgeInstance,
	RecipientBadgeInstanceCreationInfo,
} from '../models/recipient-badge-api.model';
import { MessageService } from '../../common/services/message.service';
import { HttpClient } from '@angular/common/http';
import { CommonEntityManager } from '../../entity-manager/services/common-entity-manager.service';
import { RecipientBadgeInstance } from '../models/recipient-badge.model';
import { ApiRootSkill } from '../../common/model/ai-skills.model';
import { AUTH_PROVIDER, AuthenticationService } from '~/common/services/authentication-service';

@Injectable({ providedIn: 'root' })
export class RecipientBadgeApiService extends BaseHttpApiService {
	protected loginService: AuthenticationService;
	protected http: HttpClient;
	protected configService: AppConfigService;
	protected messageService: MessageService;
	protected commonEntityManager = inject(CommonEntityManager);

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

	listRecipientBadges() {
		return this.get<ApiRecipientBadgeInstance[]>(`/v1/earner/badges?json_format=plain&include_pending=true`).then(
			(r) => r.body,
		);
	}

	listImportedBadges() {
		return this.get<ApiImportedBadgeInstance[]>('/v1/earner/imported-badges').then((importedBadges) =>
			importedBadges.body.map((badge) => this.convertToRecipientBadgeInstance(badge)),
		);
	}

	getSkills(language = 'de'): Promise<ApiRootSkill[]> {
		return this.get<{ skills: ApiRootSkill[] }>('/v1/earner/skills', {
			lang: language,
		}).then((r) => r.body.skills);
	}

	getImportedBadge(slug: string): Promise<ApiImportedBadgeInstance> {
		return this.get<ApiImportedBadgeInstance>(`/v1/earner/imported-badges/${slug}`).then((r) => r.body);
	}

	deleteImportedBadge(slug: string): Promise<void> {
		return this.delete(`/v1/earner/imported-badges/${slug}`).then((r) => void 0);
	}

	removeRecipientBadge(instanceSlug: string): Promise<void> {
		return this.delete(`/v1/earner/badges/${instanceSlug}`).then((r) => void 0);
	}

	addRecipientBadge(badgeInfo: RecipientBadgeInstanceCreationInfo) {
		return this.post<ApiRecipientBadgeInstance>('/v1/earner/imported-badges?json_format=plain', badgeInfo).then(
			(r) => r.body,
		);
	}

	saveInstance(apiModel: ApiRecipientBadgeInstance) {
		return this.put<ApiRecipientBadgeInstance>(`/v1/earner/badges/${apiModel.id}?json_format=plain`, apiModel).then(
			(r) => r.body,
		);
	}

	getBadgeShareUrlForProvider(objectIdUrl, shareServiceType, includeIdentifier): Promise<string> {
		const idUrl = objectIdUrl.replace(/.*\//, '');
		const include_identifier = includeIdentifier ? '&include_identifier=1' : '';
		return this.get<{ url: string }>(
			`/v1/earner/share/badge/${idUrl}?provider=${shareServiceType}&source=badgr-ui&redirect=0${include_identifier}`,
		).then((r) => r.body.url);
	}

	getCollectionShareUrlForProvider(objectIdUrl, shareServiceType): Promise<string> {
		const idUrl = objectIdUrl.replace(/.*\//, '');
		return this.get<{ url: string }>(
			`/v1/earner/share/collection/${idUrl}?provider=${shareServiceType}&source=badgr-ui&redirect=0`,
		).then((r) => r.body.url);
	}

	convertToRecipientBadgeInstance(importedBadge: ApiImportedBadgeInstance): RecipientBadgeInstance {
		const apiModel: ApiRecipientBadgeInstance & { imported: boolean } = {
			id: importedBadge.id,
			recipient_identifier: importedBadge.json.recipient.identity,
			acceptance: importedBadge.acceptance,
			narrative: importedBadge.narrative || null,
			evidence_items: [],
			pending: false,
			extensions: [],
			json: {
				id: '',
				type: 'Assertion',
				uid: '',
				recipient: {
					type: importedBadge.json.recipient.type,
					recipient: importedBadge.json.recipient.identity,
				},
				badge: {
					id: String(importedBadge.id),
					type: 'BadgeClass',
					name: importedBadge.json.badge.name,
					description: importedBadge.json.badge.description,
					image: importedBadge.json.badge.image,
					// criteria: importedBadge.criteria || '',
					// criteria_text: importedBadge.criteriaText || '',
					issuer: {
						id: importedBadge.json.badge.issuer.name,
						slug: importedBadge.slug,
						type: 'Issuer',
						name: importedBadge.json.badge.issuer.name,
						url: importedBadge.json.badge.issuer.url,
						description: '',
						image: importedBadge.json.badge.issuer.image,
						email: importedBadge.json.badge.issuer.email,
					},
					tags: [],
					slug: '',
					alignment: [],
				},
				issuedOn: String(importedBadge.json.issuedOn),
				image: importedBadge.json.badge.image,
			},
			imported: true,
			image: importedBadge.json.badge.image,
			imagePreview: importedBadge.imagePreview,
			isNetworkBadge: false,
			networkImage: null,
			networkName: null,
			sharedOnNetwork: {
				description: null,
				image: null,
				name: '',
				slug: '',
			},
		};

		return new RecipientBadgeInstance(this.commonEntityManager, apiModel);
	}
}
