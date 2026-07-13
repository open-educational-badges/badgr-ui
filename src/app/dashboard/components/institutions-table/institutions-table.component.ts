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

export interface InstitutionTableData {
	id: number;
	name: string;
	type: string;
	image?: string;
	city?: string;
	badgesIssued: number;
	activeUsers: number;
	joinedDate: string;
	issuerId?: string;
}

@Component({
	selector: 'app-institutions-table',
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
				@for (headerRow of institutionsTable.getHeaderGroups(); track headerRow.id) {
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
				@for (row of institutionsTable.getRowModel().rows; track row.id) {
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

		<ng-template #institutionCellTemplate let-context>
			<a
				class="tw-flex tw-flex-row tw-items-center tw-leading-7 tw-gap-3 tw-no-underline hover:tw-opacity-80 tw-transition-opacity"
				[routerLink]="context.row.original.issuerId ? ['/issuer/issuers', context.row.original.issuerId] : null"
				[class.tw-cursor-pointer]="context.row.original.issuerId"
				[class.tw-cursor-default]="!context.row.original.issuerId"
			>
				<div class="tw-flex-shrink-0">
					@if (context.row.original.image) {
						<img
							class="tw-rounded tw-object-cover"
							[src]="context.row.original.image"
							[alt]="context.row.original.name"
							width="40"
							height="40"
						/>
					} @else {
						<div
							class="tw-w-10 tw-h-10 tw-rounded tw-flex tw-items-center tw-justify-center"
							style="background-color: #F5F5F5;"
						>
							<svg
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="#492E98"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path
									d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
								/>
							</svg>
						</div>
					}
				</div>
				<div>
					<p class="tw-font-semibold" style="color: var(--color-purple);">{{ context.getValue() }}</p>
					<p class="tw-text-sm tw-text-gray-500">{{ context.row.original.type }}</p>
				</div>
			</a>
		</ng-template>

		<ng-template #badgesCellTemplate let-context>
			<div class="tw-flex tw-items-center tw-h-10">
				<span class="tw-font-semibold" style="color: var(--color-purple);">{{ context.getValue() }}</span>
			</div>
		</ng-template>

		<ng-template #usersCellTemplate let-context>
			<div class="tw-flex tw-items-center tw-h-10">
				<span class="tw-font-semibold" style="color: var(--color-purple);">{{ context.getValue() }}</span>
			</div>
		</ng-template>

		<ng-template #dateCellTemplate let-context>
			<div class="tw-flex tw-items-center tw-h-10">
				{{ formatDateValue(context.getValue()) }}
			</div>
		</ng-template>

		<ng-template #cityCellTemplate let-context>
			<div class="tw-flex tw-items-center tw-h-10">
				{{ context.getValue() || '-' }}
			</div>
		</ng-template>
	`,
})
export class InstitutionsTableComponent {
	institutions = input.required<InstitutionTableData[]>();

	translateHeaderCellTemplate = viewChild.required<TemplateRef<any>>('translateHeaderCellTemplate');
	institutionCellTemplate = viewChild.required<TemplateRef<any>>('institutionCellTemplate');
	cityCellTemplate = viewChild.required<TemplateRef<any>>('cityCellTemplate');
	badgesCellTemplate = viewChild.required<TemplateRef<any>>('badgesCellTemplate');
	usersCellTemplate = viewChild.required<TemplateRef<any>>('usersCellTemplate');
	dateCellTemplate = viewChild.required<TemplateRef<any>>('dateCellTemplate');

	readonly tableSorting = signal<SortingState>([
		{
			id: 'Network.Dashboard.socialspace.table.badges',
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

	private readonly institutionsTableColumnDefinition: ColumnDef<InstitutionTableData>[] = [
		{
			id: 'Network.Dashboard.socialspace.table.institution',
			header: () => this.translateHeaderCellTemplate(),
			accessorFn: (row) => row.name,
			cell: () => this.institutionCellTemplate(),
			sortDescFirst: false,
		},
		{
			id: 'Network.Dashboard.socialspace.table.city',
			header: () => this.translateHeaderCellTemplate(),
			accessorFn: (row) => row.city,
			cell: () => this.cityCellTemplate(),
			sortDescFirst: false,
		},
		{
			id: 'Network.Dashboard.socialspace.table.badges',
			header: () => this.translateHeaderCellTemplate(),
			accessorFn: (row) => row.badgesIssued,
			cell: () => this.badgesCellTemplate(),
			sortDescFirst: true,
		},
		{
			id: 'Network.Dashboard.socialspace.table.users',
			header: () => this.translateHeaderCellTemplate(),
			accessorFn: (row) => row.activeUsers,
			cell: () => this.usersCellTemplate(),
			sortDescFirst: true,
		},
		{
			id: 'Network.Dashboard.socialspace.table.joined',
			header: () => this.translateHeaderCellTemplate(),
			accessorFn: (row) => row.joinedDate,
			cell: () => this.dateCellTemplate(),
			sortDescFirst: true,
		},
	];

	institutionsTable = createAngularTable(() => ({
		data: this.institutions(),
		columns: this.institutionsTableColumnDefinition,
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
