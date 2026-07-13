import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { combineLatest, firstValueFrom } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { IssuerManager } from '~/issuer/services/issuer-manager.service';

/**
 * Guards the private badge detail page so that only members (staff) of the owning
 * issuer or network may view it. Non-members are redirected to the public badge page,
 * where the "copy badge" functionality is available.
 *
 * Without this guard, any authenticated user can load the page (the issuer is resolved
 * from the global issuer list), see the Award button, and only hit a 404 from the
 * backend when they try to act. See issue #2049.
 */
@Injectable({ providedIn: 'root' })
export class BadgeClassMembershipGuard {
	private issuerManager = inject(IssuerManager);
	private router = inject(Router);

	async canActivate(next: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {
		const issuerSlug = next.params['issuerSlug'];
		const badgeSlug = next.params['badgeSlug'];

		const publicBadgePage = this.router.createUrlTree(['/public/badges', badgeSlug]);

		try {
			const isMember = await firstValueFrom(
				combineLatest([this.issuerManager.myIssuers$, this.issuerManager.myNetworks$]).pipe(
					take(1),
					map(([issuers, networks]) =>
						[...issuers, ...networks].some((entity) => entity.slug === issuerSlug),
					),
				),
			);

			return isMember ? true : publicBadgePage;
		} catch {
			// Fail safe: if membership can't be determined, send the user to the public page.
			return publicBadgePage;
		}
	}
}
