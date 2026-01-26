import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { typedFormGroup } from '../../../common/util/typed-forms';
import { BadgeClassCopyPermissions } from '../../models/badgeclass-api.model';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { OebCheckboxComponent } from '../../../components/oeb-checkbox.component';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { HlmH1, HlmH2 } from '@spartan-ng/helm/typography';
import { HlmP } from '@spartan-ng/helm/typography';
import { PositiveIntegerOrNullValidator } from '~/common/validators/positive-integer-or-null.validator';
import { OebInputComponent } from '~/components/input.component';
import { OebSelectComponent } from '~/components/select.component';
import { getDurationOptions, expirationToDays, ExpirationUnit } from '~/common/util/expiration-util';
import { UrlValidator } from '~/common/validators/url.validator';

@Component({
	templateUrl: 'badgeclass-edit-issued.component.html',
	styleUrl: './badgeclass-edit-issued.component.css',
	imports: [
		BgBreadcrumbsComponent,
		HlmH1,
		BgAwaitPromises,
		FormsModule,
		ReactiveFormsModule,
		HlmH2,
		OebCheckboxComponent,
		OebButtonComponent,
		TranslatePipe,
		HlmP,
		OebInputComponent,
		OebSelectComponent,
	],
})
export class BadgeClassEditIssuedComponent extends BaseAuthenticatedRoutableComponent implements OnInit {
	protected title = inject(Title);
	protected messageService = inject(MessageService);
	protected issuerManager = inject(IssuerManager);
	protected badgeManager = inject(BadgeClassManager);
	private configService = inject(AppConfigService);
	private translate = inject(TranslateService);

	issuerSlug: string;
	badgeSlug: string;
	category: string;
	issuer: Issuer;
	issuerLoaded: Promise<unknown>;
	badgeClass: BadgeClass;
	badgeClassLoaded: Promise<unknown>;
	breadcrumbLinkEntries: LinkEntry[] = [];

	durationOptions = null;

	@ViewChild('formElem')
	formElem: ElementRef<HTMLFormElement>;

	badgeClassForm = typedFormGroup()
		.addControl('copy_permissions_allow_others', false)
		.addControl('courseUrl', null, UrlValidator.validUrl)
		.addControl('expiration', null, [
			(control) => PositiveIntegerOrNullValidator.valid(control, this.translate),
			,
			Validators.max(10000),
		])
		.addControl('expiration_unit', 'days');

	savePromise: Promise<BadgeClass> | null = null;

	constructor() {
		const sessionService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, sessionService);
		const title = this.title;
		const badgeManager = this.badgeManager;

		this.translate.get('Badge.copyBadgeHeadline').subscribe((str) => {
			title.setTitle(`${str} - ${this.configService.theme['serviceName'] || 'Badgr'}`);
		});

		this.issuerSlug = this.route.snapshot.params['issuerSlug'];
		this.badgeSlug = this.route.snapshot.params['badgeSlug'];

		this.badgeClassLoaded = badgeManager.badgeByIssuerSlugAndSlug(this.issuerSlug, this.badgeSlug).then(
			(badgeClass) => {
				this.badgeClass = badgeClass;
				this.badgeClassForm.setValue({
					courseUrl: badgeClass.courseUrl,
					copy_permissions_allow_others: badgeClass.canCopy('others'),
					expiration: badgeClass.expiration,
					expiration_unit: 'days',
				});
			},
			(error) =>
				this.messageService.reportLoadingError(
					`Cannot find badge ${this.issuerSlug} / ${this.badgeSlug}`,
					error,
				),
		);

		this.issuerLoaded = this.issuerManager.issuerBySlug(this.issuerSlug).then((issuer) => {
			this.issuer = issuer;
			this.breadcrumbLinkEntries = [
				{ title: 'Issuers', routerLink: ['/issuer'] },
				{ title: this.issuer.name, routerLink: ['/issuer/issuers', this.issuerSlug] },
				{ title: this.translate.instant('Badge.copyBadgeHeadline') },
			];
		});
	}

	ngOnInit() {
		super.ngOnInit();
		this.durationOptions = getDurationOptions(this.translate);
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

	cancelClicked() {
		this.router.navigate(['issuer/issuers', this.issuerSlug, 'badges', this.badgeClass.slug]);
	}

	async onSubmit() {
		const formState = this.badgeClassForm.value;
		const expirationDays = expirationToDays(formState.expiration, formState.expiration_unit as ExpirationUnit);
		const copy_permissions: BadgeClassCopyPermissions[] = ['issuer'];
		if (formState.copy_permissions_allow_others) {
			copy_permissions.push('others');
		}
		this.badgeClass.expiration = expirationDays;
		this.badgeClass.copyPermissions = copy_permissions;
		this.badgeClass.courseUrl = formState.courseUrl;
		try {
			this.savePromise = this.badgeClass.save();
			await this.savePromise;
		} catch (e) {
			this.messageService.reportAndThrowError(
				`Unable to save Badge Class: ${BadgrApiFailure.from(e).firstMessage}`,
				e,
			);
		}

		this.cancelClicked();
	}
}
