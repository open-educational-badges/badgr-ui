import { HttpClient } from '@angular/common/http';
import { Injectable, SecurityContext, inject } from '@angular/core';
import { AppConfigService } from '../app-config.service';
import { MessageService } from './message.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { map } from 'rxjs';
import { AUTH_PROVIDER } from './authentication-service';

export type PdfResourceType = 'badges' | 'collections';

@Injectable({ providedIn: 'root' })
export class PdfService {
	protected loginService = inject(AUTH_PROVIDER);
	protected http = inject(HttpClient);
	protected configService = inject(AppConfigService);
	protected messageService = inject(MessageService);
	private sanitizer = inject(DomSanitizer);

	baseUrl: string;

	constructor() {
		this.baseUrl = this.configService.apiConfig.baseUrl;
	}

	getPdf(slug: string, resource: PdfResourceType): Promise<SafeResourceUrl> {
		return this.http
			.get(`${this.baseUrl}/v1/earner/${resource}/pdf/${slug}`, {
				responseType: 'blob',
				withCredentials: true,
			})
			.pipe(
				map((response: Blob) => {
					const url = URL.createObjectURL(response);
					// sanitize the url before avoiding security check
					const safe_url = this.sanitizer.sanitize(SecurityContext.URL, url);
					return this.sanitizer.bypassSecurityTrustResourceUrl(safe_url);
				}),
			)
			.toPromise();
	}

	downloadPdf(pdfSrc: SafeResourceUrl, badgeName: string, issueDate: Date) {
		const link = document.createElement('a');
		// https://stackoverflow.com/questions/55849415/type-saferesourceurl-is-not-assignable-to-type-string
		const url = this.sanitizer.sanitize(SecurityContext.RESOURCE_URL, pdfSrc);
		link.href = url;
		link.download = `${issueDate.toISOString().split('T')[0]}-${badgeName}.pdf`;
		link.click();
	}
}
