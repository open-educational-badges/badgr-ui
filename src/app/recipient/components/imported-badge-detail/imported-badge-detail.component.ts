import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MessageService } from '../../../common/services/message.service';
import { SessionService } from '../../../common/services/session.service';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { CommonDialogsService } from '../../../common/services/common-dialogs.service';
import { RecipientBadgeInstance } from '../../models/recipient-badge.model';
import { RecipientBadgeManager } from '../../services/recipient-badge-manager.service';
import { RecipientBadgeCollectionSelectionDialogComponent } from '../recipient-badge-collection-selection-dialog/recipient-badge-collection-selection-dialog.component';
import { preloadImageURL } from '../../../common/util/file-util';
import { compareDate } from '../../../common/util/date-compare';
import { EventsService } from '../../../common/services/events.service';
import { AppConfigService } from '../../../common/app-config.service';
import { QueryParametersService } from '../../../common/services/query-parameters.service';
import { LinkEntry } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { CompetencyType, PageConfig } from '../../../common/components/badge-detail/badge-detail.component.types';
import { ApiLearningPath } from '../../../common/model/learningpath-api.model';
import { LearningPathApiService } from '../../../common/services/learningpath-api.service';
import { TranslateService } from '@ngx-translate/core';
import { RecipientBadgeApiService } from '../../services/recipient-badges-api.service';
import { ApiImportedBadgeInstance } from '../../models/recipient-badge-api.model';
import { BgBadgeDetail } from '../../../common/components/badge-detail/badge-detail.component';

@Component({
	selector: 'imported-earned-badge-detail',
	template: `<bg-badgedetail [config]="config" [awaitPromises]="[badgeLoaded]" [badge]="badge"></bg-badgedetail>`,
	imports: [BgBadgeDetail],
})
export class ImportedBadgeDetailComponent extends BaseAuthenticatedRoutableComponent implements OnInit {
	private recipientBadgeManager = inject(RecipientBadgeManager);
	private learningPathApiService = inject(LearningPathApiService);
	private title = inject(Title);
	private messageService = inject(MessageService);
	private eventService = inject(EventsService);
	private dialogService = inject(CommonDialogsService);
	private configService = inject(AppConfigService);
	queryParametersService = inject(QueryParametersService);
	private translate = inject(TranslateService);
	private recipientBadgeApiService = inject(RecipientBadgeApiService);

	readonly issuerImagePlacholderUrl = preloadImageURL(
		'../../../../breakdown/static/images/placeholderavatar-issuer.svg',
	);
	readonly badgeLoadingImageUrl = '../../../../breakdown/static/images/badge-loading.svg';
	readonly badgeFailedImageUrl = '../../../../breakdown/static/images/badge-failed.svg';

	@ViewChild('collectionSelectionDialog')
	collectionSelectionDialog: RecipientBadgeCollectionSelectionDialogComponent;

	badgesLoaded: Promise<unknown>;
	badgeLoaded: Promise<unknown>;
	learningPaths: ApiLearningPath[];
	learningPathsLoaded: Promise<ApiLearningPath[] | void>;
	badges: RecipientBadgeInstance[] = [];
	competencies: object[];
	category: object;
	badge: ApiImportedBadgeInstance;
	issuerBadgeCount: string;

	config: PageConfig;

	now = new Date();
	compareDate = compareDate;
	tense = {
		expires: {
			'=-1': 'Expired',
			'=0': 'Expires',
			'=1': 'Expires',
		},
	};

	crumbs: LinkEntry[];

	get badgeSlug(): string {
		return this.route.snapshot.params['badgeSlug'];
	}

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);
	// get recipientBadgeInstances() {
	// 	return this.recipientBadgeManager.recipientBadgeList;
	// }

	constructor() {
		const router = inject(Router);
		const route = inject(ActivatedRoute);
		const loginService = inject(SessionService);

		super(router, route, loginService);

		this.badgeLoaded = this.recipientBadgeApiService.getImportedBadge(this.badgeSlug).then((r) => {
			this.badge = r;
			if ('extensions:CompetencyExtension' in this.badge.extensions) {
				var comps = this.badge.extensions['extensions:CompetencyExtension'] as Array<unknown> | object;
				// In some old badges, the extension is not an array
				if (!comps['map']) comps = [comps];
				this.competencies = comps['map']((c) => {
					return {
						name: c['name'] ?? c['extensions:name'],
						description: c['description'] ?? c['extensions:description'],
						studyLoad: c['studyLoad'] ?? c['extensions:studyLoad'],
						category: c['category'] ?? c['extensions:category'],
						framework: c['framework'] ?? c['extensions:framework'],
						framework_identifier: c['framework_identifier'] ?? c['extensions:framework_identifier'],
					};
				});
			}
			if ('extensions:CategoryExtension' in this.badge.extensions) {
				this.category = this.badge.extensions['extensions:CategoryExtension'] as object;
			}
			this.crumbs = [
				{ title: 'Mein Rucksack', routerLink: ['/recipient/badges'] },
				{ title: this.badge.json.badge.name, routerLink: ['/earned-badge/' + this.badge.id] },
			];
			this.config = {
				crumbs: this.crumbs,
				badgeTitle: this.badge.json.badge.name,
				// uncomment after the sharing of a badge is discussed from a data privacy perspective
				qrCodeButton: {
					show: false,
				},
				criteria: null,
				menuitems: [
					// {
					// 	title: 'Download JSON-Datei',
					// 	icon: '	lucideFileCode',
					// 	action: () => this.exportJson(),
					// },
					// {
					// 	title: 'Download PDF-Zertifikat',
					// 	icon: 'lucideFileText',
					// 	action: () => {},
					// },
					// {
					// 	title: 'Badge verifizieren',
					// 	icon: 'lucideBadgeCheck',
					// 	action: () => window.open(this.verifyUrl, '_blank'),
					// },
					{
						title: 'RecBadgeDetail.deleteBadge',
						icon: 'lucideTrash2',
						action: () => this.deleteBadge(this.badge),
					},
				],
				badgeDescription: this.badge.json.badge.description,
				issuerSlug: this.badge.json.badge.issuer.name,
				slug: this.badgeSlug,
				issuedOn: this.badge.json.issuedOn,
				issuedTo: this.badge.json.recipient.identity,
				category: this.category
					? this.translate.instant(
							`Badge.categories.${(this.category['Category'] ?? this.category['extensions:Category']) || 'participation'}`,
						)
					: null,
				tags: [],
				issuerName: this.badge.json.badge.issuer.name,
				issuerImagePlacholderUrl: this.issuerImagePlacholderUrl,
				issuerImage: this.badge.json.badge.issuer.image,
				badgeLoadingImageUrl: this.badgeLoadingImageUrl,
				badgeFailedImageUrl: this.badgeFailedImageUrl,
				badgeImage: this.badge.json.badge.image,
				learningPaths: [],
				competencies: this.competencies as CompetencyType[],
				// license: this.badge.getExtension('extensions:LicenseExtension', {}) ? true : false,
				// shareButton: true,
				// badgeInstanceSlug: this.badgeSlug,
			};
		});
	}

	ngOnInit() {
		super.ngOnInit();
	}

	deleteBadge(badge: ApiImportedBadgeInstance) {
		console.log(badge);
		this.dialogService.confirmDialog
			.openResolveRejectDialog({
				dialogTitle: this.translate.instant('RecBadgeDetail.confirmRemove'),
				dialogBody: this.translate.instant('RecBadgeDetail.sureToRemove', {
					badgeName: badge.json.badge.name,
				}),
				rejectButtonLabel: this.translate.instant('General.cancel'),
				resolveButtonLabel: this.translate.instant('RecBadgeDetail.removeBadge'),
			})
			.then(
				() =>
					this.recipientBadgeApiService.deleteImportedBadge(badge.slug).then(
						() => {
							this.messageService.reportMajorSuccess(`${badge.json.badge.name} has been deleted`, true);
							this.router.navigate(['/recipient']);
						},
						(error) => {
							this.messageService.reportHandledError(`Failed to delete ${badge.json.badge.name}`, error);
						},
					),
				() => {},
			);
	}

	private get rawJsonUrl() {
		return `${this.configService.apiConfig.baseUrl}/public/assertions/${this.badgeSlug}.json`;
	}

	get rawBakedUrl() {
		return `${this.configService.apiConfig.baseUrl}/public/assertions/${this.badgeSlug}/baked`;
	}

	get verifyUrl() {
		let url = `${this.configService.assertionVerifyUrl}?url=${this.rawJsonUrl}`;

		for (const IDENTITY_TYPE of ['identity__email', 'identity__url', 'identity__telephone']) {
			const identity = this.queryParametersService.queryStringValue(IDENTITY_TYPE);
			if (identity) {
				url = `${url}&${IDENTITY_TYPE}=${identity}`;
			}
		}
		return url;
	}

	exportJson() {
		fetch(this.rawJsonUrl)
			.then((response) => response.blob())
			.then((blob) => {
				const link = document.createElement('a');
				const url = URL.createObjectURL(blob);
				link.href = url;
				link.download = `${this.badge.json.issuedOn.toISOString().split('T')[0]}-${this.badge.json.badge.name.trim().replace(' ', '_')}.json`;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				URL.revokeObjectURL(url);
			})
			.catch((error) => console.error('Download failed:', error));
	}
}
