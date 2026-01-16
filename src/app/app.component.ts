import {
	AfterViewInit,
	Component,
	OnInit,
	Renderer2,
	ViewChild,
	signal,
	computed,
	DOCUMENT,
	inject,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { Router, RouterLinkActive, RouterLink, RouterOutlet } from '@angular/router';
import { MessageService } from './common/services/message.service';
import { SessionService } from './common/services/session.service';
import { CommonDialogsService } from './common/services/common-dialogs.service';
import { AppConfigService } from './common/app-config.service';
import { ConfirmDialog } from './common/dialogs/confirm-dialog.component';
import { NounprojectDialog } from './common/dialogs/nounproject-dialog/nounproject-dialog.component';
import '../thirdparty/scopedQuerySelectorShim';
import { EventsService } from './common/services/events.service';
import { OAuthManager } from './common/services/oauth-manager.service';
import { EmbedService } from './common/services/embed.service';
import { InitialLoadingIndicatorService } from './common/services/initial-loading-indicator.service';
import { UserProfileManager } from './common/services/user-profile-manager.service';
import { NewTermsDialog } from './common/dialogs/new-terms-dialog.component';
import { QueryParametersService } from './common/services/query-parameters.service';
import { Title } from '@angular/platform-browser';
import { Issuer } from './issuer/models/issuer.model';
import { IssuerManager } from './issuer/services/issuer-manager.service';
import { ExportPdfDialog } from './common/dialogs/export-pdf-dialog/export-pdf-dialog.component';
import { LanguageService } from './common/services/language.service';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { MenuItem } from './common/components/badge-detail/badge-detail.component.types';
import { CmsApiMenu } from './common/model/cms-api.model';
import { CmsManager } from './common/services/cms-manager.service';
import { SourceListenerDirective } from './mozz-transition/directives/source-listener/source-listener.directive';
import { OebDropdownComponent } from './components/oeb-dropdown.component';
import { OebButtonComponent } from './components/oeb-button.component';
import { NgIcon } from '@ng-icons/core';
import { BgPopupMenuTriggerDirective, BgPopupMenu } from './common/components/bg-popup-menu.component';
import { SvgIconComponent } from './common/components/svg-icon.component';
import { MenuItemDirective } from './common/directives/bg-menuitem.directive';
import { IconsProvider } from './icons-provider';
import { CmsMenuItemsPipe } from './common/pipes/cmsMenuItems.pipe';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { environment } from 'src/environments/environment';

// Shim in support for the :scope attribute
// See https://github.com/lazd/scopedQuerySelectorShim and
// https://stackoverflow.com/questions/3680876/using-queryselectorall-to-retrieve-direct-children/21126966#21126966

@Component({
	selector: 'app-root',
	host: {
		'(document:click)': 'onDocumentClick($event)',
		'[class.l-stickyfooter-chromeless]': '! showAppChrome',
	},
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss'],
	imports: [
		SourceListenerDirective,
		OebDropdownComponent,
		RouterLinkActive,
		RouterLink,
		OebButtonComponent,
		NgStyle,
		NgIcon,
		HlmIcon,
		BgPopupMenuTriggerDirective,
		SvgIconComponent,
		BgPopupMenu,
		MenuItemDirective,
		RouterOutlet,
		ConfirmDialog,
		ExportPdfDialog,
		NounprojectDialog,
		TranslatePipe,
		CmsMenuItemsPipe,
	],
})
export class AppComponent implements OnInit, AfterViewInit {
	private sessionService = inject(SessionService);
	private profileManager = inject(UserProfileManager);
	private router = inject(Router);
	private messageService = inject(MessageService);
	private configService = inject(AppConfigService);
	private commonDialogsService = inject(CommonDialogsService);
	private eventService = inject(EventsService);
	private oAuthManager = inject(OAuthManager);
	private embedService = inject(EmbedService);
	private renderer = inject(Renderer2);
	private queryParams = inject(QueryParametersService);
	private initialLoadingIndicatorService = inject(InitialLoadingIndicatorService);
	private titleService = inject(Title);
	protected issuerManager = inject(IssuerManager);
	private languageService = inject(LanguageService);
	protected translate = inject(TranslateService);
	private document = inject<Document>(DOCUMENT);
	private cmsManager = inject(CmsManager);

	aboutBadgesMenuItems: MenuItem[] = [
		{
			title: 'Badges A-Z',
			routerLink: ['/catalog/badges'],
			icon: 'lucideAward',
		},
		{
			title: 'General.institutionsNav',
			routerLink: ['/catalog/issuers'],
			icon: 'lucideWarehouse',
		},
		{
			title: 'LearningPath.learningpathsNav',
			routerLink: ['/catalog/learningpaths'],
			icon: 'lucideRoute',
		},
		// {
		// 	title: 'Network.networksNav',
		// 	routerLink: ['/catalog/networks'],
		// 	icon: 'lucideNetwork',
		// },
	];
	accountMenuItems: MenuItem[] = [
		{
			title: 'General.backpack',
			routerLink: ['/recipient/badges'],
			icon: 'lucideHexagon',
		},
		{
			title: 'NavItems.myProfile',
			routerLink: ['/profile/profile'],
			icon: 'lucideUsers',
		},
		{
			title: 'NavItems.appIntegrations',
			routerLink: ['/profile/app-integrations'],
			icon: 'lucideRepeat2',
		},
		{
			title: 'Logout',
			routerLink: ['/auth/logout'],
			icon: 'lucideLogOut',
		},
	];

	title = 'Badgr Angular';
	loggedIn = false;
	mobileNavOpen = false;
	isUnsupportedBrowser = false;
	issuers = signal<Issuer[] | undefined>(undefined);
	showIssuersTab = computed(() => {
		// return !this.features.disableIssuers && this.issuers() !== undefined; this line was triggering errors
		return !this.features.disableIssuers;
	});

	copyrightYear = new Date().getFullYear();

	cmsMenus: CmsApiMenu;
	headerCmsItems: MenuItem[] = [];

	@ViewChild('confirmDialog')
	private confirmDialog: ConfirmDialog;

	@ViewChild('nounprojectDialog')
	private nounprojectDialog: NounprojectDialog;

	@ViewChild('newTermsDialog')
	private newTermsDialog: NewTermsDialog;

	@ViewChild('exportPdfDialog')
	private exportPdfDialog: ExportPdfDialog;

	@ViewChild('issuerLink')
	private issuerLink: unknown;

	// For changing language of texts defined in ts file
	lngObserver = this.languageService.getSelectedLngObs();
	selectedLng: string = 'de';

	get showAppChrome() {
		return !this.embedService.isEmbedded;
	}

	get theme() {
		return this.configService.theme;
	}

	get features() {
		return this.configService.featuresConfig;
	}

	get apiBaseUrl() {
		return this.configService.apiConfig.baseUrl;
	}

	get hasFatalError(): boolean {
		return this.messageService.hasFatalError;
	}
	get fatalMessage(): string {
		return this.messageService.message ? this.messageService.message.message : undefined;
	}
	get fatalMessageDetail(): string {
		return this.messageService.message ? this.messageService.message.detail : undefined;
	}

	readonly unavailableImageSrc = '../assets/@concentricsky/badgr-style/dist/images/image-error.svg';

	initFinished: Promise<unknown> = new Promise(() => {});

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const sessionService = this.sessionService;
		const router = this.router;
		const messageService = this.messageService;
		const renderer = this.renderer;
		const titleService = this.titleService;
		const document = this.document;
		const cmsManager = this.cmsManager;

		// Initialize App language
		this.languageService.setInitialAppLanguage();
		this.lngObserver.subscribe((lng) => {
			if (lng != null) {
				this.selectedLng = lng;
			}
		});

		try {
			// @ts-expect-error umami is injected globally
			// Start umami tracking
			umami.track();
		} catch (e) {}

		messageService.useRouter(router);

		titleService.setTitle(this.configService.theme['serviceName'] || 'Badgr');

		this.initScrollFix();

		const authCode = this.queryParams.queryStringValue('authCode', true);
		if (sessionService.isLoggedIn && !authCode) this.refreshProfile();

		if (this.embedService.isEmbedded) {
			// Enable the embedded indicator class on the body
			renderer.addClass(document.body, 'embeddedcontainer');
		}

		cmsManager.menus$.subscribe((menu) => {
			this.cmsMenus = menu;
		});
	}

	refreshProfile = () => {
		this.profileManager.userProfileSet.changed$.subscribe((set) => {
			if (set.entities.length && set.entities[0].agreedTermsVersion !== set.entities[0].latestTermsVersion) {
				// Dialog will be opened by the auth guard or new-terms page
				// Don't call openDialog() here as commonDialogsService is not initialized yet
			}

			// for issuers tab
			this.profileManager.userProfile.emails.updateList().then(() => {
				this.issuerManager.myIssuers$.subscribe(
					(issuers) => {
						this.issuers.set(issuers.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
					},
					(error) => {
						this.messageService.reportAndThrowError(
							this.translate.instant('Issuer.failLoadissuers'),
							error,
						);
					},
				);
			});
		});

		// Load the profile
		this.profileManager.userProfileSet.ensureLoaded();
	};

	dismissUnsupportedBrowserMessage() {
		this.isUnsupportedBrowser = false;
	}

	toggleMobileNav() {
		this.mobileNavOpen = !this.mobileNavOpen;
	}
	get isOAuthAuthorizationInProcess() {
		return this.oAuthManager.isAuthorizationInProgress;
	}

	onDocumentClick($event: MouseEvent) {
		this.eventService.documentClicked.next($event);
	}

	get isRequestPending() {
		return this.messageService.pendingRequestCount > 0;
	}

	private initScrollFix() {
		// Scroll the header into view after navigation, mainly for mobile where the menu is at the bottom of the display
		this.router.events.subscribe((url) => {
			this.mobileNavOpen = false;
			const header = document.querySelector('header') as HTMLElement;
			if (header) {
				header.scrollIntoView();
			}
		});
	}

	ngOnInit() {
		this.loggedIn = this.sessionService.isLoggedIn;

		this.sessionService.loggedin$.subscribe((loggedIn) =>
			setTimeout(() => {
				this.loggedIn = loggedIn;
				if (loggedIn) this.refreshProfile();
			}),
		);

		this.translate.onLangChange.subscribe(() => {
			this.document.documentElement.lang = this.translate.currentLang;
		});

		if (environment.networksEnabled) {
			this.aboutBadgesMenuItems.push({
				title: 'Network.networksNav',
				routerLink: ['/catalog/networks'],
				icon: 'lucideNetwork',
			});
		}
	}

	ngAfterViewInit() {
		this.commonDialogsService.init(
			this.confirmDialog,
			this.newTermsDialog,
			this.exportPdfDialog,
			this.nounprojectDialog,
		);
	}

	defaultLogoSmall = '../breakdown/static/images/logo.svg';
	defaultLogoDesktop = '../breakdown/static/images/logo-desktop.svg';
	get logoSmall() {
		return this.theme['logoImg'] ? this.theme['logoImg']['small'] : this.defaultLogoSmall;
	}
	get logoDesktop() {
		return this.theme['logoImg'] ? this.theme['logoImg']['desktop'] : this.defaultLogoDesktop;
	}

	// For changing language based on selection
	changeLng(lng) {
		this.languageService.setLanguage(lng);
	}

	openLinkedIn() {
		window.open('https://www.linkedin.com/company/106504068', '_blank');
	}
}
