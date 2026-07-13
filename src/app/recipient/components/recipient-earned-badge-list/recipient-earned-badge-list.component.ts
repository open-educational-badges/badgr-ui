import { Component, OnInit, inject, viewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { CommonDialogsService } from '../../../common/services/common-dialogs.service';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { MessageService } from '../../../common/services/message.service';
import { AddBadgeDialogComponent } from '../add-badge-dialog/add-badge-dialog.component';
import { RecipientBadgeManager } from '../../services/recipient-badge-manager.service';
import { RecipientBadgeInstance } from '../../models/recipient-badge.model';
import { UserProfileManager } from '../../../common/services/user-profile-manager.service';
import { AppConfigService } from '../../../common/app-config.service';
import { UserProfile } from '../../../common/model/user-profile.model';
import { CountUpModule } from 'ngx-countup';
import { LearningPathApiService } from '../../../common/services/learningpath-api.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { RecipientBadgeCollectionManager } from '../../services/recipient-badge-collection-manager.service';
import { RecipientBadgeApiService } from '../../services/recipient-badges-api.service';
import { RecipientBadgeCollection } from '../../models/recipient-badge-collection.model';
import { ApiRootSkill } from '../../../common/model/ai-skills.model';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { ApiLearningPath } from '~/common/model/learningpath-api.model';
import { RecipientBackpack } from '../recipient-backpack/recipient-backpack.component';

@Component({
	selector: 'recipient-earned-badge-list',
	templateUrl: './recipient-earned-badge-list.component.html',
	imports: [
		FormMessageComponent,
		BgAwaitPromises,
		FormsModule,
		ReactiveFormsModule,
		CountUpModule,
		AddBadgeDialogComponent,
		RecipientBackpack,
	],
})
export class RecipientEarnedBadgeListComponent extends BaseAuthenticatedRoutableComponent implements OnInit {
	readonly title = inject(Title);
	readonly dialogService = inject(CommonDialogsService);
	readonly messageService = inject(MessageService);
	readonly recipientBadgeManager = inject(RecipientBadgeManager);
	readonly learningPathApi = inject(LearningPathApiService);
	readonly configService = inject(AppConfigService);
	readonly profileManager = inject(UserProfileManager);
	readonly translate = inject(TranslateService);
	readonly recipientBadgeCollectionManager = inject(RecipientBadgeCollectionManager);
	readonly recipientBadgeApiService = inject(RecipientBadgeApiService);
	readonly addBadgeDialog = viewChild<AddBadgeDialogComponent>('addBadgeDialog');

	allBadges: RecipientBadgeInstance[] = [];
	importedBadges: RecipientBadgeInstance[] = [];
	badgesLoaded: Promise<unknown>;
	profileLoaded: Promise<unknown>;
	skillsLoaded: Promise<unknown>;
	learningpathLoaded: Promise<unknown>;
	collectionsLoaded: Promise<unknown>;
	allSkills: ApiRootSkill[] = [];
	allLearningPaths: ApiLearningPath[] = [];
	collections: RecipientBadgeCollection[] = [];
	profile: UserProfile;

	constructor() {
		super();

		this.title.setTitle(`Backpack - ${this.configService.theme['serviceName'] || 'Badgr'}`);

		if (this.authService.isLoggedIn) {
			// force a refresh of the userProfileSet now that we are authenticated
			this.profileLoaded = this.profileManager.userProfileSet.updateList().then((p) => {
				this.profile = this.profileManager.userProfile;
				if (
					this.profileManager.userProfile.agreedTermsVersion !==
					this.profileManager.userProfile.latestTermsVersion
				) {
					this.dialogService.newTermsDialog.openDialog();
				}
			});
		}
	}

	ngOnInit() {
		super.ngOnInit();
		this.loadImportedBadges();

		this.badgesLoaded = this.recipientBadgeManager.recipientBadgeList.loadedPromise.catch((e) =>
			this.messageService.reportAndThrowError('Failed to load your badges', e),
		);
		this.recipientBadgeManager.recipientBadgeList.changed$.subscribe((badges) => {
			this.allBadges = badges.entities;
		});
		this.learningpathLoaded = this.learningPathApi
			.getLearningPathsForUser()
			.then((res) => {
				this.allLearningPaths = res;
			})
			.catch((e) => this.messageService.reportAndThrowError('Failed to load your badges', e));

		let skillsLang = this.translate.currentLang;
		this.skillsLoaded = this.recipientBadgeApiService.getSkills(this.translate.currentLang).then((skills) => {
			this.allSkills = skills;
		});
		this.recipientBadgeManager.recipientBadgeList.changed$.subscribe((badges) => {
			const combinedBadges = [...this.importedBadges, ...badges.entities];
			this.allBadges = combinedBadges;
		});
		this.collectionsLoaded = Promise.all([
			this.recipientBadgeCollectionManager.recipientBadgeCollectionList.loadedPromise,
			this.recipientBadgeManager.recipientBadgeList.loadedPromise,
		]).then(([list]) => {
			this.collections = list.entities;
		});

		this.translate.onLangChange.subscribe((e: LangChangeEvent) => {
			if (e.lang != skillsLang) {
				this.skillsLoaded = this.recipientBadgeApiService.getSkills(e.lang).then((skills) => {
					this.allSkills = skills;
				});
				skillsLang = e.lang;
			}
		});
	}

	loadImportedBadges() {
		this.recipientBadgeApiService
			.listImportedBadges()
			.then((res) => {
				this.importedBadges = res;
				// Force an update after loading imported badges
				const currentBadges = this.recipientBadgeManager.recipientBadgeList.entities || [];
				const combinedBadges = [...this.importedBadges, ...currentBadges];
				this.allBadges = combinedBadges;
			})
			.catch((e) => this.messageService.reportAndThrowError('Failed to load imported badges', e));
	}

	uploadBadge() {
		this.addBadgeDialog()
			.openDialog()
			.then(
				() => {
					if (this.route.params['tab'] && this.route.params['tab'] !== 'badges')
						this.router.navigate([], {
							relativeTo: this.route,
							queryParams: { tab: 'badges' },
							queryParamsHandling: 'merge', // keeps existing params, only updates `tab`
						});
					this.loadImportedBadges();
				},
				() => {},
			);
	}
}
