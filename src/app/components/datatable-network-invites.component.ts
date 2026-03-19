import { CommonModule, formatDate } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { Component, input, output, signal, TemplateRef, viewChild, inject } from '@angular/core';
import { HlmTableImports } from './spartan/ui-table-helm/src';
import { FormsModule } from '@angular/forms';
import { lucideSearch } from '@ng-icons/lucide';
import { OebButtonComponent } from './oeb-button.component';
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
import { ApiNetworkInvitation } from '../issuer/models/network-invite-api.model';
import { NetworkApiService } from '../issuer/services/network-api.service';
import { Issuer } from '../issuer/models/issuer.model';

@Component({
	selector: 'network-invites-datatable',
	imports: [
		FormsModule,
		...HlmTableImports,
		...OebTableImports,
		CommonModule,
		TranslateModule,
		RouterModule,
		OebButtonComponent,
		FlexRenderDirective,
		NgIcon,
		HlmIconModule,
	],
	providers: [provideIcons({ lucideSearch })],
	template: `
		<div class="tw-mt-8 tw-overflow-x-auto">
			<table hlmTable oeb-table-secondary>
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
		</div>

		<ng-template #translateHeaderIDCellTemplate let-context>
			{{ context.header.id | translate }}
		</ng-template>

		<ng-template #inviteCellTemplate let-context>
			<div
				class="tw-flex tw-flex-row tw-items-center tw-leading-7 tw-gap-2 tw-cursor-pointer"
				(click)="redirectToIssuerDetail.emit(context.row.original)"
			>
				<div>
					<img
						class=""
						src="{{ context.row.original.issuer.image }}"
						alt="{{ context.row.original.issuer.name }}"
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
			<div class="tw-flex tw-flex-col md:tw-flex-row tw-gap-1 md:tw-gap-2 tw-leading-relaxed md:tw-justify-end">
				<oeb-button
					size="xs"
					text="{{ 'Network.resendInvitation' | translate }}"
					(click)="resendInvitation(context.row.original.issuer)"
				/>
				<oeb-button
					size="xs"
					variant="secondary"
					text="{{ 'General.withdraw' | translate }}"
					(click)="revokeInvitation(context.row.original)"
				/>
			</div>
		</ng-template>
	`,
})
export class NetworkInvitesDatatableComponent {
	private networkApiService = inject(NetworkApiService);

	invites = input.required<ApiNetworkInvitation[]>();
	network = input.required<any>();
	actionElement = output<ApiNetworkInvitation>();

	inviteRevoked = output<ApiNetworkInvitation>();
	redirectToIssuerDetail = output<Issuer>();

	translateHeaderIDCellTemplate = viewChild.required<TemplateRef<any>>('translateHeaderIDCellTemplate');
	issuerActionsTemplate = viewChild.required<TemplateRef<any>>('issuerActionsCellTemplate');
	inviteCellTemplate = viewChild.required<TemplateRef<any>>('inviteCellTemplate');

	readonly tableSorting = signal<SortingState>([
		{
			id: 'Network.pendingInvites',
			desc: false,
		},
	]);

	private readonly tableColumnDefinition: ColumnDef<ApiNetworkInvitation>[] = [
		{
			id: 'Network.pendingInvites',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => row.issuer.name,
			cell: (ctx) => this.inviteCellTemplate(),
			sortDescFirst: false,
		},
		{
			id: 'Network.invitedOn',
			header: () => this.translateHeaderIDCellTemplate(),
			accessorFn: (row) => formatDate(row.invitedOn, 'dd.MM.yyyy', 'de-DE'),
			cell: (info) => info.getValue(),
		},
		{
			id: 'actions',
			cell: (issuer) => this.issuerActionsTemplate(),
			enableSorting: false,
		},
	];

	table = createAngularTable(() => ({
		data: this.invites(),
		columns: this.tableColumnDefinition,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		state: {
			sorting: this.tableSorting(),
		},
		onSortingChange: (updater) =>
			updater instanceof Function ? this.tableSorting.update(updater) : this.tableSorting.set(updater),
		enableSortingRemoval: false,
	}));

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}

	resendInvitation(issuer: Issuer) {
		this.networkApiService.inviteInstitutions(this.network().slug, [issuer]);
	}

	revokeInvitation(invite: ApiNetworkInvitation) {
		this.inviteRevoked.emit(invite);
	}
}
