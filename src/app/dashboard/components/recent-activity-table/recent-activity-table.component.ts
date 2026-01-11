import { CommonModule, formatDate } from '@angular/common';
import { Component, input, signal, TemplateRef, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HlmTableImports, provideHlmTableConfig } from '../../../components/spartan/ui-table-helm/src';
import { OebTableImports } from '../../../components/oeb-table';
import {
	ColumnDef,
	createAngularTable,
	FlexRenderDirective,
	getCoreRowModel,
	getSortedRowModel,
	SortingState,
} from '@tanstack/angular-table';
import { NgIcon } from '@ng-icons/core';
import { NetworkRecentActivityData } from '../../models/network-dashboard-api.model';

@Component({
	selector: 'app-recent-activity-table',
	standalone: true,
	imports: [
		...HlmTableImports,
		...OebTableImports,
		FlexRenderDirective,
		CommonModule,
		TranslateModule,
		NgIcon,
		RouterLink,
	],
	providers: [
		provideHlmTableConfig({
			table: 'tw-min-w-max tw-w-full tw-mb-8 tw-text-lg tw-text-left tw-rounded-lg tw-border tw-border-solid tw-border-purple tw-border-separate tw-bg-purple',
			thead: 'tw-font-semibold tw-text-white',
			tbody: 'tw-bg-white',
			tr: '[&:last-child_td]:tw-border-none [&:last-child_th:first-child]:tw-rounded-bl-lg [&:last-child_th:last-child]:tw-rounded-br-lg',
			th: 'tw-px-2 first:tw-pl-4 last:tw-pr-4 tw-py-4 tw-leading-8 tw-border-b tw-border-solid tw-border-purple tw-align-middle',
			td: 'tw-px-2 first:tw-pl-4 last:tw-pr-4 tw-py-4 tw-leading-7 tw-border-b tw-border-solid tw-border-purple tw-align-middle',
		}),
	],
	host: {
		class: 'tw-block tw-overflow-x-auto',
	},
	template: `
		<table hlmTable oeb-table class="tw-w-full">
			<thead hlmTHead>
				@for (headerRow of activityTable.getHeaderGroups(); track headerRow.id) {
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
				@for (row of activityTable.getRowModel().rows; track row.id) {
					<tr hlmTr>
						@for (cell of row.getVisibleCells(); track cell.id) {
							<td hlmTd>
								<ng-container
									*flexRender="cell.column.columnDef.cell; props: cell.getContext(); let cell"
								>
									<div class="tw-flex tw-items-center tw-min-h-10" [innerHTML]="cell"></div>
								</ng-container>
							</td>
						}
					</tr>
				}
			</tbody>
		</table>

		<ng-template #translateHeaderCellTemplate let-context>
			{{ context.header.id | translate }}
		</ng-template>

		<ng-template #badgeCellTemplate let-context>
			<a
				[routerLink]="['/public/badges', context.row.original.badgeId]"
				class="tw-flex tw-flex-row tw-items-center tw-leading-7 tw-gap-3 hover:tw-opacity-80 tw-transition-opacity tw-cursor-pointer"
			>
				<div class="tw-flex-shrink-0">
					<img
						class="tw-rounded"
						[src]="context.row.original.badgeImage"
						[alt]="context.row.original.badgeTitle"
						width="40"
						height="40"
					/>
				</div>
				<p>{{ context.getValue() }}</p>
			</a>
		</ng-template>

		<ng-template #dateCellTemplate let-context>
			<div class="tw-flex tw-items-center tw-h-10">
				{{ formatDateValue(context.getValue()) }}
			</div>
		</ng-template>

		<ng-template #recipientCellTemplate let-context>
			<div class="tw-flex tw-items-center tw-justify-center tw-h-10">
				{{ context.getValue() }}
			</div>
		</ng-template>

		<ng-template #issuerCellTemplate let-context>
			<div class="tw-flex tw-items-center tw-h-10">
				@if (context.row.original.issuerId) {
					<a
						[routerLink]="['/issuer/issuers', context.row.original.issuerId]"
						class="tw-cursor-pointer"
					>
						{{ context.getValue() }}
					</a>
				} @else {
					{{ context.getValue() }}
				}
			</div>
		</ng-template>
	`,
})
export class RecentActivityTableComponent {
	activities = input.required<NetworkRecentActivityData[]>();

	translateHeaderCellTemplate = viewChild.required<TemplateRef<any>>('translateHeaderCellTemplate');
	badgeCellTemplate = viewChild.required<TemplateRef<any>>('badgeCellTemplate');
	dateCellTemplate = viewChild.required<TemplateRef<any>>('dateCellTemplate');
	recipientCellTemplate = viewChild.required<TemplateRef<any>>('recipientCellTemplate');
	issuerCellTemplate = viewChild.required<TemplateRef<any>>('issuerCellTemplate');

	readonly tableSorting = signal<SortingState>([
		{
			id: 'Network.Dashboard.recentActivity.date',
			desc: true,
		},
	]);

	formatDateValue(dateString: string): string {
		try {
			const date = new Date(dateString);
			return formatDate(date, 'dd.MM.yyyy', 'de-DE');
		} catch {
			return dateString;
		}
	}

	private readonly activityTableColumnDefinition: ColumnDef<NetworkRecentActivityData>[] = [
		{
			id: 'Network.Dashboard.recentActivity.date',
			header: () => this.translateHeaderCellTemplate(),
			accessorFn: (row) => row.date,
			cell: () => this.dateCellTemplate(),
			sortDescFirst: true,
		},
		{
			id: 'Network.Dashboard.recentActivity.badge',
			header: () => this.translateHeaderCellTemplate(),
			accessorFn: (row) => row.badgeTitle,
			cell: () => this.badgeCellTemplate(),
			sortDescFirst: false,
		},
		{
			id: 'Network.Dashboard.recentActivity.awardedBy',
			header: () => this.translateHeaderCellTemplate(),
			accessorFn: (row) => row.issuerName,
			cell: () => this.issuerCellTemplate(),
			sortDescFirst: false,
		},
		{
			id: 'Network.Dashboard.recentActivity.recipients',
			header: () => this.translateHeaderCellTemplate(),
			accessorFn: (row) => row.recipientCount,
			cell: () => this.recipientCellTemplate(),
			sortDescFirst: true,
		},
	];

	activityTable = createAngularTable(() => ({
		data: this.activities(),
		columns: this.activityTableColumnDefinition,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		state: {
			sorting: this.tableSorting(),
		},
		onSortingChange: (updater) =>
			updater instanceof Function ? this.tableSorting.update(updater) : this.tableSorting.set(updater),
		enableSortingRemoval: false,
	}));
}
