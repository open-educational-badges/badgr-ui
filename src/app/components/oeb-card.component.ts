import { Component } from '@angular/core';
import { HlmCardModule } from './spartan/ui-card-helm/src';

@Component({
	selector: 'oeb-card',
	standalone: true,
	imports: [HlmCardModule],
	host: {
		class: 'tw-block tw-h-full',
	},
	template: `
		<section hlmCard class="tw-flex tw-flex-col tw-h-full tw-box-border">
			<div hlmCardHeader>
				<ng-content select="[card-header]"></ng-content>
			</div>

			<div hlmCardContent class="tw-flex-grow">
				<ng-content select="[card-content]"></ng-content>
			</div>

			<div hlmCardFooter>
				<ng-content select="[card-footer]"></ng-content>
			</div>
		</section>
	`,
})
export class OebCardComponent {}
