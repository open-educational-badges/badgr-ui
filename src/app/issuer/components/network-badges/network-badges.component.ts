import {
	Component,
	computed,
	effect,
	ElementRef,
	inject,
	input,
	Input,
	output,
	signal,
	TemplateRef,
	ViewChild,
} from '@angular/core';
import { TranslatePipe, TranslateDirective } from '@ngx-translate/core';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { NetworkApiService } from '../../../issuer/services/network-api.service';
import { OebTabsComponent, Tab } from '~/components/oeb-tabs.component';
import { Route, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BadgeClassManager } from '~/issuer/services/badgeclass-manager.service';
import { MessageService } from '~/common/services/message.service';
import { Network } from '~/issuer/network.model';
import { BadgeClass } from '~/issuer/models/badgeclass.model';
import { DatatableComponent, type DatatableBadgeResult } from '~/components/datatable-badges.component';
import { ApiQRCode } from '~/issuer/models/qrcode-api.model';
import { HlmDialogService } from '~/components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { DialogComponent } from '~/components/dialog.component';
import { Issuer } from '~/issuer/models/issuer.model';
import { IssuerManager } from '~/issuer/services/issuer-manager.service';
import { UserProfileManager } from '~/common/services/user-profile-manager.service';
import { FormsModule } from '@angular/forms';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { QrCodeApiService } from '~/issuer/services/qrcode-api.service';
import { TranslateModule } from '@ngx-translate/core';
import { BadgeClassApiService } from '~/issuer/services/badgeclass-api.service';
import { NetworkManager } from '~/issuer/services/network-manager.service';
import { CommonEntityManager } from '~/entity-manager/services/common-entity-manager.service';
import { NetworkSharedBadgesDatatableComponent } from '~/components/datatable-network-shared-badges.component';
import { BgAwaitPromises } from '~/common/directives/bg-await-promises';
import { ApiBadgeClassNetworkShare } from '~/issuer/models/badgeclass-api.model';
import { ActivatedRoute } from '@angular/router';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { LinkEntry } from '~/common/components/bg-breadcrumbs/bg-breadcrumbs.component';

export interface SharedBadgeWithRequests extends ApiBadgeClassNetworkShare {
	requestCount: number;
}

@Component({
	selector: 'network-badges',
	templateUrl: './network-badges.component.html',
	imports: [
		TranslatePipe,
		OebButtonComponent,
		OebTabsComponent,
		RouterLink,
		DatatableComponent,
		FormsModule,
		TranslateDirective,
		TranslateModule,
		NetworkSharedBadgesDatatableComponent,
		BgAwaitPromises,
		HlmIcon,
	],
})
export class NetworkBadgesComponent {
	private networkApiService = inject(NetworkApiService);
	private badgeClassService = inject(BadgeClassManager);
	private badgeClassApiService = inject(BadgeClassApiService);
	private userProfileManager = inject(UserProfileManager);
	private entityManager = inject(CommonEntityManager);
	private issuerManager = inject(IssuerManager);
	private networkManager = inject(NetworkManager);
	private messageService = inject(MessageService);
	private qrCodeApiService = inject(QrCodeApiService);
	private translate = inject(TranslateService);
	private router = inject(Router);
	private route = inject(ActivatedRoute);

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		effect(async () => {
			const slug = this.network()?.slug;
			if (!slug) {
				this.userIssuers.set([]);
				return;
			}

			try {
				this.isLoadingIssuers.set(true);
				const apiIssuers = await this.networkManager.networkUserIssuers(slug);
				const issuers = apiIssuers.map((apiIssuer) => new Issuer(this.entityManager, apiIssuer));
				this.userIssuers.set(issuers);
			} catch (error) {
				console.error('Error loading network issuers:', error);
				this.userIssuers.set([]);
			} finally {
				this.isLoadingIssuers.set(false);
			}
		});
	}

	network = input.required<Network>();
	crumbs = input<LinkEntry[]>([]);
	userIssuers = signal<Issuer[]>([]);
	isLoadingIssuers = signal(false);
	requestsLoaded: Promise<Map<string, ApiQRCode[]>>;

	badges: BadgeClass[] = [];

	badgeResults: DatatableBadgeResult[] = [];

	selectedIssuer: Issuer = null;
	dialogRef: BrnDialogRef<unknown> = null;

	tabs: Tab[] = undefined;

	activeTab = 'network';

	sharedBadges: ApiBadgeClassNetworkShare[] = [];
	sharedBadgeResults: SharedBadgeWithRequests[] = [];

	@ViewChild('networkTemplate', { static: true }) networkTemplate: ElementRef;
	@ViewChild('partnerTemplate', { static: true }) partnerTemplate: ElementRef;

	@ViewChild('issuerSelection')
	issuerSelection: TemplateRef<void>;

	@ViewChild('headerTemplate')
	headerTemplate: TemplateRef<void>;

	private readonly _hlmDialogService = inject(HlmDialogService);

	private initializeTabs() {
		this.tabs = [
			{
				key: 'network',
				title: 'Network.networkBadges',
				icon: 'lucideShipWheel',
				count: this.badges.length,
				component: this.networkTemplate,
			},
			{
				key: 'partner',
				title: 'Issuer.partnerBadges',
				icon: 'lucideHexagon',
				count: this.sharedBadgeResults.length,
				component: this.partnerTemplate,
			},
		];
	}

	async ngOnInit() {
		this.route.queryParams.subscribe((params) => {
			if (params['innerTab']) {
				this.activeTab = params['innerTab'];
			}
		});
		try {
			await this.loadBadgesAndRequests();
			await this.loadSharedBadgesAndRequests();
			this.initializeTabs();
		} catch (error) {
			this.messageService.reportAndThrowError(
				`Failed to load badges for ${this.network() ? this.network().name : this.network().slug}`,
				error,
			);
		}
	}

	private async loadBadgesAndRequests() {
		const networkSlug = this.network().slug;

		const badgesByIssuer = await firstValueFrom(this.badgeClassService.getNetworkBadgesByIssuerUrl$(networkSlug));

		this.badges = this.sortBadgesByCreatedAt(badgesByIssuer[this.network().issuerUrl] || []).filter(
			(b) => b.sharedOnNetwork == null && b.extension['extensions:CategoryExtension'].Category !== 'learningpath',
		);

		const requestMap = await this.loadRequestsForBadges(this.badges);

		this.badgeResults = this.badges.map((badge) => ({
			badge,
			requestCount: this.getRequestCount(badge, requestMap),
			awardedCount: badge.recipientCount,
		}));
	}

	private async loadSharedBadgesAndRequests() {
		const networkSlug = this.network().slug;
		this.sharedBadges = await this.networkApiService.getNetworkSharedBadges(networkSlug);

		const sharedBadgePromises = this.sharedBadges.map(async (sharedBadge) => {
			let requestCount = 0;

			try {
				const requests = await this.qrCodeApiService.getQrCodesForIssuerByBadgeClass(
					networkSlug,
					sharedBadge.badgeclass.slug,
				);

				if (requests.length) {
					requestCount = requests.reduce((sum, code) => sum + (code.request_count || 0), 0);
				}
			} catch (error) {
				console.error(`Error loading requests for shared badge ${sharedBadge.badgeclass.slug}:`, error);
			}

			return {
				...sharedBadge,
				requestCount,
			};
		});

		this.sharedBadgeResults = await Promise.all(sharedBadgePromises);
	}

	private sortBadgesByCreatedAt(badges: BadgeClass[]) {
		const cmp = (a, b) => (a === b ? 0 : a < b ? -1 : 1);
		return badges.sort((a, b) => cmp(b.createdAt, a.createdAt));
	}

	private async loadRequestsForBadges(badges: BadgeClass[]): Promise<Map<string, ApiQRCode[]>> {
		const requestPromises = badges.map(async (badge) => {
			const issuer = await this.networkManager.networkBySlug(badge.issuerSlug);

			if (issuer.currentUserStaffMember) {
				const requests = await this.qrCodeApiService.getQrCodesForIssuerByBadgeClass(
					badge.issuerSlug,
					badge.slug,
				);
				return { key: badge.slug, value: requests };
			} else {
				return { key: badge.slug, value: [] };
			}
		});

		const requestData = await Promise.all(requestPromises);

		return requestData.reduce((map, { key, value }) => {
			map.set(key, value);
			return map;
		}, new Map<string, ApiQRCode[]>());
	}

	onTabChange(tab) {
		this.activeTab = tab;
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

	routeToBadgeAward(badge: BadgeClass) {
		if (!this.userIssuers().length) {
			this.dialogRef = this._hlmDialogService.open(DialogComponent, {
				context: {
					variant: 'failure',
					text: this.translate.instant('Network.addInstitutionToIssue'),
				},
			});
		} else {
			this.dialogRef = this._hlmDialogService.open(DialogComponent, {
				context: {
					headerTemplate: this.headerTemplate,
					content: this.issuerSelection,
				},
			});
			this.dialogRef.closed$.subscribe((result) => {
				if (result === 'continue')
					this.router.navigate(['/issuer/issuers/', this.selectedIssuer.slug, 'badges', badge.slug, 'issue']);
			});
		}
	}

	routeToQRCodeAward(badge) {
		if (!this.userIssuers().length) {
			this.dialogRef = this._hlmDialogService.open(DialogComponent, {
				context: {
					variant: 'failure',
					text: this.translate.instant('Network.addInstitutionToIssue'),
				},
			});
		} else {
			this.dialogRef = this._hlmDialogService.open(DialogComponent, {
				context: {
					headerTemplate: this.headerTemplate,
					content: this.issuerSelection,
				},
			});
			this.dialogRef.closed$.subscribe((result) => {
				if (result === 'continue')
					this.router.navigate(['/issuer/issuers/', this.selectedIssuer.slug, 'badges', badge.slug, 'qr'], {
						queryParams: {
							partnerIssuer: this.selectedIssuer.slug,
							isNetworkBadge: true,
						},
					});
			});
		}
	}

	routeToBadgeDetail(badge, issuerSlug, focusRequests: boolean = false) {
		const newCrumbs = [...this.crumbs()];
		newCrumbs.at(-1).routerLink = [location.pathname];
		newCrumbs.push({ title: badge.name, routerLink: ['/issuer/issuers/', issuerSlug, 'badges', badge.slug] });
		const extras = {
			queryParams: { focusRequests: focusRequests ? 'true' : undefined },
			state: { crumbs: newCrumbs },
		};

		this.router.navigate(newCrumbs.at(-1).routerLink, extras);
	}

	routeToBadgeCreation(issuer: Issuer) {
		this.closeDialog();
		this.router.navigate(['/issuer/issuers', issuer.slug, 'badges', 'create']);
	}

	closeDialog() {
		if (this.dialogRef) {
			this.dialogRef.close();
		}
	}

	closeDialogContinue() {
		this.dialogRef.close('continue');
	}
}
