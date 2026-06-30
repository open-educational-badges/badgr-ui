import { Component, EventEmitter, Input, Output, OnChanges, inject } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { Title } from '@angular/platform-browser';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import {
	BulkIssueData,
	BulkIssueImportPreviewData,
	DestSelectOptions,
	ParsedRow,
	TransformedImportData,
	ViewState,
} from '../badgeclass-issue-bulk-award/badgeclass-issue-bulk-award.component';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmH1, HlmP } from '@spartan-ng/helm/typography';
import { NgClass } from '@angular/common';
import tlds from '../../../../assets/data/tld-list.json';
import { isValidEmail } from '~/common/util/is-valid-email';

@Component({
	selector: 'Badgeclass-issue-bulk-award-preview',
	templateUrl: './badgeclass-issue-bulk-award-preview.component.html',
	imports: [HlmH1, HlmP, FormsModule, OebButtonComponent, TranslatePipe, NgClass],
})
export class BadgeClassIssueBulkAwardPreviewComponent extends BaseAuthenticatedRoutableComponent implements OnChanges {
	protected formBuilder = inject(FormBuilder);
	protected loginService: SessionService;
	protected messageService = inject(MessageService);
	protected router: Router;
	protected route: ActivatedRoute;
	protected title = inject(Title);

	@Input() importPreviewData: BulkIssueImportPreviewData;

	@Output() updateStateEmitter = new EventEmitter<ViewState>();
	@Output() transformedImportDataEmitter = new EventEmitter();

	MAX_ROWS_TO_DISPLAY = 5;

	buttonDisabledAttribute = true;
	buttonDisabledClass = true;
	columnHeadersCount: number;
	destNameToColumnHeaderMap: {
		[destColumnName: string]: number;
	};
	duplicateRecords: BulkIssueData[] = [];

	rowIsLongerThanHeader: boolean;
	validRowsTransformed = new Set<BulkIssueData>();
	invalidRowsTransformed = Array<BulkIssueData>();

	viewState: ViewState;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const loginService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, loginService);

		this.loginService = loginService;
		this.router = router;
		this.route = route;
	}

	ngOnChanges(changes) {
		this.disableActionButton();
		this.rowIsLongerThanHeader = this.importPreviewData.rowLongerThenHeader;
		this.columnHeadersCount = this.importPreviewData.columnHeaders.length;

		if (!this.importPreviewData.rowLongerThenHeader) {
			if (this.isEmailColumnHeaderMapped()) this.enableActionButton();
			else this.disableActionButton();
		}
	}

	disableActionButton() {
		this.buttonDisabledClass = true;
		this.buttonDisabledAttribute = true;
	}

	enableActionButton() {
		this.buttonDisabledClass = false;
		this.buttonDisabledAttribute = null;
	}

	updateViewState(state: ViewState) {
		this.viewState = state;
		this.updateStateEmitter.emit(state);
	}

	emitTransformedData() {
		const transformedImportData: TransformedImportData = {
			duplicateRecords: this.duplicateRecords,
			validRowsTransformed: this.validRowsTransformed,
			invalidRowsTransformed: this.invalidRowsTransformed,
		};

		this.transformedImportDataEmitter.emit(transformedImportData);
	}

	isEmailColumnHeaderMapped(): boolean {
		return this.importPreviewData.columnHeaders.some((columnHeader) => columnHeader.destColumn === 'email');
	}

	//////// Generating import data ////////
	generateImportPreview() {
		this.generateDestNameToColumnHeaderMap();
		this.removeFromInvalidRowsWithEmptyOptionalCells();
		this.transformInvalidRows();
		this.transformValidRows();
		this.emitTransformedData();
	}

	removeFromInvalidRowsWithEmptyOptionalCells() {
		const invalidRow: ParsedRow[] = [];
		let emptyCellsAreOptional: boolean;

		this.importPreviewData.invalidRows.forEach((row) => {
			emptyCellsAreOptional = row.cells.every((cell, index) => {
				if (cell.length) {
					return true;
				} else {
					return false;
				}
			});

			if (emptyCellsAreOptional) this.importPreviewData.validRows.push(row);
			else invalidRow.push(row);
		});

		this.importPreviewData.invalidRows = invalidRow;
	}

	transformInvalidRows() {
		this.importPreviewData.invalidRows.forEach((row) => {
			this.invalidRowsTransformed.push({
				email: this.getEmailFromRow(row),
				name: this.getNameFromRow(row),
			});
		});
	}

	transformValidRows() {
		this.validRowsTransformed = new Set<BulkIssueData>(
			this.importPreviewData.validRows.map((row) => {
				const email = this.getEmailFromRow(row);
				const name = this.getNameFromRow(row);

				const emailInvalid = !isValidEmail(email);

				return { email, name, emailInvalid };
			}),
		);
	}

	removeDuplicateEmails() {
		const seenEmails = new Set<string>();
		const uniqueRows = new Set<BulkIssueData>();
		const duplicates: BulkIssueData[] = [];

		this.validRowsTransformed.forEach((row) => {
			const normalizedEmail = row.email?.trim().toLowerCase();
			if (!normalizedEmail) {
				duplicates.push(row);
				return;
			}

			if (seenEmails.has(normalizedEmail)) {
				duplicates.push(row);
			} else {
				seenEmails.add(normalizedEmail);
				uniqueRows.add(row);
			}
		});

		this.validRowsTransformed = uniqueRows;
		this.duplicateRecords = duplicates;
	}

	mapDestNameToSourceName(columnHeaderId: number, selected: DestSelectOptions) {
		Object.keys(this.importPreviewData.columnHeaders).forEach((columnId) => {
			if (
				columnId !== columnHeaderId.toString() &&
				this.importPreviewData.columnHeaders[columnId].destColumn === selected
			) {
				this.importPreviewData.columnHeaders[columnId].destColumn = 'NA';
			}

			if (columnId === columnHeaderId.toString()) {
				this.importPreviewData.columnHeaders[columnId].destColumn = selected;
			}
		});

		if (this.isEmailColumnHeaderMapped()) this.enableActionButton();
		else this.disableActionButton();
	}

	getEmailFromRow(row) {
		return this.getCellFromRowByDestName('email', row);
	}

	getNameFromRow(row) {
		return this.getCellFromRowByDestName('name', row);
	}

	getCellFromRowByDestName(destName: string, row: ParsedRow) {
		const index = this.destNameToColumnHeaderMap[destName];
		return index !== undefined ? (row.cells[index]?.trim() ?? '') : '';
	}

	generateDestNameToColumnHeaderMap() {
		this.destNameToColumnHeaderMap = {};
		Object.keys(this.importPreviewData.columnHeaders).forEach((key) => {
			if (this.importPreviewData.columnHeaders[key].destColumn !== 'NA') {
				this.destNameToColumnHeaderMap[this.importPreviewData.columnHeaders[key].destColumn] = Number(key);
			}
		});
	}

	createRange(size: number) {
		const items: string[] = [];
		for (let i = 1; i <= size; i++) {
			items.push('');
		}
		return items;
	}
}
