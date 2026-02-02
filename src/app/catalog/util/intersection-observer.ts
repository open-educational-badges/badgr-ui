import { ElementRef, Signal } from '@angular/core';

export interface InfiniteScrollConfig {
	hasNext: Signal<boolean>;
	observeScrolling: Signal<boolean>;
	onLoadMore: () => void;
	rootMargin?: string;
}

export function createInfiniteScrollObserver(element: ElementRef, config: InfiniteScrollConfig): IntersectionObserver {
	return new IntersectionObserver(
		(entries) => {
			const entry = entries.at(0);
			if (entry?.isIntersecting && config.hasNext() && config.observeScrolling()) {
				config.onLoadMore();
			}
		},
		{
			rootMargin: config.rootMargin ?? '20% 0px',
		},
	);
}
