import { Component, computed, inject, input, signal } from '@angular/core';
import { FormControl, FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmInput } from '@spartan-ng/helm/input';
import { CountUpModule } from 'ngx-countup';
import { appearAnimation } from '~/common/animations/animations';
import { BgBadgecard } from '~/common/components/bg-badgecard';
import { MatchingAlgorithm } from '~/common/util/matching-algorithm';
import { OebCheckboxComponent } from '~/components/oeb-checkbox.component';
import { OebGlobalSortSelectComponent } from '~/components/oeb-global-sort-select.component';
import { HlmP } from '~/components/spartan/ui-typography-helm/src/lib/hlm-p';
import { RecipientBadgeInstance } from '~/recipient/models/recipient-badge.model';
import { TranslateService } from '@ngx-translate/core';

@Component({
	selector: 'recipient-earned-badges-overview',
	imports: [
		TranslatePipe,
		NgIcon,
		HlmInput,
		HlmIcon,
		HlmP,
		CountUpModule,
		FormsModule,
		OebGlobalSortSelectComponent,
		OebCheckboxComponent,
		BgBadgecard,
	],
	animations: [appearAnimation],
	template: `<div class="oeb-section-sm">
			<div class="tw-grid tw-grid-cols-2 tw-gap-3">
				<div
					class="tw-bg-white tw-rounded-[10px] tw-border-purple tw-border-solid tw-border tw-h-[90px] tw-p-4"
				>
					<div class="tw-whitespace-nowrap tw-flex tw-items-center tw-mb-2">
						<ng-icon hlm class="tw-mr-2" size="sm" name="lucideHexagon" /><span hlmP size="sm">Badges</span>
					</div>
					<p hlmP #badgesCounter [countUp]="badges().length" class="tw-text-purple tw-font-bold"></p>
				</div>
			</div>
		</div>

		<!-- No badges, empty state! -->
		@if (badges().length === 0) {
			<section class="emptysection l-emptysection">
				<h2 class="emptysection-x-headline">{{ 'RecBadge.noBadgesYet' | translate }}</h2>
				<p class="emptysection-x-copy">{{ 'RecBadge.collectShareBadges' | translate }}</p>
				<div class="emptysection-x-imagecontainer">
					<img
						alt="Illustration of backpack with badges"
						class="emptysection-x-image"
						[src]="'assets/@concentricsky/badgr-style/dist/images/image-empty-backpack.svg'"
					/>
				</div>
			</section>
		}

		<!-- Badge Search, group and grid/list toggle -->
		@if (badges().length > 0) {
			<div class="oeb-section-sm">
				<div class="tw-flex tw-flex-wrap tw-gap-4 tw-items-center oeb-standard-padding-bottom">
					<div class="tw-flex tw-relative tw-items-center">
						<input
							type="text"
							name="forminput"
							changeOrder
							class="!tw-bg-white tw-w-full tw-border-1 tw-border-purple md:tw-w-96 tw-border-solid tw-h-12 tw-rounded-lg tw-p-2"
							placeholder="{{ 'Badge.searchBadges' | translate }}"
							[(ngModel)]="searchQuery"
							hlmInput
						/>
						<ng-icon
							hlm
							name="lucideSearch"
							class="tw-w-8 tw-h-8 tw-absolute tw-top-1/2 tw-right-2 -tw-translate-y-1/2 tw-pointer-events-none tw-text-purple"
						></ng-icon>
					</div>
					<span>{{ 'Badge.sortBy' | translate }} </span>
					<oeb-global-sort-select
						placeholder="{{ 'Badge.sortBy' | translate }}"
						class="oeb tw-w-[12rem]"
						[options]="sortOptions"
						[control]="sortControl"
						(sortChanged)="onSortChanged($event)"
					/>
					<oeb-checkbox
						class="tw-mt-2 md:tw-mt-0"
						name="groupby"
						[(ngModel)]="groupByIssuer"
						[text]="'RecBadge.groupByInstitution' | translate"
						[noMargin]="true"
					/>
				</div>

				<!-- ------------------ UNGROUPED -------------------->
				@if (!groupedBadges()) {
					<div class="tw-gap-6 tw-grid tw-grid-cols-badges" [@stagger]>
						@for (b of filteredBadges(); track trackById(b)) {
							<bg-badgecard
								@appearAnimation
								[badgeTitle]="b.badgeClass.name"
								[badgeImage]="b.image"
								[badgeIssueDate]="b.issueDate"
								[mostRelevantStatus]="b.mostRelevantStatus"
								[issuerTitle]="b.badgeClass.issuer.name"
								[issuerSlug]="b.badgeClass.issuer.slug"
								[badgeSlug]="b.slug"
								[competencies]="b.getExtension('extensions:CompetencyExtension', [{}])"
								[imported]="b.imported"
								[publicUrl]="this.isEmbedded() ? b.shareUrl : null"
								[publicIssuerUrl]="this.isEmbedded() ? b.badgeClass.issuer.id : null"
								[useBlankHref]="this.isEmbedded()"
							/>
						}
					</div>
				}
				<!-- ------------------ GROUP BY ISSUER ------------------  -->
				@else {
					@for (issuerGroup of groupedBadges(); track issuerGroup[0]) {
						<div>
							<h3 class="u-text-h3-semibold u-margin-bottom2x u-margin-top6x u-text-dark1">
								{{ issuerGroup[1][0].badgeClass.issuer.name }}
								<span class="u-text-small-semibold-caps u-text-dark4 u-margin-left2x"
									>{{ issuerGroup[1].length }}
									{{ issuerGroup[1].length === 1 ? 'Badge' : 'Badges' }}</span
								>
							</h3>
							<div class="tw-gap-6 tw-grid tw-grid-cols-badges" [@stagger]>
								@for (badge of issuerGroup[1]; track badge.shareUrl) {
									<bg-badgecard
										@appearAnimation
										[badgeTitle]="badge.badgeClass.name"
										[badgeImage]="badge.image"
										[badgeIssueDate]="badge.issueDate"
										[mostRelevantStatus]="badge.mostRelevantStatus"
										[issuerSlug]="badge.badgeClass.issuer.slug"
										[issuerTitle]="badge.badgeClass.issuer.name"
										[badgeSlug]="badge.slug"
										[competencies]="badge.getExtension('extensions:CompetencyExtension', [{}])"
										[publicUrl]="this.isEmbedded() ? badge.shareUrl : null"
										[publicIssuerUrl]="this.isEmbedded() ? badge.badgeClass.issuer.id : null"
										[useBlankHref]="this.isEmbedded()"
									/>
								}
							</div>
						</div>
					}
				}
			</div>
		}`,
})
export default class RecipientEarnedBadgesOverview {
	private translate = inject(TranslateService);
	readonly DEFAULT_SORT = 'date_desc';
	badges = input.required<RecipientBadgeInstance[]>();
	isEmbedded = input<boolean>(false);
	groupByIssuer = signal<boolean>(false);
	sortOption = signal<'name_asc' | 'name_desc' | 'date_asc' | 'date_desc'>(this.DEFAULT_SORT);
	searchQuery = signal<string>('');
	filteredBadges = computed(() => {
		return this.badges()
			.filter(MatchingAlgorithm.badgeMatcher(this.searchQuery()))
			.sort(this.sortBadgesBy(this.sortOption()));
	});
	groupedBadges = computed(() => {
		if (this.groupByIssuer())
			return this.filteredBadges().reduce((groups, badge) => {
				groups.set(badge.issuerId, [...(groups.get(badge.issuerId) || []), badge]);
				return groups;
			}, new Map<string, RecipientBadgeInstance[]>());
		else return undefined;
	});
	sortControl = new FormControl(this.DEFAULT_SORT);

	sortOptions = [
		{
			value: 'name_asc',
			label: 'A-Z',
		},
		{
			value: 'name_desc',
			label: 'Z-A',
		},
		{
			value: 'date_asc',
			label: this.translate.instant('General.dateAscending'),
		},
		{
			value: 'date_desc',
			label: this.translate.instant('General.dateDescending'),
		},
	];

	onSortChanged(sortOption: string): void {
		this.sortOption.set(sortOption as 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc');
	}

	sortBadgesBy(
		sortOption: 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc',
	): (a: RecipientBadgeInstance, b: RecipientBadgeInstance) => number {
		const [sortBy, order] = sortOption.split('_') as ['name' | 'date', 'asc' | 'desc'];
		const multiplier = order === 'asc' ? 1 : -1;

		return (a, b) => {
			const nameA = a.badgeClass.name;
			const nameB = b.badgeClass.name;
			const dateA = new Date(a.issueDate).getTime();
			const dateB = new Date(b.issueDate).getTime();

			if (sortBy === 'name') {
				return multiplier * nameA.localeCompare(nameB);
			}
			if (sortBy === 'date') {
				return multiplier * (dateA - dateB);
			}
			return 0;
		};
	}

	isGrouped(b: RecipientBadgeInstance | Map<string, RecipientBadgeInstance[]>) {
		return b instanceof Map;
	}

	trackById(badge: RecipientBadgeInstance) {
		return badge.badgeClass.slug;
	}
}
