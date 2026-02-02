import { Component, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { Title } from '@angular/platform-browser';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { IssuerManager } from '../../services/issuer-manager.service';
import { BadgeClass } from '../../models/badgeclass.model';
import { Issuer } from '../../models/issuer.model';
import { BadgeClassManager } from '../../services/badgeclass-manager.service';
import { AppConfigService } from '../../../common/app-config.service';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { OebBackgroundComponent } from '../../../components/oeb-background.component';
import { FormMessageComponent } from '../../../common/components/form-message.component';

import { BadgeClassIssueBulkAwardImportComponent } from '../badgeclass-issue-bulk-award-import/badgeclass-issue-bulk-award-import.component';
import { BadgeClassIssueBulkAwardPreviewComponent } from '../badgeclass-issue-bulk-award-preview/badgeclass-issue-bulk-award-preview.component';
import { BadgeclassIssueBulkAwardConformation } from '../badgeclass-issue-bulk-award-confirmation/badgeclass-issue-bulk-award-confirmation.component';
import { BadgeclassIssueBulkAwardError } from '../badgeclass-issue-bulk-award-error/badgeclass-issue-bulk-award-error.component';

export interface ParsedRow {
	cells: string[];
	emailInvalid?: boolean;
}

export interface TransformedImportData {
	duplicateRecords: BulkIssueData[];
	validRowsTransformed: Set<BulkIssueData>;
	invalidRowsTransformed: BulkIssueData[];
}

export interface BulkIssueImportPreviewData {
	columnHeaders: ColumnHeaders[];
	invalidRows: ParsedRow[];
	rowLongerThenHeader: boolean;
	rows: ParsedRow[];
	validRows: ParsedRow[];
}

export interface BulkIssueData {
	email: string;
	name: string;
	emailInvalid?: boolean;
	isEditing?: boolean;
}

export type DestSelectOptions = 'email' | 'name' | 'NA';

export type ViewState = 'import' | 'importPreview' | 'importError' | 'importConfirmation' | 'cancel' | 'exit';

export interface ColumnHeaders {
	destColumn: DestSelectOptions;
	sourceName: string;
}

@Component({
	selector: 'Badgeclass-issue-bulk-award',
	templateUrl: './badgeclass-issue-bulk-award.component.html',
	imports: [
		BgAwaitPromises,
		OebBackgroundComponent,
		BgBreadcrumbsComponent,
		FormMessageComponent,
		BadgeClassIssueBulkAwardImportComponent,
		BadgeClassIssueBulkAwardPreviewComponent,
		BadgeclassIssueBulkAwardConformation,
		BadgeclassIssueBulkAwardError,
	],
})
export class BadgeClassIssueBulkAwardComponent extends BaseAuthenticatedRoutableComponent {
	protected badgeClassManager = inject(BadgeClassManager);
	protected formBuilder = inject(FormBuilder);
	protected issuerManager = inject(IssuerManager);
	protected authService: SessionService;
	protected messageService = inject(MessageService);
	protected router: Router;
	protected route: ActivatedRoute;
	protected configService = inject(AppConfigService);
	protected title = inject(Title);

	importPreviewData: BulkIssueImportPreviewData;
	transformedImportData: TransformedImportData;
	viewState: ViewState;
	badgeClass: BadgeClass;
	badgeClassLoaded: Promise<unknown>;

	issuer: Issuer;
	issuerLoaded: Promise<unknown>;

	breadcrumbLinkEntries: LinkEntry[] = [];

	constructor() {
		const sessionService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, sessionService);
		this.authService = sessionService;
		this.router = router;
		this.route = route;

		this.updateViewState('import');

		this.issuerLoaded = this.issuerManager.issuerBySlug(this.issuerSlug).then((issuer) => {
			this.issuer = issuer;
			this.badgeClassLoaded = this.badgeClassManager
				.badgeByIssuerUrlAndSlug(issuer.issuerUrl, this.badgeSlug)
				.then((badgeClass) => {
					this.badgeClass = badgeClass;
					this.title.setTitle(
						`Bulk Award Badge - ${badgeClass.name} - ${this.configService.theme['serviceName'] || 'Badgr'}`,
					);
					this.breadcrumbLinkEntries = [
						{ title: 'Issuers', routerLink: ['/issuer'] },
						{ title: issuer.name, routerLink: ['/issuer/issuers', this.issuerSlug] },
						{
							title: badgeClass.name,
							routerLink: ['/issuer/issuers', this.issuerSlug, 'badges', badgeClass.slug],
						},
						{ title: 'Bulk Award Badge' },
					];
				});
		});
	}

	onBulkIssueImportPreviewData(importPreviewData: BulkIssueImportPreviewData) {
		this.importPreviewData = importPreviewData;
		this.updateViewState('importPreview');
	}

	onTransformedImportData(transformedImportData) {
		this.transformedImportData = transformedImportData;

		// Determine if the transformed data contains any errors
		if (this.transformedImportData && transformedImportData.invalidRowsTransformed.length)
			this.updateViewState('importError');
		else this.updateViewState('importConfirmation');
	}

	updateViewState(state: ViewState) {
		if (state === 'cancel') {
			this.navigateToIssueBadgeInstance();
			return;
		}
		this.viewState = state;
	}

	get issuerSlug() {
		return this.route.snapshot.params['issuerSlug'];
	}

	get badgeSlug() {
		return this.route.snapshot.params['badgeSlug'];
	}

	navigateToIssueBadgeInstance() {
		this.router.navigate(['/issuer/issuers', this.issuer.slug, 'badges', this.badgeSlug]);
	}

	createRange(size: number) {
		const items: string[] = [];
		for (let i = 1; i <= size; i++) {
			items.push('');
		}
		return items;
	}
}
