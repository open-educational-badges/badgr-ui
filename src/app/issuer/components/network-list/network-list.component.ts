import { Component, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { IssuerManager } from '~/issuer/services/issuer-manager.service';
import { QuotaManager } from '~/issuer/services/quota-manager.service';
import { QuotaExceededDialog } from '../issuer-quotas-quota-exceeded-dialog/issuer-quotas-quota-exceeded-dialog.component';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { NavigationType, OebIssuerNetworkCard } from '../issuer-network-card/issuer-network-card.component';
import { Network } from '~/issuer/network.model';

export type NetworkTabScenario = 1 | 2 | 3 | 4 | 5;

export function computeNetworkTabScenario(
	hasInstitution: boolean,
	hasNetworkPlan: boolean,
	hasNetworkMembership: boolean,
): NetworkTabScenario {
	if (!hasInstitution) return 1;
	if (!hasNetworkPlan) return hasNetworkMembership ? 3 : 2;
	return hasNetworkMembership ? 5 : 4;
}

export function anyIssuerHasNetworkPlan(
	issuers: Array<{ quotas?: { quotas?: { NETWORK_CREATE?: { quota?: number } } } }>,
): boolean {
	const quotaIssuers = issuers.filter((i) => !!i.quotas);
	if (quotaIssuers.length === 0) return true;
	return quotaIssuers.some((i) => !!i.quotas?.quotas?.NETWORK_CREATE?.quota);
}

@Component({
	selector: 'network-list',
	templateUrl: './network-list.component.html',
	imports: [OebButtonComponent, RouterLink, FormsModule, TranslatePipe, OebIssuerNetworkCard, NgTemplateOutlet],
})
export class NetworkListComponent {
	readonly router = inject(Router);
	protected issuerManager = inject(IssuerManager);
	protected quotaManager = inject(QuotaManager);
	protected translate = inject(TranslateService);
	private readonly _hlmDialogService = inject(HlmDialogService);
	networks = input.required<Network[]>();

	loading = signal(true);

	hasInstitution = signal(false);
	hasNetworkPlan = signal(false);
	issuerOwnerOrEditor = signal(false);

	hasNetworkMembership = computed(() => this.networks().length > 0);

	scenario = computed(() =>
		computeNetworkTabScenario(this.hasInstitution(), this.hasNetworkPlan(), this.hasNetworkMembership()),
	);

	constructor() {
		Promise.all([
			new Promise<void>((r) => {
				this.issuerManager.myIssuers$.subscribe((issuers) => {
					r();
					if (issuers.length > 0) {
						this.hasInstitution.set(true);
						this.issuerOwnerOrEditor.set(
							issuers.filter(
								(issuer) =>
									issuer.currentUserStaffMember.isOwner || issuer.currentUserStaffMember.isEditor,
							).length > 0,
						);
					}
				});
			}),
			new Promise<void>((r) => {
				this.quotaManager.loaded$.subscribe(() => {
					if (this.quotaManager.quotasEnabled && this.quotaManager.quotasList.length) {
						this.issuerManager.myIssuers$.subscribe((issuers) => {
							r();
							this.hasNetworkPlan.set(anyIssuerHasNetworkPlan(issuers));
						});
					} else {
						r();
						this.hasNetworkPlan.set(true);
					}
				});
			}),
		]).then(() => {
			this.loading.set(false);
		});
	}

	showUpgradeDialog() {
		this.issuerManager.myIssuers$.subscribe((issuers) => {
			let ownedIssuers = issuers.filter(
				(issuer) => issuer.currentUserStaffMember.isOwner || issuer.currentUserStaffMember.isEditor,
			);
			const issuer = ownedIssuers[0] || null;
			this._hlmDialogService.open(QuotaExceededDialog, {
				context: {
					quota: 'NETWORK',
					issuer: issuer,
					page: 'network',
				},
			});
		});
	}

	handleNavigate(event: NavigationType, network: Network) {
		if (event === 'heading') {
			this.router.navigate(['/issuer/networks', network.slug]);
		}
	}
}
