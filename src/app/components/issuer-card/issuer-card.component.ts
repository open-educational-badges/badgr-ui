import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { BgImageStatusPlaceholderDirective } from '../../common/directives/bg-image-status-placeholder.directive';
import { TruncatedTextComponent } from '../../common/components/truncated-text.component';
import { HlmBadge } from '../spartan/ui-badge-helm/src/lib/hlm-badge.directive';
import { RouterLink } from '@angular/router';
import { I18nPluralPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { preloadImageURL } from '../../common/util/file-util';
import { HlmH2, HlmP } from '@spartan-ng/helm/typography';
import { Issuer } from '~/issuer/models/issuer.model';
import { IssuerV3 } from '~/issuer/models/issuerv3.model';

@Component({
	selector: 'oeb-issuer-card',
	templateUrl: './issuer-card.component.html',
	styleUrls: ['./issuer-card.component.css'],
	imports: [
		BgImageStatusPlaceholderDirective,
		HlmH2,
		TruncatedTextComponent,
		HlmP,
		HlmBadge,
		RouterLink,
		I18nPluralPipe,
		TranslatePipe,
	],
})
export class IssuerCardComponent {
	@Input() issuer: Issuer | IssuerV3;
	@Input() plural: object;

	@Output() navigate = new EventEmitter<void>();

	constructor() {}
	readonly issuerImagePlaceHolderUrl = preloadImageURL(
		'../../../../breakdown/static/images/placeholderavatar-issuer.svg',
	);

	onNavigate() {
		this.navigate.emit();
	}
}
