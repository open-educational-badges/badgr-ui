import {
	AfterViewInit,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnChanges,
	Output,
	SimpleChanges,
	ViewChild,
	OnInit,
	inject,
} from '@angular/core';

import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { UrlValidator } from '../validators/url.validator';
import { CommonDialogsService } from '../services/common-dialogs.service';

import { OebButtonComponent } from '../../components/oeb-button.component';

@Component({
	selector: 'bg-formfield-text',
	host: {
		class: 'forminput',
		'[class.forminput-is-error]': 'isErrorState',
		'[class.forminput-locked]': 'isLockedState',
		'[class.forminput-monospaced]': 'monospaced',
		'[class.forminput-withbutton]': 'inlineButtonText',
		'[class.forminput-withsublabel]': 'sublabel',
	},
	template: `
		<div class="forminput-x-labelrow">
			@if (label || includeLabelAsWrapper) {
				<label class="forminput-x-label" [attr.for]="inputName">
					{{ label }}
					@if (optional) {
						<span>(OPTIONAL)</span>
					}
					@if (formFieldAside) {
						<span class="forminput-x-formFieldAside">{{ formFieldAside }}</span>
					}
					@if (isLockedState) {
						<button type="button" (click)="unlock()">(unlock)</button>
					}
				</label>
			}
			<ng-content class="forminput-x-helplink" select="[label-additions]"></ng-content>
		</div>
		@if (sublabel) {
			<p class="forminput-x-sublabel">
				@if (remainingCharactersNum >= 0) {
					<span>{{ remainingCharactersNum }}</span>
				}
				{{ sublabel }}
			</p>
		}

		@if (ariaLabel) {
			<label class="visuallyhidden" [attr.for]="inputName">{{ ariaLabel }}</label>
		}
		<div class="forminput-x-inputs tw-flex tw-gap-2 tw-items-center">
			@if (!multiline) {
				<input
					[type]="fieldType"
					[name]="inputName"
					[id]="inputId"
					[formControl]="control"
					[placeholder]="placeholder || ''"
					[attr.maxlength]="maxchar"
					[attr.max]="max"
					(change)="postProcessInput()"
					(focus)="cacheControlState()"
					(keypress)="handleKeyPress($event)"
					(keyup)="handleKeyUp($event)"
					#textInput
				/>
			}
			@if (inlineButtonText) {
				<oeb-button
					class="forminput-x-button"
					[variant]="'secondary'"
					[size]="'sm'"
					(click)="buttonClicked.emit($event)"
					[disabled-when-requesting]="true"
					type="submit"
					[text]="inlineButtonText"
				/>
			}
			@if (multiline) {
				<textarea
					[name]="inputName"
					[id]="inputId"
					[formControl]="control"
					[attr.maxlength]="maxchar"
					[placeholder]="placeholder || ''"
					(change)="postProcessInput()"
					(focus)="cacheControlState()"
					(keypress)="handleKeyPress($event)"
					(keyup)="handleKeyUp($event)"
					#textareaInput
				></textarea>
			}
		</div>
		@if (isErrorState) {
			<p class="forminput-x-error">{{ errorMessageForDisplay }}</p>
		}
	`,
	imports: [FormsModule, ReactiveFormsModule, OebButtonComponent],
})
export class FormFieldText implements OnChanges, AfterViewInit, OnInit {
	private dialogService = inject(CommonDialogsService);

	@Input()
	set unlocked(unlocked: boolean) {
		this._unlocked = unlocked;
		this.updateDisabled();
	}

	get unlocked() {
		return this._unlocked;
	}
	@Input()
	set locked(locked: boolean) {
		this._locked = locked;
		this.updateDisabled();
	}

	get locked() {
		return this._locked;
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

	get hasFocus(): boolean {
		return document.activeElement === this.inputElement;
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

	get value() {
		return this.control.value;
	}

	get controlErrorState() {
		return (
			this.errorOverride ||
			(this.control.dirty && (!this.control.valid || (this.errorGroup && !this.errorGroup.valid)))
		);
	}

	get isErrorState() {
		if (this.hasFocus && this.cachedErrorState !== null) {
			return this.cachedErrorState;
		} else {
			return this.controlErrorState;
		}
	}

	get isLockedState() {
		return this.locked && !this.unlocked;
	}

	get inputName() {
		return (this.label || this.placeholder || this.randomName).replace(/[^\w]+/g, '_').toLowerCase();
	}

	get inputId() {
		return this.id || (this.label || this.placeholder || this.randomName).replace(/[^\w]+/g, '_').toLowerCase();
	}
	@Input() control: FormControl;
	@Input() initialValue: string;
	@Input() id: string;
	@Input() label: string;
	@Input() ariaLabel: string;
	@Input() includeLabelAsWrapper = false; // includes label for layout purposes even if label text wasn't passed in.
	@Input() formFieldAside: string; // Displays additional text above the field. I.E (optional)
	@Input() errorMessage: CustomValidatorMessages;
	@Input() errorOverride?: false;
	@Input() multiline = false;
	@Input() monospaced = false;
	@Input() sublabel: string;
	@Input() placeholder: string;
	@Input() fieldType: FormFieldTextInputType = 'text';
	@Input() maxchar?: number = null;
	@Input() max?: number;
	@Input() optional = false;
	@Input() inlineButtonText: string;

	@Output() buttonClicked = new EventEmitter<MouseEvent>();

	@Input() errorGroup: FormGroup;
	@Input() errorGroupMessage: CustomValidatorMessages;

	@Input() unlockConfirmText =
		'Unlocking this field may have unintended consequences. Are you sure you want to continue?';
	@Input() urlField = false;

	@Input() autofocus = false;

	@ViewChild('textInput') textInput: ElementRef;
	@ViewChild('textareaInput') textareaInput: ElementRef;

	remainingCharactersNum = this.maxchar;

	private _unlocked = false;

	private _locked = false;

	private cachedErrorMessage = null;
	private cachedErrorState = null;
	private cachedDirtyState = null;

	private randomName = 'field' + Math.random();

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}

	ngOnInit() {
		if (this.maxchar) {
			this.remainingCharactersNum = this.maxchar - this.control.value.length;
		}
	}

	ngAfterViewInit() {
		if (this.autofocus) {
			this.focus();
		}
	}

	ngOnChanges(changes: SimpleChanges) {
		// Unlocked by default when there is no value
		if (!this.control.value) {
			this.unlocked = true;
		}

		if ('initialValue' in changes) {
			const initialValue = changes['initialValue'].currentValue;
			if (
				(this.value === null || this.value === undefined || this.value === '') &&
				initialValue !== null &&
				initialValue !== undefined &&
				initialValue !== ''
			) {
				this.control.setValue(initialValue);
			}
		}

		this.updateDisabled();
	}

	updateDisabled() {
		if (!this.control) return;

		if (this.isLockedState) {
			this.control.disable();
		} else {
			this.control.enable();
		}
	}

	unlock() {
		this.dialogService.confirmDialog
			.openResolveRejectDialog({
				dialogTitle: 'Are you sure?',
				dialogBody: this.unlockConfirmText,
				resolveButtonLabel: 'Continue',
				rejectButtonLabel: 'Cancel',
			})
			.then(
				() => (this.unlocked = true),
				() => void 0,
			);
	}

	cacheControlState() {
		this.cachedErrorMessage = this.uncachedErrorMessage;
		this.cachedDirtyState = this.control.dirty;
		this.cachedErrorState = this.controlErrorState;
	}

	focus() {
		this.inputElement.focus();
	}

	select() {
		this.inputElement.select();
	}

	handleKeyPress(event: KeyboardEvent) {
		// This handles revalidating when hitting enter from within an input element. Ideally, we'd catch _all_ form submission
		// events, but since the form supresses those if things aren't valid, that doesn't really work. So we do this hack.
		if (event.code === 'Enter') {
			this.control.markAsDirty();
			this.cacheControlState();
		}
	}

	handleKeyUp(event: KeyboardEvent) {
		this.remainingCharactersNum = this.maxchar - (this.control.value ? this.control.value.length : 0);
	}

	postProcessInput() {
		if (this.urlField) {
			UrlValidator.addMissingHttpToControl(this.control);
		}
	}
}

/**
 * Allowable HTML input type for text based inputs.
 */
export type FormFieldTextInputType = 'text' | 'email' | 'url' | 'tel' | 'password' | 'search' | 'date';

export type ValidatorKey = 'required' | 'maxlength' | 'validUrl';

export type CustomValidatorMessages = string | { [validatorKey: string]: string };

/**
 * Default validation message generators for input fields.
 */
export const defaultValidatorMessages: {
	[validatorKey: string]: (label: string, result?: unknown) => string;
} = {
	required: (label: string) => `${label} is required`,
	validUrl: () => `Please enter a valid URL`,
	invalidTelephone: () => `Please enter a valid phone number`,
	invalidEmail: () => `Please enter a valid email address`,
	maxlength: (label: string, result?: unknown) => {
		const { actualLength, requiredLength } = (result ?? {}) as { actualLength: number; requiredLength: number };
		return actualLength && requiredLength
			? `${label} exceeds maximum length of ${requiredLength} by ${actualLength - requiredLength} characters`
			: `${label} exceeds maximum length.`;
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
