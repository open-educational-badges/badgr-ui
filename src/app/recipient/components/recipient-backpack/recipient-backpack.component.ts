import { Component, computed, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ApiRootSkill } from '~/common/model/ai-skills.model';
import { ApiLearningPath } from '~/common/model/learningpath-api.model';
import { UserProfile } from '~/common/model/user-profile.model';
import { OebButtonComponent } from '~/components/oeb-button.component';
import { OebTabsComponent, Tab } from '~/components/oeb-tabs.component';
import { RecipientBadgeCollection } from '~/recipient/models/recipient-badge-collection.model';
import { RecipientBadgeInstance } from '~/recipient/models/recipient-badge.model';
import { RecipientSkillVisualisationComponent } from '../recipient-skill-visualisation/recipient-skill-visualisation.component';
import RecipientEarnedBadgesOverview from '../recipient-earned-badges-overview/recipient-earned-badges-overview.component';
import { RecipientCompetencyOverview } from '../recipient-competency-overview/recipient-competency-overview.component';
import RecipientLearningPathsOverview from '../recipient-learningpaths-overview/recipient-learningpaths-overview.component';
import { BgCollectionCard } from '~/common/bg-collectioncard';
import { NgIcon } from '@ng-icons/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { DialogComponent } from '~/components/dialog.component';
import { ShareCollectionDialogComponent } from '~/common/dialogs/oeb-dialogs/share-collection-dialog.component';
import { HlmH2 } from '@spartan-ng/helm/typography';
import { HlmIcon } from '@spartan-ng/helm/icon';

const _backpackTabs = ['profile', 'badges', 'competencies', 'microdegrees', 'collections'] as const;
export type BackpackTab = (typeof _backpackTabs)[number];

@Component({
	selector: 'recipient-backpack',
	imports: [
		TranslatePipe,
		OebButtonComponent,
		OebTabsComponent,
		RecipientSkillVisualisationComponent,
		RecipientEarnedBadgesOverview,
		RecipientCompetencyOverview,
		RecipientLearningPathsOverview,
		BgCollectionCard,
		NgIcon,
		RouterLink,
		HlmH2,
		HlmIcon,
	],
	template: ` <div class="page-padding oeb">
		<div class="tw-bg-lightpurple oeb-inset-padding">
			<div class="md:tw-flex tw-justify-between tw-items-center oeb-section-sm">
				<h2 hlmH2 class="tw-text-oebblack tw-font-bold tw-pb-4 md:tw-pb-0">
					@if (profile()) {
						{{ 'RecBadge.greating' | translate }}
						<span class="tw-capitalize">{{ profile().firstName }}</span> ,
						{{ 'RecBadge.greating2' | translate }}
					} @else {
						{{ 'RecBadge.greating' | translate }}, {{ 'RecBadge.greating2' | translate }}
					}
				</h2>

				@if ((activeTab() === 'badges' || activeTab() === 'profile') && !badgeUploadDisabled()) {
					<oeb-button
						icon="lucideUpload"
						[iconLeft]="true"
						[variant]="activeTab() === 'profile' ? 'secondary' : 'default'"
						(click)="badgeUploadClicked.emit()"
						[disabled-when-requesting]="true"
						[text]="'RecBadge.uploadBadge' | translate"
					>
					</oeb-button>
				}
			</div>
			<div class="oeb-section-sm">
				<oeb-tabs (onTabChanged)="onTabChange($event)" [activeTab]="activeTab()" [tabs]="tabs()" />
				<ng-template #profileTemplate>
					<recipient-skill-visualisation [skills]="skills()"></recipient-skill-visualisation>
				</ng-template>
				<ng-template #badgesTemplate>
					<recipient-earned-badges-overview [badges]="badges()" [isEmbedded]="isEmbedded()" />
				</ng-template>
				<ng-template #badgesCompetency>
					<recipient-competency-overview [badges]="badges()" />
				</ng-template>
				<ng-template #learningPathTemplate>
					<recipient-learningpaths-overview [learningPaths]="learningPaths()" [isEmbedded]="isEmbedded()" />
				</ng-template>
				<ng-template #collectionTemplate>
					<!-- No collections, empty state! -->
					@if (collections().length === 0) {
						<section class="tw-mt-8">
							<div class="tw-flex tw-justify-between">
								<div>
									<h2
										class="tw-text-oebblack md:tw-text-[22px] tw-leading-[120%] tw-font-bold tw-uppercase"
									>
										{{ 'BadgeCollection.useCollectionsForApplications' | translate }}
									</h2>
									<p class="tw-mt-4 tw-text-oebblack tw-text-lg">
										{{ 'BadgeCollection.collectionInfoText' | translate }}
									</p>
									<p class="tw-mt-2 tw-text-purple tw-text-lg tw-italic">
										{{ 'BadgeCollection.addLink' | translate }}
									</p>
									<div class="tw-mt-6">
										<oeb-button
											[text]="'BadgeCollection.createCollectionNow' | translate"
											[routerLink]="['../badge-collections', 'create']"
										/>
									</div>
								</div>
								<img
									class="tw-hidden md:tw-flex"
									src="assets/oeb/images/backpack/collection_visual.svg"
								/>
							</div>
						</section>
					}

					@if (collections().length > 0) {
						<div class="oeb-section-sm">
							<h2
								class="tw-text-oebblack md:tw-text-[22px] tw-leading-[120%] tw-font-bold tw-uppercase tw-items-center tw-flex tw-mb-4"
							>
								{{ 'BadgeCollection.useCollectionsForApplications' | translate }}
								<ng-icon
									(click)="openCollectionInfoDialog()"
									hlm
									class="tw-text-purple tw-min-w-10 tw-ml-2"
									size="lg"
									name="lucideInfo"
								/>
							</h2>
							<div class="tw-grid min-[450px]:tw-grid-cols-badges tw-gap-6">
								@for (collection of collections(); track collection) {
									<bg-collectioncard
										[collection]="collection"
										(share)="openShareDialog(collection)"
									></bg-collectioncard>
								}
							</div>
							<oeb-button
								[text]="'BadgeCollection.createCollection' | translate"
								variant="secondary"
								size="md"
								class="tw-mt-4 tw-float-right"
								[routerLink]="['../badge-collections', 'create']"
							/>
						</div>
					}
					<div></div>
				</ng-template>
				<ng-template #collectionInfoHeaderTemplate>
					<h2 class="tw-text-[22px] tw-text-purple tw-font-bold tw-leading-[120%]">
						{{ 'BadgeCollection.useCollectionsForApplications' | translate }}
					</h2>
				</ng-template>
				<ng-template #collectionInfoContentTemplate>
					<p
						class="tw-text-lg tw-text-oebblack tw-mt-2"
						[innerHTML]="'BadgeCollection.collectionInfoText' | translate"
					></p>
					<p
						class="tw-text-lg tw-text-purple tw-italic tw-mt-1"
						[innerHTML]="'BadgeCollection.addLink' | translate"
					></p>
				</ng-template>
			</div>
		</div>
	</div>`,
})
export class RecipientBackpack {
	readonly _hlmDialogService = inject(HlmDialogService);
	readonly translate = inject(TranslateService);
	readonly route = inject(ActivatedRoute);
	readonly router = inject(Router);
	readonly profile = input<UserProfile>();
	readonly skills = input<ApiRootSkill[]>([]);
	readonly badges = input<RecipientBadgeInstance[]>([]);
	readonly learningPaths = input<ApiLearningPath[]>([]);
	readonly collections = input<RecipientBadgeCollection[]>([]);
	readonly badgeUploadDisabled = input<boolean>(false);
	readonly isEmbedded = input<boolean>(false);
	readonly enabledTabs = input<BackpackTab[]>([..._backpackTabs]);
	readonly tabs = computed(() => {
		return this.enabledTabs().map((t) => {
			switch (t) {
				case 'profile':
					return {
						key: 'profile',
						title: 'NavItems.profile',
						component: this.profileTemplate(),
					} as Tab;
				case 'badges':
					return {
						key: 'badges',
						title: 'Badges',
						component: this.badgesTemplate(),
					} as Tab;
				case 'competencies':
					return {
						key: 'competencies',
						title: 'RecBadge.competencies',
						component: this.badgesCompetency(),
					} as Tab;
				case 'microdegrees':
					return {
						key: 'microdegrees',
						title: 'LearningPath.learningpathsPlural',
						component: this.learningPathTemplate(),
					} as Tab;
				case 'collections':
					return {
						key: 'collections',
						title: 'General.collections',
						component: this.collectionTemplate(),
					} as Tab;
			}
		});
	});
	readonly activeTab = signal<BackpackTab>('profile');
	readonly badgeUploadClicked = output();
	readonly profileTemplate = viewChild.required<ElementRef>('profileTemplate');
	readonly badgesTemplate = viewChild.required<ElementRef>('badgesTemplate');
	readonly badgesCompetency = viewChild.required<ElementRef>('badgesCompetency');
	readonly learningPathTemplate = viewChild.required<ElementRef>('learningPathTemplate');
	readonly collectionTemplate = viewChild.required<ElementRef>('collectionTemplate');
	readonly collectionInfoHeaderTemplate = viewChild.required<ElementRef>('collectionInfoHeaderTemplate');
	readonly collectionInfoContentTemplate = viewChild.required<ElementRef>('collectionInfoContentTemplate');

	constructor() {
		this.route.queryParams.subscribe((params) => {
			if (
				params['tab'] &&
				_backpackTabs.includes(params['tab']) &&
				this.activeTab().toString() !== params['tab']
			) {
				this.activeTab.set(params['tab'] as BackpackTab);
			}
		});
	}

	onTabChange(tab: string) {
		// bypassing angular is required here, as the apps
		// route reuse strategy turns all reusage off and thus
		// navigating to the same url would trigger a reload.
		// we only want to sync the query parameter though
		// but only if we did not embed this component
		if (!this.isEmbedded()) {
			const url = new URL(window.location.href);
			url.searchParams.set('tab', tab); // add or replace the param
			const newUrl = url.pathname + url.search + url.hash;
			history.replaceState(null, '', newUrl);
		}
	}

	openCollectionInfoDialog() {
		this._hlmDialogService.open(DialogComponent, {
			context: {
				headerTemplate: this.collectionInfoHeaderTemplate(),
				content: this.collectionInfoContentTemplate(),
				variant: 'default',
			},
		});
	}

	openShareDialog(collection: RecipientBadgeCollection) {
		this._hlmDialogService.open(ShareCollectionDialogComponent, {
			context: {
				collection: collection,
				caption: this.translate.instant('BadgeCollection.shareCollection'),
			},
		});
	}
}
