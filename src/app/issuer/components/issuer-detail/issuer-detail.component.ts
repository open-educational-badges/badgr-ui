import { Component, OnInit, inject } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../../common/services/session.service';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { MessageService } from '../../../common/services/message.service';
import { IssuerManager } from '../../services/issuer-manager.service';
import { BadgeClassManager } from '../../services/badgeclass-manager.service';
import { Issuer } from '../../models/issuer.model';
import { BadgeClass } from '../../models/badgeclass.model';
import { Title } from '@angular/platform-browser';
import { preloadImageURL } from '../../../common/util/file-util';
import { UserProfileManager } from '../../../common/services/user-profile-manager.service';
import { UserProfileEmail } from '../../../common/model/user-profile.model';
import { AppConfigService } from '../../../common/app-config.service';
import { CommonDialogsService } from '../../../common/services/common-dialogs.service';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { MenuItem } from '../../../common/components/badge-detail/badge-detail.component.types';
import { LearningPathApiService } from '../../../common/services/learningpath-api.service';
import { ApiLearningPath } from '../../../common/model/learningpath-api.model';
import { first, firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { OebIssuerDetailComponent } from '../../../common/components/issuer/oeb-issuer-detail.component';

@Component({
	selector: 'issuer-detail',
	templateUrl: './issuer-detail.component.html',
	imports: [FormMessageComponent, BgAwaitPromises, BgBreadcrumbsComponent, OebIssuerDetailComponent],
})
export class IssuerDetailComponent extends BaseAuthenticatedRoutableComponent implements OnInit {
	protected messageService = inject(MessageService);
	protected title = inject(Title);
	protected issuerManager = inject(IssuerManager);
	protected badgeClassService = inject(BadgeClassManager);
	protected learningPathsService = inject(LearningPathApiService);
	protected profileManager = inject(UserProfileManager);
	private configService = inject(AppConfigService);
	private dialogService = inject(CommonDialogsService);
	private translate = inject(TranslateService);

	readonly issuerImagePlaceHolderUrl = preloadImageURL(
		'../../../../breakdown/static/images/placeholderavatar-issuer.svg',
	);
	readonly noIssuersPlaceholderSrc =
		'../../../../assets/@concentricsky/badgr-style/dist/images/image-empty-issuer.svg';

	issuer: Issuer;
	issuerSlug: string;
	badges: BadgeClass[];
	learningPaths: ApiLearningPath[];

	profileEmails: UserProfileEmail[] = [];

	issuerLoaded: Promise<unknown>;
	badgesLoaded: Promise<unknown>;
	learningPathsLoaded: Promise<unknown>;
	networksLoaded: Promise<unknown>;

	profileEmailsLoaded: Promise<unknown>;
	crumbs: LinkEntry[];

	menuitems: MenuItem[] = [];

	myInstitutions = 'Meine Institutionen';

	constructor() {
		const loginService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, loginService);
		const title = this.title;

		title.setTitle(`Issuer Detail - ${this.configService.theme['serviceName'] || 'Badgr'}`);

		this.issuerSlug = this.route.snapshot.params['issuerSlug'];

		this.menuitems = [
			{
				title: this.translate.instant('General.edit'),
				routerLink: ['./edit'],
				icon: 'lucidePencil',
			},
			{
				title: this.translate.instant('General.delete'),
				action: ($event) => this.delete($event),
				icon: 'lucideTrash2',
			},
			{
				title: this.translate.instant('Issuer.editMembers'),
				routerLink: ['./staff'],
				icon: 'lucideUsers',
			},
		];

		this.issuerLoaded = this.issuerManager.issuerBySlug(this.issuerSlug).then(
			(issuer) => {
				this.issuer = issuer;
				if (issuer.is_network) {
					this.router.navigate(['/issuer/networks/' + this.issuerSlug]);
				}
				this.title.setTitle(
					`Issuer - ${this.issuer.name} - ${this.configService.theme['serviceName'] || 'Badgr'}`,
				);
				this.crumbs = [
					{ title: this.translate.instant('NavItems.myInstitutions'), routerLink: ['/issuer/issuers'] },
					{ title: this.issuer.name, routerLink: ['/issuer/issuers/' + this.issuer.slug] },
				];

				this.badgesLoaded = firstValueFrom(this.badgeClassService.badgesByIssuerUrl$)
					.then((badgesByIssuer) => {
						const cmp = (a, b) => (a === b ? 0 : a < b ? -1 : 1);
						this.badges = (badgesByIssuer[this.issuer.issuerUrl] || []).sort((a, b) =>
							cmp(b.createdAt, a.createdAt),
						);
					})
					.catch((error) => {
						this.messageService.reportAndThrowError(
							`Failed to load badges for ${this.issuer ? this.issuer.name : this.issuerSlug}`,
							error,
						);
					});
			},
			(error) => {
				this.messageService.reportLoadingError(
					`Issuer '${this.issuerSlug}' does not exist or you are not allowed to view the issuer`,
					error,
				);
			},
		);

		this.profileEmailsLoaded = this.profileManager.userProfilePromise
			.then((profile) => profile.emails.loadedPromise)
			.then((emails) => (this.profileEmails = emails.entities));
	}

	delete = ($event: Event) => {
		$event.preventDefault();
		this.dialogService.confirmDialog
			.openResolveRejectDialog({
				dialogTitle: 'Delete Issuer',
				dialogBody: this.badges.length
					? 'This issuer has active badges! Please delete them before trying to delete the issuer.'
					: `Are you sure you want to delete issuer ${this.issuer.name}?`,
				resolveButtonLabel: 'Delete Issuer',
				rejectButtonLabel: 'Cancel',
				disableConfirm: !!this.badges.length,
			})
			.then(
				() => {
					this.issuer.delete().then(
						() => {
							this.issuerManager.issuersList.invalidateList();
							this.messageService.reportMinorSuccess(`Deleted issuer '${this.issuer.name}'`);
							this.router.navigate(['/issuer/issuers']);
						},
						(error) => this.messageService.reportHandledError(`Failed to delete issuer`, error),
					);
				},
				() => {},
			);
	};

	ngOnInit() {
		super.ngOnInit();
		this.translate.get('NavItems.myInstitutions').subscribe((str) => {
			this.myInstitutions = str;
		});
	}

	routeToBadgeAward(badge, issuer) {
		this.router.navigate(['/issuer/issuers/', issuer.slug, 'badges', badge.slug, 'issue']);
	}

	routeToBadgeDetail(badge, issuer) {
		this.router.navigate(['/issuer/issuers/', issuer.slug, 'badges', badge.slug]);
	}
}
