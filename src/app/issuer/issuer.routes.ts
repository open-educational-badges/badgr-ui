import { BadgeClassMembershipGuard } from '../common/guards/badgeclass-membership.guard';

export const routes = [
	/* Issuer */
	{
		path: '',
		loadComponent: () =>
			import('./components/issuer-list/issuer-list.component').then((m) => m.IssuerListComponent),
	},
	{
		path: 'create',
		loadComponent: () =>
			import('./components/issuer-create/issuer-create.component').then((m) => m.IssuerCreateComponent),
	},
	{
		path: 'networks/create',
		loadComponent: () =>
			import('./components/network-create/network-create.component').then((m) => m.NetworkCreateComponent),
	},
	{
		path: 'networks/:networkSlug',
		loadComponent: () =>
			import('./components/network-dashboard/network-dashboard.component').then(
				(m) => m.NetworkDashboardComponent,
			),
	},
	{
		path: 'networks/:networkSlug/edit',
		loadComponent: () =>
			import('./components/network-edit/network-edit.component').then((m) => m.NetworkEditComponent),
	},
	{
		path: 'networks/:networkSlug/badge-analysis',
		loadComponent: () =>
			import('./components/network-badge-analysis/network-badge-analysis.component').then(
				(m) => m.NetworkBadgeAnalysisComponent,
			),
	},
	{
		path: 'networks/:networkSlug/competency-tracking',
		loadComponent: () =>
			import('./components/network-competency-tracking/network-competency-tracking.component').then(
				(m) => m.DashboardCompetencyTrackingComponent,
			),
	},
	{
		path: 'networks/:networkSlug/competency-tracking/:competencyId',
		loadComponent: () =>
			import('./components/network-competency-tracking/network-competency-tracking.component').then(
				(m) => m.DashboardCompetencyTrackingComponent,
			),
	},
	{
		path: 'networks/invite/:inviteSlug',
		loadComponent: () =>
			import('./components/network-invite-confirmation/network-invite-confirmation.component').then(
				(m) => m.NetworkInviteConfirmationComponent,
			),
	},
	{
		path: 'issuers/:issuerSlug',
		loadComponent: () =>
			import('./components/issuer-detail/issuer-detail.component').then((m) => m.IssuerDetailComponent),
	},
	{
		path: 'issuers/:issuerSlug/edit',
		loadComponent: () =>
			import('./components/issuer-edit/issuer-edit.component').then((m) => m.IssuerEditComponent),
	},
	{
		path: 'issuers/:issuerSlug/staff',
		loadComponent: () =>
			import('./components/issuer-staff/issuer-staff.component').then((m) => m.IssuerStaffComponent),
	},
	{
		path: 'issuers/:issuerSlug/badges/select',
		loadComponent: () =>
			import('./components/badgeclass-select-type/badgeclass-select-type.component').then(
				(m) => m.BadgeClassSelectTypeComponent,
			),
	},
	{
		path: 'issuers/:issuerSlug/badges/create/:category',
		loadComponent: () =>
			import('./components/badgeclass-create/badgeclass-create.component').then(
				(m) => m.BadgeClassCreateComponent,
			),
	},
	{
		path: 'issuers/:issuerSlug/badges/create',
		loadComponent: () =>
			import('./components/badgeclass-create/badgeclass-create.component').then(
				(m) => m.BadgeClassCreateComponent,
			),
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug',
		loadComponent: () =>
			import('./components/badgeclass-detail/badgeclass-detail.component').then(
				(m) => m.BadgeClassDetailComponent,
			),
		canActivate: [BadgeClassMembershipGuard],
	},
	{
		path: 'issuers/:issuerSlug/learningpaths/create',
		loadComponent: () =>
			import('./components/learningpath-create/learningpath-create.component').then(
				(m) => m.LearningPathCreateComponent,
			),
	},
	{
		path: 'issuers/:issuerSlug/learningpaths/:learningPathSlug/edit',
		loadComponent: () =>
			import('./components/learningpath-edit/learningpath-edit.component').then(
				(m) => m.LearningPathEditComponent,
			),
	},
	{
		path: 'issuers/:issuerSlug/learningpaths/:learningPathSlug',
		loadComponent: () =>
			import('./components/issuer-learning-path/issuer-learning-path.component').then(
				(m) => m.IssuerLearningPathComponent,
			),
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug/qr',
		loadComponent: () =>
			import('./components/badgeclass-issue-qr/badgeclass-issue-qr.component').then(
				(m) => m.BadgeClassIssueQrComponent,
			),
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug/qr/:qrCodeId/edit',
		loadComponent: () =>
			import('./components/badgeclass-edit-qr/badgeclass-edit-qr.component').then(
				(m) => m.BadgeClassEditQrComponent,
			),
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug/qr/:qrCodeId/generate',
		loadComponent: () =>
			import('./components/badgeclass-generate-qr/badgeclass-generate-qr.component').then(
				(m) => m.BadgeClassGenerateQrComponent,
			),
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug/edit',
		loadComponent: () =>
			import('./components/badgeclass-edit/badgeclass-edit.component').then((m) => m.BadgeClassEditComponent),
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug/edit-issued',
		loadComponent: () =>
			import('./components/badgeclass-edit-issued/badgeclass-edit-issued').then(
				(m) => m.BadgeClassEditIssuedComponent,
			),
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug/issue',
		loadComponent: () =>
			import('./components/badgeclass-issue/badgeclass-issue.component').then((m) => m.BadgeClassIssueComponent),
	},
	{
		path: 'issuers/:issuerSlug/badges/:badgeSlug/bulk-import',
		loadComponent: () =>
			import('./components/badgeclass-issue-bulk-award/badgeclass-issue-bulk-award.component').then(
				(m) => m.BadgeClassIssueBulkAwardComponent,
			),
	},
	{
		path: 'issuers/:issuerSlug/pdftemplates/create',
		loadComponent: () =>
			import('./components/pdftemplate-create/pdftemplate-create.component').then(
				(m) => m.PDFTemplateCreateComponent,
			),
	},
	{
		path: 'issuers/:issuerSlug/pdftemplates/:pdfTemplateSlug/edit',
		loadComponent: () =>
			import('./components/pdftemplate-edit/pdftemplate-edit.component').then((m) => m.PDFTemplateEditComponent),
	},
	{
		path: 'issuers/:issuerSlug/learningpaths/:learningPathSlug/pdftemplate',
		loadComponent: () =>
			import('./components/learningpath-edit-pdftemplate/learningpath-edit-pdftemplate.component').then(
				(m) => m.LearningPathEditPDFTemplateComponent,
			),
	},
	{
		path: 'issuers/:networkSlug/badge-analysis',
		loadComponent: () =>
			import('./components/network-badge-analysis/network-badge-analysis.component').then(
				(m) => m.NetworkBadgeAnalysisComponent,
			),
	},
	{
		path: 'issuers/:networkSlug/competency-tracking',
		loadComponent: () =>
			import('./components/network-competency-tracking/network-competency-tracking.component').then(
				(m) => m.DashboardCompetencyTrackingComponent,
			),
	},
	{
		path: 'issuers/:networkSlug/competency-tracking/:competencyId',
		loadComponent: () =>
			import('./components/network-competency-tracking/network-competency-tracking.component').then(
				(m) => m.DashboardCompetencyTrackingComponent,
			),
	},
	{
		path: 'issuers/:issuerSlug/quotas',
		loadComponent: () =>
			import('./components/issuer-quotas/issuer-quotas.component').then((m) => m.IssuerQuotasComponent),
	},
	{
		path: 'networks/:issuerSlug/quotas',
		loadComponent: () =>
			import('./components/issuer-quotas/issuer-quotas.component').then((m) => m.IssuerQuotasComponent),
	},
	{
		path: '**',
		loadComponent: () =>
			import('./components/issuer-list/issuer-list.component').then((m) => m.IssuerListComponent),
	},
];
