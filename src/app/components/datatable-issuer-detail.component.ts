import { CommonModule, formatDate } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { Component, computed, effect, input, output, signal, TemplateRef, viewChild } from '@angular/core';
import { HlmTableImports } from './spartan/ui-table-helm/src';
import { BadgeInstance } from '../issuer/models/badgeinstance.model';
import { FormsModule } from '@angular/forms';
import { lucideSearch } from '@ng-icons/lucide';
import { OebButtonComponent } from './oeb-button.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { OebSpinnerComponent } from './oeb-spinner.component';
import { LoadingDotsComponent } from '../common/components/loading-dots.component';
import { OebTableImports } from './oeb-table';
import {
	ColumnDef,
	createAngularTable,
	FlexRenderDirective,
	getCoreRowModel,
	getSortedRowModel,
	getPaginationRowModel,
	getFilteredRowModel,
	SortingState,
	PaginationState,
	RowSelectionState,
} from '@tanstack/angular-table';
import { HlmIconModule } from '@spartan-ng/helm/icon';
import { Issuer } from '~/issuer/models/issuer.model';
import { Network } from '~/issuer/network.model';
import { HlmP } from '@spartan-ng/helm/typography';
import { BadgeInstanceV3 } from '~/issuer/models/badgeinstancev3.model';
import { HlmNumberedPagination } from '@spartan-ng/helm/pagination';

@Component({
	selector: 'issuer-detail-datatable',
	imports: [
		FormsModule,
		...HlmTableImports,
		...OebTableImports,
		CommonModule,
		TranslateModule,
		RouterModule,
		OebButtonComponent,
		OebSpinnerComponent,
		LoadingDotsComponent,
		FlexRenderDirective,
		NgIcon,
		HlmIconModule,
		HlmP,
		HlmNumberedPagination,
	],
	providers: [provideIcons({ lucideSearch })],
	template: `
		<div>
			<div class="tw-flex tw-items-center tw-justify-between tw-gap-4 sm:flex-col">
				<div class="tw-w-full tw-flex tw-justify-between tw-items-center tw-mb-4">
					<p hlmP class="tw-font-semibold tw-text-purple tw-uppercase">
						{{ recipientCount() }} Badge -
						{{
							recipientCount() == 1 ? ('Issuer.recipient' | translate) : ('Issuer.recipients' | translate)
						}}
					</p>

					<div class="tw-relative">
						<ng-icon
							hlm
							size="sm"
							name="lucideSearch"
							class="tw-absolute tw-left-3 tw-top-1/2 tw-transform tw--translate-y-1/2 tw-text-purple"
						/>
						<input
							type="text"
							placeholder="{{ 'General.searchByNameOrEmail' | translate }}"
							[value]="searchValue()"
							(input)="onSearchChange($event)"
							class="tw-w-full tw-pl-10 tw-pr-4 tw-py-2 tw-border-solid tw-border-2 tw-border-purple tw-rounded-lg tw-text-sm focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-purple-900 focus:tw-border-transparent"
							[disabled]="awardInProgress()"
						/>
						@if (searchValue()) {
							<button
								(click)="clearSearch()"
								class="tw-absolute tw-right-3 tw-top-1/2 tw-transform tw--translate-y-1/2 tw-text-gray-400 hover:tw-text-gray-600"
							>
								<ng-icon hlm size="sm" name="lucideX" />
							</button>
						}
					</div>
				</div>
			</div>

			@if (awardInProgress()) {
				<div
					class="tw-border-green tw-p-2 tw-border-solid tw-border-4 tw-rounded-[10px] tw-w-full tw-flex md:tw-gap-6 tw-gap-2 tw-items-center"
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
				<table hlmTable oeb-table>
					<thead hlmTHead>
						@for (headerRow of table.getHeaderGroups(); track headerRow.id) {
							<tr hlmTr>
								@for (headerCell of headerRow.headers; track headerCell.id) {
									@if (!headerCell.isPlaceholder) {
										<th hlmTh>
											<div
												class="tw-flex tw-flex-row tw-items-center tw-gap-2 [&[data-sortable='true']]:tw-cursor-pointer"
												(click)="headerCell.column.toggleSorting()"
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
														headerCell.column.getNextSortingOrder() === 'asc'
															? 'desc'
															: 'asc';
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
						@for (row of table.getRowModel().rows; track row.id; let i = $index) {
							<tr hlmTr>
								@if (downloadStates()[row.original.slug]) {
									<td hlmTd [colSpan]="3">
										<loading-dots [showLoading]="false" />
									</td>
								} @else {
									@for (cell of row.getVisibleCells(); track cell.id) {
										<td hlmTd>
											<ng-container
												*flexRender="
													cell.column.columnDef.cell;
													props: cell.getContext();
													let cell
												"
											>
												<div [innerHTML]="cell"></div>
											</ng-container>
										</td>
									}
								}
							</tr>
						}
					</tbody>
				</table>

				@if (shouldShowPagination()) {
					<hlm-numbered-pagination
						[(currentPage)]="currentPageNumber"
						[(itemsPerPage)]="currentPageSize"
						[totalItems]="recipientCount()"
						[maxSize]="7"
						[showEdges]="true"
					/>
				}

				<ng-template #translateHeaderIDCellTemplate let-context>
					{{ context.header.id | translate }}
				</ng-template>

				<ng-template #badgeActionsCellTemplate let-context>
					<div class="tw-flex tw-flex-col tw-gap-1 md:tw-gap-2 tw-leading-relaxed">
						<oeb-button
							size="xs"
							width="full_width"
							(click)="
								downloadCertificate.emit({
									instance: context.row.original,
									badgeIndex: context.row.index,
								})
							"
							text="{{ 'Issuer.pdfCertificate' | translate }}"
							[disabled]="downloadStates()[context.row.original.slug]"
						/>
						@if (issuer().canEditBadge) {
							<oeb-button
								variant="secondary"
								size="xs"
								width="full_width"
								(click)="actionElement.emit(context.row.original)"
								[text]="'General.revoke' | translate | titlecase"
							/>
						}
					</div>
				</ng-template>
			</div>
		</div>
	`,
})
export class IssuerDetailDatatableComponent {
	issuer = input<Issuer | Network>();
	recipientCount = input<number>(0);
	downloadStates = input<Record<string, boolean>>({});
	awardInProgress = input<boolean>(false);
	recipients = input.required<BadgeInstanceV3[]>();
	isLoading = input<boolean>(false);
	actionElement = output<BadgeInstanceV3>();
	downloadCertificate = output<{ instance: BadgeInstance; badgeIndex: number }>();

	paginationChange = output<{ pageIndex: number; pageSize: number }>();
	searchChange = output<string>();

	translateHeaderIDCellTemplate = viewChild.required<TemplateRef<any>>('translateHeaderIDCellTemplate');
	badgeActionsTemplate = viewChild.required<TemplateRef<any>>('badgeActionsCellTemplate');

	rowSelectionCount = computed(() => Object.keys(this.rowSelection()).length);

	readonly tableSorting = signal<SortingState>([
		{
			id: 'RecBadgeDetail.issuedOn',
			desc: true,
		},
	]);

	private readonly pagination = signal<PaginationState>({
		pageIndex: 0,
		pageSize: 15,
	});

	private readonly rowSelection = signal<RowSelectionState>({});

	searchValue = signal<string>('');

	currentPageNumber = signal<number>(1);
	currentPageSize = signal<number>(15);

	constructor() {
		effect(() => {
			const page = this.currentPageNumber();
			const size = this.currentPageSize();

			this.pagination.set({
				pageIndex: page - 1,
				pageSize: size,
			});

			this.paginationChange.emit({
				pageIndex: page - 1,
				pageSize: size,
			});
		});

		effect(() => {
			const search = this.searchValue();
			this.searchChange.emit(search);
		});
	}

	private readonly tableColumnDefinition: ColumnDef<BadgeInstanceV3>[] = [
		{
			id: 'General.name',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => {
				const ext = row.extensions?.['extensions:recipientProfile'];
				return ext?.name ?? '';
			},
			cell: (ctx) => ctx.getValue(),
			sortDescFirst: false,
		},
		{
			id: 'RecBadgeDetail.issuedOn',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row): Date => new Date(row.json.issuedOn),
			cell: (info) => {
				const value = info.getValue();
				return formatDate(value as Date, 'dd.MM.yyyy', 'de-DE');
			},
		},
		{
			id: 'actions',
			cell: (info) => this.badgeActionsTemplate(),
			enableSorting: false,
		},
	];

	shouldShowPagination = computed(() => this.recipientCount() > 15);

	table = createAngularTable(() => ({
		data: this.recipients(),
		columns: this.tableColumnDefinition,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		manualPagination: true,
		pageCount: Math.ceil(this.recipientCount() / this.pagination().pageSize),
		getPaginationRowModel: getPaginationRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			sorting: this.tableSorting(),
			pagination: this.pagination(),
			rowSelection: this.rowSelection(),
		},
		onSortingChange: (updater) =>
			updater instanceof Function ? this.tableSorting.update(updater) : this.tableSorting.set(updater),
		onPaginationChange: (updater) =>
			updater instanceof Function ? this.pagination.update(updater) : this.pagination.set(updater),
		enableSortingRemoval: false,
		enableRowSelection: true,
		onRowSelectionChange: (updaterOrValue) => {
			this.rowSelection.set(
				typeof updaterOrValue === 'function' ? updaterOrValue(this.rowSelection()) : updaterOrValue,
			);
		},
		initialState: {
			pagination: {
				pageSize: 15,
			},
		},
	}));

	onSearchChange(event: Event): void {
		const target = event.target as HTMLInputElement;
		this.searchValue.set(target.value);
		this.currentPageNumber.set(1);
	}

	clearSearch(): void {
		this.searchValue.set('');
		this.currentPageNumber.set(1);
	}
}
