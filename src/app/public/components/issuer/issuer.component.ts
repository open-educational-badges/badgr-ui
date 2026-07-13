import { Component, Injector, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { preloadImageURL } from '../../../common/util/file-util';
import { PublicApiService } from '../../services/public-api.service';
import { LoadedRouteParam } from '../../../common/util/loaded-route-param';
import { PublicApiBadgeClass, PublicApiIssuer, PublicApiLearningPath } from '../../models/public-api.model';
import { EmbedService } from '../../../common/services/embed.service';
import { addQueryParamsToUrl, stripQueryParamsFromUrl } from '../../../common/util/url-util';
import { routerLinkForUrl } from '../public/public.component';
import { Title } from '@angular/platform-browser';
import { AppConfigService } from '../../../common/app-config.service';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { OebIssuerDetailComponent } from '../../../common/components/issuer/oeb-issuer-detail.component';
import { BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { TranslateService } from '@ngx-translate/core';

@Component({
	templateUrl: './issuer.component.html',
	imports: [BgAwaitPromises, OebIssuerDetailComponent, BgBreadcrumbsComponent],
})
export class PublicIssuerComponent {
	private injector = inject(Injector);
	embedService = inject(EmbedService);
	configService = inject(AppConfigService);
	protected translate = inject(TranslateService);
	private title = inject(Title);

	private readonly parentCrumb = {
		title: this.translate.instant('General.institutionsNav'),
		routerLink: ['/catalog/issuers'],
	};
	crumbs = [this.parentCrumb];

	readonly issuerImagePlaceholderUrl = preloadImageURL(
		'../../../../breakdown/static/images/placeholderavatar-issuer.svg',
	);
	readonly badgeLoadingImageUrl = '../../../../breakdown/static/images/badge-loading.svg';
	readonly badgeFailedImageUrl = '../../../../breakdown/static/images/badge-failed.svg';

	issuerIdParam: LoadedRouteParam<{
		issuer: PublicApiIssuer;
		badges: PublicApiBadgeClass[];
		learningpaths: PublicApiLearningPath[];
		networks: PublicApiIssuer[];
		partner_issuers: PublicApiIssuer[];
	}>;
	routerLinkForUrl = routerLinkForUrl;
	plural = {
		badge: {
			'=0': 'No Badges',
			'=1': '1 Badge',
			other: '# Badges',
		},
	};

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const injector = this.injector;
		const title = this.title;

		title.setTitle(`Issuer - ${this.configService.theme['serviceName'] || 'Badgr'}`);

		this.issuerIdParam = new LoadedRouteParam(injector.get(ActivatedRoute), 'issuerId', (paramValue) => {
			const service: PublicApiService = injector.get(PublicApiService);
			return service.getIssuerWithRelations(paramValue).then((result) => {
				this.crumbs = [
					this.parentCrumb,
					{ title: result.issuer.name, routerLink: ['/public/issuers/' + result.issuer.slug] },
				];
				return result;
			});
		});
	}

	get issuer(): PublicApiIssuer {
		return this.issuerIdParam.value.issuer;
	}
	get badgeClasses(): PublicApiBadgeClass[] {
		return this.issuerIdParam.value.badges;
	}

	get learningPaths(): PublicApiLearningPath[] {
		return this.issuerIdParam.value.learningpaths;
	}

	get networks(): PublicApiIssuer[] {
		return this.issuerIdParam.value.networks;
	}

	get partner_issuers(): PublicApiIssuer[] {
		return this.issuerIdParam.value.partner_issuers;
	}

	private get rawJsonUrl() {
		return stripQueryParamsFromUrl(this.issuer.id) + '.json';
	}
}
