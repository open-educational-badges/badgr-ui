import {
	AfterViewChecked,
	AfterViewInit,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnChanges,
	Output,
	SimpleChanges,
	ViewChild,
} from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
	selector: 'bg-formfield-radio',
	host: {
		class: 'forminput',
		'[class.forminput-is-error]': 'isErrorState',
		'[class.forminput-locked]': 'isLockedState',
		'[class.forminput-monospaced]': 'monospaced',
		'[class.forminput-withbutton]': 'inlineButtonText',
		'[class.forminput-withsublabel]': 'sublabel',
	},
	template: `
		<div class="">
			<label class="radio">
				<input type="radio" [id]="inputId" [name]="name" [value]="value" [formControl]="control" #radioInput />
				<span class="radio-x-text">{{ label }}</span>
			</label>

			@if (sublabel) {
				<p class="u-margin-left3p5x u-text-small u-margin-bottom2x">
					<span [class]="{ 'tw-text-[#dedede]': disabled }">{{ sublabel }}</span>
				</p>
			}
		</div>
		@if (!control.valid && control.dirty && last) {
			<p class="forminput-x-error">{{ errorMessageForDisplay }}</p>
		}
	`,
	imports: [FormsModule, ReactiveFormsModule],
})
export class FormFieldRadio implements OnChanges, AfterViewInit, AfterViewChecked {
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
		return this.radioInput.nativeElement;
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

	get controlErrorState() {
		return !this.control.valid;
	}

	get isErrorState() {
		return !this.optional && this.control !== undefined && !this.control.valid;
	}

	get isLockedState() {
		return this.locked && !this.unlocked;
	}

	get inputId() {
		return this.id || (this.label || this.randomName).replace(/[^\w]+/g, '_').toLowerCase();
	}
	@Input() control: FormControl;
	@Input() value: string;
	@Input() id: string;
	@Input() label: string;
	@Input() name: string;
	@Input() ariaLabel: string;
	@Input() includeLabelAsWrapper = false; // includes label for layout purposes even if label text wasn't passed in.
	@Input() formFieldAside: string; // Displays additional text above the field. I.E (optional)
	@Input() errorMessage: CustomValidatorMessages;
	@Input() monospaced = false;
	@Input() sublabel: string;
	@Input() optional = false;
	@Input() inlineButtonText: string;
	@Input() last: boolean;

	@Output() buttonClicked = new EventEmitter<MouseEvent>();

	@Input() errorGroup: FormGroup;
	@Input() errorGroupMessage: CustomValidatorMessages;

	@Input() unlockConfirmText =
		'Unlocking this field may have unintended consequences. Are you sure you want to continue?';

	@Input() autofocus = false;

	@Input() disabled = false;

	@ViewChild('radioInput') radioInput: ElementRef;

	private _unlocked = false;

	private _locked = false;

	private cachedErrorMessage = null;
	private cachedErrorState = null;
	private cachedDirtyState = null;

	private randomName = 'field' + Math.random();

	ngAfterViewInit() {
		if (this.autofocus) {
			this.focus();
		}
	}

	ngAfterViewChecked() {
		if (this.disabled) {
			this.radioInput.nativeElement.setAttribute('disabled', '');
		} else {
			this.radioInput.nativeElement.removeAttribute('disabled');
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
}

export type ValidatorKey = 'required';

export type CustomValidatorMessages = string | { [validatorKey: string]: string };

/**
 * Default validation message generators for input fields.
 */
export const defaultValidatorMessages: {
	[validatorKey: string]: (label: string, result?: unknown) => string;
} = {
	required: (label: string) => `${label} is required`,
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
