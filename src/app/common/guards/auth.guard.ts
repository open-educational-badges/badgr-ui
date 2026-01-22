import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { OAuthManager } from '../services/oauth-manager.service';
import { UserProfileApiService } from '../services/user-profile-api.service';
import { AUTH_PROVIDER, AuthenticationService } from '../services/authentication-service';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
	private sessionService = inject(AUTH_PROVIDER);
	private router = inject(Router);
	private oAuthManager = inject(OAuthManager);
	private userProfileApiService = inject(UserProfileApiService);

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}

	canActivate(
		// Not using but worth knowing about
		next: ActivatedRouteSnapshot,
		state: RouterStateSnapshot,
	): boolean | Promise<boolean> {
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
			return this.userProfileApiService.getProfile().then((profile) => {
				if (profile.agreed_terms_version !== profile.latest_terms_version) {
					this.router.navigate(['/auth/new-terms']);
					return false;
				} else if (!profile.secure_password_set) {
					this.router.navigate(['/auth/new-password']);
					return false;
				}
				return true;
			});
		}
	}
}
