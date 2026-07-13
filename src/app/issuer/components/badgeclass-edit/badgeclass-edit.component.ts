import { Component, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Title } from '@angular/platform-browser';

import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';

import { SessionService } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { Issuer } from '../../models/issuer.model';
import { Network } from '../../network.model';

import { BadgeClassManager } from '../../services/badgeclass-manager.service';
import { IssuerManager } from '../../services/issuer-manager.service';
import { BadgeClass } from '../../models/badgeclass.model';
import { BadgrApiFailure } from '../../../common/services/api-failure';
import { BadgeStudioComponent } from '../badge-studio/badge-studio.component';
import { BgFormFieldImageComponent } from '../../../common/components/formfield-image';
import { BadgeInstanceManager } from '../../services/badgeinstance-manager.service';
import { BadgeClassInstances, BadgeInstance } from '../../models/badgeinstance.model';
import { EventsService } from '../../../common/services/events.service';
import { AppConfigService } from '../../../common/app-config.service';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { BadgeClassEditFormComponent } from '../badgeclass-edit-form/badgeclass-edit-form.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
	selector: 'badgeclass-edit',
	templateUrl: './badgeclass-edit.component.html',
	imports: [
		BgAwaitPromises,
		FormMessageComponent,
		BgBreadcrumbsComponent,
		BadgeClassEditFormComponent,
		TranslatePipe,
	],
})
export class BadgeClassEditComponent extends BaseAuthenticatedRoutableComponent implements OnInit {
	protected formBuilder = inject(FormBuilder);
	protected title = inject(Title);
	protected messageService = inject(MessageService);
	protected eventsService = inject(EventsService);
	protected badgeManager = inject(BadgeClassManager);
	protected issuerManager = inject(IssuerManager);
	protected badgeInstanceManager = inject(BadgeInstanceManager);
	protected configService = inject(AppConfigService);
	protected badgeClassManager = inject(BadgeClassManager);

	get issuerSlug() {
		return this.route.snapshot.params['issuerSlug'];
	}

	get badgeSlug() {
		return this.route.snapshot.params['badgeSlug'];
	}
	readonly badgeClassPlaceholderImageUrl = '../../../../breakdown/static/images/placeholderavatar.svg';

	issuer: Issuer | Network;
	badgeClassEditForm: FormGroup;

	submitted = false;

	badgeClass: BadgeClass;
	editBadgeClassFinished: Promise<unknown>;
	badgeClassLoaded: Promise<unknown>;
	issuerLoaded: Promise<unknown>;

	scrolled = false;
	@ViewChild('badgeimage') badgeImage;

	editBadgeCrumbs: LinkEntry[];

	// <li><a [routerLink]="['/issuer']">Issuers</a></li>
	// <li><a [routerLink]="['/issuer/issuers/', issuerSlug]">{{issuer.name}}</a></li>
	// <li class="breadcrumb-x-current">Edit Badge Class</li>

	@ViewChild('badgeStudio')
	badgeStudio: BadgeStudioComponent;

	@ViewChild('imageField')
	imageField: BgFormFieldImageComponent;

	private allBadgeInstances: BadgeClassInstances;
	private instanceResults: BadgeInstance[] = [];

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const sessionService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, sessionService);
		const title = this.title;
		const badgeManager = this.badgeManager;
		const issuerManager = this.issuerManager;

		title.setTitle(`Edit Badge Class - ${this.configService.theme['serviceName'] || 'Badgr'}`);

		this.badgeClassLoaded = badgeManager.badgeByIssuerSlugAndSlug(this.issuerSlug, this.badgeSlug).then(
			(badge) => (this.badgeClass = badge),
			(error) =>
				this.messageService.reportLoadingError(
					`Cannot find badge ${this.issuerSlug} / ${this.badgeSlug}`,
					error,
				),
		);

		this.issuerLoaded = issuerManager.issuerOrNetworkBySlug(this.issuerSlug).then(
			(issuer) => {
				this.issuer = issuer;
				this.editBadgeCrumbs = [
					{ title: 'Issuers', routerLink: ['/issuer'] },
					{ title: issuer.name, routerLink: ['/issuer/issuers/', this.issuerSlug] },
					{ title: 'badges', routerLink: ['/issuer/issuers/' + this.issuerSlug + '/badges/'] },
					{
						title: this.badgeClass ? this.badgeClass.name : '',
						routerLink: ['/issuer/issuers/' + this.issuerSlug + '/badges/' + this.badgeSlug],
					},
					{ title: 'Edit Badge Class' },
				];
				return issuer;
			},
			(error) => this.messageService.reportLoadingError(`Cannot find issuer ${this.issuerSlug}`, error),
		);
	}

	badgeClassSaved(promise: Promise<BadgeClass>) {
		promise.then(
			(badgeClass) => {
				this.eventsService.recipientBadgesStale.next([]);
				this.router.navigate(['issuer/issuers', this.issuerSlug, 'badges', badgeClass.slug]);
			},
			(error) =>
				this.messageService.reportAndThrowError(
					`Unable to create Badge Class: ${BadgrApiFailure.from(error).firstMessage}`,
					error,
				),
		);
	}

	editingCanceled() {
		this.router.navigate(['issuer/issuers', this.issuerSlug, 'badges', this.badgeClass.slug]);
	}

	@HostListener('window:scroll')
	onWindowScroll() {
		var top = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

		this.scrolled = this.badgeImage && top > this.badgeImage.componentElem.nativeElement.offsetTop;
	}
}

interface BadgeClassEditForm<T> {
	badge_name: T;
	badge_description: T;
	badge_criteria_text: T;
	badge_criteria_url: T;
	badge_image: T;
}
