import { NgIcon } from '@ng-icons/core';
import { Component, HostBinding, Input, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { OebDialogComponent } from '../../../components/oeb-dialog.component';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { HlmP } from '../../../components/spartan/ui-typography-helm/src';
import { HlmIcon } from '../../../components/spartan/ui-icon-helm/src';
import { lucideTriangleAlert } from '@ng-icons/lucide';

import { TranslateService } from '@ngx-translate/core';
import { provideIcons } from '@ng-icons/core';

@Component({
	selector: 'oeb-danger-dialog',
	imports: [OebDialogComponent, OebButtonComponent, HlmP, NgIcon, HlmIcon],
	providers: [TranslateService, provideIcons({ lucideTriangleAlert })],
	template: `
		<oeb-dialog [variant]="variant" class="tw-text-center tw-text-oebblack">
			<div class="tw-flex tw-justify-center">
				<div class="oeb-icon-circle tw-my-4">
					<ng-icon hlm class="tw-text-red" size="xl" name="lucideTriangleAlert" />
				</div>
			</div>
			<p hlmP class="tw-flex tw-flex-col tw-gap-2 tw-my-2">
				<span class="tw-font-extrabold md:tw-text-[18px] md:tw-leading-[23px]" [innerHtml]="caption"></span>
				@if (text) {
					<span>
						<p hlmP [innerHtml]="text"></p>
						@if (qrCodeRequested) {
							<span>Damit gehen alle noch offenen Badge-Anfragen verloren.</span>
						}
					</span>
				}
			</p>
			@if (singleButtonText) {
				<oeb-button (click)="clickSingleButton()" size="sm" [text]="singleButtonText"> </oeb-button>
			} @else {
				<div class="tw-flex tw-justify-around tw-mt-6">
					<oeb-button variant="secondary" [text]="cancelText" (click)="closeDialog()"></oeb-button>
					<oeb-button class="tw-mr-4" [text]="deleteText" (click)="deleteItem()"></oeb-button>
				</div>
			}
		</oeb-dialog>
	`,
})
export class DangerDialogComponent {
	private translate = inject(TranslateService);

	// @HostBinding('class') private readonly _class: string = 'tw-bg-red tw-bg-red';
	private readonly _dialogContext = injectBrnDialogContext<{
		caption: string;
		text: string;
		delete: any;
		qrCodeRequested: boolean;
		variant: string;
		singleButtonText?: string;
		singleButtonAction?: any;
		captionStyle?: string;
	}>();
	protected readonly caption = this._dialogContext.caption;
	protected readonly text = this._dialogContext.text;
	protected readonly delete = this._dialogContext.delete;
	protected readonly variant = this._dialogContext.variant;
	protected readonly qrCodeRequested = this._dialogContext.qrCodeRequested;
	protected readonly singleButtonText = this._dialogContext.singleButtonText;
	protected readonly singleButtonAction = this._dialogContext.singleButtonAction;
	private readonly _dialogRef = inject<BrnDialogRef>(BrnDialogRef);

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}

	cancelText = this.translate.instant('General.cancel');
	deleteText = this.translate.instant('General.delete');

	public closeDialog() {
		this._dialogRef.close();
	}

	public deleteItem() {
		this.delete();
		this._dialogRef.close();
	}

	public clickSingleButton() {
		if (this.singleButtonAction) {
			this.singleButtonAction();
		}
		this._dialogRef.close();
	}
}
