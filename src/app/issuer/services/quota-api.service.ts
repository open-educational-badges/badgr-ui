import { BaseHttpApiService } from '../../common/services/base-http-api.service';
import { Injectable, inject } from '@angular/core';
import { AppConfigService } from '../../common/app-config.service';
import { MessageService } from '../../common/services/message.service';
import { HttpClient } from '@angular/common/http';
import { AUTH_PROVIDER, AuthenticationService } from '~/common/services/authentication-service';
import { QuotaApiResponse } from '../models/quotas.model';

@Injectable({ providedIn: 'root' })
export class QuotaApiService extends BaseHttpApiService {
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

	getQuotas() {
		return this.get<QuotaApiResponse>(`/v3/issuer/quotas`).then((r) => r.body);
	}
}
