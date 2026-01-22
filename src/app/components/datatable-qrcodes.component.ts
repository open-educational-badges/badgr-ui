import { NgIcon } from '@ng-icons/core';
import {
	Component,
	signal,
	inject,
	TemplateRef,
	viewChild,
	computed,
	input,
	output,
	OnInit,
	OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmIcon } from './spartan/ui-icon-helm/src';
import { HlmMenuModule } from './spartan/ui-menu-helm/src';
import { HlmTableImports } from './spartan/ui-table-helm/src';
import { BrnSelectModule } from '@spartan-ng/brain/select';
import { HlmSelectModule } from './spartan/ui-select-helm/src';
import { Subscription } from 'rxjs';
import { HlmDialogService } from './spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { SuccessDialogComponent } from '../common/dialogs/oeb-dialogs/success-dialog.component';
import { TranslateModule } from '@ngx-translate/core';
import { BadgeRequestApiService } from '../issuer/services/badgerequest-api.service';
import { MessageService } from '../common/services/message.service';
import { DangerDialogComponent } from '../common/dialogs/oeb-dialogs/danger-dialog.component';
import { TranslateService } from '@ngx-translate/core';
import { ApiRequestedBadge } from '../issuer/models/badgerequest-api.model';
import { OebButtonComponent } from './oeb-button.component';
import striptags from 'striptags';
import { OebSpinnerComponent } from './oeb-spinner.component';
import { BadgeInstanceBatchAssertion } from '../issuer/models/badgeinstance-api.model';
import { BadgeInstanceApiService } from '../issuer/services/badgeinstance-api.service';
import { TaskPollingManagerService, TaskResult, TaskStatus } from '../common/task-manager.service';
import { formatDate, TitleCasePipe } from '@angular/common';
import {
	ColumnDef,
	createAngularTable,
	FlexRenderDirective,
	getCoreRowModel,
	getSortedRowModel,
	RowSelectionState,
	SortingState,
} from '@tanstack/angular-table';
import { OebCheckboxComponent } from './oeb-checkbox.component';
import { OebTableImports } from './oeb-table';
import { HlmButtonModule } from './spartan/ui-button-helm/src';
import { ApiQRCode } from '~/issuer/models/qrcode-api.model';

export type RequestedBadge = {
	email: string;
	status: string;
	firstName: string;
	lastName: string;
	requestedOn: Date;
	entity_id: string;
};

@Component({
	selector: 'qrcodes-datatable',
	imports: [
		FormsModule,
		HlmMenuModule,
		...HlmTableImports,
		...OebTableImports,
		NgIcon,
		HlmIcon,
		BrnSelectModule,
		HlmSelectModule,
		HlmButtonModule,
		TranslateModule,
		OebButtonComponent,
		OebSpinnerComponent,
		OebCheckboxComponent,
		FlexRenderDirective,
		OebCheckboxComponent,
		TitleCasePipe,
	],
	template: `
		@if (this.isTaskProcessing() || this.isTaskPending()) {
			<div
				class="tw-border-mint tw-p-2 tw-border-solid tw-border-4 tw-rounded-[10px] tw-w-full tw-flex md:tw-gap-6 tw-gap-2 tw-items-center"
			>
				<oeb-spinner size="lg"></oeb-spinner>
				<div class="tw-text-oebblack tw-text-lg tw-flex tw-flex-col tw-gap-1">
					<span class="tw-text-lg tw-font-bold tw-uppercase">{{
						'Badge.awardingInProgress' | translate
					}}</span>
					<span>{{ 'Badge.willBeAwardedSoon' | translate }}</span>
				</div>
			</div>
		}
		<div class="tw-overflow-x-auto">
			<table hlmTable oeb-table-secondary>
				<thead hlmTHead>
					@for (headerRow of badgeTable.getHeaderGroups(); track headerRow.id) {
						<tr hlmTr>
							@for (headerCell of headerRow.headers; track headerCell.id) {
								@if (!headerCell.isPlaceholder) {
									<th hlmTh>
										<div
											class="tw-flex tw-flex-row tw-items-center tw-gap-2 [&[data-sortable='true']]:tw-cursor-pointer"
											(click)="
												headerCell.column.getCanSort()
													? headerCell.column.toggleSorting()
													: undefined
											"
											[attr.data-sortable]="headerCell.column.getCanSort()"
										>
											<div>
												<ng-container
													*flexRender="
														headerCell.column.columnDef.header;
														props: headerCell.getContext();
														let header
													"
												>
													<div [innerHTML]="header"></div>
												</ng-container>
											</div>

											@if (headerCell.column.getIsSorted()) {
												@let order =
													headerCell.column.getNextSortingOrder() === 'asc' ? 'desc' : 'asc';
												@if (order === 'asc') {
													<ng-icon hlm size="base" name="lucideChevronUp" />
												} @else {
													<ng-icon hlm size="base" name="lucideChevronDown" />
												}
											} @else if (headerCell.column.getCanSort()) {
												<ng-icon hlm size="base" name="lucideChevronsUpDown" />
											}
										</div>
									</th>
								}
							}
						</tr>
					}
				</thead>
				<tbody hlmTBody>
					@for (row of badgeTable.getRowModel().rows; track row.id) {
						<tr hlmTr>
							@for (cell of row.getVisibleCells(); track cell.id) {
								<td hlmTd class="tw-align-middle">
									<ng-container
										*flexRender="cell.column.columnDef.cell; props: cell.getContext(); let cell"
									>
										<div [innerHTML]="cell"></div>
									</ng-container>
								</td>
							}
						</tr>
					}
				</tbody>
			</table>
		</div>

		<ng-template #translateHeaderIDCellTemplate let-context>
			{{ context.header.id | translate }}
		</ng-template>
		<ng-template #nameAndMailCell let-context>
			@if (context.row.original.firstName || context.row.original.lastName) {
				<strong> {{ context.row.original.firstName }} {{ context.row.original.lastName }} </strong>
			} @else {
				<strong>&mdash;</strong>
			}
			<br />
			{{ context.row.original.email }}
		</ng-template>
		<ng-template #headerCheckbox let-context>
			<oeb-checkbox
				[checked]="context.table.getIsAllRowsSelected()"
				(ngModelChange)="context.table.toggleAllRowsSelected()"
			/>
		</ng-template>
		<ng-template #rowCheckbox let-context>
			<oeb-checkbox
				[checked]="context.row.getIsSelected()"
				(ngModelChange)="context.row.getToggleSelectedHandler()($event)"
			/>
		</ng-template>
		<ng-template #deleteButton let-context>
			<button
				(click)="this.openDeleteDialog(context.row.original)"
				class="tw-h-10 tw-w-10 hover:tw-opacity-60 tw-inline-flex tw-items-center tw-justify-center"
			>
				<ng-icon hlm size="base" name="lucideTrash2" />
			</button>
		</ng-template>

		<oeb-button
			size="sm"
			class="tw-float-right"
			variant="blackborder"
			[weight]="'medium'"
			(click)="issueBadges()"
			[disabled]="this.rowSelectionCount() === 0 || this.isTaskProcessing() || this.isTaskPending()"
			[text]="this.rowSelectionCount() > 1 ? ('Issuer.giveBadges' | translate) : ('Issuer.giveBadge' | translate)"
		>
		</oeb-button>
	`,
})
export class QrCodeDatatableComponent implements OnInit, OnDestroy {
	private badgeRequestApiService = inject(BadgeRequestApiService);
	private badgeInstanceApiService = inject(BadgeInstanceApiService);
	private taskService = inject(TaskPollingManagerService);
	private messageService = inject(MessageService);
	private translate = inject(TranslateService);
	private progressSubscription!: Subscription;
	private processedAwardedEmails = new Set<string>();
	private processedRequests: RequestedBadge[] = [];

	qrCode = input.required<ApiQRCode>();
	badgeSlug = input.required<string>();
	issuerSlug = input.required<string>();
	qrBadgeAward = output<number>();
	requestCountChanged = output<number>();

	translateHeaderIDCellTemplate = viewChild.required<TemplateRef<any>>('translateHeaderIDCellTemplate');
	nameAndMailCell = viewChild.required<TemplateRef<any>>('nameAndMailCell');
	headerCheckbox = viewChild.required<TemplateRef<any>>('headerCheckbox');
	rowCheckbox = viewChild.required<TemplateRef<any>>('rowCheckbox');
	deleteButton = viewChild.required<TemplateRef<any>>('deleteButton');

	rowSelectionCount = computed(() => Object.keys(this.rowSelection()).length);
	isTaskPending = computed(
		() =>
			this.currentTaskStatus()?.status === TaskStatus.PENDING ||
			this.currentTaskStatus()?.status === TaskStatus.PROGRESS,
	);
	isTaskProcessing = computed(
		() =>
			this.currentTaskStatus()?.status === TaskStatus.STARTED ||
			this.currentTaskStatus()?.status === TaskStatus.RETRY,
	);

	badgeTable = createAngularTable(() => ({
		data: this.requestedBadges(),
		columns: this.badgeTableColumnDefinition,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getRowId: (row) => row.email,
		state: {
			sorting: this.tableSorting(),
			rowSelection: this.rowSelection(),
		},
		onSortingChange: (updater) =>
			updater instanceof Function ? this.tableSorting.update(updater) : this.tableSorting.set(updater),
		enableSortingRemoval: false, // ensures at least one column is sorted
		enableRowSelection: true,
		onRowSelectionChange: (updaterOrValue) => {
			this.rowSelection.set(
				typeof updaterOrValue === 'function' ? updaterOrValue(this.rowSelection()) : updaterOrValue,
			);
		},
	}));

	private taskSubscription: Subscription | null = null;
	private currentTaskStatus = signal<TaskResult | null>(null);
	private readonly requestedBadges = signal<RequestedBadge[]>([]);
	private readonly tableSorting = signal<SortingState>([
		{
			id: 'email',
			desc: false,
		},
	]);
	private readonly rowSelection = signal<RowSelectionState>({});
	private readonly badgeTableColumnDefinition: ColumnDef<RequestedBadge>[] = [
		{
			id: 'select',
			header: () => this.headerCheckbox(),
			cell: () => this.rowCheckbox(),
			enableSorting: false,
		},
		{
			accessorKey: 'email',
			header: 'ID',
			cell: (info) => this.nameAndMailCell(),
		},
		{
			id: 'Badge.requestedOn',
			accessorKey: 'requestedOn',
			header: () => this.translateHeaderIDCellTemplate(),
			cell: (info) => formatDate(info.row.original.requestedOn, 'dd.MM.yyyy', 'en'),
		},
		{
			id: 'actions',
			cell: () => this.deleteButton(),
			enableSorting: false,
		},
	];
	private readonly _hlmDialogService = inject(HlmDialogService);

	constructor() {}

	ngOnInit(): void {
		this.badgeRequestApiService.getBadgeRequestsByQrCode(this.qrCode().slug).then((response: any) => {
			this.requestedBadges.set(
				response.body.requested_badges.map((badge: ApiRequestedBadge) => this.transformRequestedBadge(badge)),
			);
		});

		this.progressSubscription = this.taskService
			.getTaskUpdatesForBadge(this.badgeSlug())
			.subscribe((taskResult) => {
				if (taskResult.status === TaskStatus.PROGRESS) {
					this.handleTaskProgress(taskResult);
				}
			});
	}

	ngOnDestroy() {
		if (this.progressSubscription) {
			this.progressSubscription.unsubscribe();
		}
		if (this.taskSubscription) {
			this.taskSubscription.unsubscribe();
		}
		this.processedAwardedEmails.clear();
		this.processedRequests = [];
	}

	private handleTaskProgress(taskResult: TaskResult) {
		const successful = taskResult.result?.data ?? [];
		if (!successful.length) return;

		const allAwardedEmails = successful.map((s: any) => s.recipient_identifier);
		const newlyAwardedEmails = allAwardedEmails.filter((email: string) => !this.processedAwardedEmails.has(email));

		if (newlyAwardedEmails.length === 0) return;

		newlyAwardedEmails.forEach((email: string) => this.processedAwardedEmails.add(email));

		const newlyAwardedSet = new Set(newlyAwardedEmails);

		this.requestedBadges.update((current) => {
			const updated = current.filter((b) => !newlyAwardedSet.has(b.email));
			this.requestCountChanged.emit(updated.length);
			return updated;
		});

		this.rowSelection.update((current) => {
			const updated = { ...current };
			newlyAwardedEmails.forEach((email) => delete updated[email]);
			return updated;
		});
	}

	transformRequestedBadge = (apiBadge: ApiRequestedBadge): RequestedBadge => {
		return {
			email: apiBadge.email,
			status: apiBadge.status,
			firstName: apiBadge.firstName,
			lastName: apiBadge.lastName,
			requestedOn: new Date(apiBadge.requestedOn),
			entity_id: apiBadge.entity_id,
		};
	};

	async issueBadges() {
		if (this.rowSelectionCount() === 0 || this.isTaskProcessing() || this.isTaskPending()) return;

		const assertions: BadgeInstanceBatchAssertion[] = [];
		const qrCode = this.qrCode();
		const recipientProfileContextUrl =
			'https://api.openbadges.education/static/extensions/recipientProfile/context.json';

		const selectedEmails = Object.keys(this.rowSelection());
		const selectedRequests = this.requestedBadges().filter((b) => selectedEmails.includes(b.email));
		this.processedRequests = selectedRequests;
		selectedRequests.forEach((b) => {
			const activityStartDate = qrCode.activity_start_date
				? new Date(qrCode.activity_start_date).toISOString()
				: null;
			const activityEndDate = qrCode.activity_end_date ? new Date(qrCode.activity_end_date).toISOString() : null;
			const name = b.firstName + ' ' + b.lastName;
			const extensions = name
				? {
						'extensions:recipientProfile': {
							'@context': recipientProfileContextUrl,
							type: ['Extension', 'extensions:RecipientProfile'],
							name: striptags(name),
						},
					}
				: undefined;
			assertions.push({
				recipient_identifier: b.email,
				extensions: extensions,
				activity_start_date: activityStartDate,
				activity_end_date: activityEndDate,
				activity_city: qrCode.activity_city,
				activity_zip: qrCode.activity_zip,
				activity_online: qrCode.activity_online,
				evidence_items: qrCode.evidence_items ?? [],
				course_url: qrCode.course_url,
			} satisfies BadgeInstanceBatchAssertion);
		});

		try {
			const response = await this.badgeInstanceApiService.createBadgeInstanceBatchedAsync(
				this.issuerSlug(),
				this.badgeSlug(),
				{
					issuer: this.issuerSlug(),
					badge_class: this.badgeSlug(),
					create_notification: true,
					assertions,
				},
			);

			const taskId = response.body.task_id;
			this.startTaskPolling(taskId);
		} catch (e) {
			this.messageService.setMessage(
				'Fast geschafft! Deine Badges werden gerade vergeben – das kann ein paar Minuten dauern. Schau gleich auf der Badge-Detail-Seite nach, oh alles geklappt hat.',
				'error',
			);
		}
	}

	private startTaskPolling(taskId: string) {
		// Clean up any existing subscription
		if (this.taskSubscription) {
			this.taskSubscription.unsubscribe();
		}

		this.taskSubscription = this.taskService
			.startTaskPolling(taskId, this.issuerSlug(), this.badgeSlug())
			.subscribe({
				next: (taskResult: TaskResult) => {
					this.currentTaskStatus.set(taskResult);

					if (taskResult.status === TaskStatus.FAILURE) {
						this.handleTaskFailure(taskResult);
					} else if (taskResult.status === TaskStatus.SUCCESS) {
						this.handleTaskSuccess();
					}
				},
				error: (error) => {
					console.error('Error polling batch award task status:', error);
					this.handleTaskError(error);
				},
			});
	}

	private handleTaskSuccess() {
		const awardedCount = this.processedRequests.length;

		if (awardedCount === 1) {
			this.openSuccessDialog([this.processedRequests[0].email]);
		} else {
			this.openSuccessDialog(
				null,
				awardedCount + ' ' + this.translate.instant('QrCode.badgesAwardedSuccessfully'),
			);
		}

		const ids = this.processedRequests.map((b) => b.entity_id);

		this.badgeRequestApiService.deleteRequests(this.issuerSlug(), this.badgeSlug(), ids).then((res) => {
			this.qrBadgeAward.emit(this.rowSelectionCount());
			this.requestedBadges.update((current) => current.filter((r) => !ids.includes(r.entity_id)));
			this.requestCountChanged.emit(this.requestedBadges().length);
			this.rowSelection.set({});
			this.processedAwardedEmails.clear();
			this.processedRequests = [];
		});
	}

	private handleTaskFailure(taskResult: TaskResult) {
		const errorMessage = taskResult.result?.error || 'An error occurred during the batch award process.';
		this.messageService.reportHandledError(this.translate.instant('Issuer.batchAwardFailed'), errorMessage);
	}

	private handleTaskError(error: any) {
		this.messageService.reportHandledError(this.translate.instant('Issuer.failedBatchMonitoring'), error);
	}

	public openSuccessDialog(recipient = null, text = null) {
		const dialogRef = this._hlmDialogService.open(SuccessDialogComponent, {
			context: {
				recipient: recipient,
				text: text,
				variant: 'success',
			},
		});
	}

	public openDeleteDialog(request: RequestedBadge) {
		const dialogRef = this._hlmDialogService.open(DangerDialogComponent, {
			context: {
				caption: this.translate.instant('Badge.deleteRequest'),
				variant: 'danger',
				text: `${this.translate.instant('Badge.confirmDeleteRequest1')} <span class="tw-font-bold">${
					request.email
				}</span>  ${this.translate.instant('Badge.confirmDeleteRequest2')}`,
				delete: () => {
					this.badgeRequestApiService
						.deleteRequest(request.entity_id)
						.then(() => {
							this.requestedBadges.update((current) =>
								current.filter((r) => r.entity_id != request.entity_id),
							);
						})
						.catch((e) =>
							this.messageService.reportAndThrowError(
								'Ausgewählte Ausweisanforderung konnte nicht gelöscht werden',
								e,
							),
						);
				},
			},
		});
	}
}
