import { Component, Input, OnInit, TemplateRef, ChangeDetectorRef, inject, input, computed } from '@angular/core';
import { BrnProgress, BrnProgressIndicator } from '@spartan-ng/brain/progress';
import { HlmProgressIndicator } from './spartan/ui-progress-helm/src';
import { NgTemplateOutlet } from '@angular/common';
import type { IndicatorVariants } from './spartan/ui-progress-helm/src';

@Component({
	selector: 'oeb-progress',
	imports: [BrnProgress, BrnProgressIndicator, HlmProgressIndicator, NgTemplateOutlet],
	template: `
		<brn-progress [attr.class]="class()" hlm aria-labelledby="loading" [value]="progressValue()">
			<brn-progress-indicator hlm [variant]="variant()" />
			@if (template()) {
				<ng-container *ngTemplateOutlet="template()"></ng-container>
			}
		</brn-progress>
	`,
})
export class OebProgressComponent {
	public readonly value = input<number>(0);

	public readonly class = input<string>('');

	public readonly template = input<TemplateRef<unknown> | null>(null);

	public readonly variant = input<IndicatorVariants['variant']>('default');

	protected readonly progressValue = computed(() => this.value());
}
