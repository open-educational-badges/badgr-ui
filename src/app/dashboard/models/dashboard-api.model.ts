/**
 * Dashboard API Models
 *
 * TypeScript interfaces for API requests and responses used by the Dashboard API Service.
 * These models align with the badgr-server API endpoints.
 */

import { BadgeType } from './dashboard-models';

// ==========================================
// User Profile Models
// ==========================================

/**
 * User profile data from API
 */
export interface ApiUserProfile {
	/** User's first name */
	first_name: string;
	/** User's last name */
	last_name: string;
	/** User's email address */
	email: string;
	/** User's telephone number(s) */
	telephone?: string | string[];
	/** User's URL(s) */
	url?: string | string[];
	/** Terms version agreed by user */
	agreed_terms_version: number;
	/** Latest terms version available */
	latest_terms_version: number;
	/** User creation timestamp */
	created_at?: string;
	/** User last login timestamp */
	last_login?: string;
}

// ==========================================
// Badge Statistics Models
// ==========================================

/**
 * Badge statistics response from API
 */
export interface ApiBadgeStatistics {
	/** Total number of badges */
	total: number;
	/** Number of participation badges */
	participation: number;
	/** Number of competency badges */
	competency: number;
	/** Number of learning path badges */
	learningpath: number;
	/** Number of badges by year */
	by_year?: Record<string, number>;
	/** Number of badges by month */
	by_month?: Record<string, number>;
}

// ==========================================
// Badge Award Models
// ==========================================

/**
 * Parameters for fetching badge awards
 */
export interface ApiBadgeAwardsParams {
	/** Filter by year */
	year?: number;
	/** Filter by month (1-12) */
	month?: number;
	/** Filter by badge type */
	type?: BadgeType | 'all';
	/** Number of results per page */
	limit?: number;
	/** Page offset */
	offset?: number;
}

/**
 * Single badge award from API
 */
export interface ApiBadgeAward {
	/** Badge instance ID */
	id: string | number;
	/** Badge class name */
	badge_name: string;
	/** Badge type */
	badge_type?: BadgeType;
	/** Issuer name */
	issuer_name: string;
	/** Award date (ISO 8601) */
	issued_on: string;
	/** Recipient identifier */
	recipient_identifier: string;
	/** Badge image URL */
	image?: string;
	/** Badge description */
	description?: string;
}

/**
 * Badge awards response from API
 */
export interface ApiBadgeAwardsResponse {
	/** Array of badge awards */
	results: ApiBadgeAward[];
	/** Total count of awards matching query */
	count: number;
	/** Next page URL if available */
	next?: string;
	/** Previous page URL if available */
	previous?: string;
}

// ==========================================
// Skills Distribution Models
// ==========================================

/**
 * Skill/competency data from API
 */
export interface ApiSkillData {
	/** Skill name */
	name: string;
	/** Number of badges with this skill */
	count: number;
	/** Percentage of total */
	percentage?: number;
	/** Skill category or parent */
	category?: string;
}

/**
 * Skills distribution response from API
 */
export interface ApiSkillsDistribution {
	/** Array of skills */
	skills: ApiSkillData[];
	/** Total number of skills */
	total_skills: number;
	/** Total number of badges with skills */
	total_badges_with_skills: number;
}

// ==========================================
// Collection Models
// ==========================================

/**
 * Badge collection from API
 */
export interface ApiBadgeCollection {
	/** Collection ID */
	id: string | number;
	/** Collection name */
	name: string;
	/** Collection description */
	description?: string;
	/** Number of badges in collection */
	badge_count: number;
	/** Collection creation date */
	created_at: string;
	/** Collection image URL */
	image?: string;
	/** Public share URL */
	share_url?: string;
}

/**
 * Collections response from API
 */
export interface ApiCollectionsResponse {
	/** Array of collections */
	results: ApiBadgeCollection[];
	/** Total count of collections */
	count: number;
}

// ==========================================
// Institution/Issuer Statistics Models
// ==========================================

/**
 * Institution statistics from API
 */
export interface ApiInstitutionStatistics {
	/** Total number of institutions */
	total_institutions: number;
	/** Institutions by category */
	by_category?: Record<string, number>;
	/** Institutions by region */
	by_region?: Record<string, number>;
}

// ==========================================
// Regional Data Models
// ==========================================

/**
 * User's region information (derived from zipcode)
 */
export interface ApiUserRegion {
	/** Region code (first digit of zipcode, e.g., "8" for München) */
	code: string;
	/** Full region name */
	name: string;
	/** German state (Bundesland) */
	state: string;
	/** Region type */
	type: 'kreisfreie-stadt' | 'landkreis';
}

/**
 * PLZ district data
 */
export interface ApiPlzDistrict {
	/** District number */
	nr: number;
	/** PLZ range code (e.g., "80331-80339") */
	code: string;
	/** District name (e.g., "Altstadt/Lehel") */
	name: string;
	/** Total badges in district */
	totalBadges: number;
	/** Badges by type distribution */
	badgesByType: {
		participation: number;
		competency: number;
		learningpath: number;
	};
	/** Top competencies in district */
	topCompetencies: Array<{
		name: string;
		count: number;
		percentage: number;
	}>;
	/** Number of institutions in district */
	institutions: number;
	/** Top institutions in district */
	topInstitutions: Array<{
		name: string;
		badgeCount: number;
	}>;
	/** Demographics data */
	demographics: {
		genderDistribution: Array<{
			gender: string;
			count: number;
			percentage: number;
		}>;
	};
	/** Trend data */
	trendData: {
		monthlyGrowth: number;
		yearlyGrowth: number;
	};
}

/**
 * PLZ districts response for a region
 */
export interface ApiPlzDistrictsResponse {
	/** Region name */
	region: string;
	/** Region code */
	regionCode: string;
	/** Array of PLZ districts */
	districts: ApiPlzDistrict[];
}

/**
 * Regional badge data from API
 */
export interface ApiRegionalBadgeData {
	/** Region identifier (e.g., PLZ, city) */
	region_id: string;
	/** Region name */
	region_name: string;
	/** Total badges in region */
	badge_count: number;
	/** Institutions in region */
	institution_count: number;
	/** Badge types distribution */
	badge_types?: Record<BadgeType, number>;
}

/**
 * Regional data response from API
 */
export interface ApiRegionalDataResponse {
	/** Array of regional data */
	regions: ApiRegionalBadgeData[];
	/** Total regions */
	total_regions: number;
}

// ==========================================
// Activity Feed Models
// ==========================================

/**
 * Activity item from API
 */
export interface ApiActivityItem {
	/** Activity ID */
	id?: string;
	/** Activity type */
	type: 'badge_issued' | 'collection_created' | 'institution_added' | 'skill_added' | 'badge_shared';
	/** Activity title/description */
	title: string;
	/** Activity description (optional) */
	description?: string;
	/** Activity timestamp */
	timestamp: string;
	/** Related entity ID */
	entity_id?: string;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
}

/**
 * Activity feed response from API
 */
export interface ApiActivityFeedResponse {
	/** Array of activity items */
	results: ApiActivityItem[];
	/** Total count of activities */
	count: number;
	/** Next page URL if available */
	next?: string | null;
	/** Previous page URL if available */
	previous?: string | null;
}
