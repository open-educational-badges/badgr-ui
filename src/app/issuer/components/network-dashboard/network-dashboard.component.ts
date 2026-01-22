import {
	AfterContentInit,
	Component,
	ElementRef,
	inject,
	OnInit,
	signal,
	TemplateRef,
	ViewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SessionService } from '../../../common/services/session.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { Title } from '@angular/platform-browser';
import { LinkEntry } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { TranslateService } from '@ngx-translate/core';
import { AppConfigService } from '../../../common/app-config.service';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { OebTabsComponent, Tab } from '../../../components/oeb-tabs.component';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { OebDropdownComponent } from '../../../components/oeb-dropdown.component';
import type { MenuItem } from '../../../common/components/badge-detail/badge-detail.component.types';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { DialogComponent } from '../../../components/dialog.component';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { NgIcon } from '@ng-icons/core';
import { NgModel, FormsModule } from '@angular/forms';
import { Issuer } from '../../../issuer/models/issuer.model';
import { PublicApiService } from '../../../public/services/public-api.service';
import { MessageService } from '../../../common/services/message.service';
import { NgStyle, NgClass } from '@angular/common';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormFieldSelectOption } from '../../../components/select.component';
import { NetworkApiService } from '../../../issuer/services/network-api.service';
import { HlmH1 } from '@spartan-ng/helm/typography';
import { NetworkPartnersComponent } from '../network-partners/network-partners.component';
import { AddInstitutionComponent } from '../add-institution/add-institution.component';
import { BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { ApiNetworkInvitation } from '../../../issuer/models/network-invite-api.model';
import { NetworkBadgesComponent } from '../network-badges/network-badges.component';
import { NetworkLearningPathsComponent } from '../network-learningpaths/network-learningpaths.component';
import { NetworkManager } from '~/issuer/services/network-manager.service';
import { RouterLink } from '@angular/router';
import { Network } from '~/issuer/network.model';
import { ApiBadgeClass } from '~/issuer/models/badgeclass-api.model';
import { OebDashboardOverviewComponent } from '~/dashboard/components/oeb-dashboard-overview/oeb-dashboard-overview.component';
import { OebDashboardLearnersComponent } from '~/dashboard/components/oeb-dashboard-learners/oeb-dashboard-learners.component';
import { OebDashboardSocialspaceComponent, SocialspaceViewState } from '~/dashboard/components/oeb-dashboard-socialspace/oeb-dashboard-socialspace.component';
import { SvgIconComponent } from '~/common/components/svg-icon.component';
@Component({
	selector: 'network-dashboard',
	templateUrl: './network-dashboard.component.html',
	imports: [
		TranslatePipe,
		BgAwaitPromises,
		OebTabsComponent,
		OebButtonComponent,
		OebDropdownComponent,
		NgIcon,
		FormsModule,
		NgStyle,
		HlmH1,
		NetworkPartnersComponent,
		AddInstitutionComponent,
		BgBreadcrumbsComponent,
		NetworkBadgesComponent,
		NetworkLearningPathsComponent,
		RouterLink,
		NgClass,
		OebDashboardOverviewComponent,
		OebDashboardLearnersComponent,
		OebDashboardSocialspaceComponent,
		SvgIconComponent,
	],
})
export class NetworkDashboardComponent extends BaseAuthenticatedRoutableComponent implements OnInit, AfterContentInit {
	private networkManager = inject(NetworkManager);
	protected title = inject(Title);
	protected translate = inject(TranslateService);
	private configService = inject(AppConfigService);
	private publicApiService = inject(PublicApiService);
	private messageService = inject(MessageService);
	private networkApiService = inject(NetworkApiService);

	networkLoaded: Promise<unknown>;
	networkSlug: string;
	crumbs: LinkEntry[];
	tabs: Tab[] = undefined;
	activeTab = 'overview';
	dialogRef: BrnDialogRef<any> = null;
	issuerSearchQuery = '';
	selectedIssuers: Issuer[] = [];

	network = signal<Network | null>(null);
	partnerIssuers = signal<Issuer[]>([]);

	networkInvites = signal<ApiNetworkInvitation[]>([]);

	issuersShowResults = false;
	issuersLoading = false;
	issuerSearchLoaded = false;
	issuerSearchResults = [];

	rightsAndRolesExpanded = false;
	networkBadges: ApiBadgeClass[] = [];
	networkActionsMenuItems: MenuItem[] = [];

	/** Base breadcrumbs (without sub-view extensions) */
	baseCrumbs: LinkEntry[] = [];

	/** Current learner sub-view state for breadcrumb extension */
	learnerSubView: { state: string; gender?: string; residence?: { city: string } } | null = null;

	/** Current socialspace sub-view state for hiding tabs */
	socialspaceSubView: { state: SocialspaceViewState; city?: string } | null = null;

	private _networkStaffRoleOptions: FormFieldSelectOption[];

	@ViewChild('overviewTemplate', { static: true }) overviewTemplate: ElementRef;
	@ViewChild('partnerTemplate', { static: true }) partnerTemplate: ElementRef;
	@ViewChild('badgesTemplate', { static: true }) badgesTemplate: ElementRef;
	@ViewChild('learningPathsTemplate', { static: true }) learningPathsTemplate: ElementRef;
	@ViewChild('socialspaceTemplate', { static: true }) socialspaceTemplate: ElementRef;
	@ViewChild('learnersTemplate', { static: true }) learnersTemplate: ElementRef;

	@ViewChild('headerTemplate')
	headerTemplate: TemplateRef<void>;

	@ViewChild('addInstitutionsTemplate')
	addInstitutionsTemplate: TemplateRef<void>;

	@ViewChild('inviteSuccessContent')
	inviteSuccessContent: TemplateRef<void>;

	@ViewChild('issuerSearchInputModel') issuerSearchInputModel: NgModel;

	/** Reference to the learners component for controlling its view state */
	@ViewChild('learnersComponentRef') learnersComponentRef: OebDashboardLearnersComponent;

	/** Reference to the socialspace component for controlling its view state */
	@ViewChild('socialspaceComponentRef') socialspaceComponentRef: OebDashboardSocialspaceComponent;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const loginService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, loginService);

		this.networkSlug = this.route.snapshot.params['networkSlug'];

		this.networkApiService.getNetworkInvites(this.networkSlug).then((invites) => {
			this.networkInvites.set(invites);
		});

		this.networkLoaded = this.networkManager.networkBySlug(this.networkSlug).then((network) => {
			this.network.set(network);
			this.partnerIssuers.set(network.partner_issuers.entities);
			this.title.setTitle(
				`Issuer - ${this.network().name} - ${this.configService.theme['serviceName'] || 'Badgr'}`,
			);
			this.baseCrumbs = [
				{ title: this.translate.instant('NavItems.myInstitutions'), routerLink: ['/issuer/issuers'] },
				{
					title: this.translate.instant('General.networks'),
					routerLink: ['/issuer'],
					queryParams: { tab: 'networks' },
				},
				{ title: this.network().name, routerLink: ['/issuer/network/' + this.network().slug] },
			];
			this.crumbs = [...this.baseCrumbs];
			this.initializeMenuItems();
			if (this.templatesReady) {
				this.initializeTabs();
			}
		});
	}

	private initializeMenuItems(): void {
		this.networkActionsMenuItems = [
			{
				title: 'General.exportData',
				icon: 'lucideFolderInput',
				action: () => this.exportData(),
			},
		];

		if (this.role === 'owner') {
			this.networkActionsMenuItems.push({
				title: 'Network.addInstitutions',
				icon: 'lucideHousePlus',
				action: () => this.openDialog(),
			});
			this.networkActionsMenuItems.push({
				title: 'General.edit',
				icon: 'lucideSquarePen',
				action: () => this.navigateToEditNetwork(),
			});
		}
	}

	ngOnInit(): void {
		this.route.queryParams.subscribe((params) => {
			if (params['tab']) {
				this.activeTab = params['tab'];
			}
		});
	}

	private templatesReady = false;

	ngAfterContentInit() {
		this.templatesReady = true;
		if (this.network()) {
			this.initializeTabs();
		}
	}

	private initializeTabs(): void {
		const userRole = this.network()?.current_user_network_role;
		const hasDashboardAccess = userRole === 'owner' || userRole === 'creator' || userRole === 'editor';

		const baseTabs: Tab[] = [
			{
				key: 'partners',
				title: 'Network.partnerIssuers',
				component: this.partnerTemplate,
			},
			{
				key: 'badges',
				title: 'Badges',
				component: this.badgesTemplate,
			},
			{
				key: 'learningpaths',
				title: 'LearningPath.learningpathsPlural',
				component: this.learningPathsTemplate,
			},
		];

		const dashboardTabs: Tab[] = [
			{
				key: 'overview',
				title: 'General.overview',
				component: this.overviewTemplate,
			},
			{
				key: 'socialspace',
				title: 'Network.Dashboard.socialspace.tabTitle',
				component: this.socialspaceTemplate,
			},
			{
				key: 'learners',
				title: 'Dashboard.Tabs.learners',
				component: this.learnersTemplate,
			},
		];

		if (hasDashboardAccess) {
			this.tabs = [
				dashboardTabs[0],
				...baseTabs,
				dashboardTabs[1],
				dashboardTabs[2],
			];
		} else {
			this.tabs = baseTabs;
			if (this.activeTab === 'overview' || this.activeTab === 'socialspace' || this.activeTab === 'learners') {
				this.activeTab = 'partners';
			}
		}
	}

	onTabChange(tab) {
		this.activeTab = tab;
		// Reset sub-views when changing tabs
		this.learnerSubView = null;
		this.socialspaceSubView = null;
		this.updateBreadcrumbs();
	}

	/**
	 * Handle learner sub-view state changes for breadcrumb updates
	 */
	onLearnerViewStateChange(event: { state: string; gender?: string; residence?: { city: string } }) {
		this.learnerSubView = event;
		this.updateBreadcrumbs();
	}

	/**
	 * Update breadcrumbs based on current state
	 */
	private updateBreadcrumbs() {
		if (!this.baseCrumbs.length) return;

		// Start with base breadcrumbs
		this.crumbs = [...this.baseCrumbs];

		// Add learner sub-view breadcrumb if active
		if (this.learnerSubView?.state === 'gender-detail' && this.learnerSubView.gender) {
			this.crumbs.push({
				title: `${this.translate.instant('Dashboard.genderDetail.competencyAnalysis')}: ${this.learnerSubView.gender}`,
			});
		} else if (this.learnerSubView?.state === 'residence-detail' && this.learnerSubView.residence) {
			this.crumbs.push({
				title: `${this.translate.instant('Dashboard.residenceDetail.competencyAnalysis')}: ${this.learnerSubView.residence.city}`,
			});
		}
	}

	/**
	 * Navigate back from learner sub-view (e.g., gender detail, residence detail) to learners overview
	 */
	onBackFromLearnerSubView(): void {
		if (this.learnersComponentRef) {
			if (this.learnerSubView?.state === 'gender-detail') {
				this.learnersComponentRef.onBackFromGenderDetail();
			} else if (this.learnerSubView?.state === 'residence-detail') {
				this.learnersComponentRef.onBackFromResidenceDetail();
			}
		}
		this.learnerSubView = null;
		this.updateBreadcrumbs();
	}

	/**
	 * Handle socialspace sub-view state changes for hiding tabs
	 */
	onSocialspaceViewStateChange(event: { state: SocialspaceViewState; city?: string }) {
		if (event.state === 'overview') {
			this.socialspaceSubView = null;
		} else {
			this.socialspaceSubView = event;
		}
		this.updateBreadcrumbs();
	}

	/**
	 * Navigate back from socialspace sub-view to socialspace overview
	 */
	onBackFromSocialspaceSubView(): void {
		if (this.socialspaceComponentRef) {
			this.socialspaceComponentRef.onBackFromDetailView();
		}
		// Note: socialspaceSubView will be reset by the viewStateChange event from the component
	}

	/**
	 * Check if currently in any sub-view that should hide tabs
	 */
	isInDetailSubView(): boolean {
		// Learner detail views
		if (this.activeTab === 'learners' && (this.learnerSubView?.state === 'gender-detail' || this.learnerSubView?.state === 'residence-detail')) {
			return true;
		}
		// Socialspace detail views (any view that's not overview)
		if (this.activeTab === 'socialspace' && this.socialspaceSubView && this.socialspaceSubView.state !== 'overview') {
			return true;
		}
		return false;
	}

	issuerSearchInputFocusOut() {
		// delay hiding for click event
		setTimeout(() => {
			this.issuersShowResults = false;
		}, 200);
	}

	private readonly _hlmDialogService = inject(HlmDialogService);

	public openDialog() {
		if (this.network().current_user_network_role != 'owner') return;
		const dialogRef = this._hlmDialogService.open(DialogComponent, {
			context: {
				headerTemplate: this.headerTemplate,
				content: this.addInstitutionsTemplate,
				variant: 'default',
				footer: false,
			},
		});
		this.dialogRef = dialogRef;

		setTimeout(() => {
			if (this.issuerSearchInputModel) {
				this.issuerSearchInputModel.valueChanges
					.pipe(debounceTime(500), distinctUntilChanged())
					.subscribe(() => {
						this.issuerSearchChange();
					});
			}
		});
	}

	onInstitutionsInvited() {
		this.networkApiService.getNetworkInvites(this.networkSlug).then((invites) => {
			this.networkInvites.set(invites);
		});
		this.activeTab = 'partners';
		if (this.dialogRef) {
			this.dialogRef.close();
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

	async onRemovePartner(issuer: Issuer) {
		const res = await this.networkApiService.removeIssuerFromNetwork(this.network().slug, issuer.slug);
		if (res.status === 204) {
			this.partnerIssuers.update((current) => current.filter((partner) => partner.slug !== issuer.slug));
		}
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

	selectIssuerFromDropdown(issuer) {
		this.selectedIssuers.push(issuer);
	}

	removeSelectedissuer(issuer) {
		const index = this.selectedIssuers.indexOf(issuer);
		this.selectedIssuers.splice(index, 1);
	}

	collapseRoles() {
		this.rightsAndRolesExpanded = !this.rightsAndRolesExpanded;
	}

	get role() {
		if (this.network().currentUserStaffMember) {
			return this.network().currentUserStaffMember.roleSlug;
		} else {
			return this.network().current_user_network_role;
		}
	}

	exportData(): void {
		console.log('Export data clicked');
	}

	navigateToEditNetwork(): void {
		this.router.navigate(['/issuer/networks', this.networkSlug, 'edit']);
	}
}
