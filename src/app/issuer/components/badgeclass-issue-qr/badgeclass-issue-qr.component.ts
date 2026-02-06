import { Component, inject } from '@angular/core';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { ActivatedRoute, Router } from '@angular/router';
import { BadgeClassManager } from '../../services/badgeclass-manager.service';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { SessionService } from '../../../common/services/session.service';
import { BadgeClass } from '../../models/badgeclass.model';
import { typedFormGroup } from '../../../common/util/typed-forms';
import { Validators } from '@angular/forms';
import { DateValidator } from '../../../common/validators/date.validator';
import { QrCodeApiService } from '../../services/qrcode-api.service';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { SuccessDialogComponent } from '../../../common/dialogs/oeb-dialogs/success-dialog.component';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { EditQrFormComponent } from '../edit-qr-form/edit-qr-form.component';
import { HlmH1, HlmP } from '@spartan-ng/helm/typography';

@Component({
	selector: 'badgeclass-issue-qr',
	templateUrl: './badgeclass-issue-qr.component.html',
	imports: [BgAwaitPromises, BgBreadcrumbsComponent, HlmH1, HlmP, EditQrFormComponent, TranslatePipe],
})
export class BadgeClassIssueQrComponent extends BaseAuthenticatedRoutableComponent {
	protected translate = inject(TranslateService);
	protected qrCodeApiService = inject(QrCodeApiService);
	protected badgeClassManager = inject(BadgeClassManager);

	get issuerSlug() {
		return this.route.snapshot.params['issuerSlug'];
	}

	get badgeSlug() {
		return this.route.snapshot.params['badgeSlug'];
	}

	badgeClass: BadgeClass;

	readonly badgeFailedImageUrl = '../../../../breakdown/static/images/badge-failed.svg';
	readonly badgeLoadingImageUrl = '../../../../breakdown/static/images/badge-loading.svg';

	badgeClassLoaded: Promise<unknown>;
	crumbs: LinkEntry[];

	list4Text: string;

	qrForm = typedFormGroup()
		.addControl('title', '', Validators.required)
		.addControl('createdBy', '', Validators.required)
		.addControl('valid_from', '', DateValidator.validDate)
		.addControl('expires_at', '', DateValidator.validDate)
		.addControl('badgeclass_id', '', Validators.required)
		.addControl('issuer_id', '', Validators.required);

	constructor() {
		const route = inject(ActivatedRoute);
		const router = inject(Router);
		const sessionService = inject(SessionService);

		super(router, route, sessionService);

		this.badgeClassLoaded = this.badgeClassManager
			.badgeByIssuerSlugAndSlug(this.issuerSlug, this.badgeSlug)
			.then((badgeClass) => {
				this.badgeClass = badgeClass;
				this.list4Text =
					this.translate.instant('IssueQr.list4') +
					`<a class="tw-tw-underline tw-text-[#1400FF]" href="issuer/issuers/${this.issuerSlug}/badges/${this.badgeSlug}">${this.translate.instant('QrCode.badgeDetailPage')} </a>` +
					this.translate.instant('IssueQr.list4.2');

				this.crumbs = [
					{ title: this.translate.instant('NavItems.myInstitutions'), routerLink: ['/issuer'] },
					{
						title: this.badgeClass.issuerName,
						routerLink: ['/issuer/issuers', this.issuerSlug],
					},
					{
						title: this.translate.instant('General.badges'),
						routerLink: ['/issuer/issuers/' + this.issuerSlug + '/badges/'],
					},
					{
						title: badgeClass.name,
						routerLink: ['/issuer/issuers', this.issuerSlug, 'badges', badgeClass.slug],
					},
					{
						title: this.translate.instant('Issuer.giveQr'),
					},
				];
			});

		this.qrForm.setValue({
			...this.qrForm.value,
			badgeclass_id: this.badgeSlug,
			issuer_id: this.issuerSlug,
		});
	}

	private readonly _hlmDialogService = inject(HlmDialogService);
	public openSuccessDialog() {
		const dialogRef = this._hlmDialogService.open(SuccessDialogComponent, {
			context: {
				text: this.translate.instant('QrCode.savedSuccessfully'),
				variant: 'success',
			},
		});
	}

	onSubmit() {
		// if (!this.qrForm.markTreeDirtyAndValidate()) {
		// 	return;
		// }

		const formState = this.qrForm.value;
		console.log(formState.badgeclass_id);
		this.qrCodeApiService
			.createQrCode(this.issuerSlug, this.badgeSlug, {
				title: formState.title,
				createdBy: formState.createdBy,
				badgeclass_id: formState.badgeclass_id,
				issuer_id: formState.issuer_id,
				// expires_at: formState.expires,
			})
			.then(() => {
				this.openSuccessDialog();
				this.router.navigate(['/issuer/issuers', this.issuerSlug, 'badges', this.badgeSlug, 'qr', 'generate']);
			});
	}
}
