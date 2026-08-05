import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { SessionService } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { AppConfigService } from '../../../common/app-config.service';
import { RecipientBadgeCollectionManager } from '../../services/recipient-badge-collection-manager.service';
import { typedFormGroup } from '../../../common/util/typed-forms';
import { RecipientBadgeCollection } from '../../models/recipient-badge-collection.model';
import { RecipientBadgeManager } from '../../services/recipient-badge-manager.service';
import { RecipientBadgeInstance } from '../../models/recipient-badge.model';
import { ApiRecipientBadgeIssuer } from '../../models/recipient-badge-api.model';
import { BadgeClass } from '../../../issuer/models/badgeclass.model';
import { BadgeInstanceUrl } from '../../../issuer/models/badgeinstance-api.model';
import { groupIntoArray, groupIntoObject } from '../../../common/util/array-reducers';
import { StringMatchingUtil } from '../../../common/util/string-matching-util';
import { ApiRecipientBadgeCollectionForCreation } from '../../models/recipient-badge-collection-api.model';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { BadgeClassCategory } from '../../../issuer/models/badgeclass-api.model';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { OebInputComponent } from '../../../components/input.component';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { NgClass, I18nPluralPipe } from '@angular/common';
import { BgBadgecard } from '../../../common/components/bg-badgecard';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { HlmInput } from '@spartan-ng/helm/input';
import { MatchingAlgorithm } from '~/common/util/matching-algorithm';

interface CreateBadgeCollectionForm<T> {
	collectionName: T;
	collectionDescription: T;
}

@Component({
	selector: 'recipient-badge-collection-edit-form',
	templateUrl: './recipient-badge-collection-edit-form.component.html',
	imports: [
		FormMessageComponent,
		FormsModule,
		ReactiveFormsModule,
		OebInputComponent,
		BgAwaitPromises,
		HlmInput,
		NgClass,
		BgBadgecard,
		OebButtonComponent,
		RouterLink,
		I18nPluralPipe,
		TranslatePipe,
	],
})
export class RecipientBadgeCollectionEditFormComponent extends BaseAuthenticatedRoutableComponent implements OnInit {
	private formBuilder = inject(FormBuilder);
	private title = inject(Title);
	private messageService = inject(MessageService);
	private configService = inject(AppConfigService);
	private recipientBadgeCollectionManager = inject(RecipientBadgeCollectionManager);
	private badgeManager = inject(RecipientBadgeManager);
	private translate = inject(TranslateService);

	@Input()
	set badgeCollection(collection: RecipientBadgeCollection) {
		this.editing = true;
		if (this.existingCollection !== collection) {
			this.existingCollection = collection;
		}
		this.initFormFromExisting(collection);

		this.badgeCollectionForm.setValue({
			collectionName: this.existingCollection.name,
			collectionDescription: this.existingCollection.description,
		});
	}

	existingCollection: RecipientBadgeCollection | null = null;

	editing = false;

	badgeCollectionForm = typedFormGroup()
		.addControl('collectionName', '', [Validators.required, Validators.maxLength(50)])
		.addControl('collectionDescription', '', [Validators.maxLength(300)]);

	savePromise: Promise<unknown>;
	badgesLoaded: Promise<unknown>;
	private loadedData = false;
	hasMultipleIssuers = true;
	restrictToIssuerId: string = null;
	maxDisplayedResults = 100;

	badgeResults: BadgeResult[] = [];
	issuerResults: MatchingIssuerBadges[] = [];
	categoryResults: MatchingBadgeCategory[] = [];

	selectedBadgeUrls: string[] = [];
	selectedBadges: RecipientBadgeInstance[] = [];

	badgeClassesByIssuerId: { [issuerUrl: string]: RecipientBadgeInstance[] };
	allBadges: RecipientBadgeInstance[];
	allIssuers: ApiRecipientBadgeIssuer[];

	descriptionMax300 = this.translate.instant('BadgeCollection.descriptionMax300');

	isEditing = false;
	groups: string[] = [];

	categoryOptions: { [key in BadgeClassCategory | 'noCategory']: string } = {
		competency: '',
		participation: '',
		learningpath: '',
		noCategory: '',
	};

	private _groupBy = '---';
	get groupBy() {
		return this._groupBy;
	}
	set groupBy(val: string) {
		this._groupBy = val;
		this.updateResults();
	}

	private _searchQuery = '';
	get searchQuery() {
		return this._searchQuery;
	}
	set searchQuery(query) {
		this._searchQuery = query;
		this.updateResults();
	}

	plural = {
		badges: {
			'=0': 'BadgeCollection.multiBadges',
			'=1': 'BadgeCollection.oneBadge',
			other: 'BadgeCollection.multiBadges',
		},
	};

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const router = inject(Router);
		const route = inject(ActivatedRoute);
		const loginService = inject(SessionService);

		super(router, route, loginService);
		this.updateData();

		this.translate.get('Badge.category').subscribe((translatedText: string) => {
			this.groups[0] = translatedText;
		});

		this.translate.get('Badge.issuer').subscribe((translatedText: string) => {
			this.groups[0] = translatedText;
		});

		this.translate.get('BadgeCollection.descriptionMax300').subscribe((str) => {
			this.descriptionMax300 = str;
		});
	}

	ngOnInit() {
		super.ngOnInit();
	}

	initFormFromExisting(collection: RecipientBadgeCollection) {
		if (!collection) return;

		collection.badges.forEach((b) => {
			this.selectedBadges.push(b);
		});
	}

	private updateData() {
		this.badgesLoaded = this.badgeManager.recipientBadgeList.loadedPromise.then(
			(list) => this.updateBadges(list.entities),
			(err) => this.messageService.reportAndThrowError('Failed to load badge list', err),
		);
	}

	badgeChecked(badge: RecipientBadgeInstance) {
		return this.selectedBadges.includes(badge);
	}

	checkboxChange(event, badge: RecipientBadgeInstance) {
		if (event) {
			this.selectedBadges.push(badge);
		} else {
			this.selectedBadges.splice(this.selectedBadges.indexOf(badge), 1);
		}
	}

	badgeIssueDate(badge: BadgeResult) {
		return new Date(badge.badge.apiModel.json.issuedOn || badge.badge.apiModel.json.validFrom);
	}

	private updateBadges(allBadges: RecipientBadgeInstance[]) {
		this.loadedData = true;

		this.badgeClassesByIssuerId = allBadges.reduce(
			groupIntoObject<RecipientBadgeInstance>((b) => b.issuerId),
			{},
		);

		this.allIssuers = allBadges
			.reduce(
				groupIntoArray<RecipientBadgeInstance, string>((b) => b.issuerId),
				[],
			)
			.map((g) => g.values[0].badgeClass.issuer);

		this.allBadges = allBadges.filter(
			(badge) => badge.apiModel.extensions?.['extensions:CategoryExtension']?.Category !== 'learningpath',
		);

		this.hasMultipleIssuers = !this.restrictToIssuerId && new Set(allBadges.map((b) => b.issuerId)).size > 1;

		this.updateResults();
	}

	private updateResults() {
		// Clear Results
		this.badgeResults.length = 0;
		this.issuerResults.length = 0;
		this.categoryResults.length = 0;

		const issuerResultsByIssuer: { [issuerUrl: string]: MatchingIssuerBadges } = {};
		const addedBadgeUrls = new Set<BadgeInstanceUrl>();

		const addBadgeToResults = (badge: RecipientBadgeInstance) => {
			if (addedBadgeUrls.has(badge.url)) {
				return;
			} else {
				addedBadgeUrls.add(badge.url);
			}

			// Restrict Length
			if (this.badgeResults.length > this.maxDisplayedResults) {
				return false;
			}

			// Restrict to issuer
			if (this.restrictToIssuerId && badge.issuerId !== this.restrictToIssuerId) {
				return false;
			}

			let issuerResults = issuerResultsByIssuer[badge.issuerId];
			if (!issuerResults) {
				issuerResults = issuerResultsByIssuer[badge.issuerId] = new MatchingIssuerBadges(
					badge.issuerId,
					badge.badgeClass.issuer,
				);
				this.issuerResults.push(issuerResults);
			}

			// TODO: do this server side maybe?
			// exclude pending badges
			if (badge.mostRelevantStatus !== 'pending') issuerResults.addBadge(badge);

			if (!this.badgeResults.find((r) => r.badge === badge)) {
				if (badge.apiModel.extensions?.['extensions:CategoryExtension']?.Category !== 'learningpath') {
					this.badgeResults.push(new BadgeResult(badge, issuerResults.issuer, false));
				}
			}

			return true;
		};

		const addIssuerToResults = (issuer: ApiRecipientBadgeIssuer) => {
			(this.badgeClassesByIssuerId[issuer.id] || []).forEach(addBadgeToResults);
		};

		this.allIssuers.filter(MatchingAlgorithm.issuerMatcher(this.searchQuery)).forEach(addIssuerToResults);

		this.allBadges.filter(MatchingAlgorithm.badgeMatcher(this.searchQuery)).forEach((item) => {
			addBadgeToResults(item);
		});

		// this.applySorting();
	}

	startEditing() {
		this.isEditing = true;

		this.badgeCollectionForm.controls.collectionName.setValue(this.badgeCollection.name, { emitEvent: false });
		this.badgeCollectionForm.controls.collectionDescription.setValue(this.badgeCollection.description, {
			emitEvent: false,
		});
	}

	cancelEditing() {
		this.isEditing = false;
	}

	onSubmit(formState?: CreateBadgeCollectionForm<string>) {
		if (!this.badgeCollectionForm.markTreeDirtyAndValidate()) {
			window?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
			return;
		}

		if (!this.editing) {
			const collectionForCreation: ApiRecipientBadgeCollectionForCreation = {
				name: formState.collectionName,
				description: formState.collectionDescription,
				published: false,
				badges: [],
			};

			this.selectedBadges.forEach((badge) => badge.markAccepted());

			this.savePromise = this.recipientBadgeCollectionManager
				.createRecipientBadgeCollection(collectionForCreation)
				.then(
					(collection) => {
						collection.updateBadges(this.selectedBadges);
						collection.save().then(
							(success) => {
								this.router.navigate(['/recipient/badge-collections/collection', collection.slug]);
								this.messageService.reportMinorSuccess('Collection created successfully.');
							},
							(failure) => this.messageService.reportHandledError('Unable to create collection', failure),
						);
					},
					(error) => {
						this.messageService.reportHandledError('Unable to create collection', error);
					},
				)
				.then(() => (this.savePromise = null));
		} else {
			this.existingCollection.name = formState.collectionName;
			this.existingCollection.description = formState.collectionDescription;

			this.selectedBadges.forEach((badge) => badge.markAccepted());
			this.existingCollection.updateBadges(this.selectedBadges);
			this.existingCollection.save().then(
				(success) => {
					this.router.navigate(['/recipient/badge-collections/collection', this.existingCollection.slug]);
					this.messageService.reportMinorSuccess('Collection saved successfully.');
				},
				(failure) => this.messageService.reportHandledError('Unable to save collection', failure),
			);
		}
	}
}

class MatchingBadgeCategory {
	constructor(
		public category: string,
		public badge,
		public badges: BadgeClass[] = [],
	) {}
	async addBadge(badge) {
		if (
			badge.extension &&
			badge.extension['extensions:CategoryExtension'] &&
			badge.extension['extensions:CategoryExtension'].Category === this.category
		) {
			if (this.badges.indexOf(badge) < 0) {
				this.badges.push(badge);
			}
		} else if (!badge.extension['extensions:CategoryExtension'] && this.category == 'noCategory') {
			if (this.badges.indexOf(badge) < 0) {
				this.badges.push(badge);
			}
		}
	}
}

class BadgeResult {
	constructor(
		public badge: RecipientBadgeInstance,
		public issuer: ApiRecipientBadgeIssuer,
		public selected: boolean,
	) {}
}

class MatchingIssuerBadges {
	constructor(
		public issuerId: string,
		public issuer: ApiRecipientBadgeIssuer,
		public badges: RecipientBadgeInstance[] = [],
	) {}

	addBadge(badge: RecipientBadgeInstance) {
		if (
			badge.issuerId === this.issuerId &&
			badge.apiModel.extensions?.['extensions:CategoryExtension']?.Category !== 'learningpath'
		) {
			if (this.badges.indexOf(badge) < 0) {
				this.badges.push(badge);
			}
		}
	}
}
