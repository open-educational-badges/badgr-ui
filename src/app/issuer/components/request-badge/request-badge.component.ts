import { Component, Input, inject, OnInit } from '@angular/core';
import { typedFormGroup } from '../../../common/util/typed-forms';
import { Validators, FormsModule, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { BadgeRequestApiService } from '../../services/badgerequest-api.service';
import { BaseRoutableComponent } from '../../../common/pages/base-routable.component';
import { Router, ActivatedRoute } from '@angular/router';
import { SuccessDialogComponent } from '../../../common/dialogs/oeb-dialogs/success-dialog.component';
import { InfoDialogComponent } from '../../../common/dialogs/oeb-dialogs/info-dialog.component';
import { HlmDialogService } from './../../../components/spartan/ui-dialog-helm/src';
import { PublicApiService } from '../../../public/services/public-api.service';
import { MessageService } from '../../../common/services/message.service';
import { BadgeRequest } from '../../models/badgerequest-api.model';
import { PublicApiBadgeClassWithIssuer } from '../../../public/models/public-api.model';
import { EmailValidator } from '../../../common/validators/email.validator';
import { DateValidator } from '../../../common/validators/date.validator';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { BgImageStatusPlaceholderDirective } from '../../../common/directives/bg-image-status-placeholder.directive';
import { OebInputComponent } from '../../../components/input.component';
import { OebCheckboxComponent } from '../../../components/oeb-checkbox.component';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { HlmH1, HlmP } from '@spartan-ng/helm/typography';
import { ApiQRCode } from '~/issuer/models/qrcode-api.model';
import { PublicNotFoundComponent } from '~/public/components/not-found/not-found-component';
import { OebSpinnerComponent } from '~/components/oeb-spinner.component';
@Component({
	selector: 'request-badge',
	templateUrl: './request-badge.component.html',
	imports: [
		BgAwaitPromises,
		HlmH1,
		BgImageStatusPlaceholderDirective,
		HlmP,
		FormsModule,
		ReactiveFormsModule,
		OebInputComponent,
		OebCheckboxComponent,
		OebButtonComponent,
		TranslatePipe,
		PublicNotFoundComponent,
		OebSpinnerComponent,
	],
})
export class RequestBadgeComponent extends BaseRoutableComponent implements OnInit {
	private translate = inject(TranslateService);
	private badgeRequestApiService = inject(BadgeRequestApiService);
	protected publicApiService = inject(PublicApiService);
	private messageService = inject(MessageService);

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route);
		this.badgeClassLoaded = this.publicApiService
			.getBadgeClass(this.badgeSlug)
			.then((badge: PublicApiBadgeClassWithIssuer) => {
				this.badgeClass = badge;
			});
	}

	readonly badgeLoadingImageUrl = '../../../breakdown/static/images/badge-loading.svg';
	readonly badgeFailedImageUrl = '../../../breakdown/static/images/badge-failed.svg';

	private readonly _hlmDialogService = inject(HlmDialogService);
	public openSuccessDialog() {
		const dialogRef = this._hlmDialogService.open(SuccessDialogComponent, {
			context: {
				text:
					this.translate.instant('RequestBadge.successMessage') +
					this.translate.instant('RequestBadge.successMessage2'),
				variant: 'success',
			},
		});
	}

	public openDuplicateDialog(captionKey: string, textKey: string) {
		this._hlmDialogService.open(InfoDialogComponent, {
			context: {
				variant: 'info',
				filledIcon: true,
				caption: this.translate.instant(captionKey),
				text: this.translate.instant(textKey),
				singleButtonText: this.translate.instant('RequestBadge.understood'),
			},
		});
	}

	get badgeSlug() {
		return this.route.snapshot.params['badgeSlug'];
	}

	get qrSlug() {
		return this.route.snapshot.params['qrCodeId'];
	}

	badgeClassLoaded: Promise<unknown>;
	badgeClass: PublicApiBadgeClassWithIssuer;

	qrCodeLoading = true;
	qrCodeValid = false;
	qrCodeExpiredMessage: string;
	qrCodeData: ApiQRCode;

	get issuerSlug() {
		return this.route.snapshot.params['issuerSlug'];
	}

	ngOnInit(): void {
		this.checkQrCodeValidity();
		this.requestForm.setValue({
			...this.requestForm.value,
			qrCodeId: this.qrSlug,
		});
	}

	private checkQrCodeValidity(): void {
		if (!this.qrSlug) {
			this.qrCodeValid = false;
			return;
		}

		this.qrCodeLoading = true;

		this.publicApiService
			.getQrCode(this.qrSlug)
			.then((qrCode: ApiQRCode) => {
				this.qrCodeData = qrCode;
				this.qrCodeValid = this.isQrCodeValid(qrCode);

				if (!this.qrCodeValid) {
					this.qrCodeExpiredMessage = this.translate.instant('QrCode.expired');
				}
			})
			.catch((error) => {
				console.error('Error fetching QR code:', error);
				this.qrCodeValid = false;
				this.qrCodeExpiredMessage = "this.translate.instant('General.notFound')";
			})
			.finally(() => {
				this.qrCodeLoading = false;
			});
	}

	private isQrCodeValid(qrCode: ApiQRCode): boolean {
		// If no validity dates set, consider it always valid
		if (!qrCode.valid_from || !qrCode.expires_at) {
			return true;
		}

		const now = new Date();
		const validFrom = new Date(qrCode.valid_from);
		const expiresAt = new Date(qrCode.expires_at);

		const todayStart = new Date(now);
		todayStart.setHours(0, 0, 0, 0);

		return validFrom <= now && expiresAt >= todayStart;
	}

	requestBadge = this.translate.instant('RequestBadge.requestBadge');

	requestForm = typedFormGroup(this.nameValidation.bind(this))
		.addControl('firstname', '', Validators.required)
		.addControl('lastname', '', Validators.required)
		.addControl('email', '', [Validators.required, EmailValidator.validEmail])
		.addControl('dateOfBirth', '', DateValidator.validDate as ValidatorFn)
		.addControl('qrCodeId', '', Validators.required)
		.addControl('ageConfirmation', false, Validators.requiredTrue);

	onSubmit() {
		if (!this.requestForm.markTreeDirtyAndValidate()) {
			return;
		}

		const formState = this.requestForm.value;

		const userData: BadgeRequest = {
			firstname: formState.firstname,
			lastname: formState.lastname,
			email: formState.email,
			ageConfirmation: formState.ageConfirmation,
			qrCodeId: formState.qrCodeId,
			dateOfBirth: formState.dateOfBirth || undefined,
		};

		this.badgeRequestApiService
			.requestBadge(this.qrSlug, userData)
			.then((response) => {
				if (!response.ok) return;

				const status = response.body?.status;
				if (status === 'duplicate_issued') {
					this.openDuplicateDialog('RequestBadge.alreadyReceivedTitle', 'RequestBadge.alreadyReceivedText');
				} else if (status === 'duplicate_pending') {
					this.openDuplicateDialog('RequestBadge.alreadyPendingTitle', 'RequestBadge.alreadyPendingText');
				} else {
					this.openSuccessDialog();
					// TODO: check if this is correct
					this.router.navigate(['/catalog/badges']);
				}
			})
			.catch((error) => {
				this.messageService.reportHandledError(this.translate.instant('RequestBadge.submitError'), error);
			});
	}

	nameValidation() {
		if (!this.requestForm) return null;

		const value = this.requestForm.value;
		const firstname = value.firstname;
		const lastname = value.lastname;
		if (firstname.length + lastname.length > 35) {
			return {
				maxLengthExceeded: true,
			};
		}
		return null;
	}
}
