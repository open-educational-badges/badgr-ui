import { Injectable, inject } from '@angular/core';
import { BaseHttpApiService } from '../../common/services/base-http-api.service';
import { AppConfigService } from '../../common/app-config.service';
import {
	ApiLearningPath,
	ApiLearningPathForCreation,
	ApiLearningPathParticipant,
} from '../../common/model/learningpath-api.model';
import { MessageService } from '../../common/services/message.service';
import { HttpClient } from '@angular/common/http';
import { AUTH_PROVIDER, AuthenticationService } from './authentication-service';

@Injectable({ providedIn: 'root' })
export class LearningPathApiService extends BaseHttpApiService {
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

	getLearningPath(issuerSlug: string, lpSlug: string) {
		return this.get<ApiLearningPath>(`/v1/issuer/issuers/${issuerSlug}/learningpath/${lpSlug}`).then((r) => r.body);
	}

	getPublicLearningPath(lpSlug: string) {
		return this.get<ApiLearningPath>(`/public/learningpaths/${lpSlug}`, null, false, true).then((r) => r.body);
	}

	getLearningPathsForIssuer(issuerSlug: string) {
		return this.get<ApiLearningPath[]>(`/v1/issuer/issuers/${issuerSlug}/learningpath`).then((r) => r.body);
	}

	getLearningPathsForBadgeClass(badgeClassSlug: string) {
		return this.get<ApiLearningPath[]>(`/public/badges/${badgeClassSlug}/learningpaths`).then((r) => r.body);
	}

	getLearningPathsForUser() {
		return this.get<ApiLearningPath[]>(`/v1/user/learningpaths`).then((r) => r.body);
	}

	getAllLearningPaths() {
		return this.get<ApiLearningPath[]>(`/public/all-learningpaths`, {}, false).then((r) => r.body);
	}

	createLearningPath(issuerSlug: string, learningPath: ApiLearningPathForCreation) {
		return this.post<ApiLearningPath>(`/v1/issuer/issuers/${issuerSlug}/learningpath`, learningPath).then(
			(r) => r.body,
		);
	}

	updateLearningPath(issuerSlug: string, lpSlug: string, updatedLP: ApiLearningPath) {
		return this.put<ApiLearningPath>(`/v1/issuer/issuers/${issuerSlug}/learningpath/${lpSlug}`, updatedLP).then(
			(r) => r.body,
		);
	}

	deleteLearningPath(issuerSlug: string, lpSlug: string) {
		return this.delete(`/v1/issuer/issuers/${issuerSlug}/learningpath/${lpSlug}`);
	}

	deleteLearningPathRequest(reqId: string) {
		return this.delete(`/deleteLpRequest/${reqId}`);
	}

	participateInLearningPath(lpSlug: string, body: any = null) {
		return this.post(`/learningpath/${lpSlug}/participate`, body);
	}

	getLearningPathParticipants(lpSlug: string) {
		return this.get<ApiLearningPathParticipant[]>(`/v1/issuer/learningpath/${lpSlug}/participants`);
	}
}
