/**
 * TypeScript types for Network Dashboard API
 * Based on dashboard-overview-openapi.yaml Network-specific endpoints
 *
 * Base URL Pattern: /v1/issuer/networks/{networkSlug}/dashboard/*
 * All endpoints require Bearer JWT authentication
 */

// ==========================================
// Network KPIs Endpoint Types
// ==========================================

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/kpis
 */
export interface NetworkKPIsResponse {
	kpis: NetworkKPIData[];
}

/**
 * KPI IDs supported by the backend
 */
export type NetworkKPIId =
	| 'institutions_count'
	| 'badges_created'
	| 'badges_awarded'
	| 'participation_badges'
	| 'competency_badges'
	| 'competency_hours'
	| 'learners_count'
	| 'badges_per_month'
	| 'learners_with_paths';

/**
 * Minimal KPI data from backend
 * Frontend maps id to display text via KPI_DISPLAY_CONFIG
 */
export interface NetworkKPIData {
	id: NetworkKPIId;
	value: number;
	trend?: 'up' | 'down' | 'stable';
	trendValue?: number;
	trendPeriod?: string;
	hasMonthlyDetails?: boolean;
}

// ==========================================
// Network Competency Areas Endpoint Types
// ==========================================

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/competency-areas
 */
export interface NetworkCompetencyAreasResponse {
	metadata?: {
		totalAreas: number;
		lastUpdated: string;
	};
	data: NetworkCompetencyAreaData[];
}

export interface NetworkCompetencyAreaData {
	id: string;
	name: string;       // Display name of the competency area
	value: number;      // Percentage for visualization
	weight: number;     // Absolute count
	escoUri?: string;   // Optional ESCO URI for the competency
	// Note: color is assigned by frontend based on area ID
}

// ==========================================
// Network Top Badges Endpoint Types
// ==========================================

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/top-badges
 */
export interface NetworkTopBadgesResponse {
	metadata?: {
		totalBadges: number;
		lastUpdated: string;
	};
	badges: NetworkTopBadgeData[];
}

export interface NetworkTopBadgeData {
	rank: number;       // 1, 2, 3
	badgeId: string;
	badgeTitle: string;
	image: string;      // URL to badge image
	count: number;
	// Note: icon and color are assigned by frontend based on rank
}

// ==========================================
// Network Recent Activity Endpoint Types
// ==========================================

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/recent-activity
 */
export interface NetworkRecentActivityResponse {
	metadata?: {
		totalActivities: number;
		lastUpdated: string;
	};
	activities: NetworkRecentActivityData[];
}

/**
 * Einzelkompetenz (ESCO skill) with URI
 */
export interface NetworkEscoSkill {
	name: string;
	escoUri: string;
}

export interface NetworkRecentActivityData {
	date: string;           // ISO date string (e.g., "2024-11-06")
	badgeId: string;
	badgeTitle: string;
	badgeImage: string;     // URL to badge image
	issuerId: string;       // Issuer slug for linking to institution page
	issuerName: string;     // Display name of the institution/issuer
	recipientCount: number;
	skills?: NetworkEscoSkill[];  // Einzelkompetenzen with ESCO links (optional)
}

// ==========================================
// Competency Area Display Configuration
// ==========================================

/**
 * Configuration for displaying a competency area in the UI
 */
export interface CompetencyAreaDisplayConfig {
	color: string;
	icon: string;
}

/**
 * Mapping from competency area ID to display configuration
 * Frontend assigns colors and icons based on area ID
 */
export const COMPETENCY_AREA_DISPLAY_CONFIG: Record<string, CompetencyAreaDisplayConfig> = {
	it_digital: {
		color: '#492E98',
		icon: 'Monitor'
	},
	social_competencies: {
		color: '#492E98',
		icon: 'Users'
	},
	languages: {
		color: '#492E98',
		icon: 'Globe'
	},
	crafts: {
		color: '#492E98',
		icon: 'Wrench'
	},
	management: {
		color: '#492E98',
		icon: 'BarChart3'
	},
	other: {
		color: '#492E98',
		icon: 'Star'
	}
};

/**
 * Get display config for a competency area
 */
export function getCompetencyAreaDisplayConfig(id: string): CompetencyAreaDisplayConfig {
	return COMPETENCY_AREA_DISPLAY_CONFIG[id] || { color: '#492E98', icon: 'Star' };
}

// ==========================================
// Badge Rank Display Configuration
// ==========================================

/**
 * Configuration for displaying a badge rank in the UI
 */
export interface BadgeRankDisplayConfig {
	icon: string;
	color: string;
}

/**
 * Mapping from rank to display configuration
 * Frontend assigns icons and colors based on rank position
 */
export const BADGE_RANK_DISPLAY_CONFIG: Record<number, BadgeRankDisplayConfig> = {
	1: { icon: 'lucideTrophy', color: '#FFCC00' },
	2: { icon: 'lucideMedal', color: '#492E98' },
	3: { icon: 'lucideAward', color: '#492E98' }
};

/**
 * Get display config for a badge rank
 */
export function getBadgeRankDisplayConfig(rank: number): BadgeRankDisplayConfig {
	return BADGE_RANK_DISPLAY_CONFIG[rank] || { icon: 'lucideBadge', color: '#492E98' };
}

// ==========================================
// KPI Display Configuration
// ==========================================

/**
 * Configuration for displaying a KPI in the UI
 */
export interface KPIDisplayConfig {
	/** i18n key for the description text */
	descriptionKey: string;
	/** i18n key for the tooltip text (shown via info icon) */
	tooltipKey?: string;
	/** i18n key for the unit (e.g., 'Personen', 'Badges') */
	unitKey?: string;
	/** Lucide icon name */
	icon: string;
	/** Icon size in pixels */
	iconSize: number;
	/** Icon color (hex) - used as fill color when iconFilled is true */
	iconColor: string;
	/** Whether icon should be filled (default: false = outline only) */
	iconFilled?: boolean;
	/** Icon border color (hex) - optional border around the icon */
	iconBorderColor?: string;
	/** Card variant: standard or dual */
	variant: 'standard' | 'dual';
	/** For dual variant: ID of the paired KPI */
	pairedWith?: NetworkKPIId;
	/** Order in which KPIs should be displayed */
	order: number;
}

/**
 * Mapping from KPI ID to display configuration
 * All text is handled via i18n translation keys
 */
export const KPI_DISPLAY_CONFIG: Record<NetworkKPIId, KPIDisplayConfig> = {
	institutions_count: {
		descriptionKey: 'Network.Dashboard.kpi.institutionsCount',
		icon: 'School',
		iconSize: 80,
		iconColor: '#492E98',
		variant: 'standard',
		order: 1
	},
	badges_created: {
		descriptionKey: 'Network.Dashboard.kpi.badgesCreated',
		unitKey: 'Network.Dashboard.unit.badges',
		icon: 'CircleStar',
		iconSize: 80,
		iconColor: '#492E98',
		variant: 'standard',
		order: 2
	},
	badges_awarded: {
		descriptionKey: 'Network.Dashboard.kpi.badgesAwarded',
		unitKey: 'Network.Dashboard.unit.badges',
		icon: 'Award',
		iconSize: 80,
		iconColor: '#492E98',
		variant: 'standard',
		order: 3
	},
	participation_badges: {
		descriptionKey: 'Network.Dashboard.kpi.participationBadges',
		unitKey: 'Network.Dashboard.unit.badges',
		icon: 'Hexagon',
		iconSize: 28,
		iconColor: '#E4FFE4',
		iconFilled: true,
		iconBorderColor: '#492E98',
		variant: 'dual',
		pairedWith: 'competency_badges',
		order: 4
	},
	competency_badges: {
		descriptionKey: 'Network.Dashboard.kpi.competencyBadges',
		unitKey: 'Network.Dashboard.unit.badges',
		icon: 'Octagon',
		iconSize: 28,
		iconColor: '#F1F0FF',
		iconFilled: true,
		iconBorderColor: '#492E98',
		variant: 'dual',
		pairedWith: 'participation_badges',
		order: 4
	},
	competency_hours: {
		descriptionKey: 'Network.Dashboard.kpi.competencyHours',
		tooltipKey: 'Dashboard.Competencies.totalHoursTooltip',
		unitKey: 'Network.Dashboard.unit.hours',
		icon: 'Clock',
		iconSize: 80,
		iconColor: '#492E98',
		variant: 'standard',
		order: 5
	},
	learners_count: {
		descriptionKey: 'Network.Dashboard.kpi.learnersCount',
		unitKey: 'Network.Dashboard.unit.persons',
		icon: 'UserStar',
		iconSize: 80,
		iconColor: '#492E98',
		variant: 'standard',
		order: 6
	},
	badges_per_month: {
		descriptionKey: 'Network.Dashboard.kpi.badgesPerMonth',
		unitKey: 'Network.Dashboard.unit.badges',
		icon: 'CircleSlash2',
		iconSize: 80,
		iconColor: '#492E98',
		variant: 'standard',
		order: 7
	},
	learners_with_paths: {
		descriptionKey: 'Network.Dashboard.kpi.learnersWithPaths',
		unitKey: 'Network.Dashboard.unit.persons',
		icon: 'Route',
		iconSize: 80,
		iconColor: '#492E98',
		variant: 'standard',
		order: 8
	}
};

/**
 * Helper function to get display config for a KPI
 */
export function getKPIDisplayConfig(id: NetworkKPIId): KPIDisplayConfig | undefined {
	return KPI_DISPLAY_CONFIG[id];
}

/**
 * Helper function to format number with German locale
 */
export function formatKPIValue(value: number): string {
	return value.toLocaleString('de-DE');
}

/**
 * Helper function to format trend label
 */
export function formatTrendLabel(
	trend: 'up' | 'down' | 'stable' | undefined,
	trendValue: number | undefined,
	unitKey: string | undefined
): string {
	if (!trend || trendValue === undefined) return '';

	const sign = trend === 'up' ? '+' : trend === 'down' ? '-' : '';
	const absValue = Math.abs(trendValue);

	// For percentage trends
	if (absValue <= 100 && !unitKey?.includes('persons')) {
		return `${sign}${absValue}% diesen Monat`;
	}

	// For absolute value trends
	return `${sign}${absValue}`;
}

// ==========================================
// Network Strengthened Competencies Endpoint Types
// ==========================================

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/strengthened-competencies
 */
export interface NetworkStrengthenedCompetenciesResponse {
	metadata?: {
		totalCompetencies: number;
		totalHours: number;
		lastUpdated: string;
	};
	competencies: NetworkStrengthenedCompetencyData[];
}

export interface NetworkStrengthenedCompetencyData {
	competencyId: string;
	title: string;
	titleKey?: string;
	hours: number;
	escoUri?: string;
}

// ==========================================
// Network Competency Detail Endpoint Types
// ==========================================

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/strengthened-competencies/{competencyId}
 * Returns detailed information about a specific competency including statistics and institutions list.
 */
export interface NetworkCompetencyDetailResponse {
	competencyId: string;
	title: string;
	titleKey?: string;
	hours: number;
	escoUri?: string;
	badgeCount: number;
	userCount: number;
	institutionCount: number;
	institutions: NetworkCompetencyInstitution[];
}

/**
 * Institution data for a specific competency
 */
export interface NetworkCompetencyInstitution {
	institutionId: string;
	name: string;
	slug?: string;
	badgeCount: number;
	userCount: number;
	competencyHours?: number;
	lastActivity?: string;
	logoUrl?: string;
}

/**
 * Parameters for competency detail request
 */
export interface NetworkCompetencyDetailParams {
	institutionLimit?: number;
	deliveryMethod?: DeliveryMethodType;
}

// ==========================================
// Network Badge Awards Timeline Endpoint Types
// ==========================================

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/badge-awards-timeline
 */
export interface NetworkBadgeAwardsTimelineResponse {
	metadata?: {
		totalAwards: number;
		year: number | null;
		groupBy: 'day' | 'week' | 'month';
		lastUpdated: string;
	};
	timeline: NetworkBadgeAwardTimelineEntry[];
}

export interface NetworkBadgeAwardTimelineEntry {
	date: string;      // ISO date string (e.g., "2024-01-01")
	count: number;
	byType?: {
		participation: number;
		competency: number;
		learningpath: number;
	};
}

/**
 * Query parameters for badge awards timeline endpoint
 */
export interface NetworkBadgeAwardsTimelineParams {
	year?: number;
	startDate?: string;
	endDate?: string;
	groupBy?: 'day' | 'week' | 'month';
	badgeType?: 'all' | 'participation' | 'competency' | 'learningpath';
}

// ==========================================
// Network Badge Type Distribution Endpoint Types
// ==========================================

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/badge-type-distribution
 */
export interface NetworkBadgeTypeDistributionResponse {
	metadata?: {
		totalBadges: number;
		year: number | null;
		lastUpdated: string;
	};
	distribution: NetworkBadgeTypeDistributionEntry[];
}

export interface NetworkBadgeTypeDistributionEntry {
	type: 'participation' | 'competency' | 'learningpath';
	typeKey?: string;
	count: number;
	percentage: number;
}

// ==========================================
// Badge Type Display Configuration
// ==========================================

/**
 * Configuration for displaying badge types in the UI
 */
export interface BadgeTypeDisplayConfig {
	label: string;
	color: string;
	borderColor: string;
}

/**
 * Mapping from badge type to display configuration
 * Colors match the original design: pastel fills with darker borders
 */
export const BADGE_TYPE_DISPLAY_CONFIG: Record<string, BadgeTypeDisplayConfig> = {
	participation: {
		label: 'Teilnahme-Badges',
		color: '#E4FFE4',
		borderColor: '#93F993'
	},
	competency: {
		label: 'Kompetenz-Badges',
		color: '#F1F0FF',
		borderColor: '#CCD7FF'
	},
	learningpath: {
		label: 'Micro Degrees',
		color: '#FFEAEA',
		borderColor: '#FFBAB9'
	}
};

/**
 * Get display config for a badge type
 */
export function getBadgeTypeDisplayConfig(type: string): BadgeTypeDisplayConfig {
	return BADGE_TYPE_DISPLAY_CONFIG[type] || {
		label: type,
		color: '#F1F0FF',
		borderColor: '#CCD7FF'
	};
}

/**
 * Extended badge type stats interface for pie chart visualization
 * Used across multiple dashboard components
 */
export interface BadgeTypeStatsExtended {
	type: 'participation' | 'competency' | 'learningpath';
	label: string;
	count: number;
	percentage: number;
	color: string;
	borderColor: string;
}

// ==========================================
// Network Delivery Method Distribution Endpoint Types
// ==========================================

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/delivery-method-distribution
 */
export interface NetworkDeliveryMethodDistributionResponse {
	metadata?: {
		totalBadges: number;
		year: number | null;
		lastUpdated: string;
	};
	total: number;
	online: {
		value: number;
		percentage: number;
	};
	inPerson: {
		value: number;
		percentage: number;
	};
}

// ==========================================
// Network Recent Badge Awards Endpoint Types
// ==========================================

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/recent-badge-awards
 */
export interface NetworkRecentBadgeAwardsResponse {
	metadata?: {
		totalAwards: number;
		periodStart: string;
		periodEnd: string;
		lastUpdated: string;
	};
	awards: NetworkRecentBadgeAwardEntry[];
}

/**
 * A badge award entry with competency details
 */
export interface NetworkRecentBadgeAwardEntry {
	date: string;
	badgeId: string;
	badgeName: string;
	badgeImage?: string;
	badgeType?: 'participation' | 'competency' | 'learningpath';
	issuerId?: string;
	count: number;
	competencies?: BadgeCompetencyWithEsco[];
}

/**
 * A competency associated with a badge, including ESCO framework reference
 */
export interface BadgeCompetencyWithEsco {
	name: string;
	escoUri?: string;
}

/**
 * Query parameters for recent badge awards endpoint
 */
export interface NetworkRecentBadgeAwardsParams {
	limit?: number;
	days?: number;
	sortBy?: 'date' | 'count' | 'badgeName';
	sortOrder?: 'asc' | 'desc';
}

// ==========================================
// Delivery Method Type (shared across endpoints)
// ==========================================

/**
 * Delivery method types for filtering endpoints
 */
export type DeliveryMethodType = 'online' | 'in-person';

// ==========================================
// Network Badge Locations Endpoint Types
// ==========================================

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/badge-locations
 */
export interface NetworkBadgeLocationsResponse {
	metadata?: {
		totalLocations: number;
		totalBadges: number;
		deliveryMethod?: DeliveryMethodType;
		lastUpdated: string;
	};
	locations: BadgeLocation[];
}

/**
 * Badge distribution for a geographic location (city)
 * Data is aggregated by city name, so a city with multiple ZIP codes
 * will have all badges combined in a single entry.
 */
export interface BadgeLocation {
	city: string;
	badgeCount: number;
	badgePercentage: number;
}

// ==========================================
// LERNENDE (LEARNERS) ENDPOINT TYPES
// ==========================================

/**
 * KPI data for learners endpoint with trend information
 * Matches the structure of NetworkKPIData for consistency
 */
export interface LearnerKPIData {
	value: number;
	trend?: 'up' | 'down' | 'stable';
	trendValue?: number;
	trendPeriod?: string;
}

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/learners
 * Aggregated learners overview for the Lernende tab
 */
export interface NetworkLearnersOverviewResponse {
	metadata?: {
		lastUpdated: string;
	};
	kpis: {
		totalLearners: LearnerKPIData;
		totalCompetencyHours: LearnerKPIData;
	};
	residenceDistribution: LearnerResidenceStatistic[];
	genderDistribution: LearnerGenderStatistic[];
}

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/learners/residence
 */
export interface NetworkLearnersResidenceResponse {
	metadata?: {
		totalLearners: number;
		totalCities: number;
		lastUpdated: string;
	};
	statistics: LearnerResidenceStatistic[];
}

/**
 * Learner residence statistic entry
 * Note: Use city="other" to identify the aggregation category
 * Data is aggregated by city, so a city with multiple ZIP codes
 * will have all learners combined in a single entry.
 */
export interface LearnerResidenceStatistic {
	city: string;
	learnerCount: number;
	percentage: number;
}

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/learners/residence/{city}
 */
export interface NetworkLearnersResidenceDetailResponse {
	metadata: {
		city: string;
		zipCodes?: string[];
		totalLearners: number;
		lastUpdated?: string;
	};
	topCompetencyAreas: NetworkCompetencyAreaData[];
	topStrengthenedCompetencies: ResidenceStrengthenedCompetency[];
}

/**
 * Strengthened competency entry for residence detail
 */
export interface ResidenceStrengthenedCompetency {
	competencyId: string;
	competencyKey?: string;
	title: string;
	areaKey?: string;
	count: number;
	hours: number;
	badges?: number;
	trend?: 'up' | 'down' | 'stable';
	trendValue?: number;
	escoUri?: string;
}

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/learners/gender
 */
export interface NetworkLearnersGenderResponse {
	metadata?: {
		totalLearners: number;
		lastUpdated: string;
	};
	distribution: LearnerGenderStatistic[];
}

/**
 * Learner gender statistic entry
 * Note: Use i18n in the UI for gender labels
 */
export interface LearnerGenderStatistic {
	gender: 'male' | 'female' | 'diverse' | 'noAnswer';
	count: number;
	percentage: number;
}

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/learners/gender/{gender}
 */
export interface NetworkLearnersGenderDetailResponse {
	metadata: {
		gender: 'male' | 'female' | 'diverse' | 'noAnswer';
		totalLearners: number;
		totalBadges: number;
		lastUpdated?: string;
	};
	topCompetencyAreas: NetworkCompetencyAreaData[];
	topStrengthenedCompetencies: GenderIndividualCompetency[];
	topBadges: GenderTopBadge[];
}

/**
 * Individual competency entry for gender detail
 */
export interface GenderIndividualCompetency {
	competencyId: string;
	name: string;
	count: number;
	hours: number;
	escoUri?: string;
}

/**
 * Top badge entry for gender detail
 */
export interface GenderTopBadge {
	badgeId: string;
	name: string;
	count: number;
	hours?: number;
	image?: string;
}

/**
 * Gender type for API parameter
 */
export type GenderType = 'male' | 'female' | 'diverse' | 'noAnswer' | 'Männlich' | 'Weiblich' | 'Divers' | 'Keine Angabe';

/**
 * Map localized gender labels to API gender types
 */
export function mapGenderLabelToType(label: string): 'male' | 'female' | 'diverse' | 'noAnswer' {
	const mapping: Record<string, 'male' | 'female' | 'diverse' | 'noAnswer'> = {
		'male': 'male',
		'female': 'female',
		'diverse': 'diverse',
		'noAnswer': 'noAnswer',
		'Männlich': 'male',
		'Weiblich': 'female',
		'Divers': 'diverse',
		'Keine Angabe': 'noAnswer'
	};
	return mapping[label] || 'male';
}

/**
 * Map API gender types to localized labels
 */
export function mapGenderTypeToLabel(type: string): string {
	const mapping: Record<string, string> = {
		'male': 'Männlich',
		'female': 'Weiblich',
		'diverse': 'Divers',
		'noAnswer': 'Keine Angabe'
	};
	return mapping[type] || type;
}

// ==========================================
// COMPETENCY AREAS SKILLS ENDPOINT TYPES
// (for Skill Visualisation Component)
// ==========================================

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/competency-areas/skills
 *
 * Returns ESCO-compatible skill data for the recipient-skill-visualisation component.
 * This endpoint supports multiple dashboard views with optional filters:
 * - Dashboard Overview: No filters - shows all competency areas for the network
 * - Residence Detail: Filter by city - shows competency areas for learners from a specific city
 * - Gender Detail: Filter by gender - shows competency areas for a specific gender
 */
export interface CompetencyAreasSkillsResponse {
	metadata?: CompetencyAreasSkillsMetadata;
	skills: ESCORootSkill[];
}

/**
 * Metadata about the competency areas skills response
 */
export interface CompetencyAreasSkillsMetadata {
	totalSkills: number;
	totalStudyLoad: number;
	lastUpdated?: string;
	filter?: {
		city?: string | null;
		gender?: GenderType | null;
	};
}

/**
 * ESCO-compatible root skill with study load and breadcrumb paths.
 * Matches the ApiRootSkill interface from ai-skills.model.ts.
 *
 * Note: This interface is compatible with ApiRootSkill but defined separately
 * to allow for dashboard-specific fields in the future.
 */
export interface ESCORootSkill {
	concept_uri: string;
	preferred_label: string;
	description: string;
	type: string;
	alt_labels: string[];
	reuse_level: string | null;
	studyLoad: number;
	breadcrumb_paths: ESCOSkill[][];
}

/**
 * ESCO skill object matching the ApiSkill interface.
 * Used in breadcrumb paths and as base for ESCORootSkill.
 */
export interface ESCOSkill {
	concept_uri: string;
	preferred_label: string;
	description: string;
	type: string;
	alt_labels: string[];
	reuse_level?: string | null;
	studyLoad?: number;
}

/**
 * Query parameters for competency areas skills endpoint
 */
export interface CompetencyAreasSkillsParams {
	/** Filter by learner residence city */
	city?: string;
	/** Filter by learner gender */
	gender?: GenderType;
	/** Maximum number of top-level competency areas to return (default: 5) */
	limit?: number;
	/** Filter by badge delivery method */
	deliveryMethod?: DeliveryMethodType;
}

// ==========================================
// SOZIALRAUM (SOCIAL SPACE) ENDPOINT TYPES
// ==========================================

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/socialspace/institutions
 */
export interface SocialspaceInstitutionsResponse {
	institutions: SocialspaceInstitution[];
	summary: {
		total: number;
		newThisMonth: number;
		byType?: Record<string, number>;
	};
}

/**
 * Institution data for Sozialraum
 */
export interface SocialspaceInstitution {
	id: number;
	name: string;
	type: string;
	image?: string | null;
	city: string;
	badgesIssued: number;
	activeUsers?: number;
	joinedDate?: string;
	issuerId?: string;
}

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/socialspace/cities
 */
export interface SocialspaceCitiesResponse {
	cities: SocialspaceCityEntry[];
}

/**
 * City entry for Sozialraum city selection
 */
export interface SocialspaceCityEntry {
	city: string;
	badges: number;
}

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/socialspace/city-detail
 */
export interface SocialspaceCityDetailResponse {
	city: string;
	learnerCount: number;
	totalBadges: number;
	institutions: number;
	badgesByType: {
		participation: number;
		competency: number;
		learningpath: number;
		microdegree: number;
	};
	topInstitutions: SocialspaceTopInstitution[];
}

/**
 * Top institution for podium display
 */
export interface SocialspaceTopInstitution {
	name: string;
	badgeCount: number;
	image?: string | null;
	issuerId?: string;
}

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/socialspace/learners
 */
export interface SocialspaceLearnersResponse {
	city: string;
	learnerCount: number;
	genderDistribution: SocialspaceGenderEntry[];
	residenceDistribution: SocialspaceResidenceEntry[];
}

/**
 * Gender distribution entry for Sozialraum
 */
export interface SocialspaceGenderEntry {
	gender: 'male' | 'female' | 'diverse';
	count: number;
	percentage: number;
}

/**
 * Residence distribution entry for Sozialraum
 */
export interface SocialspaceResidenceEntry {
	district: string;
	learnerCount: number;
	percentage: number;
	isOtherCategory?: boolean;
}

/**
 * Response from GET /v1/issuer/networks/{networkSlug}/dashboard/socialspace/competencies
 */
export interface SocialspaceCompetenciesResponse {
	city: string;
	totalCompetencyHours: number;
	competencies: SocialspaceCompetencyEntry[];
}

/**
 * Competency entry for Sozialraum
 */
export interface SocialspaceCompetencyEntry {
	competencyKey?: string;
	name?: string;
	hours: number;
	escoUri?: string;
}

// ==========================================
// COMPETENCY AREA DETAIL ENDPOINT TYPES (POST)
// ==========================================

/**
 * Request body for POST /v1/issuer/networks/{networkSlug}/dashboard/competency-area-detail
 *
 * Since the database only stores individual competencies (not competency areas/categories),
 * the frontend sends the list of ESCO URIs that belong to the clicked competency area.
 * The backend then aggregates statistics for all those competencies.
 */
export interface CompetencyAreaDetailRequest {
	/** Display name of the competency area (Kompetenzbereich) */
	areaName: string;
	/** ESCO concept URI of the competency area (if available) */
	areaConceptUri?: string;
	/** List of ESCO URIs for all individual competencies belonging to this area */
	competencyUris: string[];
	/** Maximum number of top competencies to return (default: 10) */
	topCompetenciesLimit?: number;
	/** Maximum number of institutions to return (default: 10) */
	institutionLimit?: number;
}

/**
 * Response from POST /v1/issuer/networks/{networkSlug}/dashboard/competency-area-detail
 *
 * Aggregated statistics for a competency area based on the provided ESCO URIs.
 */
export interface CompetencyAreaDetailResponse {
	/** Display name of the competency area */
	areaName: string;
	/** ESCO concept URI of the competency area (echoed from request) */
	areaConceptUri?: string;
	/** Total competency hours invested across all competencies in this area */
	totalHours: number;
	/** Total number of competency URIs provided in the request */
	totalCompetencies: number;
	/** Number of competencies that were found in the database */
	matchedCompetencies: number;
	/** Total distinct badges covering any competency in this area */
	badgeCount: number;
	/** Total distinct learners who strengthened any competency in this area */
	userCount: number;
	/** Total distinct institutions offering badges in this area */
	institutionCount: number;
	/** Top individual competencies within this area (sorted by hours) */
	topCompetencies: CompetencyAreaTopCompetency[];
	/** Institutions offering badges in this area (sorted by badge count) */
	institutions: NetworkCompetencyInstitution[];
}

/**
 * Individual competency data within a competency area detail response
 */
export interface CompetencyAreaTopCompetency {
	competencyId: string;
	title: string;
	titleKey?: string;
	escoUri?: string;
	hours: number;
	badgeCount: number;
	userCount: number;
}
