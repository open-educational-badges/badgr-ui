import {
	Component,
	ElementRef,
	Input,
	ViewChild,
	TemplateRef,
	SimpleChanges,
	AfterViewInit,
	OnChanges,
} from '@angular/core';
import { OebInputErrorComponent } from './input.error.component';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectModule } from './spartan/ui-select-helm/src/index';
import { CustomValidatorMessages, messagesForValidationError } from './input.component';
import { OebSeparatorComponent } from './oeb-separator.component';
import { TranslateModule } from '@ngx-translate/core';
import { HlmP } from '@spartan-ng/helm/typography';

@Component({
	selector: 'oeb-select ',
	imports: [
		BrnSelectImports,
		HlmSelectModule,
		HlmP,
		OebInputErrorComponent,
		ReactiveFormsModule,
		CommonModule,
		OebSeparatorComponent,
		TranslateModule,
	],
	template: ` <div [ngClass]="{ 'tw-mt-6 md:tw-mt-7': !noTopMargin }">
		<div class="tw-max-w-md">
			@if (label) {
				<label class="tw-pb-[2px] tw-pl-[3px]" [attr.for]="inputName">
					<span hlmP class="tw-text-oebblack tw-font-semibold" [innerHTML]="label"></span>
					@if (formFieldAside) {
						<span>{{ formFieldAside }}</span>
					}
					<ng-content select="[label-additions]"></ng-content>
				</label>
			}
		</div>

		@if (sublabel) {
			<p class="tw-text-purple tw-text-lg tw-italic" [innerHTML]="sublabel"></p>
		}

		<div class="tw-max-w-md">
			@if (ariaLabel) {
				<label class="visuallyhidden" [attr.for]="inputName">{{ ariaLabel }}</label>
			}

			@if (description) {
				<div class="tw-italic">{{ description }}</div>
			}

			<brn-select
				[formControl]="control"
				(focus)="cacheControlState()"
				(keypress)="handleKeyPress($event)"
				#selectInput
				class="tw-text-oebblack"
				[ngClass]="{ 'tw-pointer-events-none tw-opacity-50': disabled }"
				[attr.id]="id"
				[placeholder]="placeholder"
				[multiple]="multiple"
				brn-select
				hlm
			>
				@if (placeholder) {
					<div brnSelectLabel class="tw-hidden"></div>
				}

				<hlm-select-trigger
					[size]="actionBar ? 'actionBar' : 'default'"
					class="tw-w-full tw-border-solid tw-border-purple tw-bg-white "
				>
					@if (!multiple) {
						<hlm-select-value class="tw-text-base " />
					}
					@if (multiple) {
						<div class="tw-text-base">{{ placeholder }}</div>
					}
				</hlm-select-trigger>
				<hlm-select-content [ngStyle]="{ 'max-height.px': dropdownMaxHeight }">
					@for (option of options; track option) {
						<hlm-option [value]="option.value">{{ option.label | translate }}</hlm-option>
					}
					@if (template) {
						<div>
							<oeb-separator [separatorStyle]="'!tw-border-dashed'"></oeb-separator>
							<ng-content *ngTemplateOutlet="template"></ng-content>
						</div>
					}
				</hlm-select-content>
			</brn-select>

			@if (isErrorState) {
				<oeb-input-error class="tw-text-red tw-pl-[3px]" [error]="errorMessageForDisplay"></oeb-input-error>
			}
		</div>
	</div>`,
})
export class OebSelectComponent implements AfterViewInit, OnChanges {
	@Input() control: FormControl;
	@Input() initialValue: string;
	@Input() label: string;
	@Input() ariaLabel: string | null = null;
	@Input() includeLabelAsWrapper = false; // includes label for layout purposes even if label text wasn't passed in.
	@Input() formFieldAside: string; // Displays additional text above the field. I.E (optional)
	@Input() errorMessage: CustomValidatorMessages;
	@Input() multiline = false;
	@Input() sublabel: string;
	@Input() description: string;
	@Input() placeholder: string;
	@Input() multiple: boolean = false;
	@Input() disabled: boolean = false;
	@Input() id: string = null;
	@Input() actionBar: boolean = false;
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
	@Input() noTopMargin = false;
	@Input() dropdownMaxHeight: number | undefined;
	@Input() template?: TemplateRef<any>;

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

	cacheControlState() {
		this.cachedErrorMessage = this.uncachedErrorMessage;
		this.cachedDirtyState = this.control.dirty;
		this.cachedErrorState = this.controlErrorState;
	}

	focus() {
		if (this.inputElement) {
			this.inputElement.focus();
		}
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
}
