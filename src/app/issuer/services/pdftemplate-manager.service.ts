import { forwardRef, Inject, Injectable, signal } from '@angular/core';
import { BaseHttpApiService } from '../../common/services/base-http-api.service';
import { SessionService } from '../../common/services/session.service';
import { AppConfigService } from '../../common/app-config.service';
import { CommonEntityManager } from '../../entity-manager/services/common-entity-manager.service';
import { MessageService } from '../../common/services/message.service';
import { HttpClient } from '@angular/common/http';
import { PDFTemplate } from '../models/pdftemplate.model';
import { ApiPDFTemplate, ApiPDFTemplateForCreation } from '../../common/model/pdftemplate-api.model';
import { PDFTemplateApiService } from '../../common/services/pdftemplate-api.service';

@Injectable({ providedIn: 'root' })
export class PDFTemplateManager extends BaseHttpApiService {
	pdfEditorAvailable = signal(false);

	constructor(
		protected loginService: SessionService,
		protected http: HttpClient,
		protected configService: AppConfigService,
		@Inject(forwardRef(() => CommonEntityManager))
		protected commonEntityManager: CommonEntityManager,
		public pdfTemplateApi: PDFTemplateApiService,
		protected messageService: MessageService,
	) {
		super(loginService, http, configService, messageService);
	}

	createPDFTemplate(issuerSlug: string, newPDFTemplate: ApiPDFTemplateForCreation): Promise<PDFTemplate> {
		return this.pdfTemplateApi.createPDFTemplate(issuerSlug, newPDFTemplate).then((retNewPDFTemplate) => {
			return new PDFTemplate(this.commonEntityManager, retNewPDFTemplate);
		});
	}

	async getPDFTemplateForIssuer(issuerSlug: string, ptSlug: string): Promise<PDFTemplate> {
		const apiPDFTemplate = await this.pdfTemplateApi.getPDFTemplate(issuerSlug, ptSlug);
		return new PDFTemplate(this.commonEntityManager, apiPDFTemplate);
	}

	async getPDFTemplatesForIssuer(issuerSlug: string): Promise<ApiPDFTemplate[]> {
		const pdftemplates = await this.pdfTemplateApi.getPDFTemplatesForIssuer(issuerSlug);

		this.pdfEditorAvailable.set(this.pdfTemplateApi.pdfEditorAvailable);

		return pdftemplates;
	}
}
