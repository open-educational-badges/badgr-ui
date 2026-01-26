import { formatDate } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { Component, input, output, signal, TemplateRef, viewChild } from '@angular/core';
import { HlmTableImports } from './spartan/ui-table-helm/src';
import { FormsModule } from '@angular/forms';
import { lucideSearch } from '@ng-icons/lucide';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { OebTableImports } from './oeb-table';
import {
	ColumnDef,
	createAngularTable,
	FlexRenderDirective,
	getCoreRowModel,
	getSortedRowModel,
	SortingState,
} from '@tanstack/angular-table';
import { HlmIconModule } from '@spartan-ng/helm/icon';
import { ApiBadgeClassNetworkShare } from '~/issuer/models/badgeclass-api.model';
import { BadgeClass } from '~/issuer/models/badgeclass.model';
import { OebButtonComponent } from './oeb-button.component';
import { SharedBadgeWithRequests } from '~/issuer/components/network-badges/network-badges.component';

@Component({
	selector: 'network-shared-badges-datatable',
	imports: [
		FormsModule,
		...HlmTableImports,
		...OebTableImports,
		TranslateModule,
		RouterModule,
		FlexRenderDirective,
		NgIcon,
		HlmIconModule,
		OebButtonComponent,
	],
	providers: [provideIcons({ lucideSearch })],
	template: `
		<div class="tw-mt-8 tw-overflow-x-auto">
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
				@if (badges().length) {
					<tbody hlmTBody>
						@for (row of table.getRowModel().rows; track row.id; let i = $index) {
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
				}
			</table>
		</div>

		<ng-template #badgeCellTemplate let-context>
			<div
				class="tw-flex tw-flex-row tw-items-center tw-leading-7 tw-gap-2 tw-cursor-pointer"
				(click)="
					redirectToBadgeDetail.emit({
						badge: context.row.original.badgeclass,
						issuerSlug: context.row.original.shared_by_issuer.slug,
						focusRequests: false,
					})
				"
			>
				<div>
					<img
						class=""
						src="{{ context.row.original.badgeclass.image }}"
						alt="{{ context.row.original.badgeclass.description }}"
						width="40"
					/>
				</div>
				<p>{{ context.getValue() }}</p>
			</div>
		</ng-template>

		<ng-template #translateHeaderIDCellTemplate let-context>
			{{ context.header.id | translate }}
		</ng-template>

		<ng-template #badgeActionsCellTemplate let-context>
			<div class="tw-flex tw-flex-col tw-gap-1 md:tw-gap-2 tw-leading-relaxed">
				<oeb-button
					size="xs"
					width="full_width"
					(click)="directBadgeAward.emit(context.row.original.badgeclass)"
					[text]="'Badge.award' | translate"
				/>
				<oeb-button
					variant="secondary"
					size="xs"
					width="full_width"
					(click)="qrCodeAward.emit(context.row.original.badgeclass)"
					[text]="'QrCode.qrAward' | translate"
				/>
				@if (context.row.original.requestCount > 0) {
					<oeb-button
						variant="green"
						size="xs"
						width="full_width"
						(click)="
							redirectToBadgeDetail.emit({
								badge: context.row.original.badgeclass,
								issuerSlug: context.row.original.shared_by_issuer.slug,
								focusRequests: true,
							})
						"
						[text]="
							context.row.original.requestCount == 1
								? context.row.original.requestCount + ' ' + ('Badge.openRequestsOne' | translate)
								: context.row.original.requestCount + ' ' + ('Badge.openRequests' | translate)
						"
					/>
				}
			</div>
		</ng-template>
	`,
})
export class NetworkSharedBadgesDatatableComponent {
	badges = input.required<SharedBadgeWithRequests[]>();
	directBadgeAward = output<BadgeClass>();
	qrCodeAward = output<BadgeClass>();

	badgeCellTemplate = viewChild.required<TemplateRef<any>>('badgeCellTemplate');

	translateHeaderIDCellTemplate = viewChild.required<TemplateRef<any>>('translateHeaderIDCellTemplate');
	issuerActionsTemplate = viewChild.required<TemplateRef<any>>('issuerActionsCellTemplate');

	badgeActionsTemplate = viewChild.required<TemplateRef<any>>('badgeActionsCellTemplate');

	readonly tableSorting = signal<SortingState>([
		{
			id: 'General.badge',
			desc: false,
		},
	]);

	private readonly tableColumnDefinition: ColumnDef<SharedBadgeWithRequests>[] = [
		{
			id: 'General.badge',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => row.badgeclass.name,
			cell: (ctx) => this.badgeCellTemplate(),
			sortDescFirst: false,
		},
		{
			id: 'Network.sharedBy',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => row.shared_by_issuer.name,
			cell: (info) => info.getValue(),
		},
		{
			id: 'Network.sharedOn',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => this.sharedOn(row.shared_at),
			cell: (info) => info.getValue(),
		},
		{
			id: 'Issuer.recipients',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => row.recipient_count,
			cell: (info) => info.getValue(),
		},
		{
			id: 'actions',
			cell: (info) => this.badgeActionsTemplate(),
			enableSorting: false,
		},
	];

	table = createAngularTable(() => ({
		data: this.badges(),
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

	constructor() {}

	sharedOn(date: string) {
		return formatDate(date, 'dd.MM.yyyy', 'de-DE');
	}

	redirectToBadgeDetail = output<{ badge: BadgeClass; issuerSlug: string; focusRequests: boolean }>();
}
