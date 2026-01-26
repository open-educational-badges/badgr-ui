import { IssuerListComponent } from './components/issuer-list/issuer-list.component';
import { IssuerCreateComponent } from './components/issuer-create/issuer-create.component';
import { IssuerDetailComponent } from './components/issuer-detail/issuer-detail.component';
import { IssuerEditComponent } from './components/issuer-edit/issuer-edit.component';
import { BadgeClassCreateComponent } from './components/badgeclass-create/badgeclass-create.component';
import { BadgeClassEditComponent } from './components/badgeclass-edit/badgeclass-edit.component';
import { BadgeClassDetailComponent } from './components/badgeclass-detail/badgeclass-detail.component';
import { BadgeClassIssueComponent } from './components/badgeclass-issue/badgeclass-issue.component';
import { BadgeClassIssueBulkAwardComponent } from './components/badgeclass-issue-bulk-award/badgeclass-issue-bulk-award.component';
import { IssuerStaffComponent } from './components/issuer-staff/issuer-staff.component';
import { BadgeClassEditQrComponent } from './components/badgeclass-edit-qr/badgeclass-edit-qr.component';
import { BadgeClassIssueQrComponent } from './components/badgeclass-issue-qr/badgeclass-issue-qr.component';
import { BadgeClassGenerateQrComponent } from './components/badgeclass-generate-qr/badgeclass-generate-qr.component';
import { LearningPathCreateComponent } from './components/learningpath-create/learningpath-create.component';
import { IssuerLearningPathComponent } from './components/issuer-learning-path/issuer-learning-path.component';
import { LearningPathEditComponent } from './components/learningpath-edit/learningpath-edit.component';
import { BadgeClassSelectTypeComponent } from './components/badgeclass-select-type/badgeclass-select-type.component';
import { BadgeClassEditIssuedComponent } from './components/badgeclass-edit-issued/badgeclass-edit-issued';
import { NetworkCreateComponent } from './components/network-create/network-create.component';
import { NetworkDashboardComponent } from './components/network-dashboard/network-dashboard.component';
import { NetworkInviteConfirmationComponent } from './components/network-invite-confirmation/network-invite-confirmation.component';
import { NetworkEditComponent } from './components/network-edit/network-edit.component';

export const routes = [
	/* Issuer */
	{
		path: '',
		component: IssuerListComponent,
	},
	{
		path: 'create',
		component: IssuerCreateComponent,
	},
	{
		path: 'networks/create',
		component: NetworkCreateComponent,
	},
	{
		path: 'networks/:networkSlug',
		component: NetworkDashboardComponent,
	},
	{
		path: 'networks/:networkSlug/edit',
		component: NetworkEditComponent,
	},
	{
		path: 'networks/invite/:inviteSlug',
		component: NetworkInviteConfirmationComponent,
	},
	{
		path: 'issuers/:issuerSlug',
		component: IssuerDetailComponent,
	},
	{
		path: 'issuers/:issuerSlug/edit',
		component: IssuerEditComponent,
	},
	{
		path: 'issuers/:issuerSlug/staff',
		component: IssuerStaffComponent,
	},
	{
		path: 'issuers/:issuerSlug/badges/select',
		component: BadgeClassSelectTypeComponent,
	},
	{
		path: 'issuers/:issuerSlug/badges/create/:category',
		component: BadgeClassCreateComponent,
	},
	{
		path: 'issuers/:issuerSlug/badges/create',
		component: BadgeClassCreateComponent,
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug',
		component: BadgeClassDetailComponent,
	},
	{
		path: 'issuers/:issuerSlug/learningpaths/create',
		component: LearningPathCreateComponent,
	},
	{
		path: 'issuers/:issuerSlug/learningpaths/:learningPathSlug/edit',
		component: LearningPathEditComponent,
	},
	{
		path: 'issuers/:issuerSlug/learningpaths/:learningPathSlug',
		component: IssuerLearningPathComponent,
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug/qr',
		component: BadgeClassIssueQrComponent,
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug/qr/:qrCodeId/edit',
		component: BadgeClassEditQrComponent,
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug/qr/:qrCodeId/generate',
		component: BadgeClassGenerateQrComponent,
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug/edit',
		component: BadgeClassEditComponent,
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug/edit-issued',
		component: BadgeClassEditIssuedComponent,
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug/issue',
		component: BadgeClassIssueComponent,
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug/bulk-import',
		component: BadgeClassIssueBulkAwardComponent,
	},
	{
		path: '**',
		component: IssuerListComponent,
	},
];
