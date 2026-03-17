import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { OAuthManager } from '../services/oauth-manager.service';
import { UserProfileApiService } from '../services/user-profile-api.service';
import { AUTH_PROVIDER, AuthenticationService } from '../services/authentication-service';
import { QuotaManager } from '~/issuer/services/quota-manager.service';
import { IssuerManager } from '~/issuer/services/issuer-manager.service';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { QuotaReleaseDialog } from '~/issuer/components/issuer-quotas-quota-release-dialog/issuer-quotas-quota-release-dialog.component';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
	private sessionService = inject(AUTH_PROVIDER);
	private router = inject(Router);
	private oAuthManager = inject(OAuthManager);
	private userProfileApiService = inject(UserProfileApiService);
	private issuerManager = inject(IssuerManager);
	private quotaManager = inject(QuotaManager);

	private readonly _hlmDialogService = inject(HlmDialogService);

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}

	async canActivate(
		// Not using but worth knowing about
		next: ActivatedRouteSnapshot,
		state: RouterStateSnapshot,
	) {
		// Ignore the auth module
		if (state.url.startsWith('/auth') && !state.url.includes('welcome')) return true;

		// Ignore the public module
		if (state.url.startsWith('/public')) return true;

		if (!this.sessionService.isLoggedIn) {
			this.router.navigate(['/auth']);
			return false;
		} else if (this.oAuthManager.isAuthorizationInProgress) {
			this.router.navigate(['/auth/oauth2/authorize']);
			return false;
		} else {
			this.userProfileApiService.getProfile().then((profile) => {
				if (profile.agreed_terms_version !== profile.latest_terms_version) {
					this.router.navigate(['/auth/new-terms']);
					return false;
				} else if (!profile.secure_password_set) {
					this.router.navigate(['/auth/new-password']);
					return false;
				}

				if (!profile.quota_release_informed) {
					this.quotaManager.quotasEnabled$.subscribe((enabled) => {
						if (enabled) {
							const dtQuotaEnabled = new Date(enabled * 1000);
							const dtUserJoined = new Date(profile.date_joined);
							if (dtUserJoined < dtQuotaEnabled) {
								this.issuerManager.myIssuers$.subscribe((issuers) => {
									let showQuotaDialog = false;
									issuers.forEach((i) => {
										let dtCreated = new Date(i.createdAt);
										if (dtCreated < dtQuotaEnabled) {
											showQuotaDialog = true;
										}
									});

									if (showQuotaDialog) {
										this._hlmDialogService.open(QuotaReleaseDialog);
									}
								});
							}
						}
					});
					profile.quota_release_informed = true;
					this.userProfileApiService.updateProfile(profile);
				}
			});
			return true;
		}
	}
}
