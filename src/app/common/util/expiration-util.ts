import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type ExpirationUnit = 'days' | 'weeks' | 'months' | 'years';

export function getDurationOptions(translate: TranslateService): Record<ExpirationUnit, string> {
	return {
		days: translate.instant('General.days'),
		weeks: translate.instant('General.weeks'),
		months: translate.instant('General.months'),
		years: translate.instant('General.years'),
	};
}

export function expirationToDays(amount: number | null, unit: ExpirationUnit | null): number | null {
	if (!amount || amount <= 0 || !unit) return null;

	const MAX_DAYS = 36500; // 100 years

	let days: number;
	switch (unit) {
		case 'days':
			days = amount;
			break;
		case 'weeks':
			days = amount * 7;
			break;
		case 'months':
			days = amount * 30;
			break;
		case 'years':
			days = amount * 365;
			break;
		default:
			return null;
	}

	return days > MAX_DAYS ? null : days;
}

/**
 * Pipe that formats a number of days
 * to the largest time period representable by an integer.
 * E.g. 7 days would be displayed as 1 week, 52 weeks as a year, etc.
 */
@Pipe({ name: 'timePeriodPipe' })
export class TimePeriodPipe implements PipeTransform {
	readonly translate = inject(TranslateService);

	transform(value: number): string {
		// The fixed day values are what we assume to be a week,
		// a month or a year, even though its not perfectly accurate (leap years e.g.)
		if (value <= 0) throw new Error('Cannot determine time period to choose for days <= 0');
		const days = value;
		const weeks = value / 7;
		const months = value / 30;
		const years = value / 365;

		if (value % 365 === 0) return `${years.toFixed(0)} ${this.translate.instant('General.years')}`;
		if (value % 30 === 0) return `${months.toFixed(0)} ${this.translate.instant('General.months')}`;
		if (value % 7 === 0) return `${weeks.toFixed(0)} ${this.translate.instant('General.weeks')}`;

		return `${days.toFixed(0)} ${this.translate.instant('General.days')}`;
	}
}
