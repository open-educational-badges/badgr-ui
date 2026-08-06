import { FormBuilder, ValidationErrors, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AfterViewInit, Component, ElementRef, OnInit, Renderer2, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SignupModel } from '../../models/signup-model.type';
import { SignupService } from '../../services/signup.service';
import { SessionService } from '../../../common/services/session.service';
import { BaseRoutableComponent } from '../../../common/pages/base-routable.component';
import { MessageService } from '../../../common/services/message.service';
import { EmailValidator } from '../../../common/validators/email.validator';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { AppConfigService } from '../../../common/app-config.service';
import { OAuthManager } from '../../../common/services/oauth-manager.service';
import { HttpErrorResponse } from '@angular/common/http';
import { typedFormGroup } from '../../../common/util/typed-forms';
import { BadgrApiFailure } from '../../../common/services/api-failure';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import 'altcha';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { OAuthBannerComponent } from '../../../common/components/oauth-banner.component';
import { OebInputComponent } from '../../../components/input.component';
import { OebCheckboxComponent } from '../../../components/oeb-checkbox.component';
import { AltchaComponent } from '../../../components/altcha.component';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { PasswordComplexityValidator } from '../../../common/validators/password-complexity.validator';
import { HlmP } from '@spartan-ng/helm/typography';
import { OebHeaderText } from '~/components/oeb-header-text.component';

@Component({
	selector: 'sign-up',
	templateUrl: './signup.component.html',
	imports: [
		FormMessageComponent,
		OAuthBannerComponent,
		HlmP,
		RouterLink,
		FormsModule,
		ReactiveFormsModule,
		OebInputComponent,
		OebCheckboxComponent,
		AltchaComponent,
		OebButtonComponent,
		TranslatePipe,
		OebHeaderText,
	],
})
export class SignupComponent extends BaseRoutableComponent implements OnInit, AfterViewInit {
	private title = inject(Title);
	messageService = inject(MessageService);
	configService = inject(AppConfigService);
	sessionService = inject(SessionService);
	signupService = inject(SignupService);
	translate = inject(TranslateService);
	oAuthManager = inject(OAuthManager);
	private sanitizer = inject(DomSanitizer);
	private renderer = inject(Renderer2);
	private elementRef = inject(ElementRef);

	// Translations
	enterPassword = this.translate.instant('Signup.enterPassword');
	passwordMustBe8Char = this.translate.instant('Signup.passwordMustBe8Char');
	confirmPassword = this.translate.instant('Signup.confirmPassword');
	passwordsNotEqual = this.translate.instant('Signup.passwordsNotEqual');
	passwordInsecure = this.translate.instant('Profile.passwordInsecure');

	baseUrl: string;
	signupForm = typedFormGroup()
		.addControl('username', '', [Validators.required, EmailValidator.validEmail])
		.addControl('firstName', '', Validators.required)
		.addControl('lastName', '', Validators.required)
		.addControl('password', '', [
			Validators.required,
			Validators.minLength(8),
			PasswordComplexityValidator.securePassword,
		])
		.addControl('passwordConfirm', '', [Validators.required, this.passwordsMatch.bind(this)])
		.addControl('zipCode', '')
		.addControl('agreedTermsService', false, Validators.requiredTrue)
		.addControl('marketingOptIn', false)
		.addControl('captcha', '');

	signupFinished: Promise<unknown>;
	captchaVerified = false;

	agreedTermsService = false;

	get theme() {
		return this.configService.theme;
	}

	constructor() {
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route);
		const title = this.title;

		title.setTitle(`Signup - ${this.configService.theme['serviceName'] || 'Badgr'}`);
		this.baseUrl = this.configService.apiConfig.baseUrl;
	}

	sanitize(url: string) {
		return this.sanitizer.bypassSecurityTrustUrl(url);
	}

	ngOnInit() {
		if (this.sessionService.isLoggedIn) {
			this.router.navigate(['/issuer']);
		}
		const defaultEmail = this.route.snapshot.queryParams['email'];
		if (defaultEmail) this.signupForm.controls.username.setValue(defaultEmail);
	}

	ngAfterViewInit(): void {
		if (!document.querySelector('script[src*="sibforms.com/forms/end-form/build/main.js"]')) {
			const scriptElement = this.renderer.createElement('script');
			scriptElement.src = 'https://sibforms.com/forms/end-form/build/main.js';
			this.renderer.appendChild(this.elementRef.nativeElement, scriptElement);
		}

		const captchaElement = document.querySelector('#altcha');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		captchaElement.addEventListener('statechange', (ev: any) => {
			if (ev.detail.state === 'verified') {
				this.captchaVerified = true;
			}
		});
		const translationKeys = [
			'Captcha.error',
			'Captcha.footer',
			'Captcha.label',
			'Captcha.verified',
			'Captcha.verifying',
			'Captcha.waitAlert',
		];

		this.translate.get(translationKeys).subscribe((translations) => {
			//@ts-expect-error "captcha element is the special sibforms element"
			captchaElement.configure({
				strings: {
					error: translations['Captcha.error'],
					footer: translations['Captcha.footer'],
					label: translations['Captcha.label'],
					verified: translations['Captcha.verified'],
					verifying: translations['Captcha.verifying'],
					waitAlert: translations['Captcha.waitAlert'],
				},
			});
		});
	}

	onSubmit() {
		if (!this.signupForm.markTreeDirtyAndValidate()) {
			return;
		}

		if (!this.captchaVerified) {
			this.messageService.setMessage(this.translate.instant('Captcha.pleaseVerify'), 'error');
			return;
		}

		const formState = this.signupForm.value;

		const altcha = <HTMLInputElement>document.getElementsByName('altcha')[0];

		const signupUser = new SignupModel(
			formState.username,
			formState.firstName,
			formState.lastName,
			formState.password,
			formState.zipCode,
			formState.agreedTermsService,
			formState.marketingOptIn,
			altcha.value,
		);

		this.signupFinished = new Promise<void>((resolve, reject) => {
			const source = this.route.snapshot.params['source'] || localStorage.getItem('source') || null;
			const newsletterSubmitBtn = document.getElementById('newsletter-submit-button') as HTMLButtonElement;
			let brevoError = false;
			if (this.signupForm.valid && formState.marketingOptIn) {
				newsletterSubmitBtn.click();
				// add small delay to wait if an error message appears
				setTimeout(() => {
					const labels = document.querySelectorAll('label');
					const errorLabel = Array.from(labels).find((label) =>
						label.textContent.includes('Dieses Feld darf nicht leer sein.'),
					);
					if (errorLabel) {
						brevoError = true;
						reject(new Error('Brevo form validation failed'));
					}
				}, 100);
			}
			// add delay to wait for brevo error
			setTimeout(() => {
				if (!brevoError) {
					this.signupService.submitSignup(signupUser, source).then(
						() => {
							this.sendSignupConfirmation(formState.username, formState.marketingOptIn);
							resolve();
						},
						(response: HttpErrorResponse) => {
							const error = response.error;
							const throttleMsg = BadgrApiFailure.messageIfThrottableError(error);

							if (throttleMsg) {
								this.messageService.reportHandledError(throttleMsg, error);
							} else if (error) {
								if (error.password) {
									this.messageService.setMessage(
										this.translate.instant('Profile.passwordInsecure') +
											' ' +
											this.translate.instant('Profile.pleaseTryAgain'),
										'error',
									);
								} else if (typeof error === 'object' && error.error) {
									this.messageService.setMessage('' + error.error, 'error');
								} else {
									this.messageService.setMessage('' + error, 'error');
								}
							} else {
								this.messageService.setMessage('Unable to signup.', 'error');
							}
							resolve();
						},
					);
				} else {
					reject(new Error('Brevo form validation failed'));
				}
			}, 150);
		}).finally(() => (this.signupFinished = null));
	}

	sendSignupConfirmation(email: string, signedUpForNewsletter: boolean): void {
		this.router.navigate(['signup/success', encodeURIComponent(btoa(email))], {
			queryParams: { signedUpForNewsletter: signedUpForNewsletter },
		});
	}

	get showMarketingOptIn() {
		return !!!this.theme['hideMarketingOptIn'];
	}

	passwordsMatch(): ValidationErrors | null {
		if (!this.signupForm) return null;

		const p1 = this.signupForm.controls.password.value;
		const p2 = this.signupForm.controls.passwordConfirm.value;

		if (p1 && p2 && p1 !== p2) {
			return { passwordsMatch: 'Passwords do not match' };
		}

		return null;
	}
}
