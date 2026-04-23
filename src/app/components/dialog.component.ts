import { Component, inject, Input, TemplateRef } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';

import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { OebDialogComponent } from './oeb-dialog.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleX } from '@ng-icons/lucide';

interface DialogContext {
	headerTemplate?: TemplateRef<Record<string, any>>;
	title?: string;
	subtitle?: string;
	variant: 'danger' | 'info' | 'success' | 'default' | 'failure';
	content?: TemplateRef<Record<string, any>>;
	templateContext?: Record<string, any>;
	message?: string;
	text?: string;
}

@Component({
	selector: 'app-dialog',
	standalone: true,
	imports: [CommonModule, TranslateModule, OebDialogComponent, NgIcon],
	providers: [provideIcons({ lucideCircleX })],
	template: `
		<oeb-dialog [variant]="context.variant || 'default'">
			@if (context.variant === 'failure') {
				<div class="tw-items-center tw-w-full tw-justify-center tw-flex">
					<ng-icon
						(click)="close()"
						hlm
						name="lucideCircleX"
						class="!tw-h-28 !tw-w-28 tw-text-purple"
					></ng-icon>
				</div>
			} @else if (isTemplate(context.headerTemplate)) {
				<ng-container
					*ngTemplateOutlet="context.headerTemplate; context: context.templateContext || {}"
				></ng-container>
			} @else if (context.title) {
				<p class="tw-text-center" [innerHTML]="context.title"></p>
			}

			@if (context.variant == 'success') {
				<div class="tw-text-center tw-text-purple">
					<div class="tw-flex tw-justify-center">
						<div class="oeb-icon-circle tw-my-6">
							<svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
								<circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
								<path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
							</svg>
						</div>
					</div>
				</div>
			}

			@if (context.variant === 'failure') {
				<div class="tw-px-4">
					<p class="tw-text-lg tw-text-oebblack tw-text-center tw-font-bold tw-mt-2 tw-leading-[130%]">
						{{ context.message }}
					</p>
					<p [innerHTML]="context.text" class="tw-mt-2 tw-text-purple tw-italic tw-text-center"></p>
				</div>
			} @else if (isTemplate(context.content)) {
				<ng-container
					*ngTemplateOutlet="context.content; context: context.templateContext || {}"
				></ng-container>
			} @else if (context.content) {
				<p class="tw-text-center" [innerHTML]="context.content"></p>
			}
		</oeb-dialog>
	`,
	styleUrl: './dialog.component.scss',
})
export class DialogComponent {
	private readonly _dialogContext = injectBrnDialogContext<DialogContext>();
	private readonly dialogRef = inject<BrnDialogRef>(BrnDialogRef);
	protected readonly context = this._dialogContext;

	close() {
		this.dialogRef.close();
	}

	public cancel() {
		this.dialogRef.close('cancel');
	}

	public continue() {
		this.dialogRef.close('continue');
	}

	isTemplate(content: any): boolean {
		return content instanceof TemplateRef;
	}
}
