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
import { Network } from '~/issuer/network.model';
import { OebButtonComponent } from '~/components/oeb-button.component';

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
		OebButtonComponent,
	],
	template: `
		<article [class]="containerClasses()" (click)="navigate.emit('container')">
			<div
				class="tw-flex tw-flex-row"
				[class.tw-items-center]="inputAsIssuer() || !isPublic()"
				[class.tw-gap-4]="inputAsNetwork()"
				[class.tw-gap-2]="inputAsIssuer()"
			>
				<div class="tw-w-28 tw-h-28 tw-aspect-square tw-p-2 tw-rounded-sm tw-bg-white">
					<img
						class="tw-rounded-sm tw-w-full tw-h-full"
						[loaded-src]="issuerOrNetwork().image ?? issuerImagePlaceHolderUrl"
						[loading-src]="issuerImagePlaceHolderUrl"
						[error-src]="issuerImagePlaceHolderUrl"
						alt="{{ issuerOrNetwork().name }} logo"
					/>
				</div>
				<div>
					@if (!inputAsIssuer() && isPublic()) {
						<p class="tw-uppercase tw-font-semibold tw-text-base">{{ 'General.network' | translate }}</p>
					}
					<a
						hlmH2
						class="tw-font-bold tw-break-words tw-hyphens-auto tw-cursor-pointer"
						[class.tw-text-white]="inputAsNetwork()"
						(click)="navigate.emit('heading')"
						[truncatedText]="issuerOrNetwork().name"
						[maxLength]="48"
						>{{ issuerOrNetwork().name }}</a
					>
					@if (!isPublic()) {
						<p hlmP class="tw-italic" [class.tw-text-white]="inputAsNetwork()">
							@if (inputAsPrivateIssuer()) {
								{{ 'Issuer.yourRole' | translate }}
								{{ inputAsPrivateIssuer()?.currentUserStaffMember?.roleInfo?.label ?? '' | translate }}
							} @else {
								{{
									'Network.yourRole'
										| translate
											: {
													role:
														'Network.role.' + inputAsNetwork()?.current_user_network_role
														| translate,
											  }
								}}
							}
						</p>
					}
				</div>
			</div>

			<p
				hlmP
				class="tw-break-words tw-font-normal tw-hyphens-auto tw-flex-grow"
				[class.tw-text-white]="inputAsNetwork()"
				[class.tw-px-2]="inputAsIssuer()"
				[truncatedText]="issuerOrNetwork().description"
				[maxLength]="300"
			>
				{{ issuerOrNetwork().description }}
			</p>

			@if (isPublic()) {
				@if (inputAsIssuer()) {
					<div variant="categoryTag" hlmBadge class="tw-mb-4">
						{{ 'Issuer.categories.' + inputAsIssuer()?.category | translate }}
					</div>

					<div class="tw-flex tw-flex-row tw-gap-4">
						<a
							hlmP
							class="tw-flex tw-flex-row tw-text-purple tw-font-semibold tw-items-center hover:tw-underline"
							[routerLink]="['/public/issuers/', inputAsIssuer()?.slug]"
						>
							<img src="assets/badges/badgeIcon.svg" alt="bade icon" class="tw-w-9" />
							<p>{{ inputAsIssuer()?.badgeClassCount | i18nPlural: plural['badges'] }}</p>
						</a>
						@if (inputAsIssuer()?.learningPathCount ?? 0 > 0) {
							<a
								hlmP
								class="tw-flex tw-flex-row tw-text-purple tw-font-semibold tw-items-center hover:tw-underline"
								[routerLink]="['/public/issuers/', inputAsIssuer()?.slug]"
							>
								<img
									src="assets/oeb/images/learningPath/learningPathIcon.svg"
									alt="learning path icon"
									class="tw-w-7"
								/>
								<p class="tw-ml-2">
									{{ inputAsIssuer()?.learningPathCount | i18nPlural: plural['learningPath'] }}
								</p>
							</a>
						}
					</div>
				}
			} @else {
				<div class="tw-flex tw-flex-col tw-gap-2 tw-w-full">
					@if (inputAsPrivateIssuer()?.badgeClassCount || inputAsPrivateNetwork()?.badgeClassCount) {
						<oeb-button
							(click)="navigate.emit('awardBadge')"
							[text]="'Issuer.giveBadge' | translate"
							[width]="'full_width'"
							[variant]="inputAsPrivateNetwork() ? 'secondary' : 'default'"
							[routerLink]="['/issuer', inputAsIssuer() ? 'issuers' : 'networks', issuerOrNetwork().slug]"
							[queryParams]="inputAsPrivateNetwork() ? { tab: 'badges' } : undefined"
							class="tw-whitespace-nowrap"
						/>
					}
					<oeb-button
						(click)="navigate.emit('createBadge')"
						[id]="'create-new-badge-btn-1'"
						[text]="'Issuer.createBadge' | translate"
						[width]="'full_width'"
						[disabled]="!canCreateBadge()"
						[variant]="
							inputAsPrivateIssuer()?.badgeClassCount || inputAsPrivateNetwork() ? 'secondary' : 'default'
						"
						[umamiEvent]="'create-badge'"
						[weight]="inputAsPrivateNetwork() ? 'medium' : 'bold'"
						[routerLink]="
							inputAsIssuer()
								? ['/issuer/issuers', issuerOrNetwork().slug, 'badges', 'select']
								: ['/issuer/networks', issuerOrNetwork().slug]
						"
						[queryParams]="inputAsPrivateNetwork() ? { tab: 'badges' } : null"
						[class.disabled]="!canCreateBadge()"
						class="tw-whitespace-nowrap"
					/>
				</div>
			}
		</article>
	`,
})
export class OebIssuerNetworkCard {
	private translate = inject(TranslateService);

	readonly issuerOrNetwork = input.required<IssuerTypes | NetworkTypes>();
	readonly navigate = output<NavigationType>();
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
	readonly inputAsIssuer = computed(() => {
		const iOrN = this.issuerOrNetwork();
		return this.isIssuerType(iOrN) ? iOrN : undefined;
	});
	readonly inputAsPrivateIssuer = computed(() => {
		const iOrN = this.issuerOrNetwork();
		return this.isPrivateIssuerType(iOrN) ? iOrN : undefined;
	});
	readonly inputAsNetwork = computed(() => {
		const iOrN = this.issuerOrNetwork();
		return this.isIssuerType(iOrN) ? undefined : iOrN;
	});
	readonly inputAsPrivateNetwork = computed(() => {
		const iOrN = this.issuerOrNetwork();
		return this.isPrivateNetworkType(iOrN) ? iOrN : undefined;
	});
	readonly isPublic = computed(
		() => this.issuerOrNetwork() instanceof IssuerV3 || this.issuerOrNetwork() instanceof NetworkV3,
	);
	readonly canCreateBadge = computed(() => {
		if (this.isPublic()) return false;
		if (this.inputAsPrivateIssuer()) return this.inputAsPrivateIssuer().canCreateBadge;
		if (this.inputAsPrivateNetwork())
			return (this.inputAsPrivateNetwork().current_user_network_role ?? '') == 'staff';

		return false;
	});
	readonly containerClasses = computed(() => {
		const baseClasses =
			'tw-max-w-[660px] tw-h-[450px] tw-border-solid tw-border tw-rounded-lg tw-p-6 tw-gap-2 tw-flex tw-flex-col tw-items-start ';
		if (this.inputAsIssuer()) return baseClasses + 'tw-border-purple';
		else
			return (
				baseClasses +
				'tw-border-gray-200 tw-bg-purple tw-text-white ' +
				(this.isPublic() ? 'tw-cursor-pointer' : '')
			);
	});

	isIssuerType(obj: unknown): obj is IssuerTypes {
		return obj instanceof Issuer || obj instanceof IssuerV3;
	}

	isPrivateIssuerType(obj: unknown): obj is Issuer {
		return obj instanceof Issuer;
	}

	isPrivateNetworkType(obj: unknown): obj is Network {
		return obj instanceof Network;
	}
}

type IssuerTypes = Issuer | IssuerV3;
type NetworkTypes = Network | NetworkV3;

export type NavigationType = 'container' | 'heading' | 'awardBadge' | 'createBadge';
