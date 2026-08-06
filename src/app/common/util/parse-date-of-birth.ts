/**
 * Parses a date-of-birth value as found in bulk-award CSV files into ISO format (yyyy-mm-dd).
 * Accepts the German/English template format "dd.mm.yyyy" as well as ISO "yyyy-mm-dd".
 * Returns null when the value cannot be parsed to a valid calendar date.
 */
export function parseDateOfBirth(value: string): string | null {
	const trimmed = (value ?? '').trim();

	let year: number, month: number, day: number;

	let match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
	if (match) {
		[day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
	} else {
		match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!match) return null;
		[year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
	}

	const date = new Date(year, month - 1, day);
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
		return null;
	}

	return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
