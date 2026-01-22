import {
	Component,
	EventEmitter,
	Output,
	inject,
	OnDestroy,
	AfterViewChecked,
	ViewChildren,
	QueryList,
	ElementRef,
	OnInit,
	input,
	signal,
} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { Title } from '@angular/platform-browser';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import {
	BulkIssueData,
	TransformedImportData,
	ViewState,
} from '../badgeclass-issue-bulk-award/badgeclass-issue-bulk-award.component';
import { BadgeInstanceManager } from '../../services/badgeinstance-manager.service';
import { BadgeInstanceBatchAssertion } from '../../models/badgeinstance-api.model';
import striptags from 'striptags';
import { typedFormGroup } from '../../../common/util/typed-forms';
import { BadgeInstanceApiService } from '../../services/badgeinstance-api.service';
import { TaskStatus, TaskResult, TaskPollingManagerService } from '../../../common/task-manager.service';
import { Subscription } from 'rxjs';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { HlmH1, HlmP } from '@spartan-ng/helm/typography';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { isValidEmail } from '~/common/util/is-valid-email';
import { DateValidator } from '~/common/validators/date.validator';
import { DateRangeValidator } from '~/common/validators/date-range.validator';
import { OptionalDetailsComponent } from '../optional-details/optional-details.component';
import { setupActivityOnlineSync } from '~/common/util/activity-place-sync-helper';
import { UrlValidator } from '~/common/validators/url.validator';
import { BadgeClass } from '~/issuer/models/badgeclass.model';

@Component({
	selector: 'badgeclass-issue-bulk-award-confirmation',
	templateUrl: './badgeclass-issue-bulk-award-confirmation.component.html',
	imports: [HlmH1, HlmP, OebButtonComponent, TranslatePipe, NgClass, FormsModule, OptionalDetailsComponent],
})
export class BadgeclassIssueBulkAwardConformation
	extends BaseAuthenticatedRoutableComponent
	implements OnDestroy, AfterViewChecked, OnInit
{
	protected badgeInstanceManager = inject(BadgeInstanceManager);
	protected badgeInstanceApiService = inject(BadgeInstanceApiService);
	protected authService: SessionService;
	protected router: Router;
	protected route: ActivatedRoute;
	protected messageService = inject(MessageService);
	protected formBuilder = inject(FormBuilder);
	protected title = inject(Title);
	protected taskService = inject(TaskPollingManagerService);
	protected translate = inject(TranslateService);

	readonly transformedImportData = input<TransformedImportData>(undefined);
	readonly badgeSlug = input<string>(undefined);
	readonly badgeClass = input<BadgeClass>(undefined);
	readonly issuerSlug = input<string>(undefined);
	readonly badgeInstanceCourseUrl = signal<string | null>(null);
	@Output() updateStateEmitter = new EventEmitter<ViewState>();

	@ViewChildren('emailInput') emailInputs!: QueryList<ElementRef<HTMLInputElement>>;

	optionalDetailsForm = typedFormGroup()
		.addControl('courseUrl', null, UrlValidator.validUrl)
		.addControl('activity_start_date', '', DateValidator.validDate, (control) => {
			control.rawControl.valueChanges.subscribe(() => {
				if (
					this.optionalDetailsForm.controls.activity_end_date.rawControl.value === '' &&
					control.rawControl.value !== ''
				)
					this.optionalDetailsForm.controls.activity_end_date.setValue(control.rawControl.value);
			});
		})
		.addControl('activity_end_date', '', [
			DateValidator.validDate,
			DateRangeValidator.endDateAfterStartDate('activity_start_date', 'activityEndBeforeStart'),
		])
		.addControl('activity_zip', '')
		.addControl('activity_city', '')
		.addControl('activity_online', false)
		.addArray(
			'evidence_items',
			typedFormGroup().addControl('narrative', '').addControl('evidence_url', '', UrlValidator.validUrl),
		);

	buttonDisabledClass = true;
	buttonDisabledAttribute = true;
	issuer: string;

	issueBadgeFinished: Promise<unknown>;

	subscriptions: Subscription[] = [];

	private taskSubscription: Subscription | null = null;
	currentTaskStatus: TaskResult | null = null;

	private focusedRow: BulkIssueData | null = null;

	constructor() {
		const sessionService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, sessionService);

		this.authService = sessionService;
		this.router = router;
		this.route = route;
	}

	ngOnInit(): void {
		this.enableActionButton();
		this.subscriptions.push(...setupActivityOnlineSync(this.optionalDetailsForm));
		if (this.optionalDetailsForm.controls.evidence_items.length === 0) {
			this.optionalDetailsForm.controls.evidence_items.addFromTemplate();
		}
		this.optionalDetailsForm.controls.courseUrl.setValue(this.badgeClass().courseUrl ?? null);
		this.badgeInstanceCourseUrl.set(this.optionalDetailsForm.controls.courseUrl.value);
	}

	ngOnDestroy() {
		if (this.taskSubscription) {
			this.taskSubscription.unsubscribe();
		}
		this.subscriptions.forEach((s) => s.unsubscribe());
	}

	addEvidence() {
		this.optionalDetailsForm.controls.evidence_items.addFromTemplate();
	}

	removeEvidence(i: number) {
		this.optionalDetailsForm.controls.evidence_items.removeAt(i);
	}

	enableActionButton() {
		this.buttonDisabledClass = this.hasInvalidEmails || !this.optionalDetailsForm.valid;
		this.buttonDisabledAttribute = null;
	}

	disableActionButton() {
		this.buttonDisabledClass = true;
		this.buttonDisabledAttribute = true;
	}

	get hasInvalidEmails(): boolean {
		const transformedImportData = this.transformedImportData();
		if (!transformedImportData?.validRowsTransformed) return false;

		return Array.from(transformedImportData.validRowsTransformed).some((row) => row.emailInvalid);
	}

	get invalidEmailCount(): number {
		const transformedImportData = this.transformedImportData();
		if (!transformedImportData?.validRowsTransformed) return 0;
		return Array.from(transformedImportData.validRowsTransformed).filter((row) => row.emailInvalid).length;
	}

	startEditing(row: BulkIssueData) {
		row.isEditing = true;
		this.focusedRow = row;
	}

	cancelEditing(row: BulkIssueData) {
		row.isEditing = false;
	}

	saveEdit(row: BulkIssueData) {
		row.isEditing = false;

		row.emailInvalid = !isValidEmail(row.email);

		this.buttonDisabledClass = this.hasInvalidEmails || !this.optionalDetailsForm.valid;
		this.buttonDisabledAttribute = this.hasInvalidEmails || !this.optionalDetailsForm.valid;
	}

	onEditFocus(row: BulkIssueData) {
		this.focusedRow = row;
	}

	ngAfterViewChecked() {
		if (this.focusedRow) {
			const input = this.emailInputs.find(
				(ref) => ref.nativeElement && ref.nativeElement.value === this.focusedRow.email,
			);
			if (input) {
				input.nativeElement.focus();
				this.focusedRow = null;
			}
		}
	}

	dataConfirmed() {
		if (this.buttonDisabledAttribute) return;
		this.disableActionButton();

		const assertions: BadgeInstanceBatchAssertion[] = [];
		const recipientProfileContextUrl =
			'https://api.openbadges.education/static/extensions/recipientProfile/context.json';

		const formState = this.optionalDetailsForm.rawControl.getRawValue();
		const activityStartDate = formState.activity_start_date
			? new Date(formState.activity_start_date).toISOString()
			: null;
		const activityEndDate =
			formState.activity_end_date && formState.activity_start_date !== formState.activity_end_date
				? new Date(formState.activity_end_date).toISOString()
				: null;

		this.transformedImportData().validRowsTransformed.forEach((row) => {
			let assertion: BadgeInstanceBatchAssertion;

			const extensions = row.name
				? {
						'extensions:recipientProfile': {
							'@context': recipientProfileContextUrl,
							type: ['Extension', 'extensions:RecipientProfile'],
							name: striptags(row.name),
						},
					}
				: undefined;

			assertion = {
				recipient_identifier: row.email,
				extensions: extensions,
				activity_start_date: activityStartDate,
				activity_end_date: activityEndDate,
				activity_zip: formState.activity_zip,
				activity_city: formState.activity_city,
				activity_online: formState.activity_online,
				evidence_items: formState.evidence_items,
				course_url: formState.courseUrl,
			};
			assertions.push(assertion);
		});

		this.badgeInstanceApiService
			.createBadgeInstanceBatchedAsync(this.issuerSlug(), this.badgeSlug(), {
				issuer: this.issuerSlug(),
				badge_class: this.badgeSlug(),
				create_notification: true,
				assertions,
			})
			.then((response) => {
				const taskId = response.body.task_id;
				this.startTaskPolling(taskId);

				this.router.navigate(['/issuer/issuers', this.issuerSlug(), 'badges', this.badgeSlug()], {
					queryParams: { tab: 'recipients' },
				});
			})
			.catch((error) => {
				console.error('Error creating badge batch:', error);
				this.enableActionButton(); // Re-enable the button on error

				// Show error message to user
				this.messageService.reportHandledError('Failed to start batch award process. Please try again.', error);
			});
	}

	private startTaskPolling(taskId: string) {
		// Clean up any existing subscription
		if (this.taskSubscription) {
			this.taskSubscription.unsubscribe();
		}

		this.taskSubscription = this.taskService
			.startTaskPolling(taskId, this.issuerSlug(), this.badgeSlug())
			.subscribe(
				(taskResult: TaskResult) => {
					this.currentTaskStatus = taskResult;

					if (taskResult.status === TaskStatus.FAILURE) {
						this.handleTaskFailure(taskResult);
					}
				},
				(error) => {
					console.error('Error polling batch award task status:', error);
					this.handleTaskError(error);
				},
			);
	}

	private handleTaskFailure(taskResult: TaskResult) {
		const errorMessage = taskResult.result?.error || 'An error occurred during the batch award process.';
		this.messageService.reportHandledError(this.translate.instant('Issuer.batchAwardFailed'), errorMessage);
	}

	private handleTaskError(error: any) {
		this.messageService.reportHandledError(this.translate.instant('Issuer.failedBatchMonitoring'), error);
	}

	updateViewState(state: ViewState) {
		this.updateStateEmitter.emit(state);
	}

	removeValidRowsTransformed(row) {
		this.transformedImportData().validRowsTransformed.delete(row);
		if (!this.transformedImportData().validRowsTransformed.size) {
			this.disableActionButton();
		}
	}
}
