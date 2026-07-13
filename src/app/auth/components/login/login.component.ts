import { AfterViewInit, Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmailValidator } from '../../../common/validators/email.validator';
import { UserCredential } from '../../../common/model/user-credential.type';
import { SessionService, TwoFactorRequiredError } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { BaseRoutableComponent } from '../../../common/pages/base-routable.component';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { FormFieldText } from '../../../common/components/formfield-text';
import { QueryParametersService } from '../../../common/services/query-parameters.service';
import { OAuthManager } from '../../../common/services/oauth-manager.service';
import { UserProfileManager } from '../../../common/services/user-profile-manager.service';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { AppConfigService } from '../../../common/app-config.service';
import { typedFormGroup } from '../../../common/util/typed-forms';
import { BadgrApiFailure } from '../../../common/services/api-failure';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { UserProfileApiService } from '../../../common/services/user-profile-api.service';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { MfaReminderDialogComponent } from '../../../common/dialogs/oeb-dialogs/mfa-reminder-dialog.component';
import { OebInputComponent } from '../../../components/input.component';
import { OebCheckboxComponent } from '../../../components/oeb-checkbox.component';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { HlmP } from '@spartan-ng/helm/typography';
import { OebHeaderText } from '~/components/oeb-header-text.component';

interface RedirectResponse {
	success: boolean;
	redirectPath: string;
}

type RedirectHttpResponse = HttpResponse<RedirectResponse>;

@Component({
	selector: 'login',
	templateUrl: './login.component.html',
	styleUrls: ['./login.component.scss'],
	imports: [
		HlmP,
		RouterLink,
		FormsModule,
		ReactiveFormsModule,
		OebInputComponent,
		OebCheckboxComponent,
		OebButtonComponent,
		FormMessageComponent,
		TranslatePipe,
		OebHeaderText,
	],
})
export class LoginComponent extends BaseRoutableComponent implements OnInit, AfterViewInit {
	private destroyRef = inject(DestroyRef);
	private title = inject(Title);
	sessionService = inject(SessionService);
	private messageService = inject(MessageService);
	private configService = inject(AppConfigService);
	private queryParams = inject(QueryParametersService);
	oAuthManager = inject(OAuthManager);
	private profileManager = inject(UserProfileManager);
	private userProfileApiService = inject(UserProfileApiService);
	private dialogService = inject(HlmDialogService);
	private sanitizer = inject(DomSanitizer);
	private http = inject(HttpClient);
	private translate = inject(TranslateService);

	get theme() {
		return this.configService.theme;
	}
	get features() {
		return this.configService.featuresConfig;
	}
	loginForm = typedFormGroup()
		.addControl('username', '', [Validators.required, EmailValidator.validEmail])
		.addControl('password', '', Validators.required)
		.addControl('rememberMe', false);

	verifiedName: string;
	verifiedEmail: string;

	showTwoFactor = false;
	partialToken = '';
	twoFactorForm = typedFormGroup().addControl('code', '', [Validators.required, Validators.minLength(6)]);
	useBackupCode = false;

	toggleBackupCode() {
		this.useBackupCode = !this.useBackupCode;
		const control = this.twoFactorForm.rawControlMap.code;
		control.setValue('');
		control.setValidators([Validators.required, Validators.minLength(this.useBackupCode ? 8 : 6)]);
		control.updateValueAndValidity();
	}

	@ViewChild('passwordField')
	passwordField: FormFieldText;

	initFinished: Promise<unknown> = new Promise(() => {});
	loginFinished: Promise<unknown>;
	baseUrl: string;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route);
		const title = this.title;

		title.setTitle(`Login - ${this.configService.theme['serviceName'] || 'Badgr'}`);
		this.handleQueryParamCases();
		this.baseUrl = this.configService.apiConfig.baseUrl;
	}

	sanitize(url: string) {
		return this.sanitizer.bypassSecurityTrustUrl(url);
	}

	ngOnInit() {
		this.initVerifiedData();

		if (this.verifiedEmail) {
			this.loginForm.controls.username.setValue(this.verifiedEmail);
		}
	}

	ngAfterViewInit(): void {
		if (this.verifiedEmail) {
			setTimeout(() => this.passwordField.focus());
		}
	}

	private navigateAfterLogin() {
		if (this.oAuthManager.isAuthorizationInProgress) {
			this.router.navigate(['/auth/oauth2/authorize']);
		} else {
			this.userProfileApiService
				.getRedirectUrl()
				.then((response: RedirectHttpResponse) => {
					if (response.body.success && response.body.redirectPath) {
						this.router.navigateByUrl(response.body.redirectPath);
					} else {
						this.router.navigate([localStorage.signup ? 'auth/welcome' : 'issuer']);
					}
				})
				.catch(() => this.router.navigate(['/public/start']));
		}
	}

	afterLogin() {
		this.profileManager.reloadUserProfileSet().then(() => {
			this.profileManager.userProfilePromise.then((profile) => {
				if (profile) {
					// fetch user profile and emails to check if they are verified
					profile.emails.updateList().then(() => {
						if (profile.isVerified) {
							if (!profile.totpEnabled && !profile.mfaReminderDismissed) {
								const dialogRef = this.dialogService.open(MfaReminderDialogComponent, {
									closeOnBackdropClick: false,
									closeOnOutsidePointerEvents: false,
									contentClass: 'tw-max-w-[600px] tw-border-4 tw-min-h-[614px]',
									context: {
										onNeverRemind: () => {
											profile.mfaReminderDismissed = true;
											profile.save();
										},
									},
								});
								dialogRef.closed$
									.pipe(takeUntilDestroyed(this.destroyRef))
									.subscribe(() => this.navigateAfterLogin());
							} else {
								this.navigateAfterLogin();
							}
						} else {
							this.router.navigate([
								'signup/success',
								encodeURIComponent(btoa(profile.emails.entities[0].email)),
							]);
						}
					});
				}
			});
		});
	}

	validateToken() {
		this.loginFinished = this.sessionService
			.validateToken()
			.then(
				() => this.afterLogin(),
				(response: HttpErrorResponse) => {
					if (response.status == 401) {
						// Unauthorized: The user is not
						// authenticated in Django, meaning that the
						// OIDC authentication failed. The user
						// probably already knows this at this point
						this.router.navigate([], {
							queryParams: { validateToken: null },
							queryParamsHandling: 'merge',
						});
						// Don't display an error, since it might happen
						// quite easily that the user navigates to the
						// address containing ?validateToken
						console.error(
							'Token validation failed. This means',
							'that either the user accidently',
							'navigated to the address with the',
							'?validateToken query parameter, or',
							'something weird happened',
						);
					} else {
						this.messageService.reportHandledError(
							BadgrApiFailure.messageIfThrottableError(response.error) ||
								this.translate.instant('Login.failLogin'),
							response,
						);
					}
				},
			)
			.then(() => (this.loginFinished = null));
	}

	bildungsraumLogin() {
		if (this.isOidcDisabled()) return;
		const endpoint = this.sessionService.baseUrl + '/oidc/authenticate';
		window.location.href = endpoint;
	}

	submitAuth() {
		if (!this.loginForm.markTreeDirtyAndValidate()) {
			return;
		}

		const credential: UserCredential = new UserCredential(
			this.loginForm.value.username,
			this.loginForm.value.password,
		);

		this.loginFinished = this.sessionService
			.login(credential)
			.then(
				() => this.afterLogin(),
				(error: unknown) => {
					if (error instanceof TwoFactorRequiredError) {
						this.partialToken = error.partialToken;
						this.showTwoFactor = true;
					} else {
						const response = error as HttpErrorResponse;
						this.messageService.reportHandledError(
							BadgrApiFailure.messageIfThrottableError(response?.error) ||
								this.translate.instant('Login.failLogin'),
							response,
						);
					}
				},
			)
			.then(() => (this.loginFinished = null));
	}

	submitTwoFactor() {
		if (!this.twoFactorForm.markTreeDirtyAndValidate()) {
			return;
		}
		this.loginFinished = this.sessionService
			.verify2FA(this.partialToken, this.twoFactorForm.value.code)
			.then(
				() => this.afterLogin(),
				() => this.messageService.reportHandledError(this.translate.instant('Login.invalidTwoFactorCode')),
			)
			.then(() => (this.loginFinished = null));
	}

	private handleQueryParamCases() {
		this.route.queryParams.subscribe((params) => {
			if (params.hasOwnProperty('validateToken')) this.validateToken();
		});

		try {
			// Handle authcode exchange
			const authCode = this.queryParams.queryStringValue('authCode', true);

			if (authCode) {
				throw new Error('query param authentication is deprecated!');
			}
		} finally {
			this.queryParams.clearInitialQueryParams();
		}
	}

	private initVerifiedData() {
		this.verifiedName = this.queryParams.queryStringValue('name');
		this.verifiedEmail = this.queryParams.queryStringValue('email');
	}

	isOidcDisabled(): boolean {
		// Currently, OIDC is disabled in all environments
		//const prodUrl = 'https://openbadges.education';
		//return location.origin === prodUrl;
		return true;
	}
}
