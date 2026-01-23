import { Component, Input, OnInit, Output, EventEmitter, ViewChild, inject, TemplateRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from '../../../common/services/message.service';
import { Title } from '@angular/platform-browser';
import { UserProfileManager } from '../../../common/services/user-profile-manager.service';
import { AppConfigService } from '../../../common/app-config.service';
import { Issuer } from '../../../issuer/models/issuer.model';
import { BadgeClass } from '../../../issuer/models/badgeclass.model';
import { IssuerManager } from '../../../issuer/services/issuer-manager.service';
import { MenuItem, PageConfig } from '../badge-detail/badge-detail.component.types';
import { TranslateService, TranslatePipe, TranslateModule } from '@ngx-translate/core';
import { ApiLearningPath } from '../../../common/model/learningpath-api.model';
import { LearningPathApiService } from '../../../common/services/learningpath-api.service';
import { DangerDialogComponentTemplate } from '../../dialogs/oeb-dialogs/danger-dialog-template.component';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { InfoDialogComponent } from '../../dialogs/oeb-dialogs/info-dialog.component';
import { QrCodeApiService } from '../../../issuer/services/qrcode-api.service';
import { ApiQRCode } from '../../../issuer/models/qrcode-api.model';
import { SessionService } from '../../services/session.service';
import { BgImageStatusPlaceholderDirective } from '../../directives/bg-image-status-placeholder.directive';
import { NgIf, NgFor } from '@angular/common';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { OebDropdownComponent } from '../../../components/oeb-dropdown.component';
import { SvgIconComponent } from '../svg-icon.component';
import { OebTabsComponent, Tab } from '../../../components/oeb-tabs.component';
import { BgAwaitPromises } from '../../directives/bg-await-promises';
import { DatatableComponent } from '../../../components/datatable-badges.component';
import { FormsModule } from '@angular/forms';
import { BgBadgecard } from '../bg-badgecard';
import { LearningPathDatatableComponent } from '../../../components/datatable-learningpaths.component';
import { BgLearningPathCard } from '../bg-learningpathcard';
import { PublicApiBadgeClass, PublicApiIssuer, PublicApiLearningPath } from '../../../public/models/public-api.model';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmH1, HlmP } from '@spartan-ng/helm/typography';
import { NgTemplateOutlet } from '@angular/common';
import { NetworkApiService } from '~/issuer/services/network-api.service';
import { CommonEntityManager } from '~/entity-manager/services/common-entity-manager.service';
import { IssuerApiService } from '~/issuer/services/issuer-api.service';
import { PublicApiService } from '~/public/services/public-api.service';

interface NetworkBadgeGroup {
	issuerName: string;
	badges: BadgeResult[];
	networkIssuer?: any;
}
import { MatchingAlgorithm } from '~/common/util/matching-algorithm';
import { ApiBadgeClassNetworkShare } from '~/issuer/models/badgeclass-api.model';
import { environment } from 'src/environments/environment';
import { LinkEntry } from '../bg-breadcrumbs/bg-breadcrumbs.component';

@Component({
	selector: 'oeb-issuer-detail',
	templateUrl: './oeb-issuer-detail.component.html',
	styleUrl: './oeb-issuer-detail.component.scss',
	imports: [
		BgImageStatusPlaceholderDirective,
		HlmH1,
		NgIf,
		HlmP,
		OebButtonComponent,
		RouterLink,
		OebDropdownComponent,
		SvgIconComponent,
		OebTabsComponent,
		BgAwaitPromises,
		DatatableComponent,
		FormsModule,
		HlmInput,
		NgFor,
		BgBadgecard,
		LearningPathDatatableComponent,
		BgLearningPathCard,
		TranslatePipe,
		TranslateModule,
		NgTemplateOutlet,
	],
})
export class OebIssuerDetailComponent implements OnInit {
	private router = inject(Router);
	translate = inject(TranslateService);
	protected messageService = inject(MessageService);
	protected title = inject(Title);
	protected issuerManager = inject(IssuerManager);
	protected profileManager = inject(UserProfileManager);
	protected entityManager = inject(CommonEntityManager);
	private configService = inject(AppConfigService);
	private learningPathApiService = inject(LearningPathApiService);
	private qrCodeApiService = inject(QrCodeApiService);
	private sessionService = inject(SessionService);
	private networkApiService = inject(NetworkApiService);
	private issuerApiService = inject(IssuerApiService);
	private publicApiService = inject(PublicApiService);

	@Input() issuer: Issuer | PublicApiIssuer;
	@Input() issuerPlaceholderSrc: string;
	@Input() issuerActionsMenu: any;
	@Input() badges: BadgeClass[] | PublicApiBadgeClass[];
	@Input() networks: PublicApiIssuer[];
	@Input() partner_issuers: PublicApiIssuer[];
	@Input() public: boolean = false;
	@Input() crumbs: LinkEntry[];
	@Output() issuerDeleted = new EventEmitter();

	learningPathsPromise: Promise<unknown>;
	learningPaths: (ApiLearningPath | PublicApiLearningPath)[];
	requestsLoaded: Promise<Map<string, ApiQRCode[]>>;
	networkRequestsLoaded: Promise<Map<string, ApiQRCode[]>>;
	userIsMember = false;
	env = environment;

	private readonly _hlmDialogService = inject(HlmDialogService);

	isFullIssuer(issuer: Issuer | PublicApiIssuer): issuer is Issuer {
		return 'currentUserStaffMember' in issuer;
	}

	menuItemsPublic: MenuItem[] = [
		{
			title: 'Issuer.jsonView',
			action: (a: any) => this.routeToJson(),
			// action: (a:any) => this.delete(a),
			icon: 'lucideFileQuestion',
		},
	];

	menuItems: MenuItem[] = [
		{
			title: 'General.edit',
			routerLink: ['./edit'],
			icon: 'lucidePencil',
		},
		{
			title: 'General.delete',
			// routerLink: ['/catalog/badges'],
			action: (a: any) => this.delete(a),
			icon: 'lucideTrash2',
		},
		{
			title: 'General.members',
			routerLink: ['./staff'],
			icon: 'lucideUsers',
		},
	];

	networkGroups: Map<string, { network: any; badges: BadgeResult[]; sharedAt: string }> = new Map();
	networkGroupsArray: { network: any; badges: BadgeResult[]; sharedAt: string }[] = [];

	sharedBadgeSlugs = new Set<string>();

	tabs: Tab[] = undefined;
	activeTab = 'badges';

	badgeTemplateTabs: any = undefined;
	activeTabBadgeTemplate = 'issuer-badges';

	@ViewChild('badgesTemplate', { static: false }) badgesTemplate: TemplateRef<any>;
	@ViewChild('learningPathTemplate', { static: false }) learningPathTemplate: TemplateRef<any>;
	@ViewChild('issuerBadgesTemplate', { static: false }) issuerBadgesTemplate: TemplateRef<any>;
	@ViewChild('networkBadgesTemplate', { static: false }) networkBadgesTemplate: TemplateRef<any>;

	badgeResults: BadgeResult[] = [];
	networkBadgeInstanceResults: NetworkBadgeGroup[] = [];
	maxDisplayedResults = 100;

	private _searchQuery = '';
	get searchQuery() {
		return this._searchQuery;
	}
	set searchQuery(query) {
		this._searchQuery = query;
		this.updateResults();
	}

	/**
	 * Property used for rendering <learningpaths-datatable /> which is only
	 * available if we are working with the non-public ApiLearningPaths
	 * of an issuer. Therefore this remains null when public.
	 */
	get apiLearningPaths() {
		return this.public ? null : (this.learningPaths as ApiLearningPath[]);
	}

	private async updateResults() {
		this.badgeResults.length = 0;

		if (this.sessionService.isLoggedIn) {
			this.requestsLoaded = Promise.all(
				this.badges.map((b) =>
					this.qrCodeApiService
						.getQrCodesForIssuerByBadgeClass(b.issuerSlug, b.slug)
						.then((p) => ({ key: b.slug, value: p })),
				),
			).then((d) =>
				d.reduce((map, obj) => {
					map.set(obj.key, obj.value);
					return map;
				}, new Map<string, ApiQRCode[]>()),
			);
		}
		const requestMap = await this.requestsLoaded;

		const addBadgeToResults = async (badge: BadgeClass | PublicApiBadgeClass) => {
			if (this.badgeResults.length > this.maxDisplayedResults) {
				return false;
			}

			if (badge instanceof BadgeClass) {
				if (badge.extension && badge.extension['extensions:CategoryExtension'].Category === 'learningpath') {
					return false;
				}

				if (badge.isNetworkBadge || badge.sharedOnNetwork) {
					return false;
				}
			}

			this.badgeResults.push(
				new BadgeResult(
					badge,
					this.issuer.name,
					badge instanceof BadgeClass ? this.getRequestCount(badge, requestMap) : 0,
					badge instanceof BadgeClass ? badge.recipientCount : 0,
				),
			);

			return true;
		};

		this.badges.filter(MatchingAlgorithm.badgeMatcher(this._searchQuery)).forEach(addBadgeToResults);
		this.badgeResults.sort(this.sortBadgeResult);
	}

	private async updateNetworkResults() {
		try {
			this.networkBadgeInstanceResults.length = 0;

			const networkBadgeGroups: any = await this.networkApiService.getIssuerNetworkBadges(this.issuer.slug);
			if (!networkBadgeGroups || networkBadgeGroups.length === 0) {
				return;
			}

			const allBadgeClasses: BadgeClass[] = [];
			for (const group of networkBadgeGroups) {
				for (const networkBadgeClass of group.badge_classes) {
					const badgeClass = new BadgeClass(this.entityManager, networkBadgeClass);
					allBadgeClasses.push(badgeClass);
				}
			}

			let requestMap = new Map<string, ApiQRCode[]>();
			if (this.sessionService.isLoggedIn && allBadgeClasses.length > 0) {
				this.networkRequestsLoaded = Promise.all(
					allBadgeClasses.map((badge) =>
						this.qrCodeApiService
							.getQrCodesForIssuerByBadgeClass(badge.issuerSlug, badge.slug)
							.then((p) => ({ key: badge.slug, value: p }))
							.catch(() => ({ key: badge.slug, value: [] })),
					),
				).then((d) =>
					d.reduce((map, obj) => {
						map.set(obj.key, obj.value);
						return map;
					}, new Map<string, ApiQRCode[]>()),
				);

				requestMap = await this.networkRequestsLoaded;
			}

			for (const group of networkBadgeGroups) {
				const groupBadges: BadgeResult[] = [];

				for (const networkBadgeClass of group.badge_classes) {
					const badgeClass = new BadgeClass(this.entityManager, networkBadgeClass);

					if (this.sharedBadgeSlugs?.has(badgeClass.slug)) {
						continue;
					}

					const requestCount =
						requestMap.get(badgeClass.slug)?.reduce((sum, qr) => sum + qr.request_count, 0) ?? 0;

					const awardedCount = networkBadgeClass.awarded_count ?? 0;

					if (awardedCount === 0) {
						continue;
					}

					const badgeResult = new BadgeResult(
						badgeClass,
						group.network_issuer.name,
						requestCount,
						awardedCount,
					);

					groupBadges.push(badgeResult);
				}

				if (groupBadges.length > 0) {
					groupBadges.sort(this.sortBadgeResult);

					this.networkBadgeInstanceResults.push({
						issuerName: group.network_issuer.name,
						badges: groupBadges,
						networkIssuer: group.network_issuer,
					});
				}
			}

			this.networkBadgeInstanceResults.sort((a, b) => {
				const aBadge = a.badges[0];
				const bBadge = b.badges[0];
				return this.sortBadgeResult(aBadge, bBadge);
			});
		} catch (error) {
			console.error('Error loading network badge groups:', error);
		}
	}

	private async updateSharedNetworkResults() {
		this.networkGroups = new Map<string, { network: any; badges: BadgeResult[]; sharedAt: string }>();

		if (this.sessionService.isLoggedIn) {
			const sharedBadges = await this.issuerApiService.listSharedNetworkBadges(this.issuer.slug);
			const uniqueBadgeClasses = new Map<string, ApiBadgeClassNetworkShare>();
			sharedBadges.forEach((share) => {
				if (!uniqueBadgeClasses.has(share.badgeclass.slug)) {
					uniqueBadgeClasses.set(share.badgeclass.slug, share);
				}
			});

			this.requestsLoaded = Promise.all(
				Array.from(uniqueBadgeClasses.values()).map((share) =>
					this.qrCodeApiService
						.getQrCodesForIssuerByBadgeClass(
							share.shared_by_issuer?.slug || this.issuer.slug,
							share.badgeclass.slug,
						)
						.then((p) => ({ key: share.badgeclass.slug, value: p })),
				),
			).then((d) =>
				d.reduce((map, obj) => {
					map.set(obj.key, obj.value);
					return map;
				}, new Map<string, ApiQRCode[]>()),
			);

			const requestMap = await this.requestsLoaded;

			const filteredShares = sharedBadges.filter((share) =>
				MatchingAlgorithm.badgeMatcher(this._searchQuery)(share.badgeclass as unknown as BadgeClass),
			);

			for (const share of filteredShares) {
				const badge = new BadgeClass(this.entityManager, share.badgeclass);
				const issuerName = share.shared_by_issuer?.name || this.issuer.name;
				const requestCount = this.getRequestCount(badge, requestMap);
				const badgeResult = new BadgeResult(
					badge,
					issuerName,
					requestCount,
					share.awarded_count_original_issuer,
				);

				const networkId = share.network.slug;

				if (!this.networkGroups.has(networkId)) {
					this.networkGroups.set(networkId, {
						network: share.network,
						badges: [],
						sharedAt: share.shared_at,
					});
				} else {
					const currentGroup = this.networkGroups.get(networkId)!;
					if (new Date(share.shared_at) > new Date(currentGroup.sharedAt)) {
						currentGroup.sharedAt = share.shared_at;
					}
				}

				this.networkGroups.get(networkId)!.badges.push(badgeResult);
			}

			// Sort badges within each network by shared_at date
			this.networkGroups.forEach((group) => {
				group.badges.sort((a, b) => {
					const dateA = filteredShares.find(
						(s) => s.badgeclass.slug === a.badge.slug && s.network.slug === group.network.slug,
					)?.shared_at;
					const dateB = filteredShares.find(
						(s) => s.badgeclass.slug === b.badge.slug && s.network.slug === group.network.slug,
					)?.shared_at;
					return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
				});
			});

			// Convert to array and sort networks by most recent share
			this.networkGroupsArray = Array.from(this.networkGroups.values()).sort((a, b) => {
				return new Date(b.sharedAt || 0).getTime() - new Date(a.sharedAt || 0).getTime();
			});
			this.sharedBadgeSlugs = new Set(this.networkGroupsArray.flatMap((g) => g.badges.map((b) => b.badge.slug)));
		}
	}

	private sortBadgeResult(a: BadgeResult, b: BadgeResult) {
		const aTime =
			a.badge instanceof BadgeClass ? a.badge.createdAt.getTime() : new Date(a.badge.created_at).getTime();
		const bTime =
			b.badge instanceof BadgeClass ? b.badge.createdAt.getTime() : new Date(b.badge.created_at).getTime();
		return bTime - aTime;
	}

	async ngOnInit() {
		// initialize counts as 0 and update after data has loaded
		if (this.sessionService.isLoggedIn) {
			if (this.issuer instanceof Issuer && this.issuer.currentUserStaffMember) {
				await this.getLearningPathsForIssuerApi(this.issuer.slug);
			}
			this.issuerManager.myIssuers$.subscribe((issuers) => {
				this.userIsMember = issuers.some((i) => this.issuer.slug == i.slug);
			});
		} else {
			await this.getPublicLearningPaths(this.issuer.slug);
		}
		await this.updateResults();
		// must run before updateNetworkResults to populate sharedBadgeSlugs
		await this.updateSharedNetworkResults();
		await this.updateNetworkResults();

		// await Promise.all([this.updateResults(), this.updateNetworkResults(), this.updateSharedNetworkResults()]);
		this.badgeTemplateTabs = [
			{
				key: 'issuer-badges',
				title: 'Issuer.issuerBadges',
				count: this.badgeResults.length,
				img: this.issuer.image,
			},
		];
		if (this.env.networksEnabled) {
			this.badgeTemplateTabs.push({
				key: 'network-badges',
				title: 'Issuer.badgesInNetworks',
				count: this.networkBadgeInstanceResults.length,
				icon: 'lucideShipWheel',
			});

			this.badgeTemplateTabs[1].count =
				this.networkBadgeInstanceResults.reduce((sum, group) => {
					return sum + (group.badges.length ?? 0);
				}, 0) +
				this.networkGroupsArray.reduce((sum, group) => {
					return sum + (group.badges.length ?? 0);
				}, 0);
		}

		this.tabs = [
			{
				key: 'badges',
				title: 'Badges',
				component: this.badgesTemplate,
			},
			{
				key: 'micro-degrees',
				title: 'LearningPath.learningpathsPlural',
				component: this.learningPathTemplate,
			},
		];
	}

	delete(event) {
		this.issuerDeleted.emit(event);
	}

	getRequestCount(badge: BadgeClass, requestMap: Map<string, ApiQRCode[]>): number {
		if (requestMap?.has(badge.slug)) {
			const qrCode = requestMap.get(badge.slug);
			if (qrCode.length) {
				return qrCode.reduce((sum, code) => sum + code.request_count, 0);
			}
			return 0;
		}
	}

	routeToBadgeAward(badge: BadgeClass, issuer) {
		this.qrCodeApiService.getQrCodesForIssuerByBadgeClass(this.issuer.slug, badge.slug).then((qrCodes) => {
			if (badge.recipientCount === 0 && qrCodes.length === 0) {
				const dialogRef = this._hlmDialogService.open(InfoDialogComponent, {
					context: {
						variant: 'info',
						caption: this.translate.instant('Badge.endOfEditDialogTitle'),
						subtitle: this.translate.instant('Badge.endOfEditDialogText'),
						text: this.translate.instant('Badge.endOfEditDialogSubText'),
						cancelText: this.translate.instant('General.cancel'),
						forwardText: this.translate.instant('Issuer.giveBadge'),
					},
				});
				dialogRef.closed$.subscribe((result) => {
					if (result === 'continue')
						this.router.navigate(['/issuer/issuers/', issuer.slug, 'badges', badge.slug, 'issue']);
				});
			} else {
				this.router.navigate(['/issuer/issuers/', issuer.slug, 'badges', badge.slug, 'issue']);
			}
		});
	}

	routeToQRCodeAward(badge, issuer) {
		this.qrCodeApiService.getQrCodesForIssuerByBadgeClass(this.issuer.slug, badge.slug).then((qrCodes) => {
			if (badge.recipientCount === 0 && qrCodes.length === 0) {
				const dialogRef = this._hlmDialogService.open(InfoDialogComponent, {
					context: {
						variant: 'info',
						caption: this.translate.instant('Badge.endOfEditDialogTitle'),
						subtitle: this.translate.instant('Badge.endOfEditDialogTextQR'),
						text: this.translate.instant('Badge.endOfEditDialogSubText'),
						cancelText: this.translate.instant('General.previous'),
						forwardText: this.translate.instant('Issuer.giveQr'),
					},
				});
				dialogRef.closed$.subscribe((result) => {
					if (result === 'continue')
						this.router.navigate(['/issuer/issuers/', issuer.slug, 'badges', badge.slug, 'qr']);
				});
			} else {
				this.router.navigate(['/issuer/issuers/', issuer.slug, 'badges', badge.slug, 'qr']);
			}
		});
	}

	routeToBadgeDetail(badge, issuer, focusRequests: boolean = false) {
		const newCrumbs = [...this.crumbs];
		newCrumbs.at(-1).routerLink = [location.pathname];
		newCrumbs.push({ title: badge.name, routerLink: ['/issuer/issuers/', issuer.slug, 'badges', badge.slug] });
		const extras = {
			queryParams: { focusRequests: focusRequests ? 'true' : undefined },
			state: { crumbs: newCrumbs },
		};

		this.router.navigate(newCrumbs.at(-1).routerLink, extras);
	}
	redirectToLearningPathDetail(learningPathSlug, issuer) {
		this.router.navigate(['/issuer/issuers/', issuer.slug, 'learningpaths', learningPathSlug]);
	}

	public deleteLearningPath(learningPathSlug, issuer) {
		const dialogRef = this._hlmDialogService.open(DangerDialogComponentTemplate, {
			context: {
				delete: () => this.deleteLearningPathApi(learningPathSlug, issuer),
				// qrCodeRequested: () => {},
				variant: 'danger',
				text: this.translate.instant('LearningPath.confirmDelete'),
				title: this.translate.instant('LearningPath.deleteMd'),
			},
		});
	}

	deleteLearningPathApi(learningPathSlug, issuer) {
		this.learningPathApiService
			.deleteLearningPath(issuer.slug, learningPathSlug)
			.then(() => (this.learningPaths = this.learningPaths.filter((value) => value.slug != learningPathSlug)));
	}

	async getPublicLearningPaths(issuerSlug: string) {
		const lps = await this.publicApiService.getIssuerLearningPaths(issuerSlug);
		this.learningPaths = lps.filter((l) => l.activated);
	}

	getLearningPathsForIssuerApi(issuerSlug) {
		this.learningPathsPromise = this.learningPathApiService
			.getLearningPathsForIssuer(issuerSlug)
			.then(
				(learningPaths) =>
					(this.learningPaths = learningPaths
						.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
						.filter((lp) => (this.public ? lp.activated : true))),
			);
	}

	get rawJsonUrl() {
		if (this.issuer) return `${this.configService.apiConfig.baseUrl}/public/issuers/${this.issuer.slug}.json`;
	}

	routeToJson() {
		window.open(`${this.configService.apiConfig.baseUrl}/public/issuers/${this.issuer.slug}.json`, '_blank');
	}

	routeToMemberView() {
		this.router.navigate(['/issuer/issuers/', this.issuer.slug]);
	}

	routeToUrl(url) {
		window.location.href = url;
	}

	onTabChange(tab) {
		this.activeTab = tab;
	}

	onNestedTabChange(tab) {
		this.activeTabBadgeTemplate = tab;
	}

	calculateStudyLoad(lp: ApiLearningPath | PublicApiLearningPath): number {
		if (!lp?.badges) return 0;

		return lp.badges.reduce((acc, b) => {
			const studyLoad = b?.badge?.['extensions:StudyLoadExtension']?.StudyLoad ?? 0;
			return acc + studyLoad;
		}, 0);
	}
}

export class BadgeResult {
	constructor(
		public badge: BadgeClass | PublicApiBadgeClass,
		public issuerName: string,
		public requestCount: number,
		public awardedCount: number,
	) {}
}
