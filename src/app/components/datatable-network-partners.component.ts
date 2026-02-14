import { formatDate } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { Component, input, output, signal, TemplateRef, viewChild, inject } from '@angular/core';
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
import { Issuer } from '../issuer/models/issuer.model';
import { NetworkApiService } from '../issuer/services/network-api.service';
import { ApiNetworkInvitation } from '../issuer/models/network-invite-api.model';
import { Network } from '~/issuer/network.model';

@Component({
	selector: 'network-partners-datatable',
	imports: [
		FormsModule,
		...HlmTableImports,
		...OebTableImports,
		TranslateModule,
		RouterModule,
		FlexRenderDirective,
		NgIcon,
		HlmIconModule,
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
				@if (approvedInvites().length) {
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
				}
			</table>
		</div>

		<ng-template #translateHeaderIDCellTemplate let-context>
			{{ context.header.id | translate }}
		</ng-template>

		<ng-template #issuerCellTemplate let-context>
			<div
				class="tw-flex tw-flex-row tw-items-center tw-leading-7 tw-gap-2 tw-cursor-pointer"
				(click)="redirectToIssuerDetail.emit(context.row.original)"
			>
				<div>
					<img
						class=""
						src="{{ context.row.original.image }}"
						alt="{{ context.row.original.name }}"
						width="40"
					/>
				</div>
				<p
					class="
						tw-max-w-[26ch]
						tw-whitespace-normal
						tw-break-words
						tw-leading-tight
					"
				>
					{{ context.getValue() }}
				</p>
			</div>
		</ng-template>

		<ng-template #issuerActionsCellTemplate let-context>
			<!-- @if (network().current_user_network_role === 'owner') {
				<oeb-button
					class="tw-float-right"
					size="xs"
					variant="secondary"
					(click)="removePartner(context.row.original)"
					text="{{ 'General.remove' | translate }}"
				/>
			} -->
		</ng-template>
	`,
})
export class NetworkPartnersDatatableComponent {
	partners = input.required<Issuer[]>();
	network = input.required<Network>();
	approvedInvites = input.required<ApiNetworkInvitation[]>();
	actionElement = output<Issuer>();

	redirectToIssuerDetail = output<Issuer>();

	removePartnerRequest = output<Issuer>();

	translateHeaderIDCellTemplate = viewChild.required<TemplateRef<any>>('translateHeaderIDCellTemplate');
	issuerCellTemplate = viewChild.required<TemplateRef<any>>('issuerCellTemplate');
	issuerActionsTemplate = viewChild.required<TemplateRef<any>>('issuerActionsCellTemplate');

	readonly tableSorting = signal<SortingState>([
		{
			id: 'General.name',
			desc: false,
		},
	]);

	private readonly tableColumnDefinition: ColumnDef<Issuer>[] = [
		{
			id: 'General.name',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => row.name,
			cell: () => this.issuerCellTemplate(),
			sortDescFirst: false,
		},
		{
			id: 'Network.partnerSince',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => this.acceptedOn(row),
			cell: (info) => info.getValue(),
		},
		{
			id: 'actions',
			cell: (issuer) => this.issuerActionsTemplate(),
			enableSorting: false,
		},
	];

	table = createAngularTable(() => ({
		data: this.partners(),
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

	removePartner(issuer: Issuer) {
		this.removePartnerRequest.emit(issuer);
	}

	acceptedOn(issuer: Issuer) {
		const inv = this.approvedInvites().find((i) => i.issuer.slug == issuer.slug);
		if (inv) return formatDate(inv.acceptedOn, 'dd.MM.yyyy', 'de-DE');
	}
}
