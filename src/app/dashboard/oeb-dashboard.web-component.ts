import {
	useWebComponentLanguageSetting,
	createWebcomponent,
	WebComponentRouter,
	WebComponentActivatedRoute,
} from 'webcomponents/create-webcomponent';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Component, computed, inject, importProvidersFrom, input, OnInit, provideAppInitializer } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BrowserModule } from '@angular/platform-browser';
import { LanguageService } from '~/common/services/language.service';
import * as translationsEn from 'src/assets/i18n/en.json';
import * as translationsDe from 'src/assets/i18n/de.json';
import { ActivatedRoute, provideRouter, Router, Routes } from '@angular/router';
import { AUTH_PROVIDER } from '~/common/services/authentication-service';
import { authTokenInterceptor, TokenAuthService } from '~/common/services/token-auth.service';
import { IconsProvider } from '~/icons-provider';
import { AppConfigService } from '~/common/app-config.service';
import { OebDashboardOverviewComponent } from '~/dashboard/components/oeb-dashboard-overview/oeb-dashboard-overview.component';
import { OebDashboardLearnersComponent } from '~/dashboard/components/oeb-dashboard-learners/oeb-dashboard-learners.component';

@Component({
	selector: 'oeb-dashboard',
	imports: [OebDashboardOverviewComponent, OebDashboardLearnersComponent],
	template: `
		<base [href]="safeBaseurl()" />
		<div class="oeb">
			<app-oeb-dashboard-overview [isNetwork]="false" [networkSlug]="issuerSlug()" />
			<div class="tw-mt-8">
				<app-oeb-dashboard-learners
					[networkSlug]="issuerSlug()"
					[disableClick]="true"
					[noGeneralStats]="true"
				/>
			</div>
		</div>
	`,
})
class OebDashboard implements OnInit {
	readonly issuerSlug = input.required<string>();
	readonly accessToken = input.required<string>();
	readonly baseurl = input<string>('');

	readonly domSanitizer = inject(DomSanitizer);
	readonly authService = inject(AUTH_PROVIDER) as TokenAuthService;

	readonly safeBaseurl = computed<SafeResourceUrl>(() =>
		this.domSanitizer.bypassSecurityTrustResourceUrl(this.baseurl() || ''),
	);

	async ngOnInit() {
		await this.authService.validateToken(this.accessToken());
	}
}

createWebcomponent(OebDashboard, 'oeb-dashboard', {
	providers: [
		provideHttpClient(withInterceptors([authTokenInterceptor])),
		importProvidersFrom(BrowserModule, TranslateModule.forRoot()),
		provideAppInitializer(() => {
			const translate = inject(TranslateService);
			translate.setTranslation('en', translationsEn);
			translate.setTranslation('de', translationsDe);

			const lang = inject(LanguageService);
			useWebComponentLanguageSetting(lang);

			const configService = inject(AppConfigService);
			return configService.initializeConfig();
		}),
		provideRouter([] as Routes),
		{
			provide: Router,
			useClass: WebComponentRouter,
		},
		{
			provide: ActivatedRoute,
			useClass: WebComponentActivatedRoute,
		},
		{
			provide: AUTH_PROVIDER,
			useClass: TokenAuthService,
		},
		IconsProvider,
	],
});
