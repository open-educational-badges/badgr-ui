import {
	AfterViewInit,
	Component,
	computed,
	ElementRef,
	inject,
	input,
	Renderer2,
	signal
} from '@angular/core';
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
import { HlmDialogModule } from '@spartan-ng/helm/dialog';
import { HlmH2, HlmP } from '@spartan-ng/helm/typography';

export interface QuotaExceededDialogContext {
	issuer: Issuer | Network;
}

export type QuotaExceededDialogPageType = 'start' | 'upgrade' | 'individual';

export const quotaPackages = [
	{
		slug: 'pro',
		label: 'PRO',
	},
	{
		slug: 'enterprise',
		label: 'ENTERPRISE',
	},
	{
		slug: 'network',
		label: 'NETWORK',
	}
];

@Component({
	selector: 'quota-exceeded-dialog',
	templateUrl: 'issuer-quotas-quota-exceeded-dialog.component.html',
	styleUrl: 'issuer-quotas-quota-exceeded-dialog.component.scss',
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
	],
})

// TODO component for displaying quotas exceeded notice
export class QuotaExceededDialog extends BaseDialog implements AfterViewInit {
	protected translate = inject(TranslateService);
	issuer = signal<Issuer|Network>(undefined);
	nextLevel = computed(() => {
		return this.issuer()?.quotas?.nextLevel?.level;
	});
	nextPrice = computed(() => {
		return this.issuer()?.quotas?.nextLevel?.price;
	});
	nextQuotas = computed(() => {
		return this.issuer()?.quotas?.nextLevel?.quotas;
	});

	private readonly _dialogContext = injectBrnDialogContext<QuotaExceededDialogContext>();
	private readonly dialogRef = inject<BrnDialogRef>(BrnDialogRef);
	protected readonly context = this._dialogContext;

	ngAfterViewInit(): void {
		if (this.context.issuer) {
			this.issuer.set(this.context.issuer);

			this.issuerOptions = [{
				label: this.issuer().name,
				value: this.issuer().slug
			}];

			this.upgradeRequestForm.controls.name.setValue(this.issuer().currentUserStaffMember.nameLabel);
			this.upgradeRequestForm.controls.email.setValue(this.issuer().currentUserStaffMember.email);
			this.upgradeRequestForm.controls.issuer.setValue(this.issuer().slug);
		}
	}

	page: QuotaExceededDialogPageType = 'start';

	upgradeRequestForm = typedFormGroup()
		.addControl('name', '', [Validators.required, Validators.maxLength(254)])
		.addControl('email', '', [Validators.required, Validators.maxLength(254)])
		.addControl('issuer', '', [Validators.required])
		.addControl('package', 'pro', [Validators.required]);

	individualRequestForm = typedFormGroup()
		.addControl('name', '', [Validators.required, Validators.maxLength(254)])
		.addControl('email', '', [Validators.required, Validators.maxLength(254)])
		.addControl('issuer', '', [Validators.required])
		.addControl('message', '', [Validators.required]);

	issuerOptions: FormFieldSelectOption[];

	packageOptions: FormFieldSelectOption[] = quotaPackages.map((p) => ({
		value: p.slug,
		label: this.translate.instant('Quotas.packageFormOptions' + p.label),
	}));

	constructor() {
		const componentElem = inject(ElementRef);
		const renderer = inject(Renderer2);
		super(componentElem, renderer);
	}

	openDialog() {
		this.showModal();
	}

	closeDialog() {
		this.changePage('start');
		this.closeModal();
	}

	changePage(page: QuotaExceededDialogPageType) {
		this.page = page;
	}

	onSubmitPackage() {
		if (!this.upgradeRequestForm.markTreeDirtyAndValidate()) {
			return;
		}
	}

	onSubmitIndividual() {
		if (!this.upgradeRequestForm.markTreeDirtyAndValidate()) {
			return;
		}
	}
}
