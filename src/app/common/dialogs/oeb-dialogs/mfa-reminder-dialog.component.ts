import { Component, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { OebButtonComponent } from '../../../components/oeb-button.component';

@Component({
	selector: 'mfa-reminder-dialog',
	imports: [OebButtonComponent, TranslatePipe],
	template: `
		<div class="tw-pt-4 tw-px-8 tw-pb-10">
			<div class="tw-max-w-[440px] tw-mx-auto tw-flex tw-flex-col tw-items-center tw-text-center tw-pt-6">
				<img
					src="assets/oeb/images/2fa-icon.png"
					alt=""
					aria-hidden="true"
					class="tw-w-[120px] tw-h-[120px] tw-mb-4"
				/>
				<div class="tw-flex tw-flex-col tw-items-center tw-gap-8 tw-w-full">
					<h3 class="tw-text-purple tw-font-bold tw-text-[22px] tw-leading-[120%] tw-m-0">
						{{ 'TwoFactor.reminder.title' | translate }}
					</h3>
					<p class="tw-text-lg tw-font-normal tw-text-black tw-leading-[130%] tw-m-0">
						{{ 'TwoFactor.reminder.body' | translate }}
					</p>
					<p class="tw-text-lg tw-font-normal tw-italic tw-text-purple tw-leading-[130%] tw-m-0">
						{{ 'TwoFactor.reminder.hintPrefix' | translate }}
						<strong class="tw-font-bold">{{ 'TwoFactor.reminder.hintLink' | translate }}</strong>
						{{ 'TwoFactor.reminder.hintSuffix' | translate }}
					</p>
					<div class="tw-flex tw-gap-4 tw-justify-center">
						<oeb-button
							size="sm"
							weight="normal"
							variant="secondary"
							[text]="'TwoFactor.reminder.remindLater' | translate"
							(click)="remindLater()"
						></oeb-button>
						<oeb-button
							size="sm"
							[text]="'TwoFactor.reminder.setupNow' | translate"
							(click)="setupNow()"
						></oeb-button>
					</div>
					<button
						class="tw-text-link tw-underline tw-text-sm tw-bg-transparent tw-border-0 tw-cursor-pointer"
						(click)="neverRemind()"
					>
						{{ 'TwoFactor.reminder.neverRemind' | translate }}
					</button>
				</div>
			</div>
		</div>
	`,
})
export class MfaReminderDialogComponent {
	private readonly _dialogRef = inject<BrnDialogRef>(BrnDialogRef);
	private readonly _context = injectBrnDialogContext<{ onNeverRemind: () => void }>();

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);
	constructor() {}

	setupNow() {
		window.open('/profile/2fa', '_blank');
		this._dialogRef.close('setup');
	}

	remindLater() {
		this._dialogRef.close('later');
	}

	neverRemind() {
		this._context.onNeverRemind();
		this._dialogRef.close('never');
	}
}
