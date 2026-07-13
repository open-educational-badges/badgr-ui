import { Component, inject } from '@angular/core';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { SessionService } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { BadgrApiFailure } from '../../../common/services/api-failure';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { SuccessDialogComponent } from '../../../common/dialogs/oeb-dialogs/success-dialog.component';
import { Issuer } from '../../models/issuer.model';
import { IssuerManager } from '../../services/issuer-manager.service';
import { PDFTemplate } from '../../models/pdftemplate.model';
import { PDFTemplateEditFormComponent } from '../pdftemplate-edit-form/pdftemplate-edit-form.component';
import { ApiPDFTemplate } from '../../../common/model/pdftemplate-api.model';
import { HlmH1, HlmH2, HlmH3 } from '@spartan-ng/helm/typography';
import { PDFTemplateManager } from '../../services/pdftemplate-manager.service';

@Component({
	selector: 'pdftemplate-edit',
	templateUrl: './pdftemplate-edit.component.html',
	imports: [
		BgBreadcrumbsComponent,
		FormMessageComponent,
		HlmH1,
		HlmH2,
		HlmH3,
		BgAwaitPromises,
		PDFTemplateEditFormComponent,
		TranslatePipe,
	],
})
export class PDFTemplateEditComponent extends BaseAuthenticatedRoutableComponent {
	breadcrumbLinkEntries: LinkEntry[] = [];
	issuerSlug: string;
	ptSlug: string;
	issuer: Issuer;

	issuerLoaded: Promise<unknown>;
	pdfTemplateLoaded: Promise<unknown>;

	pdfTemplate: PDFTemplate;

	constructor(
		protected loginService: SessionService,
		protected messageService: MessageService,
		protected issuerManager: IssuerManager,
		protected router: Router,
		protected route: ActivatedRoute,
		private translate: TranslateService,
		protected pdfTemplateManager: PDFTemplateManager,
	) {
		super(router, route, loginService);
		this.issuerSlug = this.route.snapshot.params['issuerSlug'];
		this.ptSlug = this.route.snapshot.params['pdfTemplateSlug'];

		this.issuerLoaded = this.issuerManager.issuerBySlug(this.issuerSlug).then((issuer) => {
			this.issuer = issuer;
			this.breadcrumbLinkEntries = [
				{ title: 'Issuers', routerLink: ['/issuer'] },
				{
					title: this.issuer.name,
					routerLink: ['/issuer/issuers', this.issuerSlug],
				},
			];
		});

		this.pdfTemplateLoaded = this.loadPDFTemplate();
	}

	async loadPDFTemplate() {
		try {
			this.pdfTemplate = await this.pdfTemplateManager.getPDFTemplateForIssuer(this.issuerSlug, this.ptSlug);
			return this.pdfTemplate;
		} catch (error) {
			this.messageService.reportAndThrowError('Failed to load pdfTemplate', error);
		}
	}

	private readonly _hlmDialogService = inject(HlmDialogService);
	public openSuccessDialog() {
		const dialogRef = this._hlmDialogService.open(SuccessDialogComponent, {
			context: {
				text: this.translate.instant('PDFTemplate.createdSuccessfully'),
				variant: 'success',
			},
		});
	}

	pdfTemplateCreated(promise: Promise<PDFTemplate | ApiPDFTemplate>) {
		promise.then(
			(pt) => {
				this.router.navigate(['issuer/issuers', this.issuerSlug], { fragment: 'pdf-templates' }).then(() => {
					this.openSuccessDialog();
				});
			},
			(error) =>
				this.messageService.reportAndThrowError(
					`Unable to create PDF Template: ${BadgrApiFailure.from(error).firstMessage}`,
					error,
				),
		);
	}

	creationCanceled() {
		this.router.navigate(['issuer/issuers', this.issuerSlug], { fragment: 'pdf-templates' });
	}
}
