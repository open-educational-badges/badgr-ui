import { Injectable, inject } from '@angular/core';
import { BaseHttpApiService } from './base-http-api.service';
import { AppConfigService } from '../app-config.service';
import { MessageService } from './message.service';
import { HttpClient } from '@angular/common/http';
import { CmsApiMenu, CmsApiPage, CmsApiPost } from '../model/cms-api.model';
import { lastValueFrom } from 'rxjs';
import { LanguageService } from './language.service';
import { AUTH_PROVIDER, AuthenticationService } from './authentication-service';
import { CacheService } from './cache.service';

const CMS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Skip caching error responses (e.g. 404 for an unpublished slug) so a client
// doesn't get stuck seeing "not found" for the full TTL if the page goes live.
const isOkResponse = <T>(body: T): boolean => {
	const status = (body as { data?: { status?: number } } | null | undefined)?.data?.status;
	return !!body && (status === undefined || status === 200);
};

@Injectable({ providedIn: 'root' })
export class CmsApiService extends BaseHttpApiService {
	protected loginService: AuthenticationService;
	protected http: HttpClient;
	protected configService: AppConfigService;
	protected messageService: MessageService;
	protected languageService = inject(LanguageService);
	private cacheService = inject(CacheService);

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

	getMenus() {
		return this.get<CmsApiMenu>('/cms/menu/list/', null, false, false).then((r) => r.body);
	}

	getPageByID(ID: number) {
		return this.get<CmsApiPage>(`/cms/page/${ID}`, null, false, false).then((r) => r.body);
	}

	getPageBySlug(slug: string) {
		const lang = this.languageService.getSelectedLngValue();
		return this.cacheService.getOrFetch(
			`cms:page:${lang}:${slug}`,
			() => this.get<CmsApiPage>(`/cms/page/slug/`, { slug: slug }, false, false).then((r) => r.body),
			CMS_CACHE_TTL_MS,
			{ shouldCache: isOkResponse },
		);
	}

	getPostBySlug(slug: string) {
		const lang = this.languageService.getSelectedLngValue();
		return this.cacheService.getOrFetch(
			`cms:post:${lang}:${slug}`,
			() => this.get<CmsApiPage>(`/cms/post/slug/`, { slug: slug }, false, false).then((r) => r.body),
			CMS_CACHE_TTL_MS,
			{ shouldCache: isOkResponse },
		);
	}

	getPosts() {
		const lang = this.languageService.getSelectedLngValue();
		return this.cacheService.getOrFetch(
			`cms:posts:${lang}`,
			() => this.get<CmsApiPost[]>(`/cms/post/list/`, { lang }, false, false).then((r) => r.body),
			CMS_CACHE_TTL_MS,
		);
	}

	getStyles() {
		// lastValueFrom instead of deprecated .toPromise()
		return lastValueFrom(
			this.http.get(`${this.configService.apiConfig.baseUrl}/cms/style`, { responseType: 'text' }),
		);
	}
}
