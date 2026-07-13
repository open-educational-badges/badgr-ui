import { Routes } from '@angular/router';

export const routes: Routes = [
	/* Profile */
	{
		path: '',
		redirectTo: 'profile',
		pathMatch: 'full',
	},
	{
		path: 'profile',
		loadComponent: () => import('./components/profile/profile.component').then((m) => m.ProfileComponent),
	},
	{
		path: 'edit',
		loadComponent: () =>
			import('./components/profile-edit/profile-edit.component').then((m) => m.ProfileEditComponent),
	},
	{
		path: 'app-integrations',
		loadComponent: () =>
			import('./components/app-integrations-list/app-integrations-list.component').then(
				(m) => m.AppIntegrationListComponent,
			),
	},
	{
		path: 'app-integrations/app/canvas-lti1',
		loadComponent: () =>
			import('./components/badgebook-lti1-integration-detail/badgebook-lti1-integration-detail.component').then(
				(m) => m.BadgebookLti1DetailComponent,
			),
	},
	{
		path: 'app-integrations/oauth-app/:appId',
		loadComponent: () =>
			import('./components/oauth-app-detail/oauth-app-detail.component').then((m) => m.OAuthAppDetailComponent),
	},
	{
		path: 'change-password',
		loadComponent: () =>
			import('./components/change-password/change-password.component').then((m) => m.ChangePasswordComponent),
	},
	{
		path: '2fa',
		loadComponent: () =>
			import('./components/two-factor-setup/two-factor-setup.component').then((m) => m.TwoFactorSetupComponent),
	},
	{
		path: '**',
		loadComponent: () => import('./components/profile/profile.component').then((m) => m.ProfileComponent),
	},
];
