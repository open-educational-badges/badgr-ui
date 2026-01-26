import { AfterContentInit, Component, ElementRef, inject, OnInit, signal, TemplateRef, viewChild } from '@angular/core';
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
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { DialogComponent } from '../../../components/dialog.component';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { NgModel, FormsModule } from '@angular/forms';
import { Issuer } from '../../../issuer/models/issuer.model';
import { PublicApiService } from '../../../public/services/public-api.service';
import { MessageService } from '../../../common/services/message.service';
import { NgClass } from '@angular/common';
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
@Component({
	selector: 'network-dashboard',
	templateUrl: './network-dashboard.component.html',
	imports: [
		TranslatePipe,
		BgAwaitPromises,
		OebTabsComponent,
		OebButtonComponent,
		FormsModule,
		HlmH1,
		NetworkPartnersComponent,
		AddInstitutionComponent,
		BgBreadcrumbsComponent,
		NetworkBadgesComponent,
		NetworkLearningPathsComponent,
		RouterLink,
		NgClass,
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

	private _networkStaffRoleOptions: FormFieldSelectOption[];

	readonly overviewTemplate = viewChild<ElementRef>('overviewTemplate');
	readonly partnerTemplate = viewChild<ElementRef>('partnerTemplate');
	readonly badgesTemplate = viewChild<ElementRef>('badgesTemplate');
	readonly learningPathsTemplate = viewChild<ElementRef>('learningPathsTemplate');

	readonly headerTemplate = viewChild<TemplateRef<void>>('headerTemplate');

	readonly addInstitutionsTemplate = viewChild<TemplateRef<void>>('addInstitutionsTemplate');

	readonly inviteSuccessContent = viewChild<TemplateRef<void>>('inviteSuccessContent');

	readonly issuerSearchInputModel = viewChild<NgModel>('issuerSearchInputModel');

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
			this.crumbs = [
				{ title: this.translate.instant('NavItems.myInstitutions'), routerLink: ['/issuer/issuers'] },
				{
					title: this.translate.instant('General.networks'),
					routerLink: ['/issuer'],
					queryParams: { tab: 'networks' },
				},
				{ title: this.network().name, routerLink: ['/issuer/network/' + this.network().slug] },
			];
		});
	}

	ngOnInit(): void {
		this.route.queryParams.subscribe((params) => {
			if (params['tab']) {
				this.activeTab = params['tab'];
			}
		});
	}

	ngAfterContentInit() {
		this.tabs = [
			{
				key: 'overview',
				title: 'General.overview',
				component: this.overviewTemplate(),
			},
			{
				key: 'partners',
				title: 'Network.partnerIssuers',
				component: this.partnerTemplate(),
			},
			{
				key: 'badges',
				title: 'Badges',
				component: this.badgesTemplate(),
			},
			{
				key: 'learningpaths',
				title: 'LearningPath.learningpathsPlural',
				component: this.learningPathsTemplate(),
			},
		];
	}

	onTabChange(tab) {
		this.activeTab = tab;
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
				headerTemplate: this.headerTemplate(),
				content: this.addInstitutionsTemplate(),
				variant: 'default',
				footer: false,
			},
		});
		this.dialogRef = dialogRef;

		setTimeout(() => {
			const issuerSearchInputModel = this.issuerSearchInputModel();
			if (issuerSearchInputModel) {
				issuerSearchInputModel.valueChanges.pipe(debounceTime(500), distinctUntilChanged()).subscribe(() => {
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
		return this.network()?.current_user_network_role;
	}
}
