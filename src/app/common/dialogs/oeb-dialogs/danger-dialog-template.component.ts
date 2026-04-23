import { NgIcon } from '@ng-icons/core';
import { Component, HostBinding, inject, Input } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { OebDialogComponent } from '../../../components/oeb-dialog.component';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { HlmP } from '../../../components/spartan/ui-typography-helm/src';
import { HlmIcon } from '../../../components/spartan/ui-icon-helm/src';
import { lucideTriangleAlert } from '@ng-icons/lucide';

import { TranslateService } from '@ngx-translate/core';
import { provideIcons } from '@ng-icons/core';

@Component({
	selector: 'oeb-danger-dialog-template',
	imports: [OebDialogComponent, OebButtonComponent, HlmP, NgIcon, HlmIcon],
	providers: [TranslateService, provideIcons({ lucideTriangleAlert })],
	template: `
		<oeb-dialog [variant]="variant" class="tw-text-center tw-text-oebblack">
			<div class="tw-flex tw-justify-center">
				<div class="oeb-icon-circle tw-bg-white tw-my-6">
					<ng-icon hlm class="tw-text-red" size="xl" name="lucideTriangleAlert" />
				</div>
			</div>
			<p hlmP class="tw-flex tw-flex-col tw-gap-2">
				<span class="tw-font-extrabold tw-uppercase" [innerHTML]="title"></span>
				<span [innerHTML]="text"> </span>
			</p>
			<div class="tw-flex tw-gap-4 tw-justify-around tw-mt-6">
				<oeb-button variant="secondary" [text]="cancelText" (click)="closeDialog()"></oeb-button>
				<oeb-button class="tw-mr-4" [text]="deleteText" (click)="deleteItem()"></oeb-button>
			</div>
		</oeb-dialog>
	`,
})
export class DangerDialogComponentTemplate {
	private translate = inject(TranslateService);

	// @HostBinding('class') private readonly _class: string = 'tw-bg-red tw-bg-red';

	// @Input() title: String;
	// @Input() descriptionText: String;
	private readonly _dialogContext = injectBrnDialogContext<{
		text: string;
		delete: any;
		qrCodeRequested: boolean;
		variant: string;
		title: string;
	}>();
	protected readonly text = this._dialogContext.text;
	protected readonly title = this._dialogContext.title;
	protected readonly delete = this._dialogContext.delete;
	protected readonly variant = this._dialogContext.variant;
	protected readonly qrCodeRequested = this._dialogContext.qrCodeRequested;
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
}
