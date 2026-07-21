import {
	OnInit,
	AfterViewInit,
	Component,
	input,
	OnDestroy,
	output,
	TemplateRef,
	ViewChild,
	inject,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { InfoDialogComponent } from '../../../common/dialogs/oeb-dialogs/info-dialog.component';
import { NgModel, FormsModule, FormControl } from '@angular/forms';
import { Issuer } from '../../../issuer/models/issuer.model';
import { PublicApiService } from '../../../public/services/public-api.service';
import { MessageService } from '../../../common/services/message.service';
import { BadgrApiFailure } from '../../../common/services/api-failure';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { FormFieldSelectOption, OebSelectComponent } from '../../../components/select.component';
import { NetworkApiService } from '../../../issuer/services/network-api.service';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Network } from '~/issuer/network.model';
import { BadgeClassApiService } from '~/issuer/services/badgeclass-api.service';
import { BadgeClass } from '~/issuer/models/badgeclass.model';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { PublicApiIssuer } from '~/public/models/public-api.model';
import { BadgeClassManager } from '~/issuer/services/badgeclass-manager.service';

@Component({
	selector: 'select-network',
	templateUrl: './select-network.component.html',
	imports: [TranslatePipe, OebButtonComponent, FormsModule, OebSelectComponent],
})
export class SelectNetworkComponent implements OnInit {
	private publicApiService = inject(PublicApiService);
	private messageService = inject(MessageService);
	private networkApiService = inject(NetworkApiService);
	private badgeClassApiService = inject(BadgeClassApiService);
	private badgeClassManager = inject(BadgeClassManager);
	private router = inject(Router);
	private translate = inject(TranslateService);
	private readonly _hlmDialogService = inject(HlmDialogService);

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}

	issuer = input.required<Issuer | Network>();
	badge = input.required<BadgeClass>();

	closeSelect = output();

	networkSelected = output();

	@ViewChild('inviteSuccessContent')
	inviteSuccessContent: TemplateRef<void>;

	@ViewChild('networkSearchInputModel') networkSearchInputModel: NgModel;

	dialogRef: BrnDialogRef<any> = null;

	networkSearchQuery = '';
	selectedNetwork: PublicApiIssuer = null;

	networksShowResults = false;
	networksLoading = false;
	networkSearchLoaded = false;
	networkSearchResults = [];

	issuerNetworks: PublicApiIssuer[];

	rightsAndRolesExpanded = false;

	networkControl = new FormControl();

	networkOptions: FormFieldSelectOption[];

	ngOnInit() {
		this.publicApiService.getIssuerNetworks(this.issuer().slug).then((networks) => {
			this.issuerNetworks = networks;
			this.networkOptions = networks.map((n) => ({
				label: n.name,
				value: n.name,
			}));
		});

		this.networkControl.valueChanges.subscribe((value: string) => {
			const selected = this.issuerNetworks.find((n) => n.name == value);
			this.selectedNetwork = selected;
		});
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

	shareBadge() {
		// A badge that still carries an institution PDF template loses it on share
		// (it becomes a partner badge). Warn the user before proceeding.
		if (this.badge().pdfTemplate) {
			const dialogRef = this._hlmDialogService.open(InfoDialogComponent, {
				context: {
					variant: 'info',
					caption: this.translate.instant('PDFTemplate.shareInstitutionTemplateTitle'),
					subtitle: this.translate.instant('PDFTemplate.shareInstitutionTemplateText'),
					text: this.translate.instant('PDFTemplate.shareInstitutionTemplateNote'),
					cancelText: this.translate.instant('General.cancel'),
					forwardText: this.translate.instant('PDFTemplate.shareInstitutionTemplateConfirm'),
				},
			});
			dialogRef.closed$.subscribe((result) => {
				if (result === 'continue') this.performShare();
			});
		} else {
			this.performShare();
		}
	}

	private performShare() {
		try {
			this.badgeClassApiService.shareOnNetwork(this.selectedNetwork.slug, this.badge().slug).then((s) => {
				this.badgeClassManager.badgesList.updateList();
				this.closeSelect.emit();
				this.router.navigate(['/issuer/networks/', this.selectedNetwork.slug], {
					queryParams: { tab: 'badges', innerTab: 'partner' },
				});
			});
		} catch (e) {
			this.messageService.reportAndThrowError(BadgrApiFailure.from(e).firstMessage, e);
		}
	}
}
