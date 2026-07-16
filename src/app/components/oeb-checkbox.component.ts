import { Component, EventEmitter, forwardRef, computed, input, Input, Output, inject } from '@angular/core';
import { HlmCheckbox } from './spartan/ui-checkbox-helm/src';
import { ControlValueAccessor, FormControl, FormGroup, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { ClassValue } from 'clsx';
import { hlm } from '@spartan-ng/brain/core';
import { CustomValidatorMessages, messagesForValidationError } from './input.component';
import { NgClass } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { OebInputErrorComponent } from './input.error.component';
import { TranslateService } from '@ngx-translate/core';

@Component({
	selector: 'oeb-checkbox',
	imports: [HlmCheckbox, OebInputErrorComponent, ReactiveFormsModule, NgClass],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => OebCheckboxComponent),
			multi: true,
		},
	],
	template: `<label
		[ngClass]="multiLineText ? 'tw-items-start' : 'tw-items-center'"
		class="tw-flex tw-mt-[0.25rem] md:tw-text-lg"
	>
		<hlm-checkbox
			[name]="name"
			[checked]="checked"
			(changed)="onChange($event)"
			[formControl]="control"
			[class.tw-mr-2]="!noMargin"
			class="tw-mt-[1px]"
		/>
		<div class="tw-flex tw-flex-col">
			<span class="tw-pl-[8px]" [ngClass]="{ 'tw-text-darkgrey': control?.disabled }" [innerHTML]="text"></span>
			@if (isErrorState) {
				<oeb-input-error class="tw-text-red tw-pl-[3px]" [error]="errorMessageForDisplay"></oeb-input-error>
			}
		</div>
	</label>`,
	host: {
		'[class]': '_computedClass()',
	},
})
export class OebCheckboxComponent implements ControlValueAccessor {
	private translate = inject(TranslateService);

	@Input() text: string;
	@Input() control: FormControl = new FormControl();
	@Input() name: string;
	@Output() checkedChange = new EventEmitter<boolean>();
	@Input() ngModel: boolean;
	@Input() value: string;
	@Input() checked = false;
	@Input() error: string;
	@Input() errorMessage: CustomValidatorMessages;
	@Input() label: string;
	@Input() errorGroup: FormGroup;
	@Input() errorGroupMessage: CustomValidatorMessages;
	@Input() noMargin = false;
	@Input() multiLineText = false;

	@Output() ngModelChange = new EventEmitter<boolean>();

	constructor() {}

	onChange(event) {
		this.ngModelChange.emit(event);
	}

	public readonly userClass = input<ClassValue>('', { alias: 'class' });
	protected _computedClass = computed(() => hlm(this.userClass()));

	onTouched = () => {};

	writeValue(value: boolean): void {
		this.checked = value;
	}

	registerOnChange(fn: any): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: any): void {
		this.onTouched = fn;
	}

	setDisabledState?(isDisabled: boolean): void {}

	get errorMessageForDisplay(): string {
		return this.uncachedErrorMessage;
	}

	get uncachedErrorMessage(): string {
		const checkboxDefaultErrorText = { required: this.translate.instant('OEBComponents.fieldIsRequired') };

		return messagesForValidationError(this.label, checkboxDefaultErrorText, this.errorMessage).concat(
			messagesForValidationError(this.label, this.errorGroup && this.errorGroup.errors, this.errorGroupMessage),
		)[0]; // Only display the first error
	}

	private cachedErrorState = null;

	get controlErrorState() {
		if (this.control && this.control.hasError('required')) {
			return this.control.dirty && (!this.control.valid || (this.errorGroup && !this.errorGroup.valid));
		}
		return false;
	}

	get isErrorState() {
		if (this.cachedErrorState !== null) {
			return this.cachedErrorState;
		} else {
			return this.controlErrorState;
		}
	}
}
