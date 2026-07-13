import { getByTestId } from '../../../testing/query-helpers';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject, of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { OebIssuerDetailComponent } from './oeb-issuer-detail.component';
import { IssuerManager } from '../../../issuer/services/issuer-manager.service';
import { IssuerApiService } from '../../../issuer/services/issuer-api.service';
import { PublicApiService } from '../../../public/services/public-api.service';
import { LearningPathApiService } from '../../../common/services/learningpath-api.service';
import { PDFTemplateManager } from '../../../issuer/services/pdftemplate-manager.service';
import { NetworkApiService } from '../../../issuer/services/network-api.service';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { PublicApiIssuer } from '../../../public/models/public-api.model';
import { createCommonProviders } from '../../../testing/common-providers';
import { HttpClientTestingModule } from '@angular/common/http/testing';

export const mockPublicIssuer: PublicApiIssuer = {
	'@context': 'https://w3id.org/openbadges/v2',
	slug: 'test-issuer',
	name: 'Test Institution',
	description: 'A test institution',
	image: '',
	url: 'https://example.com',
	id: 'https://example.com/issuers/test-issuer',
	type: 'Issuer',
};

export const myIssuers$ = new Subject<any[]>();

export async function setupIssuerDetail(userIsMember: boolean): Promise<ComponentFixture<OebIssuerDetailComponent>> {
	await TestBed.configureTestingModule({
		imports: [RouterTestingModule, OebIssuerDetailComponent, TranslateModule.forRoot(), HttpClientTestingModule],
		providers: [
			...createCommonProviders(),
			{
				provide: ActivatedRoute,
				useValue: { snapshot: { params: {} }, params: of({}), queryParams: of({}), data: of({}) },
			},
			{ provide: IssuerManager, useValue: { myIssuers$: myIssuers$.asObservable() } },
			{ provide: LearningPathApiService, useValue: { getLearningPathsForIssuer: () => Promise.resolve([]) } },
			{ provide: IssuerApiService, useValue: { listSharedNetworkBadges: () => Promise.resolve([]) } },
			{ provide: NetworkApiService, useValue: { getIssuerNetworkBadges: () => Promise.resolve([]) } },
			{
				provide: PublicApiService,
				useValue: {
					getPublicLearningPaths: () => Promise.resolve([]),
					getIssuerLearningPaths: () => Promise.resolve([]),
				},
			},
			{ provide: PDFTemplateManager, useValue: { pdfEditorAvailable: () => false } },
			{ provide: HlmDialogService, useValue: {} },
		],
	}).compileComponents();

	const fixture = TestBed.createComponent(OebIssuerDetailComponent);
	const component = fixture.componentInstance;

	component.issuer = mockPublicIssuer;
	component.public = true;
	component.networks = [];
	component.partner_issuers = [];
	component.badges = [];

	component.userIsMember = userIsMember;
	fixture.detectChanges();
	await fixture.whenStable();
	fixture.detectChanges();

	return fixture;
}

type DashboardQuotaState = 'no-quotas' | 'enterprise' | 'free-or-pro';

function buildFullIssuerMock(state: DashboardQuotaState) {
	const base = {
		...mockPublicIssuer,
		currentUserStaffMember: null,
		canUpdateDeleteIssuer: false,
		canCreateBadge: false,
		apiModel: { verified: true },
	};
	if (state === 'no-quotas') return base;
	const quota = state === 'enterprise' ? 1 : 0;
	return {
		...base,
		quotas: {
			quotas: {
				DASHBOARD: { quota },
				PDFEDITOR: { quota: 0 },
				BADGE_AWARD: { quota: 1 },
				LEARNINGPATH_CREATE: { quota: 1 },
			},
		},
	};
}

async function setupAuthenticatedIssuerDetail(
	state: DashboardQuotaState,
): Promise<ComponentFixture<OebIssuerDetailComponent>> {
	await TestBed.configureTestingModule({
		imports: [RouterTestingModule, OebIssuerDetailComponent, TranslateModule.forRoot(), HttpClientTestingModule],
		providers: [
			...createCommonProviders(),
			{
				provide: ActivatedRoute,
				useValue: { snapshot: { params: {} }, params: of({}), queryParams: of({}), data: of({}) },
			},
			{ provide: IssuerManager, useValue: { myIssuers$: myIssuers$.asObservable() } },
			{ provide: LearningPathApiService, useValue: { getLearningPathsForIssuer: () => Promise.resolve([]) } },
			{ provide: IssuerApiService, useValue: { listSharedNetworkBadges: () => Promise.resolve([]) } },
			{ provide: NetworkApiService, useValue: { getIssuerNetworkBadges: () => Promise.resolve([]) } },
			{
				provide: PublicApiService,
				useValue: {
					getPublicLearningPaths: () => Promise.resolve([]),
					getIssuerLearningPaths: () => Promise.resolve([]),
				},
			},
			{ provide: PDFTemplateManager, useValue: { pdfEditorAvailable: () => false } },
			{ provide: HlmDialogService, useValue: {} },
		],
	}).compileComponents();

	const fixture = TestBed.createComponent(OebIssuerDetailComponent);
	const component = fixture.componentInstance;

	component.issuer = buildFullIssuerMock(state) as any;
	component.public = false;
	component.networks = [];
	component.partner_issuers = [];
	component.badges = [];

	fixture.detectChanges();
	await fixture.whenStable();
	fixture.detectChanges();

	return fixture;
}

describe('OebIssuerDetailComponent — public page button visibility', () => {
	afterEach(() => TestBed.resetTestingModule());

	describe('when user is not a member of the institution', () => {
		it('should show the website button', async () => {
			const fixture = await setupIssuerDetail(false);
			expect(getByTestId(fixture, 'website-button')).toBeTruthy();
		});

		it('should not show the member view button', async () => {
			const fixture = await setupIssuerDetail(false);
			expect(getByTestId(fixture, 'member-view-button')).toBeFalsy();
		});
	});

	describe('when user is a member of the institution', () => {
		it('should show the website button', async () => {
			const fixture = await setupIssuerDetail(true);
			expect(getByTestId(fixture, 'website-button')).toBeTruthy();
		});

		it('should show the member view button', async () => {
			const fixture = await setupIssuerDetail(true);
			expect(getByTestId(fixture, 'member-view-button')).toBeTruthy();
		});
	});
});

describe('OebIssuerDetailComponent — Dashboard tab visibility by quota', () => {
	afterEach(() => TestBed.resetTestingModule());

	it('shows the Dashboard tab on Enterprise (DASHBOARD quota truthy) with dashboard as default', async () => {
		const fixture = await setupAuthenticatedIssuerDetail('enterprise');
		const component = fixture.componentInstance;
		expect(component.tabs.find((t) => t.key === 'dashboard')).toBeTruthy();
		expect(component.activeTab).toBe('dashboard');
	});

	it('shows the Dashboard tab on Free/Pro (DASHBOARD quota = 0) with badges as default', async () => {
		const fixture = await setupAuthenticatedIssuerDetail('free-or-pro');
		const component = fixture.componentInstance;
		expect(component.tabs.find((t) => t.key === 'dashboard')).toBeTruthy();
		expect(component.activeTab).toBe('badges');
	});

	it('does not grant dashboard access on Free/Pro', async () => {
		const fixture = await setupAuthenticatedIssuerDetail('free-or-pro');
		const component = fixture.componentInstance;
		expect(component.hasDashboardAccess()).toBe(false);
	});

	it('does not render the teaser when Dashboard quota is enabled', async () => {
		const fixture = await setupAuthenticatedIssuerDetail('enterprise');
		const component = fixture.componentInstance;
		expect(component.hasDashboardAccess()).toBe(true);
	});
});
