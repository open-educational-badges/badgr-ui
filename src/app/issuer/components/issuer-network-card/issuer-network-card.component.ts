import { Component, computed, inject, input, output } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Issuer } from '~/issuer/models/issuer.model';
import { IssuerV3 } from '~/issuer/models/issuerv3.model';
import { NetworkV3 } from '~/issuer/models/networkv3.model';
import { HlmH2, HlmP } from '@spartan-ng/helm/typography';
import { TruncatedTextComponent } from '~/common/components/truncated-text.component';
import { BgImageStatusPlaceholderDirective } from '~/common/directives/bg-image-status-placeholder.directive';
import { HlmBadge } from '~/components/spartan/ui-badge-helm/src';
import { I18nPluralPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * A card to display public or private issuers or networks
 */
@Component({
	selector: 'oeb-issuer-network-card',
	imports: [
		TranslatePipe,
		HlmH2,
		HlmP,
		HlmBadge,
		TruncatedTextComponent,
		BgImageStatusPlaceholderDirective,
		I18nPluralPipe,
		RouterLink,
	],
	template: `
		<article
			class="tw-max-w-[660px] tw-h-[450px] tw-border-solid tw-border tw-border-purple tw-rounded-lg tw-p-8 tw-flex tw-flex-col tw-gap-6 tw-items-start tw-justify-between"
		>
			<div class="tw-flex tw-flex-row tw-gap-4 tw-items-center">
				<img
					class="tw-w-24 tw-aspect-square tw-rounded-sm"
					[loaded-src]="issuerOrNetwork().image"
					[loading-src]="issuerImagePlaceHolderUrl"
					[error-src]="issuerImagePlaceHolderUrl"
					alt="{{ issuerOrNetwork().name }} logo"
				/>
				<div>
					@if (!isIssuer()) {
						<p>{{ 'General.network' | translate }}</p>
					}
					<a
						hlmH2
						class="tw-font-bold tw-break-words tw-hyphens-auto tw-cursor-pointer"
						(click)="navigate.emit()"
						[truncatedText]="issuerOrNetwork().name"
						[maxLength]="48"
						>{{ issuerOrNetwork().name }}</a
					>
				</div>
			</div>

			<p
				hlmP
				class="tw-break-words tw-font-normal tw-hyphens-auto"
				[truncatedText]="issuerOrNetwork().description"
				[maxLength]="250"
			>
				{{ issuerOrNetwork().description }}
			</p>

			@if (isPublic()) {
				@if (isIssuer()) {
					<div variant="categoryTag" hlmBadge>
						{{ 'Issuer.categories.' + isIssuer()?.category | translate }}
					</div>
				}
				<div class="tw-flex tw-flex-row tw-gap-4">
					<a
						hlmP
						class="tw-flex tw-flex-row tw-text-purple tw-font-semibold tw-items-center hover:tw-underline"
						[routerLink]="['/public/issuers/', isIssuer()?.slug]"
					>
						<img src="assets/badges/badgeIcon.svg" alt="bade icon" class="tw-w-9" />
						<p>{{ isIssuer()?.badgeClassCount | i18nPlural: plural['badges'] }}</p>
					</a>
					@if (isIssuer()?.learningPathCount ?? 0 > 0) {
						<a
							hlmP
							class="tw-flex tw-flex-row tw-text-purple tw-font-semibold tw-items-center hover:tw-underline"
							[routerLink]="['/public/issuers/', isIssuer()?.slug]"
						>
							<img
								src="assets/oeb/images/learningPath/learningPathIcon.svg"
								alt="learning path icon"
								class="tw-w-7"
							/>
							<p class="tw-ml-2">
								{{ isIssuer()?.learningPathCount | i18nPlural: plural['learningPath'] }}
							</p>
						</a>
					}
				</div>
			} @else {}
		</article>
	`,
})
export class OebIssuerNetworkCard {
	private translate = inject(TranslateService);

	readonly issuerOrNetwork = input.required<IssuerTypes | NetworkTypes>();
	readonly navigate = output();
	readonly issuerImagePlaceHolderUrl = '../../../../breakdown/static/images/placeholderavatar-issuer.svg';
	readonly plural = {
		badges: {
			'=0': this.translate.instant('Issuer.noBadges'),
			'=1': '1 Badge',
			other: '# Badges',
		},
		learningPath: {
			'=0': this.translate.instant('General.noLearningPaths'),
			'=1': '1 ' + this.translate.instant('General.learningPath'),
			other: '# ' + this.translate.instant('General.learningPaths'),
		},
	};
	readonly isIssuer = computed(() => {
		const iOrN = this.issuerOrNetwork();
		return this.isIssuerType(iOrN) ? iOrN : undefined;
	});
	readonly isPublic = computed(() => this.issuerOrNetwork() instanceof IssuerV3);

	isIssuerType(obj: unknown): obj is IssuerTypes {
		return obj instanceof Issuer || obj instanceof IssuerV3;
	}
}

type IssuerTypes = Issuer | IssuerV3;
type NetworkTypes = NetworkV3;
