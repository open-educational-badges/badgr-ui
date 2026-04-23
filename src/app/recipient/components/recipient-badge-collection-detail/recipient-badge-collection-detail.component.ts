import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from '../../../common/services/message.service';
import { Title } from '@angular/platform-browser';
import { RecipientBadgeSelectionDialog } from '../recipient-badge-selection-dialog/recipient-badge-selection-dialog.component';
import { RecipientBadgeCollection, RecipientBadgeCollectionEntry } from '../../models/recipient-badge-collection.model';
import { RecipientBadgeCollectionManager } from '../../services/recipient-badge-collection-manager.service';
import { RecipientBadgeManager } from '../../services/recipient-badge-manager.service';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { SessionService } from '../../../common/services/session.service';
import { addQueryParamsToUrl } from '../../../common/util/url-util';
import { AppConfigService } from '../../../common/app-config.service';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { MenuItem } from '../../../common/components/badge-detail/badge-detail.component.types';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { DialogComponent } from '../../../components/dialog.component';
import { RecipientBadgeInstance } from '../../models/recipient-badge.model';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { TranslateService, TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { ShareCollectionDialogComponent } from '../../../common/dialogs/oeb-dialogs/share-collection-dialog.component';
import { PdfService } from '../../../common/services/pdf.service';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { OebDropdownComponent } from '../../../components/oeb-dropdown.component';
import { SvgIconComponent } from '../../../common/components/svg-icon.component';
import { FormsModule } from '@angular/forms';
import { BgBadgecard } from '../../../common/components/bg-badgecard';
import { NgIcon } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { HlmH1 } from '@spartan-ng/helm/typography';

@Component({
	selector: 'recipient-badge-collection-detail',
	templateUrl: 'recipient-badge-collection-detail.component.html',
	imports: [
		FormMessageComponent,
		BgBreadcrumbsComponent,
		BgAwaitPromises,
		HlmH1,
		OebButtonComponent,
		OebDropdownComponent,
		SvgIconComponent,
		HlmSwitch,
		FormsModule,
		BgBadgecard,
		NgIcon,
		HlmIcon,
		TranslateDirective,
		RecipientBadgeSelectionDialog,
		TranslatePipe,
	],
})
export class RecipientBadgeCollectionDetailComponent extends BaseAuthenticatedRoutableComponent implements OnInit {
	private title = inject(Title);
	private messageService = inject(MessageService);
	private recipientBadgeManager = inject(RecipientBadgeManager);
	private recipientBadgeCollectionManager = inject(RecipientBadgeCollectionManager);
	private configService = inject(AppConfigService);
	private translate = inject(TranslateService);
	private pdfService = inject(PdfService);

	readonly badgeLoadingImageUrl = '../../../../breakdown/static/images/badge-loading.svg';
	readonly badgeFailedImageUrl = '../../../../breakdown/static/images/badge-failed.svg';
	readonly noCollectionsImageUrl =
		'../../../../assets/@concentricsky/badgr-style/dist/images/image-empty-collection.svg';

	@ViewChild('recipientBadgeDialog')
	recipientBadgeDialog: RecipientBadgeSelectionDialog;

	@ViewChild('deleteBadgeDialogContentTemplate')
	deleteBadgeDialogContentTemplate: ElementRef;

	@ViewChild('deleteCollectionDialogContentTemplate')
	deleteCollectionDialogContentTemplate: ElementRef;

	collectionLoadedPromise: Promise<unknown>;
	collection: RecipientBadgeCollection = new RecipientBadgeCollection(null);
	crumbs: LinkEntry[];

	menuItems: MenuItem[];

	dialogRef: BrnDialogRef<any> = null;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const router = inject(Router);
		const route = inject(ActivatedRoute);
		const loginService = inject(SessionService);

		super(router, route, loginService);
		const title = this.title;

		title.setTitle(`Collections - ${this.configService.theme['serviceName'] || 'Badgr'}`);

		this.menuItems = [
			{
				title: this.translate.instant('General.edit'),
				icon: 'lucidePencil',
				action: () => this.router.navigate([`/recipient/badge-collections/${this.collectionSlug}/edit`]),
			},
			{
				title: this.translate.instant('BadgeCollection.downloadPdf'),
				icon: 'lucideFileText',
				action: () => this.exportPdf(),
			},
			{
				title: this.translate.instant('General.delete'),
				icon: 'lucideTrash2',
				action: () => this.deleteCollection(),
			},
		];

		this.collectionLoadedPromise = Promise.all([
			this.recipientBadgeCollectionManager.recipientBadgeCollectionList.loadedPromise,
			this.recipientBadgeManager.recipientBadgeList.loadedPromise,
		])
			.then(([list]) => {
				this.collection = list.entityForSlug(this.collectionSlug);
				this.checkDisableDownload();
				this.translate.get('General.collections').subscribe((str) => {
					this.crumbs = [
						{ title: str, routerLink: ['/recipient/badges'], queryParams: { tab: 'collections' } },
						{ title: this.collection.name, routerLink: ['/collection/' + this.collection.slug] },
					];
				});
				return this.collection;
			})
			.then((collection) => collection.badgesPromise)
			.catch((err) => {
				router.navigate(['/']);
				return this.messageService.reportHandledError(`Failed to load collection ${this.collectionSlug}`);
			});
	}

	get collectionSlug(): string {
		return this.route.snapshot.params['collectionSlug'];
	}

	ngOnInit() {
		super.ngOnInit();
	}

	closeDialog() {
		if (this.dialogRef) {
			this.dialogRef.close();
		}
	}

	closeDialogContinue() {
		if (this.dialogRef) {
			this.dialogRef.close('continue');
		}
	}

	checkDisableDownload() {
		this.menuItems[1].disabled = this.collection.badgeEntries.length === 0 || !this.collection.published;
	}

	badgeEntryBySlug(index: number, entry: RecipientBadgeCollectionEntry) {
		return entry.badgeSlug;
	}

	badgeIssueDate(entry: RecipientBadgeCollectionEntry) {
		return new Date(entry.badge.issueDate);
	}

	removeBadge(badgeSlug: string) {
		this.recipientBadgeManager.recipientBadgeList.loadedPromise.then((res) => {
			const badge = res.entityForSlug(badgeSlug);
			this.openBadgeDeleteDialog(badge);
			this.dialogRef.closed$.subscribe((result) => {
				if (result === 'continue') {
					this.collection.removeBadge(res.entityForSlug(badgeSlug));
					this.collection.save();
					this.checkDisableDownload();
					// this.menuItems[1].disabled = this.collection.badgeEntries.length === 0;
				}
			});
		});
	}

	deleteCollection() {
		this.openCollectionDeleteDialog();
		this.dialogRef.closed$.subscribe((result) => {
			if (result === 'continue') {
				this.collection.deleteCollection().then(
					() => {
						this.messageService.reportMinorSuccess(`Deleted collection '${this.collection.name}'`);
						this.router.navigate(['/recipient/badges'], {
							queryParams: { tab: 'collections' },
						});
					},
					(error) => this.messageService.reportHandledError(`Failed to delete collection`, error),
				);
			}
		});
	}

	manageBadges() {
		this.recipientBadgeDialog
			.openDialog({
				dialogId: 'manage-collection-badges',
				dialogTitle: 'Add Badges',
				multiSelectMode: true,
				restrictToIssuerId: null,
				omittedCollection: this.collection.badges,
			})
			.then((selectedBadges) => {
				const badgeCollection = selectedBadges.concat(this.collection.badges);

				badgeCollection.forEach((badge) => badge.markAccepted());

				this.collection.updateBadges(badgeCollection);
				this.collection.save().then(
					(success) =>
						this.messageService.reportMinorSuccess(
							`Collection ${this.collection.name} badges saved successfully`,
						),
					(failure) => this.messageService.reportHandledError(`Failed to save Collection`, failure),
				);
			});
	}

	private readonly _hlmDialogService = inject(HlmDialogService);
	public openBadgeDeleteDialog(badge: RecipientBadgeInstance) {
		const dialogRef = this._hlmDialogService.open(DialogComponent, {
			context: {
				content: this.deleteBadgeDialogContentTemplate,
				variant: 'danger',
				templateContext: {
					badgename: badge.apiModel.json.badge.name,
				},
			},
		});

		this.dialogRef = dialogRef;
	}

	openShareDialog(collection: RecipientBadgeCollection) {
		if (!collection.published) return;

		const dialogRef = this._hlmDialogService.open(ShareCollectionDialogComponent, {
			context: {
				collection: collection,
				caption: this.translate.instant('BadgeCollection.shareCollection'),
			},
		});

		this.dialogRef = dialogRef;
	}

	public openCollectionDeleteDialog() {
		const dialogRef = this._hlmDialogService.open(DialogComponent, {
			context: {
				content: this.deleteCollectionDialogContentTemplate,
				variant: 'danger',
				templateContext: {
					collectionname: this.collection.name,
				},
			},
		});

		this.dialogRef = dialogRef;
	}

	get badgesInCollectionCount(): string {
		return `${this.collection.badgeEntries.length} ${
			this.collection.badgeEntries.length === 1 ? 'Badge' : 'Badges'
		}`;
	}

	get collectionPublished() {
		return this.collection.published;
	}

	set collectionPublished(published: boolean) {
		this.collection.published = published;

		if (published) {
			this.collection.save().then(
				(success) => {
					this.messageService.reportMinorSuccess(`Published collection ${this.collection.name} successfully`);
					this.checkDisableDownload();
				},
				(failure) =>
					this.messageService.reportHandledError(
						`Failed to publish collection ${this.collection.name}`,
						failure,
					),
			);
		} else {
			this.collection.save().then(
				(success) =>
					this.messageService.reportMinorSuccess(
						`Unpublished collection ${this.collection.name} successfully`,
					),
				(failure) =>
					this.messageService.reportHandledError(
						`Failed to un-publish collection ${this.collection.name}`,
						failure,
					),
			);
		}
	}

	togglePublished() {
		this.collection.save().then(() => this.checkDisableDownload());
	}

	exportPdf() {
		this.pdfService.getPdf(this.collection.slug, 'collections').then((res) => {
			this.pdfService.downloadPdf(res, this.collection.name, new Date());
		});
	}
}
