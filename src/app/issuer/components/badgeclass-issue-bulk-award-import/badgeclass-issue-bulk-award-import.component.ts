import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { Title } from '@angular/platform-browser';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import {
	BulkIssueImportPreviewData,
	ColumnHeaders,
	DestSelectOptions,
	ViewState,
	ParsedRow,
} from '../badgeclass-issue-bulk-award/badgeclass-issue-bulk-award.component';
import { BgFormFieldFileComponent } from '../../../common/components/formfield-file';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmH1, HlmH3, HlmP } from '@spartan-ng/helm/typography';
import { isValidEmail } from '~/common/util/is-valid-email';
import tlds from '../../../../assets/data/tld-list.json';

@Component({
	selector: 'Badgeclass-issue-bulk-award-import',
	templateUrl: './badgeclass-issue-bulk-award-import.component.html',
	imports: [
		HlmH1,
		HlmP,
		HlmH3,
		FormsModule,
		ReactiveFormsModule,
		BgFormFieldFileComponent,
		OebButtonComponent,
		TranslatePipe,
	],
})
export class BadgeClassIssueBulkAwardImportComponent extends BaseAuthenticatedRoutableComponent {
	protected formBuilder = inject(FormBuilder);
	protected loginService: SessionService;
	protected messageService = inject(MessageService);
	protected router: Router;
	protected route: ActivatedRoute;
	protected title = inject(Title);

	readonly csvUploadIconUrl = '../../../../breakdown/static/images/csvuploadicon.svg';

	@Output() importPreviewDataEmitter = new EventEmitter<BulkIssueImportPreviewData>();
	@Output() updateStateEmitter = new EventEmitter<ViewState>();

	columnHeadersCount: number;
	csvForm: FormGroup;
	importPreviewData: BulkIssueImportPreviewData;
	issuer: string;
	rawCsv: string = null;
	viewState: ViewState;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const loginService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, loginService);
		const formBuilder = this.formBuilder;
		this.loginService = loginService;
		this.router = router;
		this.route = route;

		this.csvForm = formBuilder.group({
			file: [],
		} as ImportCsvForm<Array<unknown>>);
	}

	get zipFileControl(): FormControl {
		return this.csvForm.get('zipFile') as FormControl;
	}

	importAction() {
		this.parseCsv(this.rawCsv);
		this.importPreviewDataEmit();
	}

	importPreviewDataEmit() {
		this.importPreviewDataEmitter.emit(this.importPreviewData);
	}

	updateViewState(state: ViewState) {
		this.viewState = state;
		this.updateStateEmitter.emit(state);
	}

	onFileDataReceived(data) {
		this.rawCsv = data;
	}

	//////// Parsing ////////
	parseCsv(rawCSV: string) {
		const rows: ParsedRow[] = [];
		const validRows: ParsedRow[] = [];
		const invalidRows: ParsedRow[] = [];

		const parseRow = (rawRow: string): ParsedRow => ({
			cells: rawRow.split(/[,;]/).map((r) => r.trim()),
		});

		rawCSV.match(/[^\r\n]+/g)?.forEach((rowString) => {
			rows.push(parseRow(rowString));
		});

		const headerRow = rows.shift();
		if (!headerRow) return;

		const columnHeaders: ColumnHeaders[] = headerRow.cells.map((columnHeaderName) => {
			const lower = columnHeaderName.toLowerCase();
			let destColumn: DestSelectOptions;

			if (lower === 'email' || lower === 'e-mail-adresse' || lower === 'email address') destColumn = 'email';
			if (lower === 'name' || lower === 'vor- / nachname') destColumn = 'name';
			if (lower === 'vorname' || lower === 'first name') destColumn = 'firstname';
			if (lower === 'nachname' || lower === 'surname' || lower === 'last name') destColumn = 'lastname';
			if (lower.includes('geburtsdatum') || lower.includes('date of birth')) destColumn = 'dateOfBirth';

			return { destColumn: destColumn ?? 'NA', sourceName: columnHeaderName };
		});

		this.columnHeadersCount = columnHeaders.length;

		const emailColIndex = columnHeaders.findIndex((c) => c.destColumn === 'email');

		for (const row of rows) {
			if (row.cells.length < this.columnHeadersCount) {
				row.cells = row.cells.concat(this.createRange(this.columnHeadersCount - row.cells.length));
			}

			// empty cells are allowed in the optional date of birth column
			const rowIsValid = row.cells.every(
				(cell, index) => cell.length > 0 || columnHeaders[index]?.destColumn === 'dateOfBirth',
			);
			let emailInvalid = false;

			if (emailColIndex >= 0) {
				const email = row.cells[emailColIndex];
				emailInvalid = !isValidEmail(email);
			}

			row.emailInvalid = emailInvalid;

			if (!rowIsValid || emailInvalid) {
				invalidRows.push(row);
			} else {
				validRows.push(row);
			}
		}

		this.importPreviewData = {
			columnHeaders,
			invalidRows,
			validRows,
			rows,
			rowLongerThenHeader: rows.some((r) => r.cells.length > this.columnHeadersCount),
		} as BulkIssueImportPreviewData;
	}

	createRange = (size: number) => {
		const items: string[] = [];
		for (let i = 1; i <= size; i++) {
			items.push('');
		}
		return items;
	};
}

interface ImportCsvForm<T> {
	file: T;
}
