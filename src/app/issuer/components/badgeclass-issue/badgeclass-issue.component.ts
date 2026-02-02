import { Component, OnInit, inject, OnDestroy, signal } from '@angular/core';
import { FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { SessionService } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { EmailValidator, ValidationResult } from '../../../common/validators/email.validator';
import { UrlValidator } from '../../../common/validators/url.validator';
import { MdImgValidator } from '../../../common/validators/md-img.validator';

import { BadgeInstanceManager } from '../../services/badgeinstance-manager.service';
import { BadgeClassManager } from '../../services/badgeclass-manager.service';
import { IssuerManager } from '../../services/issuer-manager.service';

import { Issuer } from '../../models/issuer.model';
import { BadgeClass } from '../../models/badgeclass.model';
import { CommonDialogsService } from '../../../common/services/common-dialogs.service';
import { BadgrApiFailure } from '../../../common/services/api-failure';
import { RecipientIdentifierType } from '../../models/badgeinstance-api.model';
import { typedFormGroup } from '../../../common/util/typed-forms';
import { TelephoneValidator } from '../../../common/validators/telephone.validator';
import { EventsService } from '../../../common/services/events.service';
import { FormFieldTextInputType, FormFieldText } from '../../../common/components/formfield-text';
import striptags from 'striptags';
import { DateValidator } from '../../../common/validators/date.validator';
import { AppConfigService } from '../../../common/app-config.service';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { HlmDialogService } from './../../../components/spartan/ui-dialog-helm/src';
import { SuccessDialogComponent } from '../../../common/dialogs/oeb-dialogs/success-dialog.component';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { BgImageStatusPlaceholderDirective } from '../../../common/directives/bg-image-status-placeholder.directive';
import { OebInputComponent } from '../../../components/input.component';
import { OebSelectComponent } from '../../../components/select.component';
import { OebCheckboxComponent } from '../../../components/oeb-checkbox.component';
import { NgClass, DatePipe } from '@angular/common';
import { SvgIconComponent } from '../../../common/components/svg-icon.component';
import { FormFieldMarkdown } from '../../../common/components/formfield-markdown';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { HlmH1, HlmP } from '@spartan-ng/helm/typography';
import { OebCollapsibleComponent } from '~/components/oeb-collapsible.component';
import { DateRangeValidator } from '~/common/validators/date-range.validator';
import { NgIcon } from '@ng-icons/core';
import { OebSeparatorComponent } from '~/components/oeb-separator.component';
import { OptionalDetailsComponent } from '../optional-details/optional-details.component';
import { setupActivityOnlineSync } from '~/common/util/activity-place-sync-helper';
import { Subscription } from 'rxjs';

@Component({
	selector: 'badgeclass-issue',
	templateUrl: './badgeclass-issue.component.html',
	styles: [
		`
			:host ::ng-deep {
				brn-collapsible[data-state='open'] > button > span {
					font-weight: bold !important;
				}
			}
		`,
	],
	imports: [
		BgAwaitPromises,
		FormMessageComponent,
		BgBreadcrumbsComponent,
		FormsModule,
		ReactiveFormsModule,
		HlmH1,
		BgImageStatusPlaceholderDirective,
		HlmP,
		RouterLink,
		OebInputComponent,
		OebSelectComponent,
		OebCheckboxComponent,
		SvgIconComponent,
		FormFieldMarkdown,
		FormFieldText,
		NgClass,
		OebButtonComponent,
		DatePipe,
		TranslatePipe,
		OebCollapsibleComponent,
		NgIcon,
		OebSeparatorComponent,
		OptionalDetailsComponent,
	],
})
export class BadgeClassIssueComponent extends BaseAuthenticatedRoutableComponent implements OnInit, OnDestroy {
	protected title = inject(Title);
	protected messageService = inject(MessageService);
	protected eventsService = inject(EventsService);
	protected issuerManager = inject(IssuerManager);
	protected badgeClassManager = inject(BadgeClassManager);
	protected badgeInstanceManager = inject(BadgeInstanceManager);
	protected dialogService = inject(CommonDialogsService);
	protected configService = inject(AppConfigService);
	protected translate = inject(TranslateService);

	readonly badgeLoadingImageUrl = '../../../breakdown/static/images/badge-loading.svg';
	readonly badgeFailedImageUrl = '../../../breakdown/static/images/badge-failed.svg';

	readonly badgeInstanceCourseUrl = signal<string | null>(null);

	breadcrumbLinkEntries: LinkEntry[] = [];

	get issuerSlug() {
		return this.route.snapshot.params['issuerSlug'];
	}

	get badgeSlug() {
		return this.route.snapshot.params['badgeSlug'];
	}

	get recipientIdentifierFieldType(): FormFieldTextInputType {
		switch (this.issueForm.controls.recipient_type.value) {
			case 'email':
				return 'email';
			case 'openBadgeId':
				return 'text';
			case 'telephone':
				return 'tel';
			case 'url':
				return 'url';
			default:
				return 'text';
		}
	}

	idValidator: (control: FormControl) => ValidationResult = (control) => {
		if (this.issueForm) {
			switch (this.issueForm.controls.recipient_type.value) {
				case 'email':
					return EmailValidator.validEmail(control);
				case 'openBadgeId':
					return null;
				case 'telephone':
					return TelephoneValidator.validTelephone(control);
				//case 'url': return UrlValidator.validUrl(control);
				default:
					return null;
			}
		} else {
			return null;
		}
	};

	idError: string | boolean = false;

	issuer: Issuer;
	issueForm = typedFormGroup()
		.addControl('recipientprofile_name', '', [Validators.required, Validators.maxLength(35)])
		.addControl('recipient_type', 'email' as RecipientIdentifierType, [Validators.required], (control) => {
			control.rawControl.valueChanges.subscribe(() => {
				this.issueForm.controls.recipient_identifier.rawControl.updateValueAndValidity();
			});
		})
		.addControl('recipient_identifier', '', [Validators.required, this.idValidator])
		.addControl('activity_start_date', '', [], (control) => {
			control.rawControl.valueChanges.subscribe(() => {
				if (
					this.issueForm.controls.activity_end_date.rawControl.value === '' &&
					control.rawControl.value !== ''
				)
					this.issueForm.controls.activity_end_date.setValue(control.rawControl.value);
			});
		})
		.addControl('activity_end_date', '', [
			DateValidator.validDate,
			DateRangeValidator.endDateAfterStartDate('activity_start_date', 'activityEndBeforeStart'),
		])
		.addControl('activity_zip', '')
		.addControl('activity_city', '')
		.addControl('activity_online', false)
		.addControl('courseUrl', null, UrlValidator.validUrl)
		.addControl('notify_earner', true)
		.addArray(
			'evidence_items',
			typedFormGroup().addControl('narrative', '').addControl('evidence_url', '', UrlValidator.validUrl),
		);

	badgeClass: BadgeClass;

	previewB64Img: string;

	subscriptions: Subscription[] = [];

	issueBadgeFinished: Promise<unknown>;
	issuerLoaded: Promise<unknown>;
	badgeClassLoaded: Promise<unknown>;

	identifierOptionMap = {
		email: this.translate.instant('General.emailAddress'),
		url: 'URL',
		// telephone: "Telephone",
	};

	constructor() {
		const sessionService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, sessionService);
		const title = this.title;

		title.setTitle(`Award Badge - ${this.configService.theme['serviceName'] || 'Badgr'}`);

		this.issuerLoaded = this.issuerManager.issuerBySlug(this.issuerSlug).then((issuer) => {
			this.issuer = issuer;

			this.badgeClassLoaded = this.badgeClassManager
				.badgeByIssuerSlugAndSlug(this.issuerSlug, this.badgeSlug)
				.then((badgeClass) => {
					this.badgeClass = badgeClass;

					this.badgeInstanceCourseUrl.set(this.badgeClass.courseUrl ?? null);
					this.issueForm.controls.courseUrl.setValue(this.badgeInstanceCourseUrl());

					const category = badgeClass.extension['extensions:CategoryExtension'].Category;

					this.badgeClassManager
						.createBadgeImage(issuer.slug, badgeClass.slug, category, badgeClass.imageFrame)
						.then((img) => {
							this.previewB64Img = img.image_url;
						});

					this.breadcrumbLinkEntries = [
						{ title: 'Issuers', routerLink: ['/issuer'] },
						{
							title: issuer.name,
							routerLink: ['/issuer/issuers', this.issuerSlug],
						},
						{
							title: 'badges',
							routerLink: ['/issuer/issuers/' + this.issuerSlug + '/badges/'],
						},
						{
							title: badgeClass.name,
							routerLink: ['/issuer/issuers', this.issuerSlug, 'badges', badgeClass.slug],
						},
						{ title: 'Award Badge' },
					];

					this.title.setTitle(
						`Award Badge - ${badgeClass.name} - ${this.configService.theme['serviceName'] || 'Badgr'}`,
					);
				});
		});
	}

	ngOnInit() {
		super.ngOnInit();
		this.subscriptions.push(...setupActivityOnlineSync(this.issueForm));
		if (this.issueForm.controls.evidence_items.length === 0) {
			this.issueForm.controls.evidence_items.addFromTemplate();
		}
	}

	ngOnDestroy() {
		this.subscriptions.forEach((s) => s.unsubscribe());
	}

	addEvidence() {
		this.issueForm.controls.evidence_items.addFromTemplate();
	}

	onSubmit() {
		if (!this.issueForm.markTreeDirtyAndValidate()) {
			return;
		}

		const formState = this.issueForm.value;

		const cleanedEvidence = formState.evidence_items.filter((e) => e.narrative !== '' || e.evidence_url !== '');
		const cleanedName = striptags(formState.recipientprofile_name);

		const recipientProfileContextUrl =
			'https://api.openbadges.education/static/extensions/recipientProfile/context.json';
		const extensions = formState.recipientprofile_name
			? {
					'extensions:recipientProfile': {
						'@context': recipientProfileContextUrl,
						type: ['Extension', 'extensions:RecipientProfile'],
						name: cleanedName,
					},
				}
			: undefined;

		// const extensions = studyLoadExtension;

		const isIDValid = this.idValidator(this.issueForm.controls.recipient_identifier.rawControl);
		if (isIDValid) {
			Object.keys(isIDValid).forEach((key) => {
				this.idError = key;
			});
			return false;
		} else {
			this.idError = false;
		}

		const activityStartDate = formState.activity_start_date
			? new Date(formState.activity_start_date).toISOString()
			: null;
		const activityEndDate =
			formState.activity_end_date && formState.activity_start_date !== formState.activity_end_date
				? new Date(formState.activity_end_date).toISOString()
				: null;

		this.issueBadgeFinished = this.badgeInstanceManager
			.createBadgeInstance(this.issuerSlug, this.badgeSlug, {
				issuer: this.issuerSlug,
				badge_class: this.badgeSlug,
				recipient_type: formState.recipient_type,
				recipient_identifier: formState.recipient_identifier,
				create_notification: formState.notify_earner,
				evidence_items: cleanedEvidence,
				extensions,
				activity_start_date: activityStartDate,
				activity_end_date: activityEndDate,
				activity_zip: formState.activity_zip,
				activity_city: formState.activity_city,
				activity_online: formState.activity_online,
				course_url: formState.courseUrl,
			})
			.then(() => this.badgeClass.update())
			.then(
				() => {
					this.eventsService.recipientBadgesStale.next([]);
					this.openSuccessDialog(formState.recipient_identifier);
					this.router.navigate(['issuer/issuers', this.issuerSlug, 'badges', this.badgeClass.slug], {
						queryParams: { tab: 'recipients' },
					});
					this.messageService.setMessage('Badge awarded to ' + formState.recipient_identifier, 'success');
				},
				(error) => {
					this.messageService.setMessage(
						'Unable to award badge: ' + BadgrApiFailure.from(error).firstMessage,
						'error',
					);
				},
			)
			.then(() => (this.issueBadgeFinished = null));
	}

	private handleSuccess(recipientIdentifier: string) {
		this.eventsService.recipientBadgesStale.next([]);
		this.openSuccessDialog(recipientIdentifier);
		this.router.navigate(['issuer/issuers', this.issuerSlug, 'badges', this.badgeClass.slug]);
		this.messageService.setMessage(`Badge awarded to ${recipientIdentifier}`, 'success');
	}

	private handleError(error: any) {
		this.messageService.setMessage(`Unable to award badge: ${BadgrApiFailure.from(error).firstMessage}`, 'error');
	}

	async removeEvidence(i: number) {
		const evidence = this.issueForm.controls.evidence_items.value[i];

		if (
			(evidence.narrative.length === 0 && evidence.evidence_url.length === 0) ||
			(await this.dialogService.confirmDialog.openTrueFalseDialog({
				dialogTitle: `Delete Evidence?`,
				dialogBody: `Are you sure you want to delete this evidence?`,
				resolveButtonLabel: `Delete Evidence`,
				rejectButtonLabel: 'Cancel',
			}))
		) {
			this.issueForm.controls.evidence_items.removeAt(i);
		}
	}

	private readonly _hlmDialogService = inject(HlmDialogService);
	public openSuccessDialog(recipient) {
		const dialogRef = this._hlmDialogService.open(SuccessDialogComponent, {
			context: {
				recipient: recipient,
				variant: 'success',
			},
		});
	}
}
