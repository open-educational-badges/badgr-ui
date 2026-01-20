import { Component, Injector, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { preloadImageURL } from '../../../common/util/file-util';
import { PublicApiService } from '../../services/public-api.service';
import { LoadedRouteParam } from '../../../common/util/loaded-route-param';
import {
	OB3EvidenceItem,
	PublicApiBadgeAssertion,
	PublicApiBadgeAssertionWithBadgeClass,
	PublicApiBadgeClass,
	PublicApiIssuer,
} from '../../models/public-api.model';
import { EmbedService } from '../../../common/services/embed.service';
import { routerLinkForUrl } from '../public/public.component';
import { QueryParametersService } from '../../../common/services/query-parameters.service';
import { MessageService } from '../../../common/services/message.service';
import { AppConfigService } from '../../../common/app-config.service';
import { saveAs } from 'file-saver';
import { SafeResourceUrl, Title } from '@angular/platform-browser';
import { PageConfig } from '../../../common/components/badge-detail/badge-detail.component.types';
import { TranslateService } from '@ngx-translate/core';
import { BgBadgeDetail } from '../../../common/components/badge-detail/badge-detail.component';
import { PdfService } from '../../../common/services/pdf.service';
import { SessionService } from '~/common/services/session.service';
import { IssuerManager } from '~/issuer/services/issuer-manager.service';
import { Issuer } from '~/issuer/models/issuer.model';
import {
	getAssertionExpiration,
	getAssertionIssuedDate,
	isOB2Assertion,
	isOB3Assertion,
} from '~/common/util/assertion-helper';
import { ApiBadgeInstanceEvidenceItem } from '~/issuer/models/badgeinstance-api.model';

@Component({
	template: ` <bg-badgedetail [config]="config" [awaitPromises]="[assertionIdParam.loadedPromise]"></bg-badgedetail>`,
	imports: [BgBadgeDetail],
})
export class PublicBadgeAssertionComponent {
	private injector = inject(Injector);
	embedService = inject(EmbedService);
	messageService = inject(MessageService);
	configService = inject(AppConfigService);
	queryParametersService = inject(QueryParametersService);
	private title = inject(Title);
	private translate = inject(TranslateService);
	private pdfService = inject(PdfService);
	private sessionService = inject(SessionService);
	private issuerManager = inject(IssuerManager);
	protected route = inject(ActivatedRoute);

	constructor() {
		const title = this.title;

		title.setTitle(`Assertion - ${this.configService.theme['serviceName'] || 'Badgr'}`);
		this.assertionIdParam = this.createLoadedRouteParam();
	}

	get assertionSlug() {
		return this.route.snapshot.params['assertionId'];
	}

	readonly issuerImagePlacholderUrl = preloadImageURL(
		'../../../../breakdown/static/images/placeholderavatar-issuer.svg',
	);

	readonly badgeLoadingImageUrl = '../../../../breakdown/static/images/badge-loading.svg';

	readonly badgeFailedImageUrl = '../../../../breakdown/static/images/badge-failed.svg';

	assertionIdParam: LoadedRouteParam<PublicApiBadgeAssertionWithBadgeClass>;

	assertionId: string;

	awardingIssuers: Issuer[] = null;

	awardedToDisplayName: string;

	config: PageConfig;

	pdfSrc: SafeResourceUrl;

	routerLinkForUrl = routerLinkForUrl;

	tense = {
		expires: {
			'=1': 'Expired',
			'=0': 'Expires',
		},
	};

	get showDownload() {
		return this.queryParametersService.queryStringValue('action') === 'download';
	}

	get assertion(): PublicApiBadgeAssertionWithBadgeClass {
		return this.assertionIdParam.value;
	}

	get badgeClass(): PublicApiBadgeClass {
		return this.assertion.badge;
	}

	get issuer(): PublicApiIssuer {
		return this.assertion.badge.issuer;
	}

	private get rawUrl() {
		return `${this.configService.apiConfig.baseUrl}/public/assertions/${this.assertionId}`;
	}

	private get rawJsonUrl() {
		return `${this.rawUrl}.json`;
	}

	get rawBakedUrl() {
		return `${this.rawUrl}/baked`;
	}

	get verifyUrl() {
		let url = `${this.configService.assertionVerifyUrl}?url=${this.rawJsonUrl}`;

		for (const IDENTITY_TYPE of ['identity__email', 'identity__url', 'identity__telephone']) {
			const identity = this.queryParametersService.queryStringValue(IDENTITY_TYPE);
			if (identity) {
				url = `${url}&${IDENTITY_TYPE}=${identity}`;
			}
		}
		return url;
	}

	verifyBadge() {
		if (this.config.version == '3.0') {
			// v1: open ui for manual upload
			// window.open('https://verifybadge.org/upload?validatorId=OB30Inspector');

			// v2: post request using the assertion public url
			const form = document.createElement('form');
			form.target = '_blank';
			form.method = 'POST';
			form.action = 'https://verifybadge.org/uploaduri';
			form.style.display = 'none';

			[
				['uri', this.assertion.id],
				['validatorId', 'OB30Inspector'],
			].forEach(([key, value]) => {
				const input = document.createElement('input');
				input.type = 'hidden';
				input.name = key;
				input.value = value;
				form.appendChild(input);
			});

			document.body.appendChild(form);
			form.submit();
			document.body.removeChild(form);
		} else {
			window.open(this.verifyUrl, '_blank');
		}
	}

	generateFileName(assertion, fileExtension): string {
		return `${assertion.badge.name} - ${assertion.recipient.identity}${fileExtension}`;
	}

	openSaveDialog(assertion): void {
		const xhr = new XMLHttpRequest();
		xhr.open('GET', assertion.image, true);
		xhr.responseType = 'blob';
		xhr.onload = (e) => {
			if (xhr.status === 200) {
				const fileExtension = this.mimeToExtension(xhr.response.type);
				const name = this.generateFileName(assertion, fileExtension);
				saveAs(xhr.response, name);
			}
		};
		xhr.send();
	}

	mimeToExtension(mimeType: string): string {
		if (mimeType.indexOf('svg') !== -1) return '.svg';
		if (mimeType.indexOf('png') !== -1) return '.png';
		return '';
	}

	private createLoadedRouteParam() {
		return new LoadedRouteParam(this.injector.get(ActivatedRoute), 'assertionId', async (paramValue) => {
			try {
				this.assertionId = paramValue;
				const service: PublicApiService = this.injector.get(PublicApiService);
				const assertion = await service.getBadgeAssertion(paramValue);
				if (isOB2Assertion(assertion) && assertion.revoked) {
					if (assertion.revocationReason) {
						this.messageService.reportFatalError('Assertion has been revoked:', assertion.revocationReason);
					} else {
						this.messageService.reportFatalError('Assertion has been revoked.', '');
					}
				} else if (this.showDownload) {
					this.openSaveDialog(assertion);
				}
				if (this.sessionService.isLoggedIn) {
					const issuer = await this.issuerManager.issuerBySlug(assertion.badge.issuer.slug);
					this.awardingIssuers = [issuer];
				}
				const lps = await service.getLearningPathsForBadgeClass(assertion.badge.slug);

				const assertionVersion =
					Array.isArray(assertion['@context']) &&
					assertion['@context'].some((c) => c.indexOf('purl.imsglobal.org/spec/ob/v3p0') != -1)
						? '3.0'
						: '2.0';

				this.config = {
					badgeTitle: assertion.badge.name,
					headerButton: {
						title: 'RecBadgeDetail.verifyBadge',
						action: () => this.verifyBadge(),
					},
					qrCodeButton: {
						show: false,
					},
					menuitems: [
						{
							title:
								assertionVersion == '3.0'
									? 'RecBadgeDetail.downloadImage30'
									: 'RecBadgeDetail.downloadImage20',
							icon: 'lucideImage',
							action: () => this.exportPng(),
						},
						{
							title:
								assertionVersion == '3.0'
									? 'RecBadgeDetail.downloadJson30'
									: 'RecBadgeDetail.downloadJson20',
							icon: '	lucideFileCode',
							action: () => this.exportJson(),
						},
						{
							title: 'RecBadgeDetail.downloadPDF',
							icon: 'lucideFileText',
							action: () => this.downloadCertificate(),
							disabled: !this.sessionService.isLoggedIn,
						},
						// Disabled for now
						// {
						// 	title: 'View Badge',
						// 	icon: 'lucideBadge',
						// 	routerLink: routerLinkForUrl(assertion.badge.hostedUrl || assertion.badge.id),
						// },
					],
					badgeDescription: assertion.badge.description,
					awardCriteria: assertion.badge.criteria['narrative'],
					// criteria:
					// 	typeof assertion.badge.criteria != 'string' ? assertion.badge.criteria.narrative : null,
					issuerSlug: assertion.badge.issuer['slug'],
					slug: assertion.badge.id,
					category: assertion.badge['extensions:CategoryExtension'].Category,
					tags: assertion.badge.tags,
					issuerName: assertion.badge.issuer.name,
					issuerImagePlacholderUrl: this.issuerImagePlacholderUrl,
					issuerImage: assertion.badge.issuer.image,
					badgeLoadingImageUrl: this.badgeLoadingImageUrl,
					badgeFailedImageUrl: this.badgeFailedImageUrl,
					badgeImage: assertion.image,
					evidence_items: this.normalizeEvidence(assertion, assertionVersion),
					competencies: assertion.badge['extensions:CompetencyExtension'],
					license: assertion.badge['extensions:LicenseExtension'] ? true : false,
					courseUrl: assertion.badge.courseUrl,
					duration: assertion.badge['extensions:StudyLoadExtension'].StudyLoad,
					learningPaths: lps,
					version: assertionVersion,
					issuedOn: getAssertionIssuedDate(assertion) ? new Date(getAssertionIssuedDate(assertion)) : null,
					validUntil: getAssertionExpiration(assertion) ? new Date(getAssertionExpiration(assertion)) : null,
					activity_start_date:
						isOB3Assertion(assertion) && assertion.credentialSubject.activityStartDate
							? new Date(assertion.credentialSubject.activityStartDate)
							: null,
					activity_end_date:
						isOB3Assertion(assertion) && assertion.credentialSubject.activityEndDate
							? new Date(assertion.credentialSubject.activityEndDate)
							: null,
					networkBadge: assertion.badge.isNetworkBadge,
					networkImage: assertion.badge.networkImage,
					networkName: assertion.badge.networkName,
					sharedOnNetwork: assertion.badge.sharedOnNetwork,
					awardingIssuers: this.awardingIssuers,
				};
				if (assertion['extensions:recipientProfile'] && assertion['extensions:recipientProfile'].name) {
					this.awardedToDisplayName = assertion['extensions:recipientProfile'].name;
				}
				return assertion;
			} catch (err) {
				console.error('Failed to fetch assertion data', err);
			}
		});
	}

	normalizeEvidence(
		assertion: PublicApiBadgeAssertion,
		version: '2.0' | '3.0',
	): (OB3EvidenceItem | ApiBadgeInstanceEvidenceItem)[] {
		if (version === '3.0') {
			if (Array.isArray(assertion.evidence)) {
				return assertion.evidence;
			}
			return [];
		} else {
			if (Array.isArray(assertion.evidence)) {
				return assertion.evidence;
			} else if (typeof assertion.evidence === 'object' && assertion.evidence !== null) {
				return [assertion.evidence];
			} else {
				return [];
			}
		}
	}

	exportPng() {
		fetch(this.rawBakedUrl)
			.then((response) => response.blob())
			.then((blob) => {
				const link = document.createElement('a');
				const url = URL.createObjectURL(blob);
				const urlParts = this.rawBakedUrl.split('/');
				link.href = url;
				link.download = `${new Date(getAssertionIssuedDate(this.assertion)).toISOString().split('T')[0]}-${this.assertion.badge.name.trim().replace(' ', '_')}.png`;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				URL.revokeObjectURL(url);
			})
			.catch((error) => console.error('Download failed:', error));
	}

	exportJson() {
		fetch(this.rawJsonUrl)
			.then((response) => response.blob())
			.then((blob) => {
				const link = document.createElement('a');
				const url = URL.createObjectURL(blob);
				link.href = url;
				link.download = `${new Date(getAssertionIssuedDate(this.assertion)).toISOString().split('T')[0]}-${this.assertion.badge.name.trim().replace(' ', '_')}.json`;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				URL.revokeObjectURL(url);
			})
			.catch((error) => console.error('Download failed:', error));
	}

	downloadCertificate() {
		this.pdfService
			.getPdf(this.assertionSlug, 'badges')
			.then((url) => {
				this.pdfSrc = url;
				this.pdfService.downloadPdf(
					this.pdfSrc,
					this.assertion.badge.name,
					new Date(getAssertionIssuedDate(this.assertion)),
				);
			})
			.catch((error) => {
				console.log(error);
			});
	}
}
