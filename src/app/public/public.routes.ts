import { Routes } from '@angular/router';

import { BadgrRouteData } from '../common/services/navigation.service';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./components/public/public.component').then((m) => m.PublicComponent),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},
	{
		path: 'downloads/:pdfName',
		loadComponent: () =>
			import('./components/pdf-download/pdf-download.component').then((m) => m.PdfDownloadComponent),
	},
	{
		path: 'about',
		loadComponent: () => import('./components/about/about.component').then((m) => m.AboutComponent),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},
	{
		path: 'about/newsletter',
		loadComponent: () =>
			import('./components/about/newsletter/newsletter.component').then((m) => m.NewsletterComponent),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},
	{
		path: 'start',
		loadComponent: () => import('./components/start/start.component').then((m) => m.StartComponent),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},
	{
		path: 'terms',
		loadComponent: () =>
			import('./components/terms-of-service/terms-of-service.component').then((m) => m.TermsComponent),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},
	{
		path: 'privacy',
		loadComponent: () => import('./components/privacy/privacy.component').then((m) => m.PrivacyComponent),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},
	{
		path: 'faq',
		loadComponent: () => import('./components/faq/faq.component').then((m) => m.FaqComponent),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},

	{
		path: 'assertions/:assertionId',
		loadComponent: () =>
			import('./components/badge-assertion/badge-assertion.component').then(
				(m) => m.PublicBadgeAssertionComponent,
			),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},

	{
		path: 'badges/:badgeId',
		loadComponent: () =>
			import('./components/badgeclass/badgeclass.component').then((m) => m.PublicBadgeClassComponent),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},

	{
		path: 'issuers/:issuerId',
		loadComponent: () => import('./components/issuer/issuer.component').then((m) => m.PublicIssuerComponent),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},
	{
		path: 'networks/:networkId',
		loadComponent: () => import('./components/network/network.component').then((m) => m.PublicNetworkComponent),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},
	{
		path: 'learningpaths/:learningPathId',
		loadComponent: () =>
			import('./components/learningpath/learningpath.component').then((m) => m.PublicLearningPathComponent),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},
	{
		path: 'issuer/issuers/:issuerSlug/badges/:badgeSlug/request/:qrCodeId',
		loadComponent: () =>
			import('../issuer/components/request-badge/request-badge.component').then((m) => m.RequestBadgeComponent),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},
	{
		path: 'collections/not-found',
		loadComponent: () =>
			import('./components/not-found/not-found-component').then((m) => m.PublicNotFoundComponent),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},
	{
		path: 'collections/:collectionShareHash',
		loadComponent: () =>
			import('./components/badge-collection/badge-collection.component').then(
				(m) => m.PublicBadgeCollectionComponent,
			),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},
	{
		path: '**',
		loadComponent: () => import('./components/public/public.component').then((m) => m.PublicComponent),
		data: {
			publiclyAccessible: true,
		} as BadgrRouteData,
	},
];
