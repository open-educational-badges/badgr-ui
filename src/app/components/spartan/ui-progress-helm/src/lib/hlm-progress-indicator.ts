import { Directive, computed, input } from '@angular/core';
import { hlm } from '@spartan-ng/brain/core';
import { injectBrnProgress } from '@spartan-ng/brain/progress';
import { cva, VariantProps } from 'class-variance-authority';
import type { ClassValue } from 'clsx';

export const indicatorVariants = cva(
	'tw-inline-flex tw-transform-gpu tw-h-full tw-w-full tw-flex-1 tw-transition-all',
	{
		variants: {
			variant: {
				default: 'tw-bg-green',
				purple: 'tw-bg-purple',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

export type IndicatorVariants = VariantProps<typeof indicatorVariants>;

@Directive({
	selector: '[hlmProgressIndicator],brn-progress-indicator[hlm]',
	host: {
		'[class]': '_computedClass()',
		'[class.animate-indeterminate]': '_indeterminate()',
		'[style.transform]': '_transform()',
	},
})
export class HlmProgressIndicator {
	private readonly _progress = injectBrnProgress();
	public readonly userClass = input<ClassValue>('', { alias: 'class' });
	public readonly variant = input<IndicatorVariants['variant']>('default');

	protected readonly _computedClass = computed(() =>
		hlm(
			indicatorVariants({
				variant: this.variant(),
			}),
			this.userClass(),
		),
	);

	protected readonly _transform = computed(() => `translateX(-${100 - (this._progress.value() ?? 100)}%)`);

	protected readonly _indeterminate = computed(
		() => this._progress.value() === null || this._progress.value() === undefined,
	);
}
