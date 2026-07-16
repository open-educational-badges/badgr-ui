import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { OebInputComponent } from '../../../components/input.component';
import { UserProfileApiService } from '../../services/user-profile-api.service';
import { typedFormGroup } from '../../util/typed-forms';

@Component({
	selector: 'disable-two-factor-dialog',
	imports: [NgIcon, HlmIcon, OebButtonComponent, OebInputComponent, FormsModule, ReactiveFormsModule, TranslatePipe],
	template: `
		<div class="tw-pt-4 tw-px-8 tw-pb-10">
			<div class="tw-max-w-[440px] tw-mx-auto tw-flex tw-flex-col tw-items-center tw-text-center tw-pt-6">
				<div class="tw-relative tw-w-[120px] tw-h-[120px] tw-mb-4 tw-text-red" aria-hidden="true">
					<ng-icon
						hlm
						name="lucideCircle"
						size="120px"
						class="oeb-icon-stroke-only tw-absolute tw-top-0 tw-left-0"
					></ng-icon>
					<ng-icon
						hlm
						name="lucideCircleAlert"
						size="90px"
						class="oeb-icon-filled-alert tw-absolute tw-top-1/2 tw-left-1/2 -tw-translate-x-1/2 -tw-translate-y-1/2"
					></ng-icon>
				</div>
				<div class="tw-flex tw-flex-col tw-items-center tw-gap-4 tw-w-full">
					<h3 class="tw-text-black tw-font-bold tw-text-[22px] tw-leading-[120%] tw-m-0">
						{{ 'TwoFactor.disable.title' | translate }}
					</h3>
					<p class="tw-text-lg tw-font-normal tw-text-black tw-leading-[130%] tw-m-0">
						{{ 'TwoFactor.disable.description1' | translate }}
					</p>
					<p class="tw-text-lg tw-font-normal tw-italic tw-text-purple tw-leading-[130%] tw-m-0">
						{{ 'TwoFactor.disable.description2' | translate }}
					</p>

					<form
						class="tw-w-full tw-text-left"
						[formGroup]="disableForm.rawControl"
						(ngSubmit)="submit()"
						novalidate
					>
						<oeb-input
							[control]="disableForm.rawControlMap.password"
							[label]="'TwoFactor.disable.passwordLabel' | translate"
							[fieldType]="'password'"
							[autofocus]="true"
							[errorMessage]="'TwoFactor.disable.passwordError' | translate"
						></oeb-input>

						@if (errorMessage) {
							<p class="tw-text-red-600 tw-text-sm tw-mt-2">{{ errorMessage }}</p>
						}

						<div class="tw-flex tw-gap-4 tw-justify-center tw-mt-6">
							<oeb-button
								size="sm"
								weight="normal"
								variant="secondary"
								type="button"
								[text]="'General.cancel' | translate"
								(click)="cancel()"
							></oeb-button>
							<oeb-button
								size="sm"
								type="submit"
								[disabled]="isLoading"
								[text]="'TwoFactor.disable.disableButton' | translate"
							></oeb-button>
						</div>
					</form>
				</div>
			</div>
		</div>
	`,
})
export class DisableTwoFactorDialogComponent {
	private readonly _dialogRef = inject<BrnDialogRef>(BrnDialogRef);
	private readonly _context = injectBrnDialogContext<{ onDisabled: () => void }>();
	private profileApiService = inject(UserProfileApiService);
	private translate = inject(TranslateService);

	disableForm = typedFormGroup().addControl('password', '', [Validators.required]);

	errorMessage = '';
	isLoading = false;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);
	constructor() {}

	submit() {
		if (!this.disableForm.markTreeDirtyAndValidate()) return;

		this.isLoading = true;
		this.errorMessage = '';

		this.profileApiService
			.disable2FA(this.disableForm.value.password)
			.then(() => {
				this._context.onDisabled();
				this._dialogRef.close('disabled');
			})
			.catch((err) => {
				this.errorMessage = err?.error?.error || this.translate.instant('TwoFactor.disable.genericError');
			})
			.finally(() => {
				this.isLoading = false;
			});
	}

	cancel() {
		this._dialogRef.close('cancel');
	}
}
