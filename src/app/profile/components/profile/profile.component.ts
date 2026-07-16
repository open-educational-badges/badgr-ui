import { Component, computed, OnDestroy, OnInit, signal, TemplateRef, viewChild, inject } from '@angular/core';
import { Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { EmailValidator } from '../../../common/validators/email.validator';
import { MessageService } from '../../../common/services/message.service';
import { SessionService } from '../../../common/services/session.service';
import { Title } from '@angular/platform-browser';

import { CommonDialogsService } from '../../../common/services/common-dialogs.service';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { DisableTwoFactorDialogComponent } from '../../../common/dialogs/oeb-dialogs/disable-two-factor-dialog.component';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { BadgrApiFailure } from '../../../common/services/api-failure';
import { UserProfileManager } from '../../../common/services/user-profile-manager.service';
import { UserProfile, UserProfileEmail } from '../../../common/model/user-profile.model';
import { Subscription } from 'rxjs';
import { AppConfigService } from '../../../common/app-config.service';
import { typedFormGroup } from '../../../common/util/typed-forms';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { SourceListenerDirective } from '../../../mozz-transition/directives/source-listener/source-listener.directive';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { BgPopupMenuTriggerDirective, BgPopupMenu } from '../../../common/components/bg-popup-menu.component';
import { SvgIconComponent } from '../../../common/components/svg-icon.component';
import { MenuItemDirective } from '../../../common/directives/bg-menuitem.directive';
import { FormFieldText } from '../../../common/components/formfield-text';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { OebTableImports } from '~/components/oeb-table';
import {
	ColumnDef,
	createAngularTable,
	FlexRenderDirective,
	getCoreRowModel,
	getSortedRowModel,
	Header,
	SortingState,
} from '@tanstack/angular-table';
import { NgIcon } from '@ng-icons/core';
import { OebDropdownComponent } from '~/components/oeb-dropdown.component';
import { HlmIcon } from '@spartan-ng/helm/icon';

@Component({
	selector: 'userProfile',
	templateUrl: './profile.component.html',
	imports: [
		...HlmTableImports,
		...OebTableImports,
		FlexRenderDirective,
		NgIcon,
		HlmIcon,
		OebDropdownComponent,
		FormMessageComponent,
		SourceListenerDirective,
		BgAwaitPromises,
		RouterLink,
		BgPopupMenuTriggerDirective,
		SvgIconComponent,
		BgPopupMenu,
		MenuItemDirective,
		FormsModule,
		ReactiveFormsModule,
		FormFieldText,
		TranslatePipe,
	],
})
export class ProfileComponent extends BaseAuthenticatedRoutableComponent implements OnInit, OnDestroy {
	protected router: Router;
	protected authService: SessionService;
	protected title = inject(Title);
	protected messageService = inject(MessageService);
	protected profileManager = inject(UserProfileManager);
	protected dialogService = inject(CommonDialogsService);
	protected configService = inject(AppConfigService);
	private translate = inject(TranslateService);
	private hlmDialogService = inject(HlmDialogService);

	emails = signal<UserProfileEmail[]>([]);
	menuItems = computed(() => this.emails().map((x) => this.menuItemsForEmail(x)));
	emailForm = typedFormGroup().addControl('email', '', [Validators.required, EmailValidator.validEmail]);
	profile: UserProfile;
	profileLoaded: Promise<unknown>;
	emailsLoaded: Promise<unknown>;

	translateHeaderIDCellTemplate = viewChild.required<TemplateRef<any>>('translateHeaderIDCellTemplate');
	emailAddressCellTemplate = viewChild.required<TemplateRef<any>>('emailAddressCellTemplate');
	verifiedStateCellTemplate = viewChild.required<TemplateRef<any>>('verifiedStateCellTemplate');
	badgeActionsTemplate = viewChild.required<TemplateRef<any>>('badgeActionsCellTemplate');

	readonly tableSorting = signal<SortingState>([
		{
			id: 'Profile.emailAddress',
			desc: false,
		},
	]);

	private emailsSubscription: Subscription;

	private readonly tableColumnDefinition: ColumnDef<UserProfileEmail>[] = [
		{
			id: 'Profile.emailAddress',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => row.email,
			cell: (ctx) => this.emailAddressCellTemplate(),
			sortDescFirst: false,
		},
		{
			id: 'Profile.status',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => row.verified,
			cell: (info) => this.verifiedStateCellTemplate(),
		},
		{
			id: 'actions',
			cell: (info) => this.badgeActionsTemplate(),
			enableSorting: false,
		},
	];

	table = createAngularTable(() => ({
		data: this.emails(),
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

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const router = inject(Router);
		const route = inject(ActivatedRoute);
		const sessionService = inject(SessionService);

		super(router, route, sessionService);
		this.router = router;
		this.authService = sessionService;
		const title = this.title;

		title.setTitle(`Profile - ${this.configService.theme['serviceName'] || 'Badgr'}`);
	}

	ngOnInit() {
		super.ngOnInit();
		this.profileLoaded = this.profileManager.userProfilePromise.then(
			(profile) => {
				this.profile = profile;

				this.emailsSubscription = profile.emails.loaded$.subscribe((update) => {
					this.emails.set(profile.emails.entities);
				});
			},
			(error) => this.messageService.reportAndThrowError('Failed to load userProfile', error),
		);

		this.emailsLoaded = this.profileManager.userProfilePromise.then((p) => p.emails.loadedPromise);
	}

	ngOnDestroy(): void {
		if (this.emailsSubscription) this.emailsSubscription.unsubscribe();
	}

	getOrderForHeaderCell(headerCell: Header<UserProfileEmail, unknown>): 'asc' | 'desc' {
		return headerCell.column.getNextSortingOrder() === 'asc' ? 'desc' : 'asc';
	}

	submitEmailForm() {
		if (!this.emailForm.markTreeDirtyAndValidate()) {
			return;
		}

		const formState = this.emailForm.value;

		this.profile.addEmail(formState.email).then(
			(email) => {
				this.emails.update((x) => [...x]);
				this.messageService.setMessage('New email is currently pending.', 'success');
				const emailControl = this.emailForm.rawControlMap.email;

				emailControl.setValue('', { emitEvent: false });
				emailControl.setErrors(null, { emitEvent: false });
			},
			(error) => {
				const badgeApiErr = BadgrApiFailure.from(error);
				const throttleMsg = BadgrApiFailure.messageIfThrottableError(JSON.parse(badgeApiErr.overallMessage));

				if (throttleMsg) {
					this.messageService.reportHandledError(throttleMsg, error);
				} else if (error.response.status === 400) {
					this.messageService.reportHandledError(`Unable to add email: Email already exists`);
				} else {
					this.messageService.reportHandledError(
						`Unable to add email: ${BadgrApiFailure.from(error).firstMessage}`,
					);
				}
			},
		);
	}

	clickConfirmRemove(email: UserProfileEmail) {
		if (email.primary) return;
		this.dialogService.confirmDialog
			.openResolveRejectDialog({
				dialogTitle: 'Delete Email',
				dialogBody: `All badges associated with this email address will be removed. Are you sure you want to delete email ${email.email}`,
				resolveButtonLabel: 'Confirm remove',
				rejectButtonLabel: 'Cancel',
			})
			.then(
				() => this.clickRemove(email), // success - clicked confirm
				(cancel) => void 0, // fail - clicked cancel
			);
	}

	clickRemove(email: UserProfileEmail) {
		email.remove().then(
			(mail) => {
				this.emails.update((x) => [...mail.emails.entities]);
				this.messageService.reportMinorSuccess(`You have successfully removed ${email.email}`);
			},
			(error) =>
				this.messageService.reportHandledError(
					`Unable to remove ${email.email}: ${BadgrApiFailure.from(error).firstMessage}`,
					error,
				),
		);
	}

	clickMakePrimary(email: UserProfileEmail) {
		email.makePrimary().then(
			() => {
				this.messageService.reportMajorSuccess(`${email.email} is now your primary email.`);
				this.profile.emails.updateList();
				this.emails.update((x) => [...this.profile.emails.entities]);
			},
			(error) =>
				this.messageService.reportAndThrowError(
					`Unable to set ${email.email} to primary email: ${BadgrApiFailure.from(error).firstMessage}`,
					error,
				),
		);
	}

	clickResendVerification(email: UserProfileEmail) {
		email.resendVerificationEmail().then(
			() => this.messageService.reportMajorSuccess(`Confirmation re-sent to ${email.email}`),
			(error) => {
				if (error.response.status === 429) {
					this.messageService.reportAndThrowError(
						`Failed to resend confirmation to ${email.email}: ${error.response._body}`,
						error,
					);
				} else {
					this.messageService.reportAndThrowError(
						`Failed to resend confirmation to ${email.email}: ${BadgrApiFailure.from(error).firstMessage}`,
						error,
					);
				}
			},
		);
	}

	async delete() {
		if (
			await this.dialogService.confirmDialog.openTrueFalseDialog({
				dialogTitle: this.translate.instant('Profile.deleteAccount'),
				dialogBody: this.translate.instant('Profile.deleteAccountConfirm'),
				resolveButtonLabel: this.translate.instant('Profile.deleteAccountYes'),
				rejectButtonLabel: this.translate.instant('General.cancel'),
			})
		) {
			this.profile.delete().then(
				() => {
					this.authService.logout();
					// Not sure why I need the timeout, but
					// otherwise the message isn't shown
					setTimeout(() =>
						this.messageService.reportMajorSuccess(
							this.translate.instant('Profile.deleteAccountSuccess'),
							true,
						),
					);
					this.router.navigate(['/public/start']);
				},
				(error) =>
					this.messageService.reportHandledError(
						this.translate.instant('Profile.deleteAccountFailure') + ` (${error.response?._body ?? error})`,
						true,
					),
			);
		}
	}

	manage2FA() {
		if (!this.profile.totpEnabled) {
			this.router.navigate(['/profile/2fa']);
		} else {
			this.hlmDialogService.open(DisableTwoFactorDialogComponent, {
				closeOnBackdropClick: false,
				closeOnOutsidePointerEvents: false,
				contentClass: 'tw-max-w-[600px] tw-border-4 tw-min-h-[614px]',
				context: {
					onDisabled: async () => {
						await this.profile.update();
						this.messageService.reportMajorSuccess(
							this.translate.instant('TwoFactor.profile.disabledSuccess'),
							true,
						);
					},
				},
			});
		}
	}

	private menuItemsForEmail = (u: UserProfileEmail) => {
		return [
			u.verified
				? {
						title: 'Profile.makePrimary',
						icon: 'lucideRepeat2',
						action: () => this.clickMakePrimary(u),
					}
				: {
						title: 'Profile.resendVerification',
						icon: 'lucideRepeat2',
						action: () => this.clickResendVerification(u),
					},
			{
				title: 'Profile.remove',
				icon: 'lucideTrash2',
				action: () => this.clickConfirmRemove(u),
				disabled: u.primary,
			},
		];
	};
}
