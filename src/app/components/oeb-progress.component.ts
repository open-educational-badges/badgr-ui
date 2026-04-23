import { Component, Input, OnInit, TemplateRef, ChangeDetectorRef, inject } from '@angular/core';
import { BrnProgress, BrnProgressIndicator } from '@spartan-ng/brain/progress';
import { HlmProgressIndicator } from './spartan/ui-progress-helm/src';
import { NgTemplateOutlet } from '@angular/common';

@Component({
	selector: 'oeb-progress',
	imports: [BrnProgress, BrnProgressIndicator, HlmProgressIndicator, NgTemplateOutlet],
	template: `
		<brn-progress [class]="class" hlm aria-labelledby="loading" [value]="progressValue">
			<brn-progress-indicator hlm />
			@if (template) {
				<ng-container *ngTemplateOutlet="template"></ng-container>
			}
		</brn-progress>
	`,
})
export class OebProgressComponent implements OnInit {
	private cdr = inject(ChangeDetectorRef);

	@Input() value: number;
	@Input() class: string = '';
	@Input() template?: TemplateRef<any>;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}
	progressValue = 0;

	ngOnInit() {
		setTimeout(() => {
			this.progressValue = this.value;
			this.cdr.detectChanges();
		}, 1000);
	}
}
