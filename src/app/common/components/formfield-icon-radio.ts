import { Component, Input } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormFieldRadio } from './formfield-radio';
import { NgIcon } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';

@Component({
	selector: 'bg-formfield-icon-radio',
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
			<label class="radio with-icon">
				<input type="radio" [id]="inputId" [name]="name" [value]="value" [formControl]="control" #radioInput />
				<div class="radio-icon">
					<ng-icon hlm name="{{ icon }}" class=""></ng-icon>
				</div>
				<span class="radio-x-text">{{ label }}</span>
			</label>

			@if (sublabel) {
				<p class="u-margin-left3p5x u-text-small u-margin-bottom2x">{{ sublabel }}</p>
			}
		</div>
		@if (!control.valid && control.dirty && last) {
			<p class="forminput-x-error">{{ errorMessageForDisplay }}</p>
		}
	`,
	imports: [FormsModule, ReactiveFormsModule, NgIcon, HlmIcon],
})
export class FormFieldIconRadio extends FormFieldRadio {
	@Input() icon: string;
}
