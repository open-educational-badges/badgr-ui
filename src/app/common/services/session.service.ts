import { Injectable, inject } from '@angular/core';
import { UserCredential } from '../model/user-credential.type';
import { AppConfigService } from '../app-config.service';
import { MessageService } from './message.service';
import { BaseHttpApiService } from './base-http-api.service';
import { ExternalAuthProvider } from '../model/user-profile-api.model';
import { UpdatableSubject } from '../util/updatable-subject';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { NavigationService } from './navigation.service';
import { AuthenticationService } from './authentication-service';

export const EXPIRATION_DATE_STORAGE_KEY = 'LoginService.tokenExpirationDate';
const IS_OIDC_LOGIN_KEY = 'LoginService.isOidcLogin';
const DEFAULT_EXPIRATION_SECONDS = 24 * 60 * 60;

export interface AuthorizationTokenInformation {
	expires_in?: number;
	scope?: string;
	token_typ?: string;
	requires_2fa?: boolean;
	partial_token?: string;
}

export class TwoFactorRequiredError extends Error {
	constructor(public partialToken: string) {
		super('2FA required');
	}
}

@Injectable({ providedIn: 'root' })
export class SessionService implements AuthenticationService {
	private http = inject(HttpClient);
	private configService = inject(AppConfigService);
	private messageService = inject(MessageService);
	private navService = inject(NavigationService);

	baseUrl: string;

	enabledExternalAuthProviders: ExternalAuthProvider[];

	private loggedInSubject = new UpdatableSubject<boolean>();
	get loggedin$() {
		return this.loggedInSubject.asObservable();
	}
	get isLoggedIn$() {
		return this.loggedInSubject.asObservable();
	}

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const configService = this.configService;

		this.baseUrl = this.configService.apiConfig.baseUrl;
		this.enabledExternalAuthProviders = configService.featuresConfig.externalAuthProviders || [];
	}

	validateToken(): Promise<void> {
		const endpoint = this.baseUrl + '/o/token';
		const scope = 'rw:profile rw:issuer rw:backpack';
		const client_id = 'public';

		const payload = `grant_type=oidc&client_id=${encodeURIComponent(client_id)}&scope=${encodeURIComponent(scope)}`;

		return this.makeAuthorizationRequest(endpoint, payload, true);
	}

	refreshToken(): Promise<void> {
		const endpoint = this.baseUrl + '/o/token';
		const scope = 'rw:profile rw:issuer rw:backpack';
		const client_id = 'public';

		const payload = `grant_type=refresh_token&client_id=${encodeURIComponent(client_id)}&scope=${encodeURIComponent(
			scope,
		)}`;

		return this.makeAuthorizationRequest(endpoint, payload, true);
	}

	login(credential: UserCredential): Promise<void> {
		const endpoint = this.baseUrl + '/o/token';
		const scope = 'rw:profile rw:issuer rw:backpack';
		const client_id = 'public';

		const payload = `grant_type=password&client_id=${encodeURIComponent(client_id)}&scope=${encodeURIComponent(
			scope,
		)}&username=${encodeURIComponent(credential.username)}&password=${encodeURIComponent(credential.password)}`;

		return this.makeAuthorizationRequest(endpoint, payload, false);
	}

	makeAuthorizationRequest(endpoint: string, payload: string, isOidcLogin: boolean): Promise<void> {
		const headers = new HttpHeaders().append('Content-Type', 'application/x-www-form-urlencoded');
		// Update global loading state
		this.messageService.incrementPendingRequestCount();

		return lastValueFrom(
			this.http.post<AuthorizationTokenInformation>(endpoint, payload, {
				observe: 'response',
				responseType: 'json',
				headers,
				withCredentials: true,
			}),
		)
			.then((r) => BaseHttpApiService.addTestingDelay(r, this.configService))
			.finally(() => this.messageService.decrementPendingRequestCount())
			.then((r) => {
				this.storeToken(r.body, isOidcLogin);
				if (isOidcLogin) this.startRefreshTokenTimer(r.body.expires_in || DEFAULT_EXPIRATION_SECONDS);
			})
			.catch((err) => {
				if (err instanceof HttpErrorResponse && err.status === 401 && err.error?.requires_2fa) {
					throw new TwoFactorRequiredError(err.error.partial_token);
				}
				throw err;
			});
	}

	private refreshTokenTimeout?: ReturnType<typeof setTimeout>;

	startRefreshTokenTimer(expiresIn: number) {
		const timeout = (expiresIn - 60) * 1000;
		this.refreshTokenTimeout = setTimeout(() => this.refreshToken(), timeout);
	}

	stopRefreshTokenTimer() {
		clearTimeout(this.refreshTokenTimeout);
	}

	initiateUnauthenticatedExternalAuth(provider: ExternalAuthProvider) {
		window.location.href = `${this.baseUrl}/account/sociallogin?provider=${encodeURIComponent(provider.slug)}`;
	}

	logout(nextObservable = true): Promise<void> {
		this.stopRefreshTokenTimer();

		const endpoint = this.baseUrl + '/o/revoke_token/';
		const client_id = 'public';
		const payload = `client_id=${encodeURIComponent(client_id)}`;
		const headers = new HttpHeaders().append('Content-Type', 'application/x-www-form-urlencoded');
		// Update global loading state
		this.messageService.incrementPendingRequestCount();
		return new Promise((resolve, reject) => {
			this.http
				.post<Response>(endpoint, payload, {
					observe: 'response',
					responseType: 'json',
					headers,
					withCredentials: true,
				})
				.subscribe({
					next: (r) => {
						if (r.status < 200 || r.status >= 300) {
							this.messageService.reportFatalError('Logout Failed: ' + r.status);
							reject('Logout failed: ' + r.status);
						}

						localStorage.removeItem(EXPIRATION_DATE_STORAGE_KEY);
						sessionStorage.removeItem(EXPIRATION_DATE_STORAGE_KEY);
						if (nextObservable) this.loggedInSubject.next(false);
						resolve();
					},
					error: (err) => {
						// If an error occurs it typically still means that the cookie gets deleted.
						// So we should also update the local storage etc. accordingly
						localStorage.removeItem(EXPIRATION_DATE_STORAGE_KEY);
						sessionStorage.removeItem(EXPIRATION_DATE_STORAGE_KEY);
						if (nextObservable) this.loggedInSubject.next(false);
						this.messageService.reportFatalError('Logout Failed: ' + err);
						reject('Logout failed: ' + err);
					},
				});
		});
	}

	/**
	 * Note that this doesn't actually store the token anymore, but merely the metadata on the token
	 */
	storeToken(token: AuthorizationTokenInformation, isOidcLogin = false): void {
		const expirationDateStr = new Date(
			Date.now() + (token.expires_in || DEFAULT_EXPIRATION_SECONDS) * 1000,
		).toISOString();

		localStorage.setItem(EXPIRATION_DATE_STORAGE_KEY, expirationDateStr);
		localStorage.setItem(IS_OIDC_LOGIN_KEY, isOidcLogin ? 'true' : '');
		this.loggedInSubject.next(true);
	}

	get isLoggedIn(): boolean {
		// Remove old login token
		if (localStorage.getItem('LoginService.token')) {
			localStorage.removeItem('LoginService.token');
			localStorage.removeItem('LoginService.refreshToken');
			localStorage.removeItem(EXPIRATION_DATE_STORAGE_KEY);
		}

		if (sessionStorage.getItem(EXPIRATION_DATE_STORAGE_KEY) || localStorage.getItem(EXPIRATION_DATE_STORAGE_KEY)) {
			const expirationString =
				sessionStorage.getItem(EXPIRATION_DATE_STORAGE_KEY) ||
				localStorage.getItem(EXPIRATION_DATE_STORAGE_KEY);

			if (expirationString) {
				const expirationDate = new Date(expirationString);

				return expirationDate > new Date();
			} else {
				return true;
			}
		} else {
			return false;
		}
	}

	isOidcLogin(): boolean {
		const expirationString = sessionStorage.getItem(IS_OIDC_LOGIN_KEY) || localStorage.getItem(IS_OIDC_LOGIN_KEY);
		if (expirationString === 'false')
			console.error(IS_OIDC_LOGIN_KEY, 'is set to false, which is still treated as true');
		// Note that this treats all values except "" as true
		return !!expirationString;
	}

	verify2FA(partialToken: string, code: string): Promise<void> {
		const endpoint = this.baseUrl + '/v1/user/2fa/verify';
		const headers = new HttpHeaders().append('Content-Type', 'application/json');
		this.messageService.incrementPendingRequestCount();
		return lastValueFrom(
			this.http.post<AuthorizationTokenInformation>(
				endpoint,
				{ partial_token: partialToken, code },
				{
					observe: 'response',
					responseType: 'json',
					headers,
					withCredentials: true,
				},
			),
		)
			.finally(() => this.messageService.decrementPendingRequestCount())
			.then((r) => {
				if (!r || r.status < 200 || r.status >= 300) {
					throw new Error('2FA verification failed');
				}
				this.storeToken(r.body, false);
			});
	}

	exchangeCodeForToken(authCode: string): Promise<AuthorizationTokenInformation> {
		return lastValueFrom(
			this.http.post<AuthorizationTokenInformation>(
				this.baseUrl + '/o/code',
				'code=' + encodeURIComponent(authCode),
				{
					observe: 'response',
					responseType: 'json',
					headers: new HttpHeaders().append('Content-Type', 'application/x-www-form-urlencoded'),
				},
			),
		).then((r) => r.body);
	}

	submitResetPasswordRequest(email: string) {
		// TODO: Define the type of this response
		return lastValueFrom(
			this.http.post<unknown>(this.baseUrl + '/v1/user/forgot-password', 'email=' + encodeURIComponent(email), {
				observe: 'response',
				responseType: 'json',
				headers: new HttpHeaders().append('Content-Type', 'application/x-www-form-urlencoded'),
			}),
		);
	}

	submitForgotPasswordChange(newPassword: string, token: string) {
		// TODO: Define the type of this response
		return lastValueFrom(
			this.http.put<unknown>(
				this.baseUrl + '/v1/user/forgot-password',
				{ password: newPassword, token },
				{
					observe: 'response',
					responseType: 'json',
				},
			),
		);
	}

	/**
	 * Handles errors from the API that indicate session expiration, invalid token, and other similar problems.
	 */
	handleAuthenticationError() {
		// currently, only authenticated users (with verified emails) can load list of issuers, this cause users with unverified emails who wants to resend verification-email to be logged out immediatly. Checking wehther user is already logged in should resolve the issue for now.
		if (!this.isLoggedIn) {
			this.logout();

			if (this.navService.currentRouteData.publiclyAccessible !== true) {
				const params = new URLSearchParams(document.location.search.substring(1));
				// catch redirect_uri
				const redirectUri = params.get('redirect_uri');
				if (redirectUri) localStorage.redirectUri = redirectUri;
				// If we're not on a public page, send the user to the login page with an error
				window.location.replace(
					`/auth/login?authError=${encodeURIComponent(
						'Your session has expired. Please log in to continue.',
					)}`,
				);
			} else {
				// If we _are_ on a public page, reload the page after clearing the session token, because that will clear any messy error states from
				// api errors.
				window.location.replace(window.location.toString());
			}
		}
	}

	/**
	 * To resend verification email for unlogged user.
	 */
	resendVerificationEmail_unloggedUser(emailToVerify: string) {
		return lastValueFrom(this.http.put<unknown>(this.baseUrl + `/v1/user/resendemail`, { email: emailToVerify }));
	}
}
