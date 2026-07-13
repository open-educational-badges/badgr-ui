import { Injectable } from '@angular/core';
import { BaseHttpApiService } from '../../common/services/base-http-api.service';
import { SessionService } from '../../common/services/session.service';
import { AppConfigService } from '../../common/app-config.service';
import { MessageService } from '../../common/services/message.service';
import { HttpClient } from '@angular/common/http';
import { ApiPDFTemplate, ApiPDFTemplateForCreation } from '../../common/model/pdftemplate-api.model';

@Injectable({ providedIn: 'root' })
export class PDFTemplateApiService extends BaseHttpApiService {
	pdfEditorAvailable: boolean = true;

	constructor(
		protected loginService: SessionService,
		protected http: HttpClient,
		protected configService: AppConfigService,
		protected messageService: MessageService,
	) {
		super(loginService, http, configService, messageService);
	}

	getPDFTemplate(issuerSlug: string, ptSlug: string) {
		return this.get<ApiPDFTemplate>(`/v1/issuer/issuers/${issuerSlug}/pdftemplate/${ptSlug}`).then((r) => r.body);
	}

	getPDFTemplatesForIssuer(issuerSlug: string) {
		return this.get<ApiPDFTemplate[]>(`/v1/issuer/issuers/${issuerSlug}/pdftemplate`)
			.catch((e) => {
				// handle pdfEditor Plugin not installed
				if (e.response.status === 404) {
					this.pdfEditorAvailable = false;
					return { body: [] };
				}
			})
			.then((r) => r.body);
	}

	createPDFTemplate(issuerSlug: string, pdfTemplate: ApiPDFTemplateForCreation) {
		return this.post<ApiPDFTemplate>(`/v1/issuer/issuers/${issuerSlug}/pdftemplate`, pdfTemplate).then(
			(r) => r.body,
		);
	}

	updatePDFTemplate(issuerSlug: string, ptSlug: string, updatedPT: ApiPDFTemplate) {
		return this.put<ApiPDFTemplate>(`/v1/issuer/issuers/${issuerSlug}/pdftemplate/${ptSlug}`, updatedPT).then(
			(r) => r.body,
		);
	}

	deletePDFTemplate(issuerSlug: string, ptSlug: string) {
		return this.delete(`/v1/issuer/issuers/${issuerSlug}/pdftemplate/${ptSlug}`);
	}
}
