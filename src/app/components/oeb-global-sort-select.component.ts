import { Component, Input, OnInit, Output, EventEmitter, AfterViewInit, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { OebSelectComponent } from './select.component';

@Component({
	selector: 'oeb-global-sort-select',
	template: `
		<oeb-select
			[actionBar]="true"
			class="oeb tw-block tw-w-full"
			[options]="options"
			[control]="control"
			[disabled]="disabled"
			[autofocus]="true"
			[placeholder]="placeholder"
			[noTopMargin]="true"
		></oeb-select>
	`,
	imports: [OebSelectComponent],
})
export class OebGlobalSortSelectComponent implements OnInit {
	private translate = inject(TranslateService);

	@Input() control!: FormControl;
	@Input() options!: Array<{ value: string; label: string }>;
	@Input() disabled: boolean = false;
	@Input() placeholder: string | undefined;

	@Output() sortChanged = new EventEmitter<string>();

	ngOnInit(): void {
		this.control.valueChanges.subscribe((value) => {
			this.sortChanged.emit(value);
		});
	}
}
