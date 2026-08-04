import { AfterContentInit, AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
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
import { ApiLearningPath, ApiLearningPathParticipant } from '../../..//common/model/learningpath-api.model';
import { LearningPathApiService } from '../../../common/services/learningpath-api.service';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { OebLearningPathDetailComponent } from '../../../common/components/learningpath-detail/oeb-learning-path.component';
import { Network } from '~/issuer/network.model';

@Component({
	selector: 'issuer-learning-path',
	templateUrl: './issuer-learning-path.component.html',
	imports: [FormMessageComponent, BgAwaitPromises, BgBreadcrumbsComponent, OebLearningPathDetailComponent],
})
export class IssuerLearningPathComponent extends BaseAuthenticatedRoutableComponent implements OnInit {
	protected messageService = inject(MessageService);
	protected title = inject(Title);
	protected issuerManager = inject(IssuerManager);
	protected badgeClassService = inject(BadgeClassManager);
	protected profileManager = inject(UserProfileManager);
	private configService = inject(AppConfigService);
	private dialogService = inject(CommonDialogsService);
	private learningPathApiService = inject(LearningPathApiService);

	readonly issuerImagePlaceHolderUrl = preloadImageURL(
		'../../../../breakdown/static/images/placeholderavatar-issuer.svg',
	);
	readonly noIssuersPlaceholderSrc =
		'../../../../assets/@concentricsky/badgr-style/dist/images/image-empty-issuer.svg';

	issuer: Issuer | Network;
	learningPath: ApiLearningPath;
	issuerSlug: string;
	learningPathSlug: string;
	badges: BadgeClass[];

	profileEmails: UserProfileEmail[] = [];

	issuerLoaded: Promise<unknown>;
	learningPathLoaded: Promise<unknown>;
	participantsLoaded: Promise<unknown>;
	participants: ApiLearningPathParticipant[];

	profileEmailsLoaded: Promise<unknown>;
	crumbs: LinkEntry[];
	menuitems: MenuItem[] = [];

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const loginService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, loginService);
		const title = this.title;

		title.setTitle(`Issuer Detail - ${this.configService.theme['serviceName'] || 'Badgr'}`);

		this.issuerSlug = this.route.snapshot.params['issuerSlug'];
		this.learningPathSlug = this.route.snapshot.params['learningPathSlug'];

		this.menuitems = [
			{
				title: 'Bearbeiten',
				routerLink: ['./edit'],
				icon: 'lucidePencil',
			},
			{
				title: 'Löschen',
				action: ($event) => this.delete($event),
				icon: 'lucideTrash2',
			},
			{
				title: 'Mitglieder bearbeiten',
				routerLink: ['./staff'],
				icon: 'lucideUsers',
			},
		];

		this.issuerLoaded = this.issuerManager.issuerOrNetworkBySlugDirect(this.issuerSlug).then(
			(issuer) => {
				this.issuer = issuer;
				this.title.setTitle(
					`Issuer - ${this.issuer.name} - ${this.configService.theme['serviceName'] || 'Badgr'}`,
				);

				this.learningPathLoaded = new Promise<void>((resolve, reject) => {
					this.learningPathApiService.getLearningPath(this.issuerSlug, this.learningPathSlug).then(
						(result) => {
							this.learningPath = result;
							this.crumbs = [
								{ title: 'Meine Institutionen', routerLink: ['/issuer/issuers'] },
								{ title: this.issuer.name, routerLink: ['/issuer/issuers/' + this.issuer.slug] },
								{ title: this.learningPath.name },
							];
							resolve();
						},
						(error) => {
							this.messageService.reportAndThrowError(
								`Failed to load learningpath for ${this.issuer ? this.issuer.name : this.issuerSlug}`,
								error,
							);
						},
					);
				});
				this.participantsLoaded = new Promise<void>((resolve, reject) => {
					this.learningPathApiService.getLearningPathParticipants(this.learningPathSlug).then((result) => {
						this.participants = result.body;
						resolve();
					});
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
					if (this.issuer instanceof Issuer) {
						this.issuer.delete().then(
							() => {
								this.issuerManager.issuersList.invalidateList();
								this.messageService.reportMinorSuccess(`Deleted issuer '${this.issuer.name}'`);
								this.router.navigate(['/issuer/issuers']);
							},
							(error) => this.messageService.reportHandledError(`Failed to delete issuer`, error),
						);
					}
				},
				() => {},
			);
	};

	ngOnInit() {
		super.ngOnInit();
	}

	routeToBadgeAward(badge, issuer) {
		this.router.navigate(['/issuer/issuers/', issuer.slug, 'badges', badge.slug, 'issue']);
	}

	routeToBadgeDetail(badge, issuer) {
		this.router.navigate(['/issuer/issuers/', issuer.slug, 'badges', badge.slug]);
	}
}
