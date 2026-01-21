/**
 * Dashboard Data Models
 *
 * Shared TypeScript interfaces and types for the municipal dashboard.
 * These models define the structure for KPIs, charts, badges, and competency data.
 */

// ==========================================
// KPI Models
// ==========================================

/**
 * Key Performance Indicator data structure
 * Used for displaying metrics with trends and visual indicators
 */
export interface KPIData {
	/** Unique identifier for the KPI (used for i18n lookups and UI config) */
	id?: string;
	/** Display label for the KPI */
	label?: string;
	/** The current value (can be numeric or formatted string) */
	value: number | string;
	/** Unit of measurement */
	unit?: string;
	/** Trend direction indicator */
	trend?: 'up' | 'down' | 'stable';
	/** Numeric value of the trend change */
	trendValue?: number;
	/** Trend label for display */
	trendLabel?: string;
	/** Icon identifier */
	icon?: string;
	/** Color theme */
	color?: string;
	/** Tooltip text */
	tooltip?: string;
	/** Whether this KPI has monthly details available */
	hasMonthlyDetails?: boolean;
	/** Monthly detail records */
	monthlyDetails?: MonthlyDetail[];
}

/**
 * Monthly detail data for KPIs
 */
export interface MonthlyDetail {
	/** Title of the monthly item */
	title?: string;
	/** Value or count for this item */
	value: number | string;
	/** Date of this entry */
	date?: string | Date;
	/** Category key (for i18n lookup) */
	categoryKey?: string;
	/** Category display name */
	category?: string;
	/** Additional details */
	details?: string;
	/** Area key (for competency areas) */
	areaKey?: string;
	/** Competency key (for specific competencies) */
	competencyKey?: string;
	/** Postal code prefix */
	postalCodePrefix?: string;
	/** City name */
	cityName?: string;
	/** District name */
	districtName?: string;
}

// ==========================================
// Chart Models
// ==========================================

/**
 * Generic chart data structure
 * Used for various chart types (pie, bar, line)
 */
export interface ChartData {
	/** Array of labels for chart data points */
	labels: string[];
	/** Array of numeric values corresponding to labels */
	values: number[];
	/** Optional array of colors for each data point */
	backgroundColor?: string[];
}

// ==========================================
// Badge Models
// ==========================================

/**
 * Badge type enumeration for type safety
 */
export type BadgeType = 'participation' | 'competency' | 'learningpath';

/**
 * Extended badge type including 'all' for aggregated data
 * Used in timeline data when no type breakdown is available
 */
export type BadgeTypeExtended = BadgeType | 'all';

/**
 * Badge delivery method enumeration
 * Used to categorize how badges are delivered
 */
export type BadgeDeliveryMethod = 'online' | 'in-person';

/**
 * Statistics for different badge types
 * Used in pie charts and summary displays
 */
export interface BadgeTypeStats {
	/** Type key for i18n and config lookup */
	typeKey?: BadgeType;
	/** Badge type (for backwards compatibility) */
	type?: BadgeType;
	/** Display label */
	label?: string;
	/** Number of badges of this type */
	count: number;
	/** Percentage of total badges */
	percentage: number;
	/** Color for visualization */
	color?: string;
}

/**
 * Time-series data for badge awards
 * Used in line charts to show badge distribution over time
 */
export interface BadgeAwardData {
	/** Calendar year (e.g., 2024) */
	year: number;
	/** Month number (1-12) */
	month: number;
	/** Day of month (1-31), optional - used for daily granularity */
	day?: number;
	/** Type of badge awarded (can be 'all' when aggregated) */
	type: BadgeTypeExtended;
	/** Number of badges awarded in this period */
	count: number;
	/** Date object for the award period */
	date: Date;
}

/**

// ==========================================
// Competency Models
// ==========================================

/**
 * Competency bubble chart data
 * Used for visualizing competency distribution with weighted sizes
 */
export interface CompetencyBubbleData {
	/** Area key for i18n and color lookup */
	areaKey?: string;
	/** Display name */
	name?: string;
	/** Percentage value */
	value: number;
	/** Weight for bubble size calculation */
	weight: number;
	/** Color for visualization */
	color?: string;
	/** Number of unique users who have earned competencies in this area */
	userCount?: number;
	/** Number of institutions offering badges in this area */
	institutionCount?: number;
}

// ==========================================
// Helper Types
// ==========================================

/**
 * Filter options for year selection
 */
export interface YearFilterOption {
	/** Year value */
	value: number;
	/** Display label */
	label: string;
}

/**
 * Filter options for month selection
 */
export interface MonthFilterOption {
	/** Month number (1-12) */
	value: number;
	/** German month name */
	label: string;
}

/**
 * Filter options for badge type selection
 */
export interface BadgeTypeFilterOption {
	/** Badge type value or 'all' */
	value: string;
	/** Display label in German */
	label: string;
}

/**
 * Activity feed item
 */
export interface ActivityItem {
	/** Type of activity */
	type: 'badge' | 'esco' | 'course' | 'institution';
	/** Activity title/description */
	title: string;
	/** Number of items affected */
	count: number;
	/** Date of the activity */
	date: Date;
	/** Icon identifier */
	icon: string;
}

/**
 * Badge competency data for horizontal bar charts
 */
export interface BadgeCompetencyData {
	/** Badge title/name */
	badgeTitle: string;
	/** Number of badges */
	count: number;
	/** Optional category key for color determination */
	categoryKey?: string;
	/** Color for visualization */
	color?: string;
}

// ==========================================
// Gender-Based Competency Models
// ==========================================

/**
 * Gender category type for filtering and data segmentation
 */
export type GenderCategory = 'male' | 'female';

/**
 * Top competency area (Kompetenzbereich) data
 * Used for displaying top 5 competency categories by gender
 * Note: Names and colors should be determined by frontend based on areaKey
 */
export interface KompetenzbereichData {
	/** Area key for i18n and color lookup */
	areaKey: string;
	/** Number of participants in this area */
	count: number;
	/** Percentage within gender group */
	percentage: number;
	/** Total hours spent in this area */
	hours: number;
}

/**
 * Gender-specific competency area summary
 */
export interface GenderKompetenzbereicheData {
	/** Total participants in this gender category */
	total: number;
	/** Percentage of overall participants */
	percentage: number;
	/** Top 5 competency areas for this gender */
	topCompetencyAreas: KompetenzbereichData[];
}

/**
 * Complete competency areas data structure by gender
 */
export interface GenderKompetenzbereicheResponse {
	/** Metadata about the dataset */
	metadata: {
		lastUpdated: string;
		totalCompetencies: number;
		totalParticipants: number;
	};
	/** Male participants data */
	male: GenderKompetenzbereicheData;
	/** Female participants data */
	female: GenderKompetenzbereicheData;
}

/**
 * Strengthened competency data
 * Used for displaying specific competencies that have been enhanced
 * Note: Names should be determined by frontend based on competencyKey and areaKey
 */
export interface StrengthenedCompetencyData {
	/** Competency key for i18n lookup */
	competencyKey: string;
	/** Number of participants who strengthened this competency */
	count: number;
	/** Total hours invested */
	hours: number;
	/** Number of badges awarded for this competency */
	badges: number;
	/** Trend direction */
	trend: 'up' | 'down' | 'stable';
	/** Numeric trend value */
	trendValue: number;
	/** Area key this competency belongs to */
	areaKey: string;
}

/**
 * Gender-specific strengthened competencies summary
 */
export interface GenderStrengthenedCompetenciesData {
	/** Total participants in this gender category */
	total: number;
	/** Percentage of overall participants */
	percentage: number;
	/** Top 5 strengthened competencies for this gender */
	strengthenedCompetencies: StrengthenedCompetencyData[];
}

/**
 * Complete strengthened competencies data structure by gender
 */
export interface GenderStrengthenedCompetenciesResponse {
	/** Metadata about the dataset */
	metadata: {
		lastUpdated: string;
		totalCompetencies: number;
		averageHoursPerCompetency: number;
	};
	/** Male participants data */
	male: GenderStrengthenedCompetenciesData;
	/** Female participants data */
	female: GenderStrengthenedCompetenciesData;
}

/**
 * Top badge data by gender
 * Used for displaying the top 3 most awarded badges
 * Note: Icons, colors, and category labels should be determined by frontend based on categoryKey
 * Competency names should be looked up from competencyKeys
 */
export interface GenderTopBadgeData {
	/** Badge title/name */
	badgeTitle: string;
	/** Number of times awarded */
	count: number;
	/** Percentage within gender group */
	percentage: number;
	/** Total hours for this badge */
	hours: number;
	/** Category key for i18n lookup */
	categoryKey: string;
	/** List of competency keys covered by this badge */
	competencyKeys: string[];
}

/**
 * Gender-specific top badges summary
 */
export interface GenderTopBadgesData {
	/** Total badges awarded to this gender category */
	total: number;
	/** Percentage of overall badges */
	percentage: number;
	/** Top 3 badges for this gender */
	topBadges: GenderTopBadgeData[];
}

/**
 * Complete top badges data structure by gender
 */
export interface GenderTopBadgesResponse {
	/** Metadata about the dataset */
	metadata: {
		lastUpdated: string;
		totalBadges: number;
		totalCategories: number;
	};
	/** Male participants data */
	male: GenderTopBadgesData;
	/** Female participants data */
	female: GenderTopBadgesData;
}

// ==========================================
// ZIP Code (Postal Code) Statistics Models
// ==========================================

/**
 * ZIP code area statistics data
 * Used for displaying learner distribution across postal code regions
 */
export interface ZipCodeStatisticsData {
	/** Postal code prefix (e.g., "80xxx", "10xxx") */
	zipCode: string;
	/** Region name (e.g., "München", "Berlin Mitte") */
	regionName: string;
	/** Number of learners in this ZIP code area */
	learnerCount: number;
	/** Percentage of total learners */
	percentage: number;
	/** Trend direction indicator */
	trend: 'up' | 'down' | 'stable';
	/** Numeric value of the trend change */
	trendValue: number;
}

/**
 * Complete ZIP code statistics response structure
 */
export interface ZipCodeStatisticsResponse {
	/** Human-readable description of the dataset */
	description?: string;
	/** Metadata about the dataset */
	metadata: {
		lastUpdated: string;
		totalLearners: number;
		totalZipCodeAreas: number;
	};
	/** Array of ZIP code area statistics */
	statistics: ZipCodeStatisticsData[];
}

/**
 * @deprecated Use ZipCodeStatisticsData instead
 */
export type PlzStatisticsData = ZipCodeStatisticsData;

/**
 * @deprecated Use ZipCodeStatisticsResponse instead
 */
export type PlzStatisticsResponse = ZipCodeStatisticsResponse;
