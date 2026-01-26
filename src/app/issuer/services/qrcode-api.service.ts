import { Injectable, inject } from '@angular/core';
import { BaseHttpApiService } from '../../common/services/base-http-api.service';
import { AppConfigService } from '../../common/app-config.service';
import { ApiQRCode } from '../models/qrcode-api.model';
import { MessageService } from '../../common/services/message.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { ApiIssuer } from '../models/issuer-api.model';
import { AUTH_PROVIDER, AuthenticationService } from '~/common/services/authentication-service';

@Injectable({ providedIn: 'root' })
export class QrCodeApiService extends BaseHttpApiService {
	protected loginService: AuthenticationService;
	protected http: HttpClient;
	protected configService: AppConfigService;
	protected messageService: MessageService;
	private sanitizer = inject(DomSanitizer);

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

	getQrCode(issuerSlug: string, badgeClassSlug: string, qrSlug: string) {
		return this.get<ApiQRCode>(`/v1/issuer/issuers/${issuerSlug}/badges/${badgeClassSlug}/qrcodes/${qrSlug}`).then(
			(r) => r.body,
		);
	}

	createQrCode(issuerSlug: string, badgeClassSlug: string, qrCode: ApiQRCode) {
		return this.post<ApiQRCode>(`/v1/issuer/issuers/${issuerSlug}/badges/${badgeClassSlug}/qrcodes`, qrCode).then(
			(r) => r.body,
		);
	}

	updateQrCode(issuerSlug: string, badgeClassSlug: string, qrCodeSlug: string, updatedQrCode: ApiQRCode) {
		return this.put<ApiQRCode>(
			`/v1/issuer/issuers/${issuerSlug}/badges/${badgeClassSlug}/qrcodes/${qrCodeSlug}`,
			updatedQrCode,
		).then((r) => r.body);
	}

	deleteQrCode(issuerSlug: string, badgeClassSlug: string, qrCodeSlug: string) {
		return this.delete(`/v1/issuer/issuers/${issuerSlug}/badges/${badgeClassSlug}/qrcodes/${qrCodeSlug}`);
	}

	getQrCodesForIssuerByBadgeClass(issuerSlug: string, badgeClassSlug: string) {
		return this.get<ApiQRCode[]>(`/v1/issuer/issuers/${issuerSlug}/badges/${badgeClassSlug}/qrcodes`).then(
			(r) => r.body,
		);
	}

	getQrCodesForNetworkBadge(networkSlug: string, badgeSlug: string) {
		return this.get<{
			[issuerSlug: string]: {
				issuer: ApiIssuer;
				qrcodes: ApiQRCode[];
				staff: boolean;
			};
		}>(`/v1/issuer/networks/${networkSlug}/badges/${badgeSlug}/qrcodes`).then((r) => r.body);
	}

	getQrCodePdf(slug: string, badgeSlug: string, base64QrImage: string): Observable<Blob> {
		const imageData = {
			image: base64QrImage,
		};
		return this.http.post(`${this.baseUrl}/download-qrcode/${slug}/${badgeSlug}`, imageData, {
			responseType: 'blob',
			withCredentials: true,
		});
	}

	downloadQrCode(blob: Blob, qrCodeName: string, badgeName: string): void {
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${qrCodeName}.pdf`;
		link.click();
		window.URL.revokeObjectURL(url);
	}
}
