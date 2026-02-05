import { Injectable, InjectionToken, NgZone, inject } from '@angular/core';
import { ApiConfig, BadgrConfig, FeaturesConfig, HelpConfig } from '../../environments/badgr-config';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { BadgrTheme } from '../../theming/badgr-theme';

import * as deepmerge from 'deepmerge';
import { animationFramePromise } from './util/promise-util';
import { initializeTheme } from '../../theming/theme-setup';

export const PARTIAL_CONFIG = new InjectionToken<Partial<BadgrConfig>>('config');

@Injectable({ providedIn: 'root' })
export class AppConfigService {
	private http = inject(HttpClient);
	private ngZone = inject(NgZone);
	private partialConfig = inject(PARTIAL_CONFIG, { optional: true });

	get apiConfig(): ApiConfig {
		return this.config.api;
	}

	get featuresConfig(): FeaturesConfig {
		return this.config.features;
	}

	get helpConfig(): HelpConfig {
		return this.config.help;
	}

	get assertionVerifyUrl(): string {
		return this.config.assertionVerifyUrl;
	}

	get theme(): BadgrTheme {
		return this.config.theme;
	}
	private config: BadgrConfig = defaultConfig;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const ngZone = this.ngZone;

		window['initializeBadgrConfig'] = (...args) => ngZone.run(() => this.initializeConfig.apply(this, args));
	}

	async initializeConfig(configOverrides?: Partial<BadgrConfig>) {
		// Build the canonical configuration object by deep merging all config contributors
		this.config = deepmerge.all(
			[
				// The default, base configuration object
				defaultConfig,

				// Configuration overrides from the Angular environment
				environment.config || {},

				// Configuration overrides in Angular's dependency injection. Mostly used for tests.
				this.partialConfig || {},

				// Remote configuration overrides, generally domain-specific from a config server
				(await this.loadRemoteConfig()) || {},

				// User-specified configuration overrides from local storage
				JSON.parse(localStorage.getItem('config')) || {},

				// User-specified configuration overrides from session storage
				JSON.parse(sessionStorage.getItem('config')) || {},

				// Programmatic Configuration Overrides
				configOverrides || {},
			],
			{
				clone: true,
			},
		) as BadgrConfig;

		// Initialize theming with the final configuration value
		initializeTheme(this);

		return this.config;
	}

	private async loadRemoteConfig(): Promise<Partial<BadgrConfig> | null> {
		const queryParams = new URLSearchParams(window.location.search);

		// Allow custom remote config information to be added after the angular scripts in index.html.
		await animationFramePromise();

		function getRemoteConfigParam(name, allowQueryParam) {
			return (
				(allowQueryParam && queryParams.get(name)) ||
				window.localStorage.getItem(name) ||
				window.sessionStorage.getItem(name) ||
				(() => {
					const m = document.querySelector(`meta[name=${name}]`);
					return m && m.getAttribute('content');
				})()
			);
		}

		// SECURITY NOTE: We do _not_ allow overriding the remote configuration baseUrl with a query param because it could allow an attacker
		// to load badgr with third-party configuration, which could harvest user data or otherwise cause mischief.
		const baseUrl =
			getRemoteConfigParam('configBaseUrl', false) ||
			(environment.remoteConfig && environment.remoteConfig.baseUrl) ||
			null;
		const version =
			getRemoteConfigParam('configVersion', true) ||
			(environment.remoteConfig && environment.remoteConfig.version) ||
			null;
		const cacheBust = getRemoteConfigParam('configCacheBust', true) || null;
		const domain = getRemoteConfigParam('configDomain', true) || window.location.hostname;

		if (!baseUrl || !version || !domain) {
			return Promise.resolve(null);
		}

		// Request a new copy of the config every hour
		const oneHourMs = 60 * 60 * 1000;
		const timeCode = Math.floor(Date.now() / oneHourMs);

		const configUrl = `${baseUrl}/${version}/${domain}/config.json?t=${timeCode}&cacheBust=${cacheBust}`;

		return this.http
			.get(configUrl)
			.toPromise()
			.then((r) => {
				return r;
			})
			.catch((err) => {
				console.error(`Failed to load remote config from ${configUrl}`, err);
				return null;
			});
	}
}

export const defaultConfig: BadgrConfig = {
	api: {
		baseUrl: window.location.protocol + '//' + window.location.hostname + ':8000',
	},
	features: {
		alternateLandingRedirect: false,
	},
	help: {
		email: 'info@openbadges.education',
	},
	assertionVerifyUrl: 'https://badgecheck.io/',
	theme: {
		serviceName: 'Badgr',
		welcomeMessage: `### Welcome!`,
		alternateLandingUrl: null,
		showPoweredByBadgr: false,
		showApiDocsLink: true,
		termsOfServiceLink: null,
		termsHelpLink: null,
		privacyPolicyLink: null,
		logoImg: {
			small: '../../assets/@concentricsky/badgr-style/dist/images/os-logo-small.svg',
			desktop: '../../assets/@concentricsky/badgr-style/dist/images/os-logo-large.svg',
		},
		loadingImg: {
			// Image is inlined here to avoid any external resource loading, at the expense of a larger initial file size. We only do this for the default theme.
			imageUrl:
				'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAxCAMAAACrgNoQAAAAilBMVEXx8fH////9/f3z8/P19fX39/f5+fn19PTR0NHt7e2np6f7/Pvo6ejY2NjLy8vv7++urq7l5eXg4ODT09O3t7fExMTAwMC8vLzr6+u1tbXi4uKysrLe3t7W1tbGxsaKiorIyMirq6vc3Nzb29vV1dXPz8/d3d3Nzc29vb25ubmfn5+RkZHa2tp/f3+C+l03AAADIklEQVRIx41WiZKkIAwNkIB437atrX3Oufv/v7cIVG3RM1NjbCEBHknIKxtgVjjntgnV0HZiAR4UND+p4DQBijECSBgHQMYQgDMJIBkXgHaKu5VgW/xYL5ic18+ap59rn9C4fmiefa4Nh4+1pKRbPytO21owb6NBoALTIAAgCgCFKlC3KeouG4Cz+a+CXUJrxrgBlOek2AeYawsALWCfoD8lBTulkGzLQR+ePQj7WMWKV+jU2pAukYRdIqPYAuIAELh49jBYwGNG2CnSJS2+d/BVFHPU8OavMDy6wi03fFr5W9IPnzS6H2rLHvMqYV5Q9ASYGjuiDmeFj4qqYWgPAq83xOao8N52D/QbplVADRqPesLicqSXUtFrTtRnSN0fWdYeoUJqYDX0L0nWJ1qOxySKiLob0vlkLAcQWlkPaao8U4ZS4r0jTcOLASBugC7+ePVJUDOFlabmlURVSqkuWjY5528z0nKsB/kDNSjKZUHLGF0iBD2d8ndRyCXjkz93+tNZwMmHCMLyFuuoQgBVnLKtcgettI8ZgD9RQ1gNSYHrTRNwULhTSsCLc6QISGwW2l6QsiZY3zakPiO38q63iA7t2BcCMG1HU0Ch38dBq2+pgWOKAKLMoGlRpGVVVBpwaiCb0AMuFtCeyAEGA8DrwEGOVdI1SYEK65ZD0tboyHMwAMao8CG+p6KgZivc25W/1yKfMlN4Y7qgv1Jj0FJhNSVE5UGeF86zJUlLibJMrQdzxDakukKfQ3StAPt+bnOEoszr9kHYDfOw+ByaMqi0OkbRrADv5xqNBdGSbdtk5xl/oAYSbVMkPRMkgTf9/EtuAXOFsE8E3/2pDLhExdetwt4LXs//CyeCx9vBcJj0bxIc61tG+0ISGiw1pLOCx3XhcECNXR5UmtqQ7jV+/2H934eVbuN9f4pFUvYWQGsqLA1QSgUgvSpAyY0Vfsro4o5b0gaBeMobUFWep0pH+U2Iax5plb7mRwWn/G54mUfLLbE3AXfp6OI3yer4kjIc45yxKJ4UO5TxlSV93Cdsjqf4D+OeS5ztEb/u6b7EXePtUHX7/gP37yxIGVsXUQAAAABJRU5ErkJggg==',
			height: 48,
		},
		favicons: [],
		useColorNavbar: false,
		cssCustomProps: {
			'--color-interactive1': 'rgb(0,0,0)',
			'--color-interactive2': 'rgb(20,20,20)',
			'--color-interactive2alpha50': 'rgba(20,20,20,0.5)',
		},
	},
};
