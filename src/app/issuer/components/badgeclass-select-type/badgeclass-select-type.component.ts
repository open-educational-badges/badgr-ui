import { Component, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { Issuer } from '../../models/issuer.model';
import { IssuerManager } from '../../services/issuer-manager.service';
import { BadgeClass } from '../../models/badgeclass.model';
import { AppConfigService } from '../../../common/app-config.service';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { HlmH1, HlmP, HlmH2 } from '@spartan-ng/helm/typography';
import { Network } from '~/issuer/network.model';
import { BgAwaitPromises } from '~/common/directives/bg-await-promises';
import { QuotaInformationComponent } from '../quota-information/quota-information.component';

@Component({
	selector: 'badgeclass-select-type',
	templateUrl: 'badgeclass-select-type.component.html',
	styleUrls: ['./badgeclass-select-type.component.scss'],
	imports: [
		BgBreadcrumbsComponent,
		HlmH1,
		HlmP,
		HlmH2,
		RouterLink,
		TranslatePipe,
		BgAwaitPromises,
		QuotaInformationComponent,
	],
})
export class BadgeClassSelectTypeComponent extends BaseAuthenticatedRoutableComponent {
	protected title = inject(Title);
	protected issuerManager = inject(IssuerManager);
	private configService = inject(AppConfigService);
	private translate = inject(TranslateService);

	issuerSlug: string;
	issuer: Issuer | Network;
	issuerLoaded: Promise<unknown>;
	breadcrumbLinkEntries: LinkEntry[] = [];

	constructor() {
		super();
		const title = this.title;
		this.translate.get('Issuer.createBadge').subscribe((str) => {
			title.setTitle(`${str} - ${this.configService.theme['serviceName'] || 'Badgr'}`);
		});
		this.issuerSlug = this.route.snapshot.params['issuerSlug'];

		this.issuerLoaded = this.issuerManager.issuerOrNetworkBySlug(this.issuerSlug).then((issuer) => {
			this.issuer = issuer;
			this.breadcrumbLinkEntries = [
				{ title: 'Issuers', routerLink: ['/issuer'] },
				{ title: issuer.name, routerLink: ['/issuer/issuers', this.issuerSlug] },
				{ title: this.translate.instant('Issuer.createBadge') },
			];
		});
	}

	get canCreateLp(): boolean {
		return (
			!this.issuer.is_network ||
			(this.issuer instanceof Network && this.issuer.partnerBadgesCount + this.issuer.badgeClassCount >= 2)
		);
	}
}
