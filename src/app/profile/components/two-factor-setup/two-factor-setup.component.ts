import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { BaseRoutableComponent } from '../../../common/pages/base-routable.component';
import { UserProfileManager } from '../../../common/services/user-profile-manager.service';
import { UserProfileApiService } from '../../../common/services/user-profile-api.service';
import { MessageService } from '../../../common/services/message.service';
import { AppConfigService } from '../../../common/app-config.service';
import { typedFormGroup } from '../../../common/util/typed-forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { OebInputComponent } from '../../../components/input.component';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { HlmH1, HlmP } from '@spartan-ng/helm/typography';

type SetupStep = 'qr' | 'confirm' | 'backup';

@Component({
	selector: 'two-factor-setup',
	templateUrl: './two-factor-setup.component.html',
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		BgBreadcrumbsComponent,
		OebInputComponent,
		OebButtonComponent,
		RouterLink,
		HlmH1,
		HlmP,
		TranslatePipe,
	],
})
export class TwoFactorSetupComponent extends BaseRoutableComponent {
	private title = inject(Title);
	private profileManager = inject(UserProfileManager);
	private profileApiService = inject(UserProfileApiService);
	private messageService = inject(MessageService);
	protected configService = inject(AppConfigService);
	private translate = inject(TranslateService);

	step: SetupStep = 'qr';
	qrCode: string | null = null;
	secret: string | null = null;
	backupCodes: string[] = [];
	copiedToClipboard = false;
	isLoading = false;

	codeForm = typedFormGroup().addControl('code', '', [Validators.required, Validators.minLength(6)]);

	get crumbs(): LinkEntry[] {
		return [
			{ title: this.translate.instant('Profile.profile'), routerLink: ['/profile'] },
			{ title: this.translate.instant('TwoFactor.setup.breadcrumb'), routerLink: ['/profile/2fa'] },
		];
	}

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const route = inject(ActivatedRoute);
		const router = inject(Router);
		super(router, route);

		this.title.setTitle(
			`${this.translate.instant('TwoFactor.setup.title')} - ${this.configService.theme['serviceName'] || 'Badgr'}`,
		);

		this.profileManager.userProfilePromise.then((profile) => {
			if (profile.totpEnabled) {
				this.router.navigate(['/profile/profile']);
				return;
			}
			this.loadQrCode();
		});
	}

	loadQrCode() {
		this.isLoading = true;
		this.profileApiService
			.setup2FA()
			.then((res) => {
				this.qrCode = res.qr_code;
				this.secret = res.secret;
				this.step = 'qr';
			})
			.catch(() => {
				this.messageService.reportHandledError(this.translate.instant('TwoFactor.setup.setupError'));
			})
			.finally(() => {
				this.isLoading = false;
			});
	}

	submitCode() {
		if (!this.codeForm.markTreeDirtyAndValidate()) {
			return;
		}
		this.isLoading = true;
		this.profileApiService
			.confirm2FA(this.codeForm.value.code)
			.then((res) => {
				this.backupCodes = res.backup_codes;
				this.step = 'backup';
				this.profileManager.userProfileSet.updateList();
			})
			.catch(() => {
				this.messageService.reportHandledError(this.translate.instant('TwoFactor.setup.invalidCode'));
			})
			.finally(() => {
				this.isLoading = false;
			});
	}

	copyBackupCodes() {
		const text = this.backupCodes.join('\n');
		navigator.clipboard.writeText(text).then(() => {
			this.copiedToClipboard = true;
			setTimeout(() => (this.copiedToClipboard = false), 2000);
		});
	}

	finish() {
		this.router.navigate(['/profile/profile']);
	}
}
