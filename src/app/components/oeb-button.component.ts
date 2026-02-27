import { Component, computed, input, signal, OnInit, OnDestroy } from '@angular/core';
import { ButtonVariants, HlmButton } from './spartan/ui-button-helm/src';
import { NgClass } from '@angular/common';
import { MessageService } from '../common/services/message.service';
import { lucidePlus, lucideUpload, lucideCircleX, lucideMapPin } from '@ng-icons/lucide';
import { provideIcons } from '@ng-icons/core';
import { HlmIcon } from './spartan/ui-icon-helm/src';
import { NgIcon } from '@ng-icons/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, Subscription } from 'rxjs';

@Component({
	selector: 'oeb-button',
	imports: [HlmButton, HlmIcon, NgClass, NgIcon],
	providers: [MessageService, provideIcons({ lucideUpload, lucidePlus, lucideCircleX, lucideMapPin })],
	template: `<button
		[type]="type()"
		class="tw-relative"
		hlmBtn
		[disabled]="computedDisabled()"
		[weight]="weight()"
		[width]="width()"
		[size]="size()"
		[variant]="variant()"
		[attr.id]="id()"
		[attr.data-umami-event]="umamiEvent()"
	>
		@if (icon() && iconLeft()) {
			<ng-icon hlm [size]="iconSize()" [name]="icon()" />
		}
		@if (img()) {
			<img class="md:tw-h-[30px] tw-h-[20px] tw-pr-4" [src]="img()" />
		}
		<span [ngClass]="{ 'tw-ml-4': iconLeft() }" [innerHTML]="computedText()"></span>
		@if (icon() && !iconLeft()) {
			<ng-icon hlm [size]="iconSize()" [name]="icon()" />
		}
	</button>`,
})
export class OebButtonComponent implements OnInit, OnDestroy {
	readonly variant = input<ButtonVariants['variant']>('default');
	readonly size = input<ButtonVariants['size']>('default');
	readonly weight = input<ButtonVariants['weight']>('bold');
	readonly width = input<ButtonVariants['width']>('default');
	readonly disabled = input<boolean>(false);
	readonly text = input<string>();
	readonly img = input<string>();
	readonly icon = input<string>();
	readonly iconSize = input<string>('lg');
	readonly type = input<'submit' | 'reset' | 'button'>('submit');
	readonly id = input<string>();
	readonly iconLeft = input<boolean>(false);
	readonly umamiEvent = input<string>();

	readonly loadingMessage = input<string>('Loading', { alias: 'loading-message' });
	readonly disableWhenRequesting = input<boolean>(false, { alias: 'disabled-when-requesting' });
	readonly loadingPromise = input<Promise<unknown> | Promise<unknown | undefined | null>[]>(undefined, {
		alias: 'loading-promises',
	});
	readonly loadingPromise$ = toObservable(this.loadingPromise);
	readonly promiseIsLoading = signal(false);
	private loadingSubscription?: Subscription;

	readonly computedDisabled = computed(
		() => this.disabled() || (this.disableWhenRequesting() && this.promiseIsLoading()),
	);

	readonly computedText = computed(() => {
		return this.promiseIsLoading() && this.loadingMessage() ? this.loadingMessage() : this.text();
	});

	constructor() {}

	ngOnInit() {
		// Subscribe to changes made to the loadingPromises
		let currentLoadingPromise: Promise<unknown[]>;
		this.loadingSubscription = this.loadingPromise$
			.pipe(map((p) => this.transformPromisesInput(p)))
			.subscribe((p) => {
				currentLoadingPromise = p;
				if (p === null) {
					// loading promises have been removed from component, hence we are not loading anymore
					this.promiseIsLoading.set(false);
				} else {
					this.promiseIsLoading.set(true);
					p.then((_) => {
						if (currentLoadingPromise === p) this.promiseIsLoading.set(false);
					});
				}
			});
	}

	ngOnDestroy() {
		this.loadingSubscription?.unsubscribe();
	}

	/**
	 * Transforms the promises input {@link loadingPromise} on the component into a single
	 * promise that can be used to decide whether the button should be disabled or not.
	 * This handles both single promises as well as arrays of promises attached to
	 * the components input.
	 * @param input Input to the component
	 * @returns Promise to be used to decide whether to disable the button or null if
	 * there are no promises in the input.
	 */
	transformPromisesInput(input: Promise<unknown> | Promise<unknown>[] | undefined | null): Promise<unknown[]> | null {
		if (!input) return null;

		let promises: Array<Promise<unknown>> = [];
		if (Array.isArray(input)) promises = [...input.filter((p) => !!p && typeof p.then === 'function')];
		else if (!!input && typeof input.then === 'function') promises = [input];

		if (promises.length === 0) return null;
		else return Promise.allSettled(promises); // allSettled -> we don't care if the promises are successful or not
	}
}
