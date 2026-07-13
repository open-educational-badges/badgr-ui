import { NgIcon } from '@ng-icons/core';
import { Component, HostBinding, Input, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { OebDialogComponent } from '../../../components/oeb-dialog.component';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { HlmP } from '../../../components/spartan/ui-typography-helm/src';
import { HlmIcon } from '../../../components/spartan/ui-icon-helm/src';
import { HlmH3 } from '../../../components/spartan/ui-typography-helm/src';
import { lucideInfo } from '@ng-icons/lucide';

import { TranslateService } from '@ngx-translate/core';
import { TranslateModule } from '@ngx-translate/core';
import { provideIcons } from '@ng-icons/core';

@Component({
	selector: 'oeb-info-dialog',
	imports: [OebDialogComponent, OebButtonComponent, HlmP, HlmH3, NgIcon, HlmIcon, TranslateModule],
	providers: [TranslateService, provideIcons({ lucideInfo })],
	template: `
		<oeb-dialog [variant]="variant" class="tw-text-center tw-text-oebblack">
			<div class="tw-flex tw-justify-center">
				<div class="oeb-icon-circle tw-my-4">
					<ng-icon hlm class="tw-text-link" size="xl" name="lucideInfo" />
				</div>
			</div>
			<h3 hlmH3 class="tw-font-bold !tw-text-black tw-uppercase">
				{{ caption }}
			</h3>
			<div class="tw-flex tw-flex-col tw-gap-2 tw-my-2">
				@if (subtitle) {
					<p hlmP>
						{{ subtitle }}
					</p>
				}
				@if (text) {
					<p hlmP class="tw-italic" [innerHTML]="text"></p>
				}
			</div>
			@if (singleButtonText) {
				<oeb-button (click)="clickSingleButton()" size="sm" [text]="singleButtonText"> </oeb-button>
			} @else {
				<div class="tw-flex tw-justify-around tw-mt-6">
					<oeb-button size="md" variant="secondary" [text]="cancelText" (click)="cancel()"></oeb-button>
					<oeb-button
						[id]="'confirm-award-badge'"
						width="max_content"
						size="md"
						class="tw-mr-4"
						[text]="forwardText"
						(click)="continue()"
					></oeb-button>
				</div>
			}
		</oeb-dialog>
	`,
})
export class InfoDialogComponent {
	private translate = inject(TranslateService);

	// @HostBinding('class') private readonly _class: string = 'tw-bg-red tw-bg-red';
	private readonly _dialogContext = injectBrnDialogContext<{
		caption: string;
		subtitle: string;
		text: string;
		variant: string;
		cancelText: string;
		forwardText: string;
		singleButtonText?: string;
		singleButtonAction?: any;
	}>();
	protected readonly caption = this._dialogContext.caption;
	protected readonly subtitle = this._dialogContext.subtitle;
	protected readonly text = this._dialogContext.text;
	protected readonly variant = this._dialogContext.variant;
	protected readonly singleButtonText = this._dialogContext.singleButtonText;
	protected readonly cancelText = this._dialogContext.cancelText;
	protected readonly forwardText = this._dialogContext.forwardText;
	protected readonly singleButtonAction = this._dialogContext.singleButtonAction;
	private readonly _dialogRef = inject<BrnDialogRef>(BrnDialogRef);

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}

	public cancel() {
		this._dialogRef.close('cancel');
	}

	public continue() {
		this._dialogRef.close('continue');
	}

	public clickSingleButton() {
		if (this.singleButtonAction) {
			this.singleButtonAction();
		}
		this._dialogRef.close();
	}
}
