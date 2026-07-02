import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmInput } from '@spartan-ng/helm/input';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { BadgeFilter, EMPTY_BADGE_FILTER } from './badge-filter.types';

function parseLocalDate(dateStr: string): Date {
	const [year, month, day] = dateStr.split('-').map(Number);
	return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

@Component({
	selector: 'badge-filter',
	templateUrl: './badge-filter.component.html',
	imports: [TranslatePipe, HlmInput, OebButtonComponent],
})
export class BadgeFilterComponent implements OnDestroy {
	keyword: string = '';
	fromDate: string = '';
	toDate: string = '';

	@Output() filterChange = new EventEmitter<BadgeFilter>();

	private readonly keywordSubject = new Subject<string>();

	constructor() {
		this.keywordSubject.pipe(debounceTime(300)).subscribe(() => this.emit());
	}

	ngOnDestroy(): void {
		this.keywordSubject.complete();
	}

	onKeywordInput(event: Event): void {
		this.keyword = (event.target as HTMLInputElement).value;
		this.keywordSubject.next(this.keyword);
	}

	onFromDateChange(event: Event): void {
		this.fromDate = (event.target as HTMLInputElement).value;
		this.emit();
	}

	onToDateChange(event: Event): void {
		this.toDate = (event.target as HTMLInputElement).value;
		this.emit();
	}

	reset(): void {
		this.keyword = '';
		this.fromDate = '';
		this.toDate = '';
		this.filterChange.emit({ ...EMPTY_BADGE_FILTER });
	}

	private emit(): void {
		this.filterChange.emit({
			keyword: this.keyword,
			fromDate: this.fromDate ? parseLocalDate(this.fromDate) : null,
			toDate: this.toDate ? endOfDay(parseLocalDate(this.toDate)) : null,
		});
	}
}
