import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nPluralPipe, NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { OebButtonComponent } from '~/components/oeb-button.component';
import { BgImageStatusPlaceholderDirective } from '~/common/directives/bg-image-status-placeholder.directive';
import { TruncatedTextComponent } from '~/common/components/truncated-text.component';
import { HlmBadge } from './spartan/ui-badge-helm/src';
import { HlmH2, HlmP } from '@spartan-ng/helm/typography';
import { preloadImageURL } from '~/common/util/file-util';
import { NetworkV3 } from '~/issuer/models/networkv3.model';
import { Network } from '~/issuer/network.model';
import { Issuer } from '~/issuer/models/issuer.model';
import { IssuerV3 } from '~/issuer/models/issuerv3.model';

type CardVariant = 'network' | 'issuer';
type CardEntity = Network | NetworkV3 | Issuer | IssuerV3;

@Component({
	selector: 'oeb-unified-card',
	template: `
		<div
			[ngClass]="{
				'tw-rounded-[10px] tw-bg-purple tw-border-[#CFCECE] tw-border-solid tw-border tw-relative tw-p-6 tw-block tw-overflow-hidden tw-max-w-[600px] tw-cursor-pointer':
					variant === 'network',
				'tw-flex tw-justify-between tw-max-w-[660px] tw-flex-col tw-box-border tw-gap-6 tw-border-solid tw-border tw-border-purple tw-rounded-lg tw-p-8':
					variant === 'issuer',
			}"
			class="tw-h-[455px]"
		>
			<div class="tw-flex tw-flex-col tw-h-full">
				<!-- Header Section -->
				<div
					[ngClass]="{
						'tw-flex-row tw-flex tw-items-center': variant === 'network',
						'tw-flex tw-flex-row tw-gap-4': variant === 'issuer',
					}"
				>
					<!-- Image Container -->
					<div
						[ngClass]="{
							'tw-bg-white tw-w-[100px] tw-h-[100px] tw-flex tw-flex-shrink-0 tw-items-center tw-justify-center tw-rounded-[10px]':
								variant === 'network',
							'tw-w-24 tw-aspect-square': variant === 'issuer',
						}"
					>
						@if (variant === 'network') {
							<img
								[src]="entity.image"
								class="tw-aspect-square"
								width="80"
								alt="{{ entity.name }} logo"
							/>
						}
						@if (variant === 'issuer') {
							<img
								class="tw-w-24 tw-aspect-square"
								[loaded-src]="entity?.image"
								[loading-src]="issuerImagePlaceHolderUrl"
								[error-src]="issuerImagePlaceHolderUrl"
								alt="{{ entity?.name }} avatar"
							/>
						}
					</div>

					<!-- Title and Metadata -->
					<div
						[ngClass]="{
							'tw-flex tw-flex-col tw-flex-wrap tw-pl-4 tw-py-2 tw-break-words': variant === 'network',
							'tw-content-center oeb-break-words': variant === 'issuer',
						}"
					>
						@if (variant === 'network') {
							<div class="!tw-text-3xl tw-font-bold tw-leading-[120%] tw-text-white tw-line-clamp-2">
								{{ entity.name }}
							</div>
						}
						@if (variant === 'issuer') {
							<a
								hlmH2
								class="tw-text-purple tw-font-bold tw-break-words tw-cursor-pointer tw-line-clamp-2"
								(click)="onNavigate()"
							>
								{{ entity?.name }}
							</a>
						}

						@if (variant === 'issuer' && !isPublic && isIssuer(entity) && entity.current_user_issuer_role) {
							<p
								class="tw-text-oebblack tw-pb-2 tw-mt-2 tw-font-semibold md:tw-text-[20px] md:tw-leading-[24.4px] tw-text-[14px] tw-leading-[19.6px]"
							>
								{{ 'Issuer.yourRole' | translate }}
								{{ entity.current_user_issuer_role | translate }}
							</p>
						}

						@if (variant === 'network' && !isPublic && isNetwork(entity)) {
							<p
								class="tw-text-white tw-pb-2 tw-mt-2 tw-font-semibold md:tw-text-[20px] md:tw-leading-[24.4px] tw-text-[14px] tw-leading-[19.6px]"
							>
								{{
									'Network.yourRole'
										| translate
											: {
													role:
														'Network.role.' + entity.current_user_network_role | translate,
											  }
								}}
							</p>
						}
					</div>
				</div>

				<!-- Description -->
				<div
					[ngClass]="{
						'tw-text-white tw-mt-4 tw-leading-[130%] tw-line-clamp-5': variant === 'network',
						'tw-font-normal md:tw-min-h-32 tw-break-words tw-hyphens-auto tw-line-clamp-5 tw-mt-6':
							variant === 'issuer',
					}"
					hlmP
				>
					{{ entity?.description }}
				</div>

				<!-- Footer Section -->
				@if (variant === 'issuer' && isIssuer(entity)) {
					<div class="tw-mt-auto tw-space-y-6">
						<!-- Category Badge -->
						<div>
							<div variant="categoryTag" hlmBadge>
								{{ 'Issuer.categories.' + entity?.category | translate }}
							</div>
						</div>

						<!-- Counts -->
						<div class="tw-flex tw-flex-row tw-gap-4">
							<a
								hlmP
								class="tw-flex tw-flex-row tw-text-purple tw-font-semibold tw-items-center hover:tw-underline"
								[routerLink]="['/public/issuers/', entity?.slug]"
							>
								<img src="assets/badges/badgeIcon.svg" alt="badge icon" class="tw-w-9" />
								<!-- <p [innerHTML]="entity?.badgeClassCount | i18nPlural: pluralMappings['badges']"></p> -->
							</a>
							@if (entity?.learningPathCount > 0) {
								<a
									hlmP
									class="tw-flex tw-flex-row tw-text-purple tw-font-semibold tw-items-center hover:tw-underline"
									[routerLink]="['/public/issuers/', entity?.slug]"
								>
									<img
										src="assets/oeb/images/learningPath/learningPathIcon.svg"
										alt="learning path icon"
										class="tw-w-7"
									/>
									<p
										class="tw-ml-2"
										[innerHTML]="
											 // entity?.learningPathCount | i18nPlural: pluralMappings['learningPath']
										"
									></p>
								</a>
							}
						</div>
					</div>
				}

				@if (variant === 'network' && !isPublic && isNetwork(entity)) {
					<section class="tw-flex tw-flex-col tw-h-full">
						<div class="tw-mt-auto tw-flex tw-flex-col tw-gap-6">
							@if (entity.current_user_network_role && entity.current_user_network_role != 'staff') {
								<oeb-button
									variant="secondary"
									width="full_width"
									weight="medium"
									[text]="'Issuer.createBadge' | translate"
									[routerLink]="['/issuer/networks', entity.slug]"
									[queryParams]="{ tab: 'badges' }"
								></oeb-button>
							}
							<oeb-button
								variant="secondary"
								width="full_width"
								[text]="'Issuer.giveBadge' | translate"
								[routerLink]="['/issuer/networks', entity.slug]"
								[queryParams]="{ tab: 'badges' }"
							></oeb-button>
						</div>
					</section>
				}
			</div>
		</div>
	`,
	styles: [
		`
			.tw-line-clamp-2 {
				display: -webkit-box;
				-webkit-line-clamp: 2;
				-webkit-box-orient: vertical;
				overflow: hidden;
			}

			.tw-line-clamp-5 {
				display: -webkit-box;
				-webkit-line-clamp: 5;
				-webkit-box-orient: vertical;
				overflow: hidden;
			}
		`,
	],
	imports: [
		RouterLink,
		NgClass,
		TranslatePipe,
		OebButtonComponent,
		BgImageStatusPlaceholderDirective,
		TruncatedTextComponent,
		HlmBadge,
		HlmH2,
		HlmP,
		I18nPluralPipe,
	],
})
export class OebUnifiedCard {
	@Input() variant: CardVariant = 'network';
	@Input() entity: CardEntity;
	@Input() isPublic = true;
	@Input() pluralMappings?: { badges: object; learningPath: object };

	@Output() navigate = new EventEmitter<void>();

	readonly issuerImagePlaceHolderUrl = preloadImageURL(
		'../../../../breakdown/static/images/placeholderavatar-issuer.svg',
	);

	onNavigate() {
		this.navigate.emit();
	}

	isNetwork(entity: CardEntity): entity is Network | NetworkV3 {
		return 'current_user_network_role' in entity;
	}

	isIssuer(entity: CardEntity): entity is Issuer | IssuerV3 {
		return 'category' in entity && 'badgeClassCount' in entity;
	}
}
