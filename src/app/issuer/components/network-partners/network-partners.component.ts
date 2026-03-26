import { Component, effect, inject, input, output, signal, TemplateRef, ViewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { DialogComponent } from '../../../components/dialog.component';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { NetworkPartnersDatatableComponent } from '../../../components/datatable-network-partners.component';
import { NetworkInvitesDatatableComponent } from '../../../components/datatable-network-invites.component';
import { Issuer } from '../../../issuer/models/issuer.model';
import { NetworkApiService } from '../../../issuer/services/network-api.service';
import { ApiNetworkInvitation } from '../../../issuer/models/network-invite-api.model';
import { NgModel } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PublicApiService } from '../../../public/services/public-api.service';
import { MessageService } from '../../../common/services/message.service';
import { Network } from '~/issuer/network.model';
import { Router } from '@angular/router';
import { QuotaInformationComponent } from '../quota-information/quota-information.component';

@Component({
	selector: 'network-partners',
	templateUrl: './network-partners.component.html',
	imports: [
		TranslatePipe,
		OebButtonComponent,
		NetworkPartnersDatatableComponent,
		NetworkInvitesDatatableComponent,
		QuotaInformationComponent,
	],
})
export class NetworkPartnersComponent {
	private networkApiService = inject(NetworkApiService);
	private publicApiService = inject(PublicApiService);
	private messageService = inject(MessageService);
	private router = inject(Router);

	issuers = input.required<Issuer[]>();
	network = input.required<Network>();
	addInstitutionsTemplate = input.required<TemplateRef<void>>();

	pendingInvites = signal<ApiNetworkInvitation[]>([]);
	approvedInvites = signal<ApiNetworkInvitation[]>([]);

	networkInvites = input<ApiNetworkInvitation[]>([]);

	removePartnerRequest = output<Issuer>();

	issuerSearchQuery = '';
	selectedIssuers: Issuer[] = [];

	issuersShowResults = false;
	issuersLoading = false;
	issuerSearchLoaded = false;
	issuerSearchResults = [];

	@ViewChild('headerTemplate')
	headerTemplate: TemplateRef<void>;

	@ViewChild('issuerSearchInputPartnerModel') issuerSearchInputPartnerModel: NgModel;

	constructor() {
		effect(() => {
			const invites = this.networkInvites();
			this.approvedInvites.set(invites.filter((i) => i.acceptedOn));
			this.pendingInvites.set(invites.filter((i) => i.status.toLowerCase() === 'pending'));
		});
	}

	dialogRefPartner: BrnDialogRef = null;

	private readonly _hlmDialogService = inject(HlmDialogService);

	public openDialog() {
		const dialogRef = this._hlmDialogService.open(DialogComponent, {
			context: {
				headerTemplate: this.headerTemplate,
				content: this.addInstitutionsTemplate(),
				variant: 'default',
				footer: false,
			},
		});
		this.dialogRefPartner = dialogRef;

		dialogRef.closed$.subscribe((result) => {
			if (result === 'continue') dialogRef.close();
		});

		setTimeout(() => {
			if (this.issuerSearchInputPartnerModel) {
				this.issuerSearchInputPartnerModel.valueChanges
					.pipe(debounceTime(500), distinctUntilChanged())
					.subscribe(() => {
						this.issuerSearchChange();
					});
			}
		});
	}

	async issuerSearchChange() {
		if (this.issuerSearchQuery.length >= 3) {
			this.issuersLoading = true;
			try {
				this.issuerSearchResults = [];
				this.issuerSearchResults = await this.publicApiService.searchIssuers(this.issuerSearchQuery);
			} catch (error) {
				this.messageService.reportAndThrowError(`Failed to issuers: ${error.message}`, error);
			}
			this.issuersLoading = false;
			this.issuerSearchLoaded = true;
		}
	}

	async onInviteRevoked(invite: ApiNetworkInvitation) {
		try {
			const res = await this.networkApiService.revokeInvitation(invite.entity_id);

			if (res.ok) {
				this.pendingInvites.update((current) =>
					current.filter((invitation) => invitation.entity_id !== invite.entity_id),
				);
				// update network to refresh quotas
				if (this.network().quotas) {
					this.network().update();
				}
			}
		} catch (error) {
			console.error('Failed to revoke invitation:', error);
		}
	}

	async onPartnerRemoved(issuer: Issuer) {
		this.removePartnerRequest.emit(issuer);
	}

	redirectToIssuerDetail(issuer: Issuer) {
		if (issuer.currentUserStaffMember) {
			this.router.navigate(['/issuer/issuers/', issuer.slug]);
		} else {
			this.router.navigate(['/public/issuers/', issuer.slug]);
		}
	}
}
