export interface BadgeFilter {
	keyword: string;
	fromDate: Date | null;
	toDate: Date | null;
}

export const EMPTY_BADGE_FILTER: BadgeFilter = {
	keyword: '',
	fromDate: null,
	toDate: null,
};
