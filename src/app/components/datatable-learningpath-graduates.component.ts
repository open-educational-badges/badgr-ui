import { CommonModule, formatDate } from '@angular/common';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { Component, input, output, signal, TemplateRef, viewChild } from '@angular/core';
import { HlmTableImports } from './spartan/ui-table-helm/src';
import { OebButtonComponent } from './oeb-button.component';
import { HlmIconModule } from '@spartan-ng/helm/icon';
import { OebTableImports } from './oeb-table';
import {
	SortingState,
	ColumnDef,
	createAngularTable,
	getCoreRowModel,
	getSortedRowModel,
	FlexRenderDirective,
} from '@tanstack/angular-table';
import { ApiLearningPathParticipant } from '~/common/model/learningpath-api.model';
import { NgIcon } from '@ng-icons/core';

@Component({
	selector: 'learningpath-graduates-datatable',
	imports: [
		...HlmTableImports,
		...OebTableImports,
		FlexRenderDirective,
		TranslatePipe,
		NgIcon,
		HlmIconModule,
		CommonModule,
		OebButtonComponent,
		TranslateModule,
		RouterModule,
	],
	host: {
		class: 'tw-block tw-overflow-x-auto',
	},
	template: ` <table hlmTable oeb-table>
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

		<ng-template #nameCellTemplate let-context>
			<p class="tw-max-w-[26ch] tw-whitespace-normal tw-break-words tw-leading-tight">
				{{ context.getValue() }}
			</p>
		</ng-template>

		<ng-template #badgeActionsCellTemplate let-context>
			<div class="tw-flex tw-flex-col tw-gap-1 md:tw-gap-2 tw-leading-relaxed">
				<oeb-button
					size="xs"
					width="full_width"
					(click)="downloadCertificate.emit(context.row.original)"
					[text]="'Issuer.pdfCertificate' | translate"
				/>
				<oeb-button
					variant="secondary"
					size="xs"
					width="full_width"
					(click)="revokeLearningPath.emit(context.row.original)"
					[text]="'General.revoke' | translate | titlecase"
				/>
			</div>
		</ng-template>`,
})
export class LearningPathGraduatesDatatableComponent {
	participants = input.required<ApiLearningPathParticipant[]>();
	revokeLearningPath = output<ApiLearningPathParticipant>();
	downloadCertificate = output<ApiLearningPathParticipant>();

	translateHeaderIDCellTemplate = viewChild.required<TemplateRef<any>>('translateHeaderIDCellTemplate');
	badgeActionsTemplate = viewChild.required<TemplateRef<any>>('badgeActionsCellTemplate');
	nameCellTemplate = viewChild.required<TemplateRef<any>>('nameCellTemplate');

	readonly tableSorting = signal<SortingState>([
		{
			id: 'General.name',
			desc: false,
		},
	]);

	private readonly tableColumnDefinition: ColumnDef<ApiLearningPathParticipant>[] = [
		{
			id: 'General.name',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => `${row.user.first_name} ${row.user.last_name}`,
			cell: () => this.nameCellTemplate(),
			sortDescFirst: false,
		},
		{
			id: 'LearningPath.finishedOn',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => formatDate(row.completed_at, 'dd.MM.yyyy', 'de-DE'),
			cell: (info) => info.getValue(),
		},
		{
			id: 'actions',
			cell: (info) => this.badgeActionsTemplate(),
			enableSorting: false,
		},
	];

	table = createAngularTable(() => ({
		data: this.participants(),
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
