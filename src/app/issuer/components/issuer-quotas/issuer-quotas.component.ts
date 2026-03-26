import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
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
import { Network } from '~/issuer/network.model';
import { IssuerManager } from '~/issuer/services/issuer-manager.service';
import { QuotaExceededDialog } from '../issuer-quotas-quota-exceeded-dialog/issuer-quotas-quota-exceeded-dialog.component';
import { NgIcon } from '@ng-icons/core';
import { QuotaManager } from '~/issuer/services/quota-manager.service';

@Component({
	selector: 'issuer-quotas',
	templateUrl: 'issuer-quotas.component.html',
	imports: [
		BgAwaitPromises,
		HlmH1,
		TranslatePipe,
		OebButtonComponent,
		BgBreadcrumbsComponent,
		TimeComponent,
		NgIcon,
		RouterLink,
	],
})
export class IssuerQuotasComponent extends BaseAuthenticatedRoutableComponent {
	protected issuerManager = inject(IssuerManager);
	protected quotaManager = inject(QuotaManager);
	protected messageService = inject(MessageService);
	protected translate = inject(TranslateService);
	private readonly _hlmDialogService = inject(HlmDialogService);
	issuer: Issuer | Network;
	issuerSlug: string;

	issuerLoaded: Promise<unknown>;

	crumbs: LinkEntry[];

	email = signal('');

	constructor() {
		const loginService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, loginService);

		this.issuerSlug = this.route.snapshot.params['issuerSlug'];

		this.issuerLoaded = this.issuerManager.issuerOrNetworkBySlug(this.issuerSlug).then(
			(issuer) => {
				// redirect if quotas not active
				if (!issuer.quotas) {
					this.router.navigate([`/issuer/${issuer.is_network ? 'networks' : 'issuers'}/${issuer.slug}`]);
				}

				this.issuer = issuer;

				this.crumbs = [
					{ title: this.translate.instant('NavItems.myInstitutions'), routerLink: ['/issuer/issuers'] },
					{ title: this.issuer.name, routerLink: ['/issuer/issuers/' + this.issuer.slug] },
					{
						title: this.translate.instant('Quotas.QuotasMenuItem'),
						routerLink: ['/issuer/issuers/' + this.issuer.slug + '/quotas'],
					},
				];
			},
			(error) => {
				this.messageService.reportLoadingError(`Issuer '${this.issuerSlug}' does not exist.`, error);
			},
		);
		this.quotaManager.loaded$.subscribe((response) => {
			this.email.set(response.email);
		});
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

	upgrade() {
		this._hlmDialogService.open(QuotaExceededDialog, {
			context: {
				issuer: this.issuer,
				variant: 'quotas',
				page: 'upgrade',
			},
		});
	}
}
