import { AfterViewInit, Component, computed, ElementRef, inject, Renderer2, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
import { QuotaRequestApiService } from '../../services/quotarequest-api.service';
import { TitleCasePipe } from '@angular/common';
import { IssuerManager } from '~/issuer/services/issuer-manager.service';
import { QuotaManager } from '~/issuer/services/quota-manager.service';

@Component({
	selector: 'quota-release-dialog',
	templateUrl: 'issuer-quotas-quota-release-dialog.component.html',
	styles: `
		ul {
			padding-left: 24px;
		}
		ul li {
			list-style-type: disc;
		}
	`,
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
	],
})
export class QuotaReleaseDialog extends BaseDialog {
	protected translate = inject(TranslateService);
	protected router = inject(Router);
	protected quotaRequestApiService = inject(QuotaRequestApiService);
	protected issuerManager = inject(IssuerManager);
	protected quotaManager = inject(QuotaManager);

	private readonly dialogRef = inject<BrnDialogRef>(BrnDialogRef);

	issuer = signal<Issuer | null>(null);
	email = signal('');

	constructor() {
		super();
		this.issuerManager.myIssuers$.subscribe((issuers) => {
			if (issuers.length > 0) {
				this.issuer.set(issuers[0]);
			}
		});
		this.quotaManager.loaded$.subscribe((response) => {
			this.email.set(response.email);
		});
	}

	closeDialog() {
		this.dialogRef.close();
	}
	showPackages() {
		// this.closeDialog();
		const paths = {
			de: '/page/produkte',
			en: '/page/pricing',
		};
		// this.router.navigate([paths[this.translate.currentLang]]);
		window.open(paths[this.translate.currentLang]);
	}
}
