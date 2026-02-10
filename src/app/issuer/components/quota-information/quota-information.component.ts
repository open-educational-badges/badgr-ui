import { Component, inject, input } from '@angular/core';
import { ActivatedRoute, Route, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiQuotas, ApiQuotasBooleanQuota, ApiQuotasNumberQuota } from '~/issuer/models/issuer-api.model';
import { Issuer } from '~/issuer/models/issuer.model';
import { IssuerManager } from '~/issuer/services/issuer-manager.service';

type QuotaName =
	| 'BADGE_CREATE'
	| 'BADGE_AWARD'
	| 'LEARNINGPATH_CREATE'
	| 'ACCOUNTS_ADMIN'
	| 'ACCOUNTS_MEMBER'
	| 'AISKILLS_REQUESTS'
	| 'PDFEDITOR';

@Component({
	selector: 'quota-information',
	templateUrl: './quota-information.component.html',
	imports: [RouterLink, TranslatePipe],
})
export class QuotaInformationComponent {
	protected issuerManager = inject(IssuerManager);
	protected route = inject(ActivatedRoute);
	issuerSlug: string;
	issuer: Issuer;

	issuerLoaded: Promise<unknown>;

	quotas = input.required<QuotaName | QuotaName[]>();
	quotaKeys: string[];
	quotaValues: (ApiQuotasNumberQuota | ApiQuotasBooleanQuota)[];

	constructor() {
		this.issuerSlug = this.route.snapshot.params['issuerSlug'];
		this.issuerLoaded = this.issuerManager.issuerBySlug(this.issuerSlug).then((issuer) => {
			issuer.changed$.subscribe((issuer) => {
				this.issuer = issuer;
				const quotas = this.quotas();
				if (Array.isArray(quotas)) {
					this.quotaKeys = quotas;
					this.quotaValues = quotas.map((q) => {
						return issuer.quotas.quotas[q];
					});
				} else {
					this.quotaKeys = [quotas];
					this.quotaValues = [issuer.quotas.quotas[quotas]];
				}
			});
		});
	}

	quotaWarning(quota: ApiQuotasNumberQuota | ApiQuotasBooleanQuota) {
		if ('used' in quota) {
			return quota['used'] / quota['max'] >= 0.8;
		}
	}
}
