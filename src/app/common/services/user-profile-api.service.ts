import { Injectable, inject } from '@angular/core';
import { AppConfigService } from '../app-config.service';
import { BaseHttpApiService } from './base-http-api.service';
import { MessageService } from './message.service';
import { EventsService } from './events.service';
import { ApiUserProfile, ApiUserProfileEmail, ApiUserProfileSocialAccount } from '../model/user-profile-api.model';
import { HttpClient } from '@angular/common/http';
import { ApiStaffRequest } from '../../issuer/models/staffrequest-api.model';
import { AUTH_PROVIDER, AuthenticationService } from './authentication-service';

@Injectable({ providedIn: 'root' })
export class UserProfileApiService extends BaseHttpApiService {
	protected sessionService: AuthenticationService;
	protected http: HttpClient;
	protected configService: AppConfigService;
	protected messageService: MessageService;
	protected eventsService = inject(EventsService);

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const sessionService = inject(AUTH_PROVIDER);
		const http = inject(HttpClient);
		const configService = inject(AppConfigService);
		const messageService = inject(MessageService);

		super(sessionService, http, configService, messageService);

		this.sessionService = sessionService;
		this.http = http;
		this.configService = configService;
		this.messageService = messageService;
	}

	private _profilePromise: Promise<ApiUserProfile> | null = null;

	getProfile() {
		if (this.sessionService.isLoggedIn) {
			if (!this._profilePromise) {
				this._profilePromise = this.get<ApiUserProfile>('/v1/user/profile').then((r) => r.body);
			}
			return this._profilePromise;
		} else {
			this._profilePromise = null;
			return Promise.reject('No user logged in');
		}
	}

	updatePassword(newPassword: string, currentPassword: string) {
		return this.put<ApiUserProfile>('/v1/user/profile', {
			password: newPassword,
			current_password: currentPassword,
		}).then((r) => r.body);
	}

	updateProfile(profile: ApiUserProfile) {
		this._profilePromise = null;
		return this.put<ApiUserProfile>('/v1/user/profile', profile).then((r) => r.body);
	}

	deleteOwnProfile() {
		return this.delete('/v1/user/profile');
	}

	private _emailsPromise: Promise<ApiUserProfileEmail[]> | null = null;

	fetchEmails() {
		if (!this._emailsPromise) {
			this._emailsPromise = this.get<ApiUserProfileEmail[]>('/v1/user/emails').then((r) => r.body);
		}
		return this._emailsPromise;
	}

	fetchSocialAccounts() {
		return this.get<ApiUserProfileSocialAccount[]>('/v1/user/socialaccounts').then((r) => r.body);
	}

	addEmail(email: string) {
		this._emailsPromise = null;
		return this.post<ApiUserProfileEmail>('/v1/user/emails', { email: email }).then((r) => r.body);
	}

	removeEmail(emailId: number) {
		this._emailsPromise = null;
		return this.delete('/v1/user/emails/' + emailId);
	}

	removeSocialAccount(accountId: string) {
		return this.delete('/v1/user/socialaccounts/' + accountId);
	}

	setPrimaryEmail(emailId: number) {
		return this.put<ApiUserProfileEmail>('/v1/user/emails/' + emailId, { primary: true }).then((r) => r.body);
	}

	resendVerificationEmail(emailIdToVerify: number) {
		return this.put('/v1/user/emails/' + emailIdToVerify, { resend: true });
	}

	getRedirectUrl() {
		return this.post('/v1/user/get-redirect-path', {});
	}

	getIssuerStaffRequests() {
		return this.get<ApiStaffRequest[]>('/v1/user/issuerStaffRequests');
	}

	revokeIssuerStaffRequest(requestId: string) {
		return this.delete(`/v1/user/issuerStaffRequest/${requestId}`);
	}

	disable2FA(password: string): Promise<void> {
		return this.post('/v1/user/2fa/disable', { password }).then(() => undefined);
	}

	setup2FA(): Promise<{ qr_code: string; secret: string }> {
		return this.post<{ qr_code: string; secret: string }>('/v1/user/2fa/setup', {}).then((r) => r.body);
	}

	confirm2FA(code: string): Promise<{ backup_codes: string[] }> {
		return this.post<{ backup_codes: string[] }>('/v1/user/2fa/confirm', { code }).then((r) => r.body);
	}
}
