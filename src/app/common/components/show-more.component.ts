import { AfterViewChecked, Component, ElementRef, Input, ViewChild, inject } from '@angular/core';

@Component({
	selector: 'show-more',
	host: {
		class: 'showmore',
		'[class.showmore-is-open]': 'isOpen',
		'[class.showmore-is-loaded]': 'loaded',
	},
	template: `
		<div #container class="showmore-x-container">
			<div #content class="showmore-x-content">
				<ng-content></ng-content>
			</div>
		</div>

		<button class="showmore-x-button" (click)="toggleOpen()">
			<div class="showmore-x-buttoninside">{{ isOpen ? 'Show Less' : 'Show More' }}</div>
		</button>
	`,
})
export class ShowMore implements AfterViewChecked {
	private componentRef = inject(ElementRef);

	@Input()
	maxCollapsedHeight = 256;

	@ViewChild('content')
	contentRef: ElementRef;

	@ViewChild('container')
	containerRef: ElementRef;

	isOpen = false;
	loaded = false;

	get contentElem() {
		return this.contentRef.nativeElement as HTMLElement;
	}
	get containerElem() {
		return this.containerRef.nativeElement as HTMLElement;
	}
	get componentElem() {
		return this.componentRef.nativeElement as HTMLElement;
	}

	constructor() {}

	toggleOpen() {
		this.isOpen = !this.isOpen;
	}

	ngAfterViewChecked(): void {
		// Manually update the height and toggle the unnecessary flag instead of using data-binding because these flags are
		// based on the content of the DOM, and having to route those changes back through angular can cause a feedback
		// loop that Angular throws an error about in dev mode, and could potentially could result in an infinite loop.
		this.containerElem.style.maxHeight = this.isOpen
			? this.contentElem.clientHeight + 'px'
			: this.maxCollapsedHeight + 'px';

		this.componentElem.classList.toggle(
			'showmore-is-unnecessary',
			this.contentElem.clientHeight <= this.maxCollapsedHeight,
		);
	}
}
