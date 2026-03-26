import {
	AfterViewInit,
	ChangeDetectorRef,
	Component,
	computed,
	inject,
	input,
	Input,
	output,
	signal,
	TemplateRef,
	ViewChild,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { DialogComponent } from '../../../components/dialog.component';
import { NgIcon } from '@ng-icons/core';
import { NgModel, FormsModule } from '@angular/forms';
import { Issuer, issuerStaffRoles } from '../../../issuer/models/issuer.model';
import { PublicApiService } from '../../../public/services/public-api.service';
import { MessageService } from '../../../common/services/message.service';
import { NgStyle } from '@angular/common';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormFieldSelectOption } from '../../../components/select.component';
import { NetworkApiService } from '../../../issuer/services/network-api.service';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { MemoizedProperty } from '~/common/util/memoized-property-decorator';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { ApiNetworkInvitation } from '~/issuer/models/network-invite-api.model';

@Component({
	selector: 'add-institution',
	templateUrl: './add-institution.component.html',
	imports: [TranslatePipe, OebButtonComponent, NgIcon, HlmIcon, FormsModule, NgStyle],
})
export class AddInstitutionComponent implements AfterViewInit {
	private publicApiService = inject(PublicApiService);
	private messageService = inject(MessageService);
	private networkApiService = inject(NetworkApiService);
	public translate = inject(TranslateService);
	private cdRef = inject(ChangeDetectorRef);

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}

	network = input.required<any>();
	invites = input.required<ApiNetworkInvitation[]>();

	institutionsInvited = output();
	inviting = false;

	@ViewChild('inviteSuccessContent')
	inviteSuccessContent: TemplateRef<void>;

	@ViewChild('issuerSearchInputModel') issuerSearchInputModel: NgModel;

	private _networkStaffRoleOptions: FormFieldSelectOption[];

	dialogRef: BrnDialogRef<any> = null;

	issuerSearchQuery = '';
	selectedIssuers = signal<Issuer[]>([]);

	issuersShowResults = false;
	issuersLoading = false;
	issuerSearchLoaded = false;
	issuerSearchResults = signal<Issuer[]>([]);

	rightsAndRolesExpanded = false;

	filteredSearchResults = computed(() => {
		const selected = this.selectedIssuers();
		return this.issuerSearchResults().filter((i) => !selected.some((i2) => i.slug === i2.slug));
	});

	quotasInvitesExceeded = computed(() => {
		if (!this.network()?.quotas) {
			return 0;
		}
		return this.selectedIssuers().length - (this.network().quotas.quotas['NETWORK_MEMBERSHIPS'].quota || 0);
	});

	ngAfterViewInit() {
		this.issuerSearchInputModel.valueChanges
			.pipe(debounceTime(500))
			.pipe(distinctUntilChanged())
			.subscribe(() => {
				this.issuerSearchChange();
			});
	}

	issuerSearchInputFocusOut() {
		// delay hiding for click event
		setTimeout(() => {
			this.issuersShowResults = false;
		}, 200);
	}

	async issuerSearchChange() {
		if (this.issuerSearchQuery.length >= 3) {
			this.issuersLoading = true;
			try {
				this.issuerSearchResults.set(
					(await this.publicApiService.searchIssuers(this.issuerSearchQuery)).filter(
						(i) => !this.hasUnrevokedInvite(i.slug),
					),
				);
			} catch (error) {
				this.messageService.reportAndThrowError(`Failed to issuers: ${error.message}`, error);
			}
			this.issuersLoading = false;
			this.issuerSearchLoaded = true;
		}
	}

	calculateDropdownMaxHeight(el: HTMLElement, minHeight = 100) {
		const rect = el.getBoundingClientRect();
		let maxHeight = Math.ceil(window.innerHeight - rect.top - rect.height - 20);
		if (maxHeight < minHeight) {
			maxHeight = Math.ceil(rect.top - 20);
		}
		return maxHeight;
	}
	calculateDropdownBottom(el: HTMLElement, minHeight = 100) {
		const rect = el.getBoundingClientRect();
		const maxHeight = Math.ceil(window.innerHeight - rect.top - rect.height - 20);
		if (maxHeight < minHeight) {
			return rect.height + 2;
		}
		return null;
	}

	selectIssuerFromDropdown(issuer: Issuer) {
		this.selectedIssuers.update((v) => {
			return [...v, issuer];
		});
		// FIXME: prevents angular ExpressionChangedAfterItHasBeenCheckedError - not quite sure what happens here
		this.cdRef.detectChanges();
	}

	removeSelectedissuer(issuer: Issuer) {
		this.selectedIssuers.update((v) => {
			return v.filter((i) => i.slug !== issuer.slug);
		});
	}

	collapseRoles() {
		this.rightsAndRolesExpanded = !this.rightsAndRolesExpanded;
	}

	@MemoizedProperty()
	get issuerStaffRoleOptions() {
		return issuerStaffRoles.map((r) => ({
			label: r.label,
			value: r.slug,
			description: r.description,
		}));
	}

	inviteInstitutions(issuers: Issuer[]) {
		if (!issuers.length || this.inviting) return;
		this.inviting = true;
		this.networkApiService
			.inviteInstitutions(this.network().slug, issuers)
			.then((res) => {
				if (res) {
					this.openSuccessDialog();
					this.institutionsInvited.emit();
				}
			})
			.finally(() => {
				this.inviting = false;
				// update to refresh quotas
				if (this.network().quotas) {
					this.network().update();
				}
			});
	}

	private hasUnrevokedInvite(issuerSlug: string): boolean {
		return this.invites().some((inv) => inv.issuer?.slug === issuerSlug && !inv.revoked);
	}

	private readonly _hlmDialogService = inject(HlmDialogService);

	public openSuccessDialog() {
		const dialogRef = this._hlmDialogService.open(DialogComponent, {
			context: {
				content: this.inviteSuccessContent,
				variant: 'success',
			},
		});

		this.dialogRef = dialogRef;
	}

	closeDialog() {
		this.dialogRef.close();
	}
}
