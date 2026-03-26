import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AppConfigService } from '../app-config.service';
import { AiSkillsResult, ApiSkill } from '../model/ai-skills.model';
import { BaseHttpApiService } from './base-http-api.service';
import { MessageService } from './message.service';
import { AUTH_PROVIDER, AuthenticationService } from './authentication-service';
import { IssuerSlug } from '~/issuer/models/issuer-api.model';

@Injectable({ providedIn: 'root' })
export class AiSkillsService extends BaseHttpApiService {
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

	getAiSkillsResult(textToAnalyze: string, issuerSlug: IssuerSlug | null = null): Promise<AiSkillsResult> {
		return this.post<AiSkillsResult>(issuerSlug ? `/v1/issuer/issuers/${issuerSlug}/aiskills` : `/aiskills/`, {
			text: textToAnalyze,
		}).then(
			(r) => r.body as AiSkillsResult,
			(error) => {
				throw new Error(JSON.parse(error.message).error);
			},
		);
	}

	getAiSkills(textToAnalyze: string): Promise<ApiSkill[]> {
		return this.getAiSkillsResult(textToAnalyze).then(
			(result: AiSkillsResult) => result.skills,
			(error) => {
				throw error;
			},
		);
	}
	getAiSkillsForIssuer(textToAnalyze: string, issuerSlug: IssuerSlug): Promise<ApiSkill[]> {
		return this.getAiSkillsResult(textToAnalyze, issuerSlug).then(
			(result: AiSkillsResult) => result.skills,
			(error) => {
				throw error;
			},
		);
	}

	getAiKeywordSkillsResult(query: string, language: string): Promise<AiSkillsResult> {
		return this.post<AiSkillsResult>(`/aiskills-keywords/`, {
			keyword: query,
			lang: language,
		}).then(
			(r) => r.body as AiSkillsResult,
			(error) => {
				throw new Error(JSON.parse(error.message).error);
			},
		);
	}

	getAiKeywordSkills(query: string, language = 'de'): Promise<ApiSkill[]> {
		return this.getAiKeywordSkillsResult(query, language).then(
			(result: AiSkillsResult) => result.skills,
			(error) => {
				throw error;
			},
		);
	}
}
