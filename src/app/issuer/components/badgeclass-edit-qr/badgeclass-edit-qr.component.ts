import { Component, inject } from '@angular/core';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { ActivatedRoute, Router } from '@angular/router';
import { BadgeClassManager } from '../../services/badgeclass-manager.service';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { SessionService } from '../../../common/services/session.service';
import { BadgeClass } from '../../models/badgeclass.model';
import { QrCodeApiService } from '../../services/qrcode-api.service';
import { TranslateService } from '@ngx-translate/core';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { EditQrFormComponent } from '../edit-qr-form/edit-qr-form.component';
import { HlmH1 } from '@spartan-ng/helm/typography';

@Component({
	selector: 'badgeclass-edit-qr',
	templateUrl: './badgeclass-edit-qr.component.html',
	imports: [BgAwaitPromises, BgBreadcrumbsComponent, HlmH1, EditQrFormComponent],
})
export class BadgeClassEditQrComponent extends BaseAuthenticatedRoutableComponent {
	protected translate = inject(TranslateService);
	protected qrCodeApiService = inject(QrCodeApiService);
	protected badgeClassManager = inject(BadgeClassManager);

	get issuerSlug() {
		return this.route.snapshot.params['issuerSlug'];
	}

	get badgeSlug() {
		return this.route.snapshot.params['badgeSlug'];
	}

	badgeClass: BadgeClass;

	readonly badgeFailedImageUrl = '../../../../breakdown/static/images/badge-failed.svg';
	readonly badgeLoadingImageUrl = '../../../../breakdown/static/images/badge-loading.svg';

	badgeClassLoaded: Promise<unknown>;
	crumbs: LinkEntry[];

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const route = inject(ActivatedRoute);
		const router = inject(Router);
		const sessionService = inject(SessionService);

		super(router, route, sessionService);

		this.badgeClassLoaded = this.badgeClassManager
			.badgeByIssuerSlugAndSlug(this.issuerSlug, this.badgeSlug)
			.then((badgeClass) => {
				this.badgeClass = badgeClass;

				this.crumbs = [
					{ title: 'Issuers', routerLink: ['/issuer'] },
					{
						// title: issuer.name,
						title: 'issuer',
						routerLink: ['/issuer/issuers', this.issuerSlug],
					},
					{
						title: 'badges',
						routerLink: ['/issuer/issuers/' + this.issuerSlug + '/badges/'],
					},
					{
						title: badgeClass.name,
						routerLink: ['/issuer/issuers', this.issuerSlug, 'badges', badgeClass.slug],
					},
					{ title: 'Award Badge' },
				];
			});
	}
}
