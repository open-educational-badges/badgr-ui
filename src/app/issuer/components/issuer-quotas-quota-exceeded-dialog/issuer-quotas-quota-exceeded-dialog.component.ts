import { AfterViewInit, Component, computed, ElementRef, inject, Renderer2, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BaseDialog } from '~/common/dialogs/base-dialog';
import { OebButtonComponent } from '~/components/oeb-button.component';
import { Issuer } from '~/issuer/models/issuer.model';
import { Network } from '~/issuer/network.model';
import { Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { typedFormGroup } from '../../../common/util/typed-forms';
import { OebInputComponent } from '../../../components/input.component';
import { OebSelectComponent } from '../../../components/select.component';
import { FormFieldRadio } from '../../../common/components/formfield-radio';
import { FormFieldSelectOption } from '../../../common/components/formfield-select';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmDialogModule, HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmH2, HlmP } from '@spartan-ng/helm/typography';
import { QuotaRequestApiService } from '../../services/quotarequest-api.service';
import { CurrencyPipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { QuotaManager } from '~/issuer/services/quota-manager.service';
import { ApiQuota } from '~/issuer/models/quotas.model';
import { IssuerManager } from '~/issuer/services/issuer-manager.service';
import { ErrorDialogComponent } from '~/common/dialogs/oeb-dialogs/error-dialog.component';

export interface QuotaExceededDialogContext {
	issuer: Issuer | Network;
	quota: 'pro' | 'enterprise' | 'network';
	page: QuotaExceededDialogPageType;
}

export type QuotaExceededDialogPageType = 'start' | 'upgrade' | 'network' | 'success';

export const quotaPackages = [
	{
		value: 'PRO',
		label: 'PRO',
	},
	{
		value: 'ENTERPRISE',
		label: 'ENTERPRISE',
	},
	{
		value: 'NETWORK',
		label: 'NETWORK',
	},
];

@Component({
	selector: 'quota-exceeded-dialog',
	templateUrl: 'issuer-quotas-quota-exceeded-dialog.component.html',
	styleUrls: [
		'issuer-quotas-quota-exceeded-dialog.component.scss',
		'../../../common/dialogs/oeb-dialogs/success-dialog.component.scss',
	],
	imports: [
		OebButtonComponent,
		TranslatePipe,
		RouterLink,
		NgIcon,
		FormsModule,
		ReactiveFormsModule,
		OebInputComponent,
		OebSelectComponent,
		FormFieldRadio,
		HlmDialogModule,
		HlmH2,
		HlmP,
		TitleCasePipe,
		DecimalPipe,
	],
})
export class QuotaExceededDialog extends BaseDialog implements AfterViewInit {
	protected quotaManager = inject(QuotaManager);
	protected issuerManager = inject(IssuerManager);
	protected translate = inject(TranslateService);
	protected quotaRequestApiService = inject(QuotaRequestApiService);

	quotas = signal<ApiQuota[]>([]);

	issuer = signal<Issuer | Network>(undefined);

	quota = computed(() => {
		const nextKey = this.context.quota || this.issuer()?.quotas?.nextLevel;
		return this.quotas().find((q) => q.key == nextKey);
	});

	network = computed(() => {
		if (this.issuer() && !this.issuer().is_network) {
			return (this.issuer() as Issuer).networks[0] || null;
		}
		return null;
	});

	private readonly _dialogContext = injectBrnDialogContext<QuotaExceededDialogContext>();
	private readonly dialogRef = inject<BrnDialogRef>(BrnDialogRef);
	protected readonly context = this._dialogContext;
	private readonly _hlmDialogService = inject(HlmDialogService);

	page = signal<QuotaExceededDialogPageType>('start');
	loading = signal(false);

	upgradeRequestForm = typedFormGroup()
		.addControl('name', '', [Validators.required, Validators.maxLength(254)])
		.addControl('email', '', [Validators.required, Validators.maxLength(254)])
		.addControl('issuer', '', [Validators.required])
		.addControl('package', '', [Validators.required]);

	issuerOptions: FormFieldSelectOption[];

	packageOptions: FormFieldSelectOption[] = quotaPackages.map((qp) => ({
		value: qp.value,
		label: this.translate.instant('Quotas.packageFormOptions' + qp.value),
	}));

	isWebcomponentContext = !!(window as any).OEBWebComponentSettings;

	constructor() {
		const componentElem = inject(ElementRef);
		const renderer = inject(Renderer2);
		super(componentElem, renderer);
		this.quotaManager.quotas$.subscribe((quotas) => {
			this.quotas.set(quotas);
		});
	}

	ngAfterViewInit(): void {
		if (this.context.issuer) {
			this.issuer.set(this.context.issuer);

			this.upgradeRequestForm.rawControlMap.package.setValue(this.issuer().quotas.nextLevel);
			// this.upgradeRequestForm.rawControlMap.package.setValue('pro');

			this.issuerOptions = [
				{
					label: this.issuer().name,
					value: this.issuer().slug,
				},
			];

			this.upgradeRequestForm.controls.name.setValue(this.issuer().currentUserStaffMember.nameLabel);
			this.upgradeRequestForm.controls.email.setValue(this.issuer().currentUserStaffMember.email);
			this.upgradeRequestForm.controls.issuer.setValue(this.issuer().slug);
		}
		if (this.context.page) {
			this.page.set(this.context.page);
			if (this.context.page === 'network') {
				this.upgradeRequestForm.rawControlMap.package.setValue('network');
			}
			this.issuerManager.myIssuers$.subscribe((issuers) => {
				this.issuerOptions = issuers
					.filter((issuer) => issuer.currentUserStaffMember.isOwner || issuer.currentUserStaffMember.isEditor)
					.sort((a, b) => a.name.localeCompare(b.name))
					.map((issuer) => ({
						label: issuer.name,
						value: issuer.slug,
					}));
			});
		}
	}

	closeDialog() {
		this.dialogRef.close();
		setTimeout(() => {
			this.changePage('start');
		}, 500);
	}

	emailOEB() {
		this.quotaManager.loaded$.subscribe((response) => {
			window.open(`mailto:${response.email}`);
		});
	}

	changePage(page: QuotaExceededDialogPageType) {
		this.page.set(page);
	}

	async onSubmitPackage() {
		if (!this.upgradeRequestForm.markTreeDirtyAndValidate()) {
			return;
		}

		this.loading.set(true);

		const formState = this.upgradeRequestForm.value;

		try {
			await this.quotaRequestApiService.createUpgradeQuotaRequest(formState.issuer, {
				name: formState.name,
				email: formState.email,
				issuer_id: formState.issuer,
				quota: formState.package,
			});
			this.changePage('success');
		} catch (e) {
			this._hlmDialogService.open(ErrorDialogComponent, {
				context: {
					error: e,
				},
			});
		}
		this.loading.set(false);
	}
	formatNumber(value: number) {
		const nf = Intl.NumberFormat(this.translate.currentLang == 'de' ? 'de-DE' : 'en-US');
		return nf.format(value);
	}
}
