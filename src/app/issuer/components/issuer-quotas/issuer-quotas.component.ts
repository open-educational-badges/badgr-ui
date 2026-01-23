import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HlmH1 } from '@spartan-ng/helm/typography';
import { BgBreadcrumbsComponent, LinkEntry } from '~/common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { TimeComponent } from '~/common/components/time.component';
import { BgAwaitPromises } from '~/common/directives/bg-await-promises';
import { BaseAuthenticatedRoutableComponent } from '~/common/pages/base-authenticated-routable.component';
import { MessageService } from '~/common/services/message.service';
import { SessionService } from '~/common/services/session.service';
import { OebButtonComponent } from '~/components/oeb-button.component';
import { ApiQuotasBooleanQuota, ApiQuotasNumberQuota } from '~/issuer/models/issuer-api.model';
import { Issuer } from '~/issuer/models/issuer.model';
import { IssuerManager } from '~/issuer/services/issuer-manager.service';

@Component({
	selector: 'issuer-quotas',
	templateUrl: 'issuer-quotas.component.html',
	imports: [BgAwaitPromises, HlmH1, TranslatePipe, OebButtonComponent, BgBreadcrumbsComponent, TimeComponent],
})
export class IssuerQuotasComponent extends BaseAuthenticatedRoutableComponent {
	protected issuerManager = inject(IssuerManager);
	protected messageService = inject(MessageService);
	protected translate = inject(TranslateService);
	issuer: Issuer;
	issuerSlug: string;

	issuerLoaded: Promise<unknown>;

	crumbs: LinkEntry[];

	constructor() {
		const loginService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, loginService);

		this.issuerSlug = this.route.snapshot.params['issuerSlug'];

		this.issuerLoaded = this.issuerManager.issuerBySlug(this.issuerSlug).then(
			(issuer) => {
				this.issuer = issuer;
			},
			(error) => {
				this.messageService.reportLoadingError(`Issuer '${this.issuerSlug}' does not exist.`, error);
			},
		);
	}

	quotaWarning(quota: ApiQuotasNumberQuota | ApiQuotasBooleanQuota) {
		if ('used' in quota) {
			return quota['used'] / quota['max'] >= 0.8;
		}
	}
	// returns true if any quota has a custom value
	isCustom() {
		return Object.keys(this.issuer.quotas.quotas).some((key, index) => this.issuer.quotas.quotas[key].custom);
	}
}
