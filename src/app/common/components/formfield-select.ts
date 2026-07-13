import {
	AfterViewInit,
	Component,
	ElementRef,
	Input,
	OnChanges,
	SimpleChanges,
	ViewChild,
	inject,
} from '@angular/core';

import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CommonDialogsService } from '../services/common-dialogs.service';
import { CustomValidatorMessages, messagesForValidationError } from './formfield-text';

@Component({
	selector: 'bg-formfield-select',
	host: {
		class: 'forminput',
		'[class.forminput-is-error]': 'isErrorState',
		'[class.forminput-locked]': 'isLockedState',
	},
	template: `
		@if (label || includeLabelAsWrapper) {
			<label class="forminput-x-label" [attr.for]="inputName">
				{{ label }}
				@if (formFieldAside) {
					<span>{{ formFieldAside }}</span>
				}
				@if (isLockedState) {
					<button type="button" (click)="unlock()">(unlock)</button>
				}
				<ng-content select="[label-additions]"></ng-content>
			</label>
		}

		@if (ariaLabel) {
			<label class="visuallyhidden" [attr.for]="inputName">{{ ariaLabel }}</label>
		}

		@if (description) {
			<div class="forminput-x-sublabel">{{ description }}</div>
		}
		<div class="forminput-x-inputs">
			<select
				[name]="inputName"
				[id]="inputName"
				[attr.disabled]="disabled ? '' : null"
				[formControl]="control"
				(focus)="cacheControlState()"
				(keypress)="handleKeyPress($event)"
				#selectInput
			>
				@if (placeholder) {
					<option selected value="">{{ placeholder }}</option>
				}
				@for (option of options; track option) {
					<option [value]="option.value">{{ option.label }}</option>
				}
			</select>
		</div>

		@if (isErrorState) {
			<p class="forminput-x-error">{{ errorMessageForDisplay }}</p>
		}
	`,
	imports: [FormsModule, ReactiveFormsModule],
})
export class FormFieldSelect implements OnChanges, AfterViewInit {
	private dialogService = inject(CommonDialogsService);

	@Input() control: FormControl;
	@Input() initialValue: string;
	@Input() label: string;
	@Input() ariaLabel: string | null = null;
	@Input() includeLabelAsWrapper = false; // includes label for layout purposes even if label text wasn't passed in.
	@Input() formFieldAside: string; // Displays additional text above the field. I.E (optional)
	@Input() errorMessage: CustomValidatorMessages;
	@Input() multiline = false;
	@Input() description: string;
	@Input() placeholder: string;
	@Input() disabled: boolean = false;

	@Input() options: FormFieldSelectOption[];
	@Input() set optionMap(valueToLabelMap: { [value: string]: string }) {
		this.options = Object.getOwnPropertyNames(valueToLabelMap).map((value) => ({
			value,
			label: valueToLabelMap[value],
		}));
	}

	@Input() errorGroup: FormGroup;
	@Input() errorGroupMessage: CustomValidatorMessages;

	@Input() unlockConfirmText =
		'Unlocking this field may have unintended consequences. Are you sure you want to continue?';
	@Input() urlField = false;

	@Input() autofocus = false;

	@ViewChild('selectInput') selectInput: ElementRef;

	private _unlocked = false;
	@Input()
	set unlocked(unlocked: boolean) {
		this._unlocked = unlocked;
		this.updateDisabled();
	}

	get unlocked() {
		return this._unlocked;
	}

	private _locked = false;
	@Input()
	set locked(locked: boolean) {
		this._locked = locked;
		this.updateDisabled();
	}

	get locked() {
		return this._locked;
	}

	get inputElement(): HTMLInputElement | HTMLTextAreaElement {
		if (this.selectInput && this.selectInput.nativeElement) {
			return this.selectInput.nativeElement;
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
		return messagesForValidationError(this.label, this.control && this.control.errors, this.errorMessage).concat(
			messagesForValidationError(this.label, this.errorGroup && this.errorGroup.errors, this.errorGroupMessage),
		)[0]; // Only display the first error
	}

	get value() {
		return this.control.value;
	}

	private cachedErrorMessage = null;
	private cachedErrorState = null;
	private cachedDirtyState = null;

	get controlErrorState() {
		return this.control.dirty && (!this.control.valid || (this.errorGroup && !this.errorGroup.valid));
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

	private randomName = 'field' + Math.random();

	get inputName() {
		return (this.label || this.placeholder || this.randomName).replace(/[^\w]+/g, '_').toLowerCase();
	}

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}

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
		if (!this.control) {
			return;
		}

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
		if (event.keyCode === 13) {
			this.control.markAsDirty();
			this.cacheControlState();
		}
	}
}

export interface FormFieldSelectOption {
	label: string;
	value: string;
	description?: string;
	icon?: string;
}
