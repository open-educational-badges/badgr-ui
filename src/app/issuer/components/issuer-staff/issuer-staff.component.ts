import { Component, computed, inject, OnInit, signal, TemplateRef, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { SessionService } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { IssuerManager } from '../../services/issuer-manager.service';
import { Title } from '@angular/platform-browser';
import { Issuer, IssuerStaffMember, issuerStaffRoles } from '../../models/issuer.model';
import { preloadImageURL } from '../../../common/util/file-util';
import { FormFieldSelectOption } from '../../../common/components/formfield-select';
import { BadgrApiFailure } from '../../../common/services/api-failure';
import { CommonDialogsService } from '../../../common/services/common-dialogs.service';
import { IssuerStaffRoleSlug } from '../../models/issuer-api.model';
import { AppConfigService } from '../../../common/app-config.service';
import { BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src';
import { DialogComponent } from '../../../components/dialog.component';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { typedFormGroup } from '../../../common/util/typed-forms';
import { Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EmailValidator } from '../../../common/validators/email.validator';
import { IssuerStaffRequestApiService } from '../../services/issuer-staff-request-api.service';
import { ApiStaffRequest } from '../../models/staffrequest-api.model';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { OebInputComponent } from '../../../components/input.component';
import { FormFieldRadio } from '../../../common/components/formfield-radio';
import { IssuerStaffRequestsDatatableComponent } from '../../../components/datatable-issuer-staff-requests.component';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmH1, HlmH2 } from '@spartan-ng/helm/typography';
import { OebTableImports } from '~/components/oeb-table';
import { NgIcon } from '@ng-icons/core';
import { HlmIconModule } from '@spartan-ng/helm/icon';
import {
	SortingState,
	ColumnDef,
	createAngularTable,
	getCoreRowModel,
	getSortedRowModel,
	FlexRenderDirective,
	Header,
} from '@tanstack/angular-table';
import { TitleCasePipe } from '@angular/common';
import { UserProfileManager } from '~/common/services/user-profile-manager.service';
import { UserProfile } from '~/common/model/user-profile.model';
import { QuotaInformationComponent } from '../quota-information/quota-information.component';

@Component({
	templateUrl: './issuer-staff.component.html',
	styles: [
		`
			::ng-deep .radio .radio-x-text {
				--typography-size: 18px;
				line-height: 130%;
				font-weight: bold;
				padding-left: var(--gridspacing);
				color: var(--color-black);
			}

			::ng-deep .forminput p {
				color: var(--color-black);
				--typography-size: 18px;
				line-height: 130%;
			}
		`,
	],
	imports: [
		BgAwaitPromises,
		FormMessageComponent,
		BgBreadcrumbsComponent,
		HlmH1,
		OebButtonComponent,
		FormsModule,
		ReactiveFormsModule,
		OebInputComponent,
		FormFieldRadio,
		HlmH2,
		IssuerStaffRequestsDatatableComponent,
		...HlmTableImports,
		...OebTableImports,
		NgIcon,
		HlmIconModule,
		FlexRenderDirective,
		TranslatePipe,
		TitleCasePipe,
		QuotaInformationComponent,
	],
})
export class IssuerStaffComponent extends BaseAuthenticatedRoutableComponent implements OnInit {
	protected title = inject(Title);
	protected messageService = inject(MessageService);
	protected issuerManager = inject(IssuerManager);
	protected profileManager = inject(UserProfileManager);
	protected configService = inject(AppConfigService);
	protected dialogService = inject(CommonDialogsService);
	protected translate = inject(TranslateService);
	protected issuerStaffRequestApiService = inject(IssuerStaffRequestApiService);

	issuer = signal<Issuer | null>(null);
	userProfile = signal<UserProfile | null>(null);

	// Workaround the fact that issuers are updated in place by the ApiService, meaning
	// there is no new object reference when a new staff member is added or one is removed.
	// Hence, the signal won't get updated if the entities aren't spread into a new array.
	staff = computed<IssuerStaffMember[]>(() =>
		this.issuer()?.staff.entities ? [...this.issuer()?.staff.entities] : [],
	);
	staffRequests = signal<ApiStaffRequest[]>([]);
	isCurrentUserIssuerOwner = computed(() => {
		if (this.userProfile() && this.userProfile().emails.entities) {
			const emails = this.profileManager.userProfile.emails.entities;
			const staffMember = this.staff().find(
				(staffMember) => !!emails.find((profileEmail) => profileEmail.email === staffMember.email),
			);
			const isOwner = staffMember?.isOwner ?? false;
			return isOwner;
		}
	});
	breadcrumbLinkEntries = computed(() => [
		{ title: 'Issuers', routerLink: ['/issuer'] },
		{ title: this.issuer().name, routerLink: ['/issuer/issuers', this.issuerSlug] },
		{
			title: this.isCurrentUserIssuerOwner()
				? this.translate.instant('Issuer.editMembers')
				: this.translate.instant('General.members'),
		},
	]);
	issuerLoaded = signal<Promise<Issuer>>(null);
	userProfileLoaded = signal<Promise<UserProfile>>(null);
	error = signal<string>(null);

	dialogHeaderTemplate = viewChild.required<TemplateRef<void>>('dialogHeaderTemplate');
	addMemberFormTemplate = viewChild.required<TemplateRef<void>>('addMemberFormTemplate');
	confirmDialogHeaderTemplate = viewChild.required<TemplateRef<void>>('confirmDialogHeaderTemplate');
	staffRequestRoleTemplate = viewChild.required<TemplateRef<void>>('staffRequestRoleTemplate');
	translateHeaderIDCellTemplate = viewChild.required<TemplateRef<any>>('translateHeaderIDCellTemplate');
	roleSelectionCellTemplate = viewChild.required<TemplateRef<any>>('roleSelectionCellTemplate');
	badgeActionsTemplate = viewChild.required<TemplateRef<any>>('badgeActionsCellTemplate');

	readonly issuerStaffRoleOptions: FormFieldSelectOption[] = issuerStaffRoles.map((r) => ({
		label: r.label,
		value: r.slug,
		description: r.description,
	}));
	readonly issuerImagePlaceHolderUrl = preloadImageURL(
		'../../../../breakdown/static/images/placeholderavatar-issuer.svg',
	);
	readonly issuerSlug: string;
	readonly tableSorting = signal<SortingState>([
		{
			id: 'General.name',
			desc: false,
		},
	]);
	private readonly _hlmDialogService = inject(HlmDialogService);
	private readonly tableColumnDefinition: ColumnDef<IssuerStaffMember>[] = [
		{
			id: 'General.name',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => row.nameLabel,
			cell: (ctx) => ctx.getValue(),
			sortDescFirst: false,
		},
		{
			id: 'General.email',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => row.email,
			cell: (ctx) => ctx.getValue(),
			sortDescFirst: false,
		},
		{
			id: 'General.role',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => row.roleSlug,
			cell: () => this.roleSelectionCellTemplate(),
		},
		{
			id: 'actions',
			cell: (info) => this.badgeActionsTemplate(),
			enableSorting: false,
		},
	];

	table = createAngularTable(() => ({
		data: this.staff(),
		columns: this.tableColumnDefinition,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		state: {
			sorting: this.tableSorting(),
		},
		onSortingChange: (updater) =>
			updater instanceof Function ? this.tableSorting.update(updater) : this.tableSorting.set(updater),
		enableSortingRemoval: false, // ensures at least one column is sorted
	}));
	staffCreateForm = typedFormGroup()
		.addControl('staffRole', 'staff' as IssuerStaffRoleSlug, Validators.required)
		.addControl('staffEmail', '', [Validators.required, EmailValidator.validEmail]);

	staffRequestRoleForm = typedFormGroup().addControl(
		'staffRole',
		'staff' as IssuerStaffRoleSlug,
		Validators.required,
	);
	dialogRef: BrnDialogRef<any> = null;
	selectedStaffRequestEmail: string | null = null;

	constructor() {
		const loginService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, loginService);
		const title = this.title;

		title.setTitle(`Manage Issuer Staff - ${this.configService.theme['serviceName'] || 'Badgr'}`);
		this.issuerSlug = this.route.snapshot.params['issuerSlug'];
	}

	ngOnInit(): void {
		this.userProfileLoaded.set(
			this.profileManager.userProfilePromise.then((userProfile) => {
				this.userProfile.set(userProfile);
				return userProfile;
			}),
		);

		this.issuerLoaded.set(
			this.issuerManager.issuerBySlug(this.issuerSlug).then((issuer) => {
				this.issuer.set(issuer);
				return issuer;
			}),
		);

		this.issuerStaffRequestApiService.getStaffRequestsByIssuer(this.issuerSlug).then((r) => {
			this.staffRequests.set(r.body);
		});
	}

	getOrderForHeaderCell(headerCell: Header<IssuerStaffMember, unknown>): 'asc' | 'desc' {
		return headerCell.column.getNextSortingOrder() === 'asc' ? 'desc' : 'asc';
	}

	submitStaffRequestRoleForm(requestid: string) {
		if (!this.staffRequestRoleForm.markTreeDirtyAndValidate()) {
			return;
		}
		const formData = this.staffRequestRoleForm.value;

		return this.issuerStaffRequestApiService.confirmRequest(this.issuerSlug, requestid).then(
			() => {
				this.issuer()
					.addStaffMember(formData.staffRole, this.selectedStaffRequestEmail)
					.then((issuer) => {
						this.issuer.set(new Issuer(issuer.commonManager, issuer.apiModel));
					});
				this.error.set(null);
				this.messageService.reportMinorSuccess(
					`Added ${this.selectedStaffRequestEmail} as ${formData.staffRole}`,
				);
				this.closeDialog();
				this.staffRequests.update((current) =>
					current.filter((req) => req.user.email != this.selectedStaffRequestEmail),
				);
			},
			(error) => {
				const err = BadgrApiFailure.from(error);
				console.log(err);
				this.error.set(
					BadgrApiFailure.messageIfThrottableError(err.overallMessage) ||
						''.concat(this.translate.instant('Issuer.addMember_failed'), ': ', err.firstMessage),
				);
			},
		);
	}

	submitStaffCreate() {
		if (!this.staffCreateForm.markTreeDirtyAndValidate()) {
			return;
		}

		const formData = this.staffCreateForm.value;

		return this.issuer()
			.addStaffMember(formData.staffRole, formData.staffEmail)
			.then(
				(issuer) => {
					this.error.set(null);
					this.messageService.reportMinorSuccess(`Added ${formData.staffEmail} as ${formData.staffRole}`);
					this.closeDialog();
					this.issuer.set(new Issuer(issuer.commonManager, issuer.apiModel));
				},
				(error) => {
					const err = BadgrApiFailure.from(error);
					console.log(err);
					this.error.set(
						BadgrApiFailure.messageIfThrottableError(err.overallMessage) ||
							''.concat(this.translate.instant('Issuer.addMember_failed'), ': ', err.firstMessage),
					);
				},
			);
	}

	changeMemberRole(member: IssuerStaffMember, roleSlug: IssuerStaffRoleSlug) {
		member.roleSlug = roleSlug;

		member.save().then(
			() => {
				this.messageService.reportMajorSuccess(
					`${member.nameLabel}'s role has been changed to ${member.roleInfo.label}`,
				);
			},
			(error) =>
				this.messageService.reportHandledError(
					`Failed to edit member: ${BadgrApiFailure.from(error).firstMessage}`,
				),
		);
	}

	async removeMember(member: IssuerStaffMember) {
		if (
			!(await this.dialogService.confirmDialog.openTrueFalseDialog({
				dialogTitle: `Remove ${member.nameLabel}?`,
				dialogBody: `${member.nameLabel} is ${member.roleInfo.indefiniteLabel} of ${this.issuer().name}. Are you sure you want to remove them from this role?`,
				resolveButtonLabel: `Remove ${member.nameLabel}`,
				rejectButtonLabel: 'Cancel',
			}))
		) {
			return;
		}

		return member.remove().then(
			(issuer) => {
				this.issuer.set(new Issuer(issuer.commonManager, issuer.apiModel));
				this.messageService.reportMinorSuccess(`Removed ${member.nameLabel} from ${this.issuer().name}`);
			},
			(error) =>
				this.messageService.reportHandledError(
					`Failed to add member: ${BadgrApiFailure.from(error).firstMessage}`,
				),
		);
	}

	public openDialog(text: string) {
		const dialogRef = this._hlmDialogService.open(DialogComponent, {
			context: {
				headerTemplate: this.dialogHeaderTemplate(),
				text: text,
				subtitle: 'Are you sure you want to proceed?',
				content: this.addMemberFormTemplate(),
				variant: 'default',
				footer: false,
			},
		});
		this.dialogRef = dialogRef;
	}

	public isStaffMemberLoggedInUser(u: UserProfile, staff: IssuerStaffMember): boolean {
		if (!u.emails?.entities) return false;
		return u.emails.entities.find((e) => e.email === staff.email) !== undefined;
	}

	deleteStaffRequest(event) {
		this.issuerStaffRequestApiService.deleteRequest(this.issuerSlug, event).then(() => {
			this.staffRequests.update((current) => current.filter((req) => req.entity_id != event));
		});
	}

	closeDialog() {
		if (this.dialogRef) {
			this.dialogRef.close();
		}
	}

	confirmStaffRequest(event: ApiStaffRequest) {
		this.selectedStaffRequestEmail = event.user.email;
		const dialogRef = this._hlmDialogService.open(DialogComponent, {
			context: {
				headerTemplate: this.confirmDialogHeaderTemplate(),
				content: this.staffRequestRoleTemplate(),
				footer: false,
				templateContext: {
					email: this.selectedStaffRequestEmail,
					requestid: event.entity_id,
				},
			},
		});
		this.dialogRef = dialogRef;
	}
}
