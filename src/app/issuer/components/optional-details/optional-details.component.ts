import { Component, Output, EventEmitter, OnInit, input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TypedFormGroup, TypedFormArray, TypedFormControl } from '~/common/util/typed-forms';
import { OebCheckboxComponent } from '~/components/oeb-checkbox.component';
import { OebInputComponent } from '~/components/input.component';
import { OebCollapsibleComponent } from '~/components/oeb-collapsible.component';
import { NgIcon } from '@ng-icons/core';
import { OebSeparatorComponent } from '~/components/oeb-separator.component';
import { OebButtonComponent } from '~/components/oeb-button.component';

@Component({
	selector: 'oeb-optional-details',
	standalone: true,
	imports: [
		CommonModule,
		TranslateModule,
		OebCheckboxComponent,
		OebInputComponent,
		OebCollapsibleComponent,
		NgIcon,
		OebSeparatorComponent,
		OebButtonComponent,
	],
	templateUrl: './optional-details.component.html',
})
export class OptionalDetailsComponent implements OnInit {
	readonly parentForm = input.required<TypedFormGroup<any, any>>();
	readonly showExpiration = input<boolean>(false);
	readonly showEvidence = input<boolean>(false);
	readonly showLocation = input<boolean>(false);
	readonly showCourseDate = input<boolean>(false);
	readonly showCourseUrl = input<boolean>(false);
	readonly courseUrlDefaultOpen = input<boolean>(false);
	readonly isOptional = input<boolean>(true);

	@Output() addEvidenceEvent = new EventEmitter<void>();
	@Output() removeEvidenceEvent = new EventEmitter<number>();

	sharedNarrative: string = '';

	ngOnInit() {
		if (!this.parentForm()) {
			throw new Error('parentForm is required for OptionalDetailsComponent');
		}

		const evidence = this.evidenceItems;
		if (evidence && evidence.length > 0) {
			const first = evidence.controls[0].controls['narrative'] as TypedFormControl<any>;
			this.sharedNarrative = first.value ?? '';
		}
	}

	onNarrativeChange(event: Event): void {
		const target = event.target as HTMLTextAreaElement;
		this.sharedNarrative = target.value;

		if (this.evidenceItems) {
			this.evidenceItems.controls.forEach((control) => {
				const narrativeControl = control.controls['narrative'] as TypedFormControl<any>;
				narrativeControl.setValue(this.sharedNarrative);
			});
		}
	}

	get evidenceItems(): TypedFormArray<any, any> | null {
		return (this.parentForm().controls['evidence_items'] as TypedFormArray<any, any>) || null;
	}

	addEvidence(): void {
		this.addEvidenceEvent.emit();

		if (this.evidenceItems && this.evidenceItems.controls.length > 0) {
			const lastItem = this.evidenceItems.controls[this.evidenceItems.controls.length - 1];
			const narrativeControl = lastItem.controls['narrative'] as TypedFormControl<any>;
			narrativeControl.setValue(this.sharedNarrative);
		}
	}

	getEvidenceUrlControl(index: number): FormControl {
		const item = this.evidenceItems?.controls[index];
		if (item) {
			const urlControl = item.controls['evidence_url'] as TypedFormControl<any>;
			return urlControl.rawControl;
		}
		return new FormControl('');
	}

	removeEvidence(index: number): void {
		this.removeEvidenceEvent.emit(index);
	}

	hasControl(controlName: string): boolean {
		return controlName in this.parentForm().controls;
	}

	getRawControl(controlName: string): FormControl {
		const typedControl = this.parentForm().controls[controlName] as TypedFormControl<any>;
		return typedControl.rawControl;
	}
}
