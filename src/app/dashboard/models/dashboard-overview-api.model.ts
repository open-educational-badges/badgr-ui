/**
 * TypeScript types for Dashboard Overview API
 * Generated from dashboard-overview-openapi.yaml
 *
 * Base URL Pattern: /v1/dashboard/overview/*
 * All endpoints require Bearer JWT authentication
 */

// ==========================================
// KPIs Endpoint Types
// ==========================================

/**
 * Response from GET /v1/dashboard/overview/kpis
 */
export interface DashboardKPIsResponse {
	topKpis: KPIData[]; // Exactly 3 items
	secondaryKpis: KPIData[];
}

export interface KPIData {
	id: string;
	labelKey: string;
	value: number | string;
	unitKey?: string;
	trend?: 'up' | 'down' | 'stable';
	trendValue?: number;
	trendPeriod?: string;
	tooltipKey?: string;
	hasMonthlyDetails?: boolean;
	monthlyDetails?: MonthlyDetail[];
}

export interface MonthlyDetail {
	title?: string;
	value: string;
	date: string; // ISO 8601
	categoryKey?: string;
	details?: string;
	areaKey?: string;
	competencyKey?: string;
}

// ==========================================
// Competency Areas Endpoint Types
// ==========================================

/**
 * Response from GET /v1/dashboard/overview/competency-areas
 */
export interface CompetencyAreasResponse {
	metadata: {
		totalAreas: number;
		totalBadges: number;
		totalHours?: number;
		totalUsers?: number;
		lastUpdated: string;
	};
	data: CompetencyAreaSummary[];
}

export interface CompetencyAreaSummary {
	id: string;
	name: string; // Display name of the competency area
	value: number; // Prozent für Bubble-Größe
	weight: number; // Absoluter Wert
	userCount: number;
	institutionCount: number;
	color: string; // Hex-Farbe
}

/**
 * Response from GET /v1/dashboard/overview/competency-areas/{areaId}
 */
export interface CompetencyAreaDetails {
	id: string;
	name: string; // Display name of the competency area
	description?: string;
	statistics: {
		totalBadges: number;
		totalHours: number;
		totalUsers: number;
		totalInstitutions: number;
		percentage: number;
	};
	trend: {
		direction: 'up' | 'down' | 'stable';
		value: number;
		period: string;
	};
	topBadges: Array<{
		badgeId: string;
		badgeTitleKey: string;
		count: number;
		percentage: number;
	}>;
	topInstitutions: Array<{
		institutionId: string;
		institutionName: string;
		badgeCount: number;
		userCount: number;
	}>;
	genderDistribution?: {
		male: number;
		female: number;
		diverse: number;
		noAnswer: number;
	};
	regionalDistribution?: Array<{
		zipCode: string;
		regionName: string;
		percentage: number;
		count: number;
	}>;
	subCompetencies?: Array<{
		id: string;
		name: string;
		count: number;
		hours: number;
	}>;
}

// ==========================================
// Top Badges Endpoint Types
// ==========================================

/**
 * Response from GET /v1/dashboard/overview/top-badges
 */
export interface TopBadgesResponse {
	metadata: {
		totalBadges: number;
		lastUpdated: string;
		period: 'all_time' | 'last_year' | 'last_month' | 'last_week';
		zipCode?: string;
		regionName?: string;
	};
	badges: TopBadgeData[];
}

export interface TopBadgeData {
	rank: number; // 1, 2, 3
	badgeId: string;
	badgeTitleKey: string;
	badgeTitle: string;
	count: number;
	percentage: number;
	hours: number;
	categoryKey: 'badge.category.competency' | 'badge.category.participation' | 'badge.category.learningpath';
	competencies: Array<{
		id: string;
		name: string;
	}>;
	institutions?: Array<{
		id: string;
		name: string;
		awardCount: number;
	}>;
	recentActivity?: {
		lastAwardDate: string;
		awardsThisMonth: number;
		trend: 'up' | 'down' | 'stable';
		trendValue: number;
	};
	visualization?: {
		icon: string; // z.B. "lucideTrophy"
		color: string; // Hex-Farbe
	};
}

// ==========================================
// Query Parameters
// ==========================================

export interface OverviewKPIsParams {
	zipCode?: string;
	includeMonthlyDetails?: boolean;
}

export interface CompetencyAreasParams {
	zipCode?: string;
	limit?: number;
	sortBy?: 'percentage' | 'count' | 'hours' | 'userCount';
}

export interface CompetencyAreaDetailsParams {
	zipCode?: string;
	includeSubCompetencies?: boolean;
}

export interface TopBadgesParams {
	zipCode?: string;
	limit?: number;
	period?: 'all_time' | 'last_year' | 'last_month' | 'last_week';
}

// ==========================================
// Error Response Types
// ==========================================

export interface ApiErrorResponse {
	error: string;
	message: string;
	details?: any;
	requestId?: string;
}
