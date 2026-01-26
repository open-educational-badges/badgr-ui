import { formatDate } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { Component, input, output, signal, TemplateRef, viewChild } from '@angular/core';
import { HlmTableImports } from './spartan/ui-table-helm/src';
import { OebButtonComponent } from './oeb-button.component';
import { ApiStaffRequest } from '../issuer/models/staffrequest-api.model';
import { HlmIconModule } from '@spartan-ng/helm/icon';
import { OebTableImports } from './oeb-table';
import {
	ColumnDef,
	createAngularTable,
	FlexRenderDirective,
	getCoreRowModel,
	getSortedRowModel,
	SortingState,
} from '@tanstack/angular-table';
import { NgIcon } from '@ng-icons/core';

@Component({
	selector: 'issuer-staff-requests-datatable',
	standalone: true,
	imports: [
		...HlmTableImports,
		...OebTableImports,
		FlexRenderDirective,
		NgIcon,
		HlmIconModule,
		OebButtonComponent,
		TranslateModule,
		RouterModule,
	],
	host: {
		class: 'tw-block tw-overflow-x-auto',
	},
	template: `
		<table hlmTable oeb-table-highlight>
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
				@for (row of table.getRowModel().rows; track row.id; let i = $index) {
					<tr hlmTr>
						@for (cell of row.getVisibleCells(); track cell.id) {
							<td hlmTd>
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

		<ng-template #translateHeaderIDCellTemplate let-context>
			{{ context.header.id | translate }}
		</ng-template>

		<ng-template #badgeActionsCellTemplate let-context>
			<div class="tw-flex tw-flex-col tw-justify-end lg:tw-flex-row tw-gap-4">
				<oeb-button
					(click)="confirmStaffRequest.emit(context.row.original)"
					size="sm"
					width="full_width"
					[text]="'General.confirm' | translate"
				/>
				<oeb-button
					variant="secondary"
					(click)="deleteStaffRequest.emit(context.row.original.entity_id)"
					size="sm"
					width="full_width"
					[text]="'Issuer.deleteStaffRequest' | translate"
				/>
			</div>
		</ng-template>
	`,
})
export class IssuerStaffRequestsDatatableComponent {
	requests = input.required<ApiStaffRequest[]>();
	deleteStaffRequest = output<string>();
	confirmStaffRequest = output<ApiStaffRequest>();

	translateHeaderIDCellTemplate = viewChild.required<TemplateRef<any>>('translateHeaderIDCellTemplate');
	badgeActionsTemplate = viewChild.required<TemplateRef<any>>('badgeActionsCellTemplate');

	readonly tableSorting = signal<SortingState>([
		{
			id: 'General.name',
			desc: false,
		},
	]);
	private readonly tableColumnDefinition: ColumnDef<ApiStaffRequest>[] = [
		{
			id: 'General.name',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => `${row.user.first_name} ${row.user.last_name}`,
			cell: (ctx) => ctx.getValue(),
			sortDescFirst: false,
		},
		{
			id: 'General.email',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => `${row.user.email}`,
			cell: (ctx) => ctx.getValue(),
			sortDescFirst: false,
		},
		{
			id: 'Badge.requestedOn',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => formatDate(row.requestedOn, 'dd.MM.yyyy', 'de-DE'),
			cell: (ctx) => ctx.getValue(),
		},
		{
			id: 'actions',
			cell: (info) => this.badgeActionsTemplate(),
			enableSorting: false,
		},
	];

	table = createAngularTable(() => ({
		data: this.requests(),
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
}
