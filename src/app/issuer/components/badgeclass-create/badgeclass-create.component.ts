import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { SessionService } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { Issuer } from '../../models/issuer.model';
import { IssuerManager } from '../../services/issuer-manager.service';
import { BadgrApiFailure } from '../../../common/services/api-failure';
import { BadgeClass } from '../../models/badgeclass.model';
import { AppConfigService } from '../../../common/app-config.service';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { BadgeClassManager } from '../../services/badgeclass-manager.service';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { BadgeClassEditFormComponent } from '../badgeclass-edit-form/badgeclass-edit-form.component';
import { HlmH1 } from '@spartan-ng/helm/typography';
import { NetworkManager } from '~/issuer/services/network-manager.service';
import { Network } from '~/issuer/network.model';

@Component({
	templateUrl: 'badgeclass-create.component.html',
	imports: [BgBreadcrumbsComponent, HlmH1, BgAwaitPromises, BadgeClassEditFormComponent, TranslatePipe],
})
export class BadgeClassCreateComponent extends BaseAuthenticatedRoutableComponent implements OnInit {

	protected title = inject(Title);
	protected messageService = inject(MessageService);
	protected issuerManager = inject(IssuerManager);
	protected networkManager = inject(NetworkManager);
	protected badgeClassService = inject(BadgeClassManager);
	private configService = inject(AppConfigService);
	translate = inject(TranslateService);

	issuerSlug: string;
	category: string;
	issuer: Issuer | Network;
	issuerLoaded: Promise<unknown>;
	breadcrumbLinkEntries: LinkEntry[] = [];
	scrolled = false;
	copiedBadgeClass: BadgeClass = null;
	/**
	 * Indicates wether the "copiedBadgeClass" is a forked copy, or a 1:1 copy
	 */
	isForked = false;

	badgesLoaded: Promise<unknown>;
	badges: BadgeClass[] = null;

	@ViewChild('badgeimage') badgeImage; // Delete or rename
	@ViewChild('formElem') formElem: ElementRef;
	@ViewChild('imageSection') imageSection: ElementRef;

	navigationState: any;

	constructor() {
		super();
		const title = this.title;

		this.translate.get('Issuer.createBadge').subscribe((str) => {
			title.setTitle(`${str} - ${this.configService.theme['serviceName'] || 'Badgr'}`);
		});

		this.issuerSlug = this.route.snapshot.params['issuerSlug'];
		this.category = this.route.snapshot.params['category'];
		const navigation = this.router.currentNavigation();
		this.navigationState = navigation?.extras?.state;
	}

	async ngOnInit() {
		const state = this.router.currentNavigation()?.extras.state;
		if (state?.issuer) {
			this.issuer = state.issuer;
			this.issuerLoaded = Promise.resolve(this.issuer);
		} else {
			this.issuerLoaded = this.issuerManager
				.issuerOrNetworkBySlug(this.issuerSlug)
				.then((issuer) => {
					this.issuer = issuer;
					return issuer;
				})
				.then((issuer) => {
					this.breadcrumbLinkEntries = [
						{ title: 'Issuers', routerLink: ['/issuer'] },
						{
							title: issuer.name,
							routerLink: [`/issuer/${this.issuer.is_network ? 'networks' : 'issuers'}`, this.issuerSlug],
						},
						{
							title: this.copiedBadgeClass
								? this.translate.instant('Badge.copyBadge')
								: this.translate.instant('Issuer.createBadge'),
						},
					];
					return issuer;
				});
		}

		// Check if there is a badge ID in the state and fetch it if necessary
		if (this.navigationState && this.navigationState.copybadgeid) {
			this.badgeClassService.issuerBadgeById(this.navigationState.copybadgeid).then((badge) => {
				this.category = badge.extension['extensions:CategoryExtension'].Category;
				this.copiedBadgeClass = badge;
			});
		}
	}

	badgeClassCreated(promise: Promise<BadgeClass>) {
		promise.then(
			(badgeClass) => this.router.navigate(['issuer/issuers', this.issuerSlug, 'badges', badgeClass.slug]),
			(error) =>
				this.messageService.reportAndThrowError(
					`Unable to create Badge Class: ${BadgrApiFailure.from(error).firstMessage}`,
					error,
				),
		);
	}
	creationCanceled() {
		this.router.navigate(['issuer/issuers', this.issuerSlug]);
	}

	@HostListener('window:scroll')
	onWindowScroll() {
		// Use '?' to safely check if things exist before reading nativeElement
		if (!this.formElem?.nativeElement || !this.badgeImage?.componentElem?.nativeElement) {
			return;
		}

		const top = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

		// The logic only runs if the elements above were found
		this.scrolled = top > this.badgeImage.componentElem.nativeElement.offsetTop;
	}
	// copyBadge() {
	// 	this.dialogService.copyBadgeDialog
	// 		.openDialog(this.badges)
	// 		.then((data: BadgeClass | void) => {
	// 			if (data) {
	// 				this.copiedBadgeClass = data;
	// 				this.isForked = false;
	// 			}
	// 		})
	// 		.catch((error) => {
	// 			this.messageService.reportAndThrowError('Failed to load badges to copy', error);
	// 		});
	// }

	// forkBadge() {
	// 	this.dialogService.forkBadgeDialog
	// 		.openDialog(this.badges)
	// 		.then((data: BadgeClass | void) => {
	// 			if (data) {
	// 				this.copiedBadgeClass = data;
	// 				this.isForked = true;
	// 			}
	// 		})
	// 		.catch((error) => {
	// 			this.messageService.reportAndThrowError('Failed to load badges to fork', error);
	// 		});
	// }
}
