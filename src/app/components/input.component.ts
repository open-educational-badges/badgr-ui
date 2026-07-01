import { Component, ElementRef, input, Input, TemplateRef, ViewChild, AfterViewInit } from '@angular/core';
import { HlmInput, InputVariants } from './spartan/ui-input-helm/src';
import { OebInputErrorComponent } from './input.error.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { UrlValidator } from '../common/validators/url.validator';
import { TypedFormGroup } from '../common/util/typed-forms';
import { NgIcon } from '@ng-icons/core';
import { HlmP } from '@spartan-ng/helm/typography';

@Component({
	selector: 'oeb-input',
	imports: [HlmInput, HlmP, OebInputErrorComponent, NgClass, ReactiveFormsModule, NgIcon, NgTemplateOutlet],
	styleUrls: ['./input.component.scss'],
	template: ` <div
		[ngClass]="{ 'tw-mt-6 md:tw-mt-7': !noTopMargin, 'tw-opacity-50 tw-pointer-events-none': readonly }"
	>
		<div class="tw-flex tw-justify-between">
			@if (label) {
				<label class="tw-pb-[2px] tw-pl-[3px]">
					@if (labelStyle) {
						<span [class]="labelStyle" [innerHTML]="label"></span>
					} @else {
						<span hlmP class="tw-text-oebblack tw-font-semibold" [innerHTML]="label"></span>
					}
					@if (sublabelRightTemplate()) {
						<ng-container *ngTemplateOutlet="sublabelRightTemplate()" />
					} @else if (sublabelRight) {
						<span class="tw-pl-[3px] tw-text-oebblack"> {{ sublabelRight }}</span>
					}
				</label>
			}
			<ng-content
				class="tw-relative tw-z-20 tw-font-semibold tw-text-[14px] md:tw-text-[20px] tw-leading-4 md:tw-leading-6"
				select="[label-additions]"
			></ng-content>
		</div>
		@if (sublabel) {
			<p class="tw-pl-[3px] tw-text-purple tw-italic" [innerHTML]="sublabel"></p>
		}
		@if (ariaLabel) {
			<label class="visuallyhidden" [attr.for]="inputName">{{ ariaLabel }}</label>
		}

		<div class="tw-relative tw-w-full">
			@if (fieldType != 'textarea' && fieldType != 'password') {
				<input
					(focus)="cacheControlState()"
					(keypress)="handleKeyPress($event)"
					(keyup)="handleKeyUp($event)"
					(change)="postProcessInput()"
					[formControl]="control"
					[placeholder]="placeholder || ''"
					[attr.maxlength]="maxchar"
					[attr.max]="max"
					[attr.min]="min"
					[type]="fieldType"
					[readonly]="readonly"
					#textInput
					class="tw-w-full tw-border-solid tw-border-purple tw-bg-white"
					hlmInput
				/>
			}
			@if (fieldType === 'textarea') {
				<textarea
					(focus)="cacheControlState()"
					(keypress)="handleKeyPress($event)"
					(keyup)="handleKeyUp($event)"
					(change)="postProcessInput()"
					[formControl]="control"
					[placeholder]="placeholder || ''"
					[attr.maxlength]="maxchar"
					[attr.max]="max"
					[attr.min]="min"
					[readonly]="readonly"
					[size]="size"
					#textInput
					class="tw-w-full tw-border-solid tw-border-purple tw-bg-white"
					[ngClass]="{ 'tw-min-h-20': size === 'default', 'tw-min-h-32': size === 'lg' }"
					hlmInput
				></textarea>
			}
			@if (fieldType == 'password') {
				<div class="tw-relative tw-flex tw-items-center">
					<input
						(focus)="cacheControlState()"
						(keypress)="handleKeyPress($event)"
						(keyup)="handleKeyUp($event)"
						(change)="postProcessInput()"
						[formControl]="control"
						[placeholder]="placeholder || ''"
						[attr.maxlength]="maxchar"
						[attr.max]="max"
						[attr.min]="min"
						[type]="showPassword ? 'text' : 'password'"
						[readonly]="readonly"
						#textInput
						class="tw-w-full tw-border-solid tw-border-purple tw-bg-white"
						hlmInput
					/>
					<ng-icon
						(click)="togglePasswordVisibility()"
						class="tw-absolute tw-right-3 tw-text-purple"
						hlm
						[name]="showPassword ? 'lucideEyeOff' : 'lucideEye'"
					></ng-icon>
				</div>
			}
			@if (isErrorState) {
				<oeb-input-error
					class="tw-text-red tw-pl-[3px] tw-absolute tw-top-full tw-w-full"
					[error]="errorMessageForDisplay"
				></oeb-input-error>
			}
		</div>
	</div>`,
})
export class OebInputComponent implements AfterViewInit {
	@Input() error: string;
	@Input() errorOverride?: boolean = false;
	@Input() label: string;
	@Input() labelStyle?: string = '';
	@Input() ariaLabel: string;
	@Input() errorMessage: CustomValidatorMessages;
	@Input() errorGroupMessage: CustomValidatorMessages;
	@Input() urlField = false;
	@Input() fieldType = 'text';
	@Input() placeholder = '';
	@Input() maxchar?: number = null;
	@Input() max?: number;
	@Input() min?: number;
	@Input() readonly?: boolean = false;
	@Input() sublabel?: string;
	sublabelRightTemplate = input<TemplateRef<any>>();
	@Input() sublabelRight?: string;
	@Input() autofocus = false;
	@Input() noTopMargin = false;
	@Input() size: InputVariants['size'] = 'default';

	@ViewChild('textInput') textInput: ElementRef;
	@ViewChild('textareaInput') textareaInput: ElementRef;

	private cachedErrorMessage = null;
	private cachedErrorState: boolean | null = null;
	private cachedDirtyState = null;
	@Input() control: FormControl;
	@Input() errorGroup: TypedFormGroup;

	remainingCharactersNum = this.maxchar;

	showPassword = false;

	togglePasswordVisibility(): void {
		this.showPassword = !this.showPassword;
	}

	get hasFocus(): boolean {
		return document.activeElement === this.inputElement;
	}
	get isErrorState() {
		if (this.hasFocus && this.cachedErrorState !== null) {
			return this.cachedErrorState;
		} else {
			return this.controlErrorState;
		}
	}

	get inputElement(): HTMLInputElement | HTMLTextAreaElement {
		if (this.textInput && this.textInput.nativeElement) {
			return this.textInput.nativeElement;
		}
		if (this.textareaInput && this.textareaInput.nativeElement) {
			return this.textareaInput.nativeElement;
		}
		return null;
	}

	get controlErrorState() {
		if (this.errorOverride) return true;
		if (!this.control.dirty) return false;

		const controlInvalid = this.errorGroup ? !this.control.valid || !this.errorGroup.valid : !this.control.valid;
		return controlInvalid;
	}
	get errorMessageForDisplay(): string {
		return this.hasFocus ? this.cachedErrorMessage : this.uncachedErrorMessage;
	}

	get uncachedErrorMessage(): string {
		return messagesForValidationError(
			this.label || this.ariaLabel,
			this.control && this.control.errors,
			this.errorMessage,
		).concat(
			messagesForValidationError(this.label, this.errorGroup && this.errorGroup.errors, this.errorGroupMessage),
		)[0]; // Only display the first error
	}

	get inputName() {
		return (this.label || this.placeholder).replace(/[^\w]+/g, '_').toLowerCase();
	}

	ngAfterViewInit() {
		if (this.autofocus) {
			this.focus();
		}
	}

	cacheControlState() {
		this.cachedErrorMessage = this.uncachedErrorMessage;
		this.cachedDirtyState = this.control.dirty;
		this.cachedErrorState = this.controlErrorState;
	}

	focus() {
		this.inputElement.focus();
	}

	handleKeyPress(event: KeyboardEvent) {
		// This handles revalidating when hitting enter from within an input element. Ideally, we'd catch _all_ form submission
		// events, but since the form supresses those if things aren't valid, that doesn't really work. So we do this hack.
		if (event.code === 'Enter') {
			this.control.markAsDirty();
			this.cacheControlState();

			if (this.cachedErrorState) event.preventDefault();
		}
		// If fieldType is number prevent strings and chars from entering
		if (this.fieldType === 'number') {
			const charCode = event.which ? event.which : event.keyCode;
			const charStr = String.fromCharCode(charCode);
			// Erlaubt nur Zahlen (0-9) und ggf. Dezimalpunkt oder Minuszeichen
			if (!/^\d$/.test(charStr) && charStr !== '.' && charStr !== '-') {
				event.preventDefault(); // Blockiert die Eingabe
			}
		}
	}

	handleKeyUp(event: KeyboardEvent) {
		this.remainingCharactersNum = this.maxchar - (this.control.value ? this.control.value.length : 0);
	}

	public postProcessInput() {
		if (this.urlField) {
			UrlValidator.addMissingHttpToControl(this.control);
		}
	}
}

export type CustomValidatorMessages = string | { [validatorKey: string]: string };

export const defaultValidatorMessages: { [validatorKey: string]: (label: string, result?: unknown) => string } = {
	required: (label: string) => `Bitte ${label} eingeben`,
	validUrl: () => `Bitte gültige URL eingeben.`,
	invalidTelephone: () => `Bitte gültige Telefonnummer eingeben`,
	invalidEmail: () => `Bitte gültige E-Mail Adresse eingeben`,
	maxlength: (label: string | undefined, result?: unknown) => {
		const { actualLength, requiredLength } = (result ?? {}) as { actualLength: number; requiredLength: number };
		return actualLength && requiredLength
			? `${label ?? 'Text'} überschreitet maximale Länge von ${requiredLength} um ${
					actualLength - requiredLength
				} Zeichen`
			: `${label ?? 'Text'} überschreitet maximale Länge.`;
	},
	minlength: (label: string, result?: unknown) => {
		const { actualLength, requiredLength } = (result ?? {}) as { actualLength: number; requiredLength: number };
		return actualLength && requiredLength
			? `${label} unterschreitet erforderliche Länge von ${requiredLength} um ${
					requiredLength - actualLength
				} Zeichen`
			: `${label} unterschreitet erforderliche Länge.`;
	},
};

export function messagesForValidationError(
	label: string,
	validatorResult: { [key: string]: string },
	customMessages: CustomValidatorMessages,
): string[] {
	if (validatorResult && typeof validatorResult === 'object' && Object.keys(validatorResult).length > 0) {
		if (typeof customMessages === 'string') {
			return [customMessages];
		}

		const messages: string[] = [];

		Object.keys(validatorResult).forEach((validatorKey) => {
			const validatorValue = validatorResult[validatorKey];

			messages.push(
				(customMessages && typeof customMessages === 'object' && customMessages[validatorKey]) ||
					(validatorValue && typeof validatorValue === 'string' && validatorValue) ||
					(defaultValidatorMessages[validatorKey] &&
						defaultValidatorMessages[validatorKey](label, validatorValue)) ||
					`Field failed ${validatorKey} validation.`,
			);
		});

		return messages;
	} else {
		return [];
	}
}
