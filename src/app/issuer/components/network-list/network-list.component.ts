import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { IssuerManager } from '~/issuer/services/issuer-manager.service';
import { QuotaManager } from '~/issuer/services/quota-manager.service';
import { QuotaExceededDialog } from '../issuer-quotas-quota-exceeded-dialog/issuer-quotas-quota-exceeded-dialog.component';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { NavigationType, OebIssuerNetworkCard } from '../issuer-network-card/issuer-network-card.component';

@Component({
	selector: 'network-list',
	templateUrl: './network-list.component.html',
	imports: [OebButtonComponent, RouterLink, FormsModule, TranslatePipe, OebIssuerNetworkCard],
})
export class NetworkListComponent {
	readonly router = inject(Router);
	protected issuerManager = inject(IssuerManager);
	protected quotaManager = inject(QuotaManager);
	protected translate = inject(TranslateService);
	private readonly _hlmDialogService = inject(HlmDialogService);
	networks = input.required<any[]>();

	loading = signal(true);

	canList = signal(false);
	canCreate = signal(false);
	issuerOwnerOrEditor = signal(false);

	constructor() {
		Promise.all([
			new Promise<void>((r) => {
				this.issuerManager.myIssuers$.subscribe((issuers) => {
					r();
					if (issuers.length > 0) {
						this.canList.set(true);
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
				this.quotaManager.loaded$.subscribe((enabled) => {
					if (this.quotaManager.quotasEnabled && this.quotaManager.quotasList.length) {
						this.issuerManager.myIssuers$.subscribe((issuers) => {
							r();
							const quotaIssuers = issuers.filter((i) => !!i.quotas);
							if (quotaIssuers.length === 0) {
								this.canCreate.set(true);
							} else {
								quotaIssuers.forEach((i) => {
									if (i.quotas.quotas.NETWORK_CREATE.quota) {
										this.canCreate.set(true);
									}
								});
							}
						});
					} else {
						r();
						this.canCreate.set(true);
					}
				});
			}),
		]).then(() => {
			this.loading.set(false);
		});
	}
	async showUpgradeDialog() {
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

	handleNavigate(event: NavigationType, network: any) {
		if (event === 'heading') {
			this.router.navigate(['/issuer/networks', network.slug]);
		}
	}
}
