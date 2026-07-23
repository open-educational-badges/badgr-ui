import { Component, inject } from '@angular/core';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { SessionService } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { BadgrApiFailure } from '../../../common/services/api-failure';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { SuccessDialogComponent } from '../../../common/dialogs/oeb-dialogs/success-dialog.component';
import { Issuer } from '../../models/issuer.model';
import { Network } from '~/issuer/network.model';
import { IssuerManager } from '../../services/issuer-manager.service';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { PDFTemplate } from '../../models/pdftemplate.model';
import { PDFTemplateEditFormComponent } from '../pdftemplate-edit-form/pdftemplate-edit-form.component';
import { ApiPDFTemplate } from '../../../common/model/pdftemplate-api.model';
import { HlmH1, HlmH2 } from '@spartan-ng/helm/typography';

@Component({
	selector: 'pdftemplate-create',
	templateUrl: './pdftemplate-create.component.html',
	imports: [BgBreadcrumbsComponent, FormMessageComponent, HlmH1, HlmH2, PDFTemplateEditFormComponent, TranslatePipe],
})
export class PDFTemplateCreateComponent extends BaseAuthenticatedRoutableComponent {
	breadcrumbLinkEntries: LinkEntry[] = [];
	issuerSlug: string;
	issuer: Issuer | Network;
	isNetwork = false;

	issuerLoaded: Promise<unknown>;

	constructor(
		protected loginService: SessionService,
		protected messageService: MessageService,
		protected router: Router,
		protected route: ActivatedRoute,
		protected issuerManager: IssuerManager,
		private translate: TranslateService,
	) {
		super(router, route, loginService);
		this.issuerSlug = this.route.snapshot.params['issuerSlug'];

		this.issuerLoaded = this.issuerManager.issuerOrNetworkBySlug(this.issuerSlug).then((issuer) => {
			this.issuer = issuer;
			this.isNetwork = issuer.is_network;
			this.breadcrumbLinkEntries = [
				{ title: 'Issuers', routerLink: ['/issuer'] },
				{
					title: this.issuer.name,
					routerLink: this.isNetwork
						? ['/issuer/networks', this.issuerSlug]
						: ['/issuer/issuers', this.issuerSlug],
				},
			];
		});
	}

	private navigateBackToTemplates(): Promise<boolean> {
		return this.isNetwork
			? this.router.navigate(['/issuer/networks', this.issuerSlug], { queryParams: { tab: 'pdf-templates' } })
			: this.router.navigate(['issuer/issuers', this.issuerSlug], { fragment: 'pdf-templates' });
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
				this.navigateBackToTemplates().then(() => {
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
		this.navigateBackToTemplates();
	}
}
