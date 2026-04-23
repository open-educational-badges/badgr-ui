import { NgIcon } from '@ng-icons/core';
import {
	Component,
	EventEmitter,
	Input,
	Output,
	SimpleChanges,
	inject,
	OnChanges,
	input,
	TemplateRef,
	model,
} from '@angular/core';
import { BrnAccordionContent } from '@spartan-ng/brain/accordion';
import { HlmAccordionModule } from '../../../components/spartan/ui-accordion-helm/src';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { NgClass } from '@angular/common';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { OebDropdownComponent } from '../../../components/oeb-dropdown.component';
import { BadgeRequestApiService } from '../../services/badgerequest-api.service';
import { QrCodeDatatableComponent } from '../../../components/datatable-qrcodes.component';
import type { MenuItem } from '../../../../app/common/components/badge-detail/badge-detail.component.types';
import { HlmDialogService } from '../../../../app/components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { DangerDialogComponent } from '../../../../app/common/dialogs/oeb-dialogs/danger-dialog.component';
import { QrCodeApiService } from '../../services/qrcode-api.service';
import { TranslateService } from '@ngx-translate/core';
import { InfoDialogComponent } from '../../../common/dialogs/oeb-dialogs/info-dialog.component';
import { BadgeClass } from '../../models/badgeclass.model';
import { Router } from '@angular/router';
import { Issuer } from '../../models/issuer.model';
import { SvgIconComponent } from '~/common/components/svg-icon.component';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmH3 } from '@spartan-ng/helm/typography';
import { Network } from '~/issuer/network.model';
import { ApiQRCode } from '~/issuer/models/qrcode-api.model';
import { DialogComponent } from '~/components/dialog.component';

@Component({
	selector: 'qrcode-awards',
	templateUrl: './qrcode-awards.component.html',
	providers: [BadgeRequestApiService, HlmDialogService, QrCodeApiService, TranslateService],
	imports: [
		HlmAccordionModule,
		NgIcon,
		HlmIcon,
		TranslateModule,
		BrnAccordionContent,
		RouterModule,
		NgClass,
		OebButtonComponent,
		OebDropdownComponent,
		QrCodeDatatableComponent,
		HlmH3,
		SvgIconComponent,
	],
})
export class QrCodeAwardsComponent implements OnChanges {
	private badgeRequestApiService = inject(BadgeRequestApiService);
	private qrCodeApiService = inject(QrCodeApiService);
	private router = inject(Router);
	private translate = inject(TranslateService);

	networkUserIssuers = input<Issuer[]>();
	networkIssuerSelection = input<TemplateRef<any>>();
	networkIssuerSelectionHeader = input<TemplateRef<any>>();
	selectedNetworkIssuer = model<Issuer | null>();

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}

	getSvgFillColor(int: number) {
		if (int === 0) {
			return 'white';
		} else {
			return 'oebblack';
		}
	}

	@Input() awards: ApiQRCode[];
	@Input() routerLinkText: string[];
	@Input() issuer: Issuer | Network;
	@Input() badgeClass: BadgeClass;
	@Input() defaultUnfolded: boolean | undefined = false;
	@Input() interactive = true;
	@Output() qrBadgeAward = new EventEmitter<number>();

	qrCodeMenus: Array<MenuItem[]> = [];

	ngOnChanges(changes: SimpleChanges) {
		if (changes.awards || changes.issuer || changes.badgeClass) {
			this.setupQrCodeMenus();
		}
	}

	private setupQrCodeMenus() {
		if (!this.issuer || !this.awards || !this.badgeClass || !this.interactive) {
			return;
		}

		this.qrCodeMenus = [];
		this.awards.forEach((award) => {
			this.qrCodeMenus.push([
				{
					title: 'QrCode.showQrCode',
					routerLink: [
						'/issuer/issuers',
						this.issuer.slug,
						'badges',
						this.badgeClass.slug,
						'qr',
						award.slug,
						'generate',
					],
					icon: 'lucideQrCode',
				},
				{
					title: 'General.edit',
					routerLink: [
						'/issuer/issuers/',
						this.issuer.slug,
						'badges',
						this.badgeClass.slug,
						'qr',
						award.slug,
						'edit',
					],
					icon: 'lucidePencil',
				},
				{
					title: 'General.delete',
					action: () => this.openDangerDialog(award.slug),
					icon: 'lucideTrash2',
				},
			]);
		});
	}

	private readonly _hlmDialogService = inject(HlmDialogService);

	public openDangerDialog(qrSlug: string) {
		const dialogRef = this._hlmDialogService.open(DangerDialogComponent, {
			context: {
				caption: this.translate.instant('QrCode.deleteQrAward'),
				text: this.translate.instant('QrCode.deleteQrAwardConfirm'),
				delete: () => this.deleteQrCode(qrSlug),
				qrCodeRequested: this.awards.find((award) => award.slug == qrSlug).request_count > 0,
				variant: 'danger',
			},
		});
	}

	routeToQrAward(badge: BadgeClass, issuer) {
		if (badge.recipientCount === 0 && issuer instanceof Issuer) {
			const dialogRef = this._hlmDialogService.open(InfoDialogComponent, {
				context: {
					variant: 'info',
					caption: this.translate.instant('Badge.endOfEditDialogTitle'),
					subtitle: this.translate.instant('Badge.endOfEditDialogTextQR'),
					text: this.translate.instant('Badge.endOfEditDialogSubText'),
					cancelText: this.translate.instant('General.previous'),
					forwardText: this.translate.instant('Issuer.giveQr'),
				},
			});
			dialogRef.closed$.subscribe((result) => {
				if (result === 'continue')
					this.router.navigate(['/issuer/issuers/', issuer.slug, 'badges', badge.slug, 'qr']);
			});
		} else if (issuer.is_network) {
			if (!this.networkUserIssuers().length) {
				const dialogRef = this._hlmDialogService.open(DialogComponent, {
					context: {
						variant: 'failure',
						text: this.translate.instant('Network.addInstitutionToIssue'),
					},
				});
			} else {
				const dialogRef = this._hlmDialogService.open(DialogComponent, {
					context: {
						variant: 'default',
						headerTemplate: this.networkIssuerSelectionHeader(),
						content: this.networkIssuerSelection(),
						templateContext: {
							closeDialog: (result?: string) => dialogRef.close(result),
						},
					},
				});

				dialogRef.closed$.subscribe((result) => {
					if (result === 'continue' && this.selectedNetworkIssuer()) {
						this.router.navigate([
							'/issuer/issuers/',
							this.selectedNetworkIssuer().slug,
							'badges',
							badge.slug,
							'qr',
						]);
					}
				});
			}
		} else {
			this.router.navigate(['/issuer/issuers/', issuer.slug, 'badges', badge.slug, 'qr']);
		}
	}

	deleteQRAward(data) {
		let index = this.awards.findIndex((award) => award.slug == data.slug);
		this.awards[index].request_count -= 1;
	}

	deleteQrCode(qrSlug: string) {
		this.qrCodeApiService.deleteQrCode(this.issuer.slug, this.badgeClass.slug, qrSlug).then(() => {
			this.awards = this.awards.filter((value) => value.slug != qrSlug);
		});
	}

	onQrBadgeAward(count: number) {
		this.qrBadgeAward.emit(count);
	}

	onRequestCountChanged(award: any, newCount: number) {
		this.awards = this.awards.map((a) => (a.slug === award.slug ? { ...a, request_count: newCount } : a));
	}
}
