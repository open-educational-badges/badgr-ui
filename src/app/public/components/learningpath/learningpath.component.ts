import { AfterContentInit, Component, ElementRef, Injector, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicApiService } from '../../services/public-api.service';
import { LoadedRouteParam } from '../../../common/util/loaded-route-param';
import {
	PublicApiBadgeClass,
	PublicApiBadgeClassWithIssuer,
	PublicApiIssuer,
	PublicApiLearningPath,
} from '../../models/public-api.model';
import { EmbedService } from '../../../common/services/embed.service';
import { SafeResourceUrl, Title } from '@angular/platform-browser';
import { AppConfigService } from '../../../common/app-config.service';
import { LearningPathApiService } from '../../../common/services/learningpath-api.service';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { SuccessDialogComponent } from '../../../common/dialogs/oeb-dialogs/success-dialog.component';
import { UserProfileApiService } from '../../../common/services/user-profile-api.service';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { IssuerManager } from '../../../issuer/services/issuer-manager.service';
import type { Tab } from '../../../components/oeb-tabs.component';
import { SessionService } from '../../../common/services/session.service';
import { PdfService } from '../../../common/services/pdf.service';
import { RecipientBadgeManager } from '../../../recipient/services/recipient-badge-manager.service';
import { RecipientBadgeInstance } from '../../../recipient/models/recipient-badge.model';
import { HourPipe } from '../../../common/pipes/hourPipe';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { NgIcon } from '@ng-icons/core';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { OebProgressComponent } from '../../../components/oeb-progress.component';
import { BgImageStatusPlaceholderDirective } from '../../../common/directives/bg-image-status-placeholder.directive';
import { OebTabsComponent } from '../../../components/oeb-tabs.component';
import { CountUpModule } from 'ngx-countup';
import { OebIssuerCard } from '../../../common/components/oeb-issuercard';
import { BgBadgecard } from '../../../common/components/bg-badgecard';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmH1, HlmP, HlmH3 } from '@spartan-ng/helm/typography';

@Component({
	templateUrl: './learningpath.component.html',
	providers: [RecipientBadgeManager],
	imports: [
		BgAwaitPromises,
		BgBreadcrumbsComponent,
		HlmH1,
		HlmP,
		RouterLink,
		NgIcon,
		HlmIcon,
		OebButtonComponent,
		OebProgressComponent,
		BgImageStatusPlaceholderDirective,
		HlmH3,
		OebTabsComponent,
		CountUpModule,
		OebIssuerCard,
		BgBadgecard,
		HourPipe,
		TranslatePipe,
	],
})
export class PublicLearningPathComponent implements OnInit, AfterContentInit {
	private injector = inject(Injector);
	embedService = inject(EmbedService);
	configService = inject(AppConfigService);
	publicService = inject(PublicApiService);
	private learningPathApiService = inject(LearningPathApiService);
	protected userProfileApiService = inject(UserProfileApiService);
	protected recipientBadgeManager = inject(RecipientBadgeManager);
	protected translate = inject(TranslateService);
	protected sessionService = inject(SessionService);
	private pdfService = inject(PdfService);
	issuerManager = inject(IssuerManager);
	private title = inject(Title);

	learningPathSlug: string;
	isParticipating: boolean = false;
	learningPath: PublicApiLearningPath;
	learningPathIdParam: LoadedRouteParam<PublicApiLearningPath>;
	participationButtonText: string = 'Teilnehmen';
	issuerLoaded: Promise<unknown>;
	badgeLoaded: Promise<unknown>;
	loaded: LoadedRouteParam<void>;
	issuer: PublicApiIssuer;
	badge: PublicApiBadgeClassWithIssuer;
	progressPercentage: number | undefined = undefined;
	minutesCompleted: number;
	hoursCompleted: number;
	minutesCompletedRemainder: number;
	minutesTotal: number;
	tabs: Tab[] = undefined;
	activeTab = 'all';
	loggedIn = false;
	badgeInstance: RecipientBadgeInstance | null = null;

	showDownloadButton = false;

	totalBadgeCount: number;
	openBadgeCount: number;
	finishedBadgeCount: number;

	pdfSrc: SafeResourceUrl;

	openBadges: PublicApiBadgeClass[];
	completedBadgeIds: PublicApiBadgeClass[];

	participantButtonVariant: string;

	@ViewChild('allTemplate', { static: true }) allTemplate: ElementRef;
	@ViewChild('openTemplate', { static: true }) openTemplate: ElementRef;
	@ViewChild('finishedTemplate', { static: true }) finishedTemplate: ElementRef;

	crumbs = [{ title: this.translate.instant('General.learningPaths'), routerLink: ['/catalog/learningpaths'] }];

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const injector = this.injector;

		this.title.setTitle(`LearningPath - ${this.configService.theme['serviceName'] || 'Badgr'}`);

		this.loaded = new LoadedRouteParam(injector.get(ActivatedRoute), 'learningPathId', async (paramValue) => {
			this.learningPathSlug = paramValue;
			await this.requestPath();
			if (this.progressValue() === 100 && this.learningPath.learningPathBadgeInstanceSlug) {
				this.showDownloadButton = true;
				this.recipientBadgeManager.recipientBadgeList.loadedPromise.then((results) => {
					this.badgeInstance = results.entityForSlug(this.learningPath.learningPathBadgeInstanceSlug);
				});
			}
		});
	}

	ngOnInit(): void {
		this.loggedIn = this.sessionService.isLoggedIn;
	}

	ngAfterContentInit() {
		this.tabs = [
			{
				key: 'all',
				title: 'LearningPath.badgeTabs.all',
				count: this.totalBadgeCount,
				component: this.allTemplate,
			},
			{
				key: 'inprogress',
				title: 'LearningPath.badgeTabs.inprogress',
				count: this.openBadgeCount,
				component: this.openTemplate,
			},
			{
				key: 'finished',
				title: 'LearningPath.badgeTabs.finished',
				count: this.finishedBadgeCount,
				component: this.finishedTemplate,
			},
		];
	}

	private readonly _hlmDialogService = inject(HlmDialogService);
	public openSuccessDialog() {
		const dialogRef = this._hlmDialogService.open(SuccessDialogComponent, {
			context: {
				text: `Du nimmst am Lernpfad <span class="tw-font-bold">${this.learningPath.name}</span> teil!`,
				variant: 'success',
			},
		});
	}

	private get rawUrl() {
		return `${this.configService.apiConfig.baseUrl}/public/assertions/${this.badgeInstance.slug}`;
	}

	private get rawJsonUrl() {
		return `${this.configService.apiConfig.baseUrl}/public/assertions/${this.badgeInstance.slug}.json`;
	}

	get rawBakedUrl() {
		return `${this.rawUrl}/baked`;
	}

	progressValue(): number {
		if (this.loggedIn && this.learningPath.required_badges_count <= this.learningPath.completed_badges.length) {
			return 100;
		}
		return Math.floor((this.minutesCompleted / this.minutesTotal) * 100);
	}

	requestPath() {
		const service: PublicApiService = this.injector.get(PublicApiService);
		return service.getLearningPath(this.learningPathSlug).then((response) => {
			this.learningPath = response;
			this.totalBadgeCount = response.badges.length;
			this.completedBadgeIds = response.completed_badges
				? response.completed_badges.map((badge) => badge.slug)
				: [];
			this.openBadges = response.badges.filter((badge) => !this.completedBadgeIds.includes(badge.badge.slug));

			this.tabs = [
				{
					key: 'all',
					title: 'LearningPath.badgeTabs.all',
					count: this.totalBadgeCount,
					component: this.allTemplate,
				},
				{
					key: 'inprogress',
					title: 'LearningPath.badgeTabs.inprogress',
					count: this.totalBadgeCount - (response.completed_badges ? response.completed_badges.length : 0),
					component: this.openTemplate,
				},
				{
					key: 'finished',
					title: 'LearningPath.badgeTabs.finished',
					count: response.completed_badges ? response.completed_badges.length : 0,
					component: this.finishedTemplate,
				},
			];
			this.crumbs = [
				{ title: this.translate.instant('General.learningPaths'), routerLink: ['/catalog/learningpaths'] },
				{ title: this.learningPath.name, routerLink: ['/public/learningpaths/' + this.learningPath.slug] },
			];
			if (response.progress === null) {
				this.isParticipating = false;
				this.participationButtonText = this.translate.instant('LearningPath.participate');
			} else {
				this.isParticipating = true;
				this.participationButtonText = this.translate.instant('LearningPath.notParticipateAnymore');
			}
			this.progressPercentage = response.progress;
			this.minutesTotal = response.badges.reduce(
				(acc, b) => acc + b.badge.extensions['extensions:StudyLoadExtension'].StudyLoad,
				0,
			);

			this.minutesCompleted = response.completed_badges?.reduce(
				(acc, b) => acc + b.extensions['extensions:StudyLoadExtension'].StudyLoad,
				0,
			);
			this.issuerLoaded = this.publicService.getIssuer(response.issuer_id).then((issuer) => {
				this.issuer = issuer;
			});
			this.badgeLoaded = this.publicService.getBadgeClass(response.participationBadge_id).then((badge) => {
				this.badge = badge;
				return badge;
			});
		});
	}

	formatCountUpMinutes(x: number) {
		const p = new HourPipe();
		return p.transform(x);
	}

	downloadPdf() {
		if (!this.badgeInstance) {
			return;
		} else {
			this.pdfService
				.getPdf(this.badgeInstance.slug, 'badges')
				.then((url) => {
					this.pdfSrc = url;
					this.pdfService.downloadPdf(this.pdfSrc, this.learningPath.name, new Date());
				})
				.catch((error) => {
					console.log(error);
				});
		}
	}

	downloadMicroDegree() {
		fetch(this.rawBakedUrl)
			.then((response) => response.blob())
			.then((blob) => {
				const link = document.createElement('a');
				const url = URL.createObjectURL(blob);
				const urlParts = this.rawBakedUrl.split('/');
				const inferredFileName = urlParts[urlParts.length - 1] || 'downloadedFile';
				link.href = url;
				link.download = inferredFileName;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				URL.revokeObjectURL(url);
			})
			.catch((error) => console.error('Download failed:', error));
	}

	participate() {
		this.learningPathApiService.participateInLearningPath(this.learningPathSlug).then(
			(response) => {
				if (response.body['message'] === 'Successfully joined the learning path') {
					this.openSuccessDialog();
				}
				this.requestPath();
			},
			(err) => {
				console.log(err);
			},
		);
	}

	onTabChange(tab) {
		this.activeTab = tab;
	}

	get learningPathReverseBadges() {
		return [...this.learningPath.badges].reverse();
	}

	get openBadgesReversed() {
		return [...this.openBadges].reverse();
	}
}
