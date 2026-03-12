import {
	Component,
	ElementRef,
	OnInit,
	TemplateRef,
	ViewChild,
	inject,
	signal,
	viewChild,
	AfterContentInit,
	AfterViewInit,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../common/services/session.service';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { MessageService } from '../../../common/services/message.service';
import { IssuerManager } from '../../services/issuer-manager.service';
import { BadgeClassManager } from '../../services/badgeclass-manager.service';
import { Issuer } from '../../models/issuer.model';
import { BadgeClass } from '../../models/badgeclass.model';
import { Title } from '@angular/platform-browser';
import { preloadImageURL } from '../../../common/util/file-util';
import { AppConfigService } from '../../../common/app-config.service';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { SuccessDialogComponent } from '../../../common/dialogs/oeb-dialogs/success-dialog.component';
import { DialogComponent } from '../../../components/dialog.component';
import { NgModel, FormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, map, tap } from 'rxjs';
import { PublicApiService } from '../../../public/services/public-api.service';
import { IssuerStaffRequestApiService } from '../../services/issuer-staff-request-api.service';
import { UserProfileApiService } from '../../../common/services/user-profile-api.service';
import { ApiStaffRequest } from '../../models/staffrequest-api.model';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { BadgrApiFailure } from '../../../common/services/api-failure';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { NgTemplateOutlet, NgClass, NgStyle } from '@angular/common';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { NgIcon } from '@ng-icons/core';
import { BgImageStatusPlaceholderDirective } from '../../../common/directives/bg-image-status-placeholder.directive';
import { OebTabsComponent } from '../../../components/oeb-tabs.component';
import { environment } from 'src/environments/environment';
import { NetworkListComponent } from '../network-list/network-list.component';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmH1, HlmH3, HlmP } from '@spartan-ng/helm/typography';
import { toSignal } from '@angular/core/rxjs-interop';
import { NetworkManager } from '~/issuer/services/network-manager.service';
import { Network } from '~/issuer/network.model';
import { UserPreferenceService } from '~/common/services/user-preference.service';

@Component({
	selector: 'issuer-list',
	templateUrl: './issuer-list.component.html',
	imports: [
		FormMessageComponent,
		HlmH1,
		HlmH3,
		HlmP,
		OebButtonComponent,
		RouterLink,
		NgTemplateOutlet,
		NgIcon,
		HlmIcon,
		BgImageStatusPlaceholderDirective,
		NgClass,
		FormsModule,
		NgStyle,
		TranslatePipe,
		OebTabsComponent,
		NetworkListComponent,
	],
})
export class IssuerListComponent
	extends BaseAuthenticatedRoutableComponent
	implements OnInit, AfterContentInit, AfterViewInit
{
	protected title = inject(Title);
	protected messageService = inject(MessageService);
	protected issuerManager = inject(IssuerManager);
	protected networkManager = inject(NetworkManager);
	protected configService = inject(AppConfigService);
	protected badgeClassService = inject(BadgeClassManager);
	protected publicApiService = inject(PublicApiService);
	private translate = inject(TranslateService);
	private issuerStaffRequestApiService = inject(IssuerStaffRequestApiService);
	private userProfileApiService = inject(UserProfileApiService);
	private userPreferences = inject(UserPreferenceService);

	readonly issuerPlaceholderSrc = preloadImageURL('../../../../breakdown/static/images/placeholderavatar-issuer.svg');
	readonly noIssuersPlaceholderSrc =
		'../../../../assets/@concentricsky/badgr-style/dist/images/image-empty-issuer.svg';

	Array = Array;

	issuers: Issuer[] = null;
	networks = signal<Network[]>([]);
	badges: BadgeClass[] = null;

	issuersLoaded: Promise<unknown>;
	networksLoaded: Promise<unknown>;

	badgesLoaded: Promise<unknown>;

	@ViewChild('pluginBox') public pluginBoxElement: ElementRef;

	@ViewChild('headerTemplate')
	headerTemplate: TemplateRef<void>;

	@ViewChild('headerQuestionMarkTemplate')
	headerQuestionMarkTemplate: TemplateRef<void>;

	@ViewChild('requestStaffMembershipTemplate')
	requestStaffMembershipTemplate: TemplateRef<void>;

	@ViewChild('issuerInfoTemplate')
	issuerInfoTemplate: TemplateRef<void>;

	@ViewChild('staffRequestFooterTemplate')
	staffRequestFooterTemplate: TemplateRef<void>;

	@ViewChild('successfullyRequestedMembershipHeaderTemplate')
	successfullyRequestedMembershipHeaderTemplate: TemplateRef<void>;

	@ViewChild('issuersTemplate', { static: true })
	issuersTemplate: ElementRef<void>;

	@ViewChild('networksTemplate', { static: true })
	networksTemplate: ElementRef<void>;

	@ViewChild('issuerSearchInput') issuerSearchInput: ElementRef<HTMLInputElement>;
	@ViewChild('issuerSearchInputModel') issuerSearchInputModel: NgModel;

	get theme() {
		return this.configService.theme;
	}
	get features() {
		return this.configService.featuresConfig;
	}

	issuerSearchQuery = '';
	issuersShowResults = false;
	issuerSearchResults: any[] = [];
	selectedIssuer: Issuer | null = null;

	staffRequests: ApiStaffRequest[] = [];

	issuersLoading = false;
	issuerSearchLoaded = false;

	dialogRef: BrnDialogRef<any> = null;

	activeTab: string = 'issuers';

	tabs: any[] = [];

	plural = {
		issuer: {
			'=0': this.translate.instant('Issuer.noInstitutions'),
			'=1': this.translate.instant('Issuer.oneInstitution'),
			other: this.translate.instant('Issuer.multiInstitutions'),
		},
		badges: {
			'=0': this.translate.instant('Badge.noBadges'),
			'=1': '<strong class="u-text-bold">1</strong> ' + this.translate.instant('General.badge'),
			other: '<strong class="u-text-bold">#</strong> ' + this.translate.instant('General.badges'),
		},
		recipient: {
			'=0': this.translate.instant('Badge.noRecipients'),
			'=1': this.translate.instant('Badge.oneRecipient'),
			other: this.translate.instant('Badge.multiRecipients'),
		},
	};

	constructor() {
		const loginService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, loginService);
		const title = this.title;

		title.setTitle(`Issuers - ${this.configService.theme['serviceName'] || 'Badgr'}`);

		// subscribe to issuer and badge class changes
		this.issuersLoaded = this.loadIssuers();
		this.networksLoaded = this.loadNetworks();
	}

	issuerSearchInputFocusOut() {
		// delay hiding for click event
		setTimeout(() => {
			this.issuersShowResults = false;
		}, 200);
	}

	loadIssuers = () => {
		return new Promise<void>((resolve, reject) => {
			this.issuerManager.myIssuers$.subscribe(
				(issuers) => {
					this.issuers = issuers
						.filter((i) => !i.is_network)
						.slice()
						.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
					resolve();
				},
				(error) => {
					this.messageService.reportAndThrowError(this.translate.instant('Issuer.failLoadissuers'), error);
					resolve();
				},
			);
		});
	};

	loadNetworks = () => {
		return new Promise<void>((resolve, reject) => {
			this.networkManager.myNetworks$.subscribe(
				(issuers) => {
					this.networks.set(
						issuers
							.filter((i) => i.is_network)
							.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
					);
					resolve();
				},
				(error) => {
					this.messageService.reportAndThrowError(this.translate.instant('Issuer.failLoadissuers'), error);
					resolve();
				},
			);
		});
	};

	ngOnInit() {
		super.ngOnInit();

		this.prepareTexts();

		// Translate: to update predefined text when language is changed
		this.translate.onLangChange.subscribe((event) => {
			console.log('lng:', event.lang);
			this.prepareTexts();
		});

		this.route.queryParams.subscribe((params) => {
			if (params.hasOwnProperty('newsletter_confirmed')) {
				this.openSuccessDialog();
				this.router.navigate([], {
					queryParams: { newsletter_confirmed: null },
					queryParamsHandling: 'merge',
				});
			}
		});

		this.route.queryParams.subscribe((params) => {
			if (params['tab']) {
				this.activeTab = params['tab'];
			}
		});

		this.userProfileApiService.getIssuerStaffRequests().then((r) => (this.staffRequests = r.body));
	}

	ngAfterContentInit() {
		if (!environment.networksEnabled) {
			this.tabs = [
				{
					key: 'issuers',
					title: 'General.institutions',
					component: this.issuersTemplate,
				},
			];
		} else {
			this.tabs = [
				{
					key: 'issuers',
					title: 'General.institutions',
					component: this.issuersTemplate,
				},
				{
					key: 'networks',
					title: 'General.networks',
					component: this.networksTemplate,
				},
			];
		}
	}

	async issuerSearchChange() {
		if (this.issuerSearchQuery.length >= 3) {
			this.issuersLoading = true;
			try {
				this.issuerSearchResults = [];
				this.issuerSearchResults = await this.publicApiService.searchIssuers(this.issuerSearchQuery);
			} catch (error) {
				this.messageService.reportAndThrowError(`Failed to issuers: ${error.message}`, error);
			}
			this.issuersLoading = false;
			this.issuerSearchLoaded = true;
		}
	}

	selectIssuerFromDropdown(issuer) {
		this.issuerSearchQuery = issuer.name;
		this.selectedIssuer = issuer;
	}

	ngAfterViewInit() {
		this.issuerSearchInputModel.valueChanges
			.pipe(debounceTime(500))
			.pipe(distinctUntilChanged())
			.subscribe(() => {
				this.issuerSearchChange();
			});
	}

	closeDialog() {
		if (this.dialogRef) {
			this.dialogRef.close();
		}
	}

	requestMembership() {
		this.issuerStaffRequestApiService.requestIssuerStaffMembership(this.selectedIssuer.slug).then(
			(res) => {
				if (res.ok) {
					this.closeDialog();
					this.staffRequests.push(res.body as ApiStaffRequest);
					this.openSuccessfullyRequestedMembershipDialog();
					this.selectedIssuer = null;
					this.issuerSearchQuery = '';
				}
			},
			(error) => {
				this.closeDialog();
				const err = BadgrApiFailure.from(error);
				BadgrApiFailure.messageIfThrottableError(
					err.overallMessage || `${this.translate.instant('Issuer.addMember_failed')}: ${err.firstMessage}`,
				);
				if (err.fieldMessages.error) {
					this.messageService.reportAndThrowError(err.fieldMessages.error);
				} else {
					this.messageService.reportAndThrowError(
						'Etwas ist schiefgelaufen! Bitte probiere es erneut oder kontaktiere unseren Support.',
					);
				}
			},
		);
	}

	onTabChange(tab) {
		this.activeTab = tab;

		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: { tab: tab },
		});
	}

	private readonly _hlmDialogService = inject(HlmDialogService);
	public openSuccessDialog() {
		const dialogRef = this._hlmDialogService.open(SuccessDialogComponent, {
			context: {
				text: this.translate.instant('Newsletter.confirmedSubscription'),
				variant: 'success',
			},
		});
	}

	public openIssuerInfoDialog() {
		const dialogRef = this._hlmDialogService.open(DialogComponent, {
			context: {
				headerTemplate: this.headerTemplate,
				content: this.issuerInfoTemplate,
				variant: 'default',
				footer: false,
			},
		});

		this.dialogRef = dialogRef;
	}

	public openRequestStaffMembershipDialog() {
		const dialogRef = this._hlmDialogService.open(DialogComponent, {
			context: {
				headerTemplate: this.headerQuestionMarkTemplate,
				content: this.requestStaffMembershipTemplate,
				variant: 'info',
				templateContext: {
					issuername: this.selectedIssuer.name,
				},
			},
		});
		this.dialogRef = dialogRef;
	}

	public openSuccessfullyRequestedMembershipDialog() {
		this._hlmDialogService.open(DialogComponent, {
			context: {
				headerTemplate: null,
				content: `
					<p class='tw-text-oebblack tw-text-lg'>
						<span>
						${this.translate.instant('Issuer.staffRequestForwarded')}
						</span>
						<span class='tw-font-bold'>
						${this.selectedIssuer.name}
						</span>
						<span>
						${this.translate.instant('General.forwarded') + '.'}
						</span>
					</p>
					<br>
					<span class='tw-text-oebblack tw-text-lg tw-mt-6'>
					${this.translate.instant('Issuer.staffRequestForwardedEmail')}
					</span>
					`,
				variant: 'success',
				footer: false,
			},
		});
	}

	linkedInIdHeaderTemplate = viewChild.required<TemplateRef<any>>('linkedInIdDialogHeader');
	linkedInIdBodyTemplate = viewChild.required<TemplateRef<any>>('linkedInIdDialogBody');

	public async openLinkedInHintDialog(issuer: Issuer) {
		if (!issuer.currentUserStaffMember.isOwner) return;
		const issuerSlug = issuer.slug;
		const prefKey = 'linkedInIDPromptForInstitution';
		const pref = await this.userPreferences.getPreference(prefKey, '[]');
		if (pref === undefined || pref === null)
			// not logged in or unsuccessful
			return;
		const promptedInstitutions = JSON.parse(pref) as string[];
		if (!promptedInstitutions.find((x) => x === issuerSlug)) {
			this.dialogRef = this._hlmDialogService.open(DialogComponent, {
				context: {
					headerTemplate: this.linkedInIdHeaderTemplate(),
					content: this.linkedInIdBodyTemplate(),
					templateContext: { slug: issuerSlug },
				},
			});
			await this.userPreferences.setPreference(prefKey, JSON.stringify([...promptedInstitutions, issuerSlug]));
		}
	}

	// initialize predefined text
	prepareTexts() {
		// Plural
		this.plural = {
			issuer: {
				'=0': this.translate.instant('Issuer.noInstitutions'),
				'=1': this.translate.instant('Issuer.oneInstitution'),
				other: this.translate.instant('Issuer.multiInstitutions'),
			},
			badges: {
				'=0': this.translate.instant('Badge.noBadges'),
				'=1': '<strong class="u-text-bold">1</strong> ' + this.translate.instant('General.badge'),
				other: '<strong class="u-text-bold">#</strong> ' + this.translate.instant('General.badges'),
			},
			recipient: {
				'=0': this.translate.instant('Badge.noRecipients'),
				'=1': this.translate.instant('Badge.oneRecipient'),
				other: this.translate.instant('Badge.multiRecipients'),
			},
		};
	}

	revokeStaffRequest(requestId: string) {
		this.userProfileApiService.revokeIssuerStaffRequest(requestId).then((r) => {
			if (r.ok) {
				this.staffRequests = this.staffRequests.filter((req) => req.entity_id != requestId);
			}
		});
	}

	calculateDropdownMaxHeight(el: HTMLElement, minHeight = 100) {
		const rect = el.getBoundingClientRect();
		let maxHeight = Math.ceil(window.innerHeight - rect.top - rect.height - 20);
		if (maxHeight < minHeight) {
			maxHeight = Math.ceil(rect.top - 20);
		}
		return maxHeight;
	}
	calculateDropdownBottom(el: HTMLElement, minHeight = 100) {
		const rect = el.getBoundingClientRect();
		const maxHeight = Math.ceil(window.innerHeight - rect.top - rect.height - 20);
		if (maxHeight < minHeight) {
			return rect.height + 2;
		}
		return null;
	}
}
