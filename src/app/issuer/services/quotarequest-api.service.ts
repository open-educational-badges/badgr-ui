import { Injectable, inject } from '@angular/core';
import { BaseHttpApiService } from '../../common/services/base-http-api.service';
import { AppConfigService } from '../../common/app-config.service';
import { MessageService } from '../../common/services/message.service';
import { HttpClient } from '@angular/common/http';
import { AUTH_PROVIDER, AuthenticationService } from '~/common/services/authentication-service';
import { ApiQuotaRequest } from '../models/quotarequest-api.model';

@Injectable({ providedIn: 'root' })
export class QuotaRequestApiService extends BaseHttpApiService {
	protected loginService: AuthenticationService;
	protected http: HttpClient;
	protected configService: AppConfigService;
	protected messageService: MessageService;

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

	createUpgradeQuotaRequest(issuerSlug: string, quotaRequest: ApiQuotaRequest) {
		return this.post<ApiQuotaRequest>(`/v1/issuer/issuers/${issuerSlug}/upgradeQuota`, quotaRequest).then(
			(r) => r.body,
		);
	}
}
