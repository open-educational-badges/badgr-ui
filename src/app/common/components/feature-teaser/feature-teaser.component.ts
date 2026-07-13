import { Component, Input } from '@angular/core';

@Component({
	selector: 'oeb-feature-teaser',
	standalone: true,
	templateUrl: './feature-teaser.component.html',
})
export class OebFeatureTeaserComponent {
	@Input() imagePosition: 'left' | 'right' = 'left';
}
