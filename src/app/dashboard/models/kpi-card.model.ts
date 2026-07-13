/**
 * KPI Card Data Models
 *
 * Comprehensive TypeScript interfaces and mock data for the dashboard KPI card system.
 * Supports both standard and dual-variant cards with icons, values, growth indicators,
 * and internationalized content.
 */

/**
 * Icon configuration for KPI cards
 */
export interface KpiCardIcon {
	/** Lucide icon name (e.g., 'Building2', 'Award', 'Medal') */
	name: string;
	/** Icon size in pixels */
	size: number;
	/** Icon color in hex format - used as fill color when filled is true */
	color: string;
	/** Whether icon should be filled (default: false = outline only) */
	filled?: boolean;
	/** Border color in hex format - optional border around the icon */
	borderColor?: string;
}

/**
 * Value representation with raw and formatted display
 */
export interface KpiCardValue {
	/** Raw numeric value */
	raw: number;
	/** Formatted display string (e.g., '362', '19.876', '30 + 38') */
	display: string;
}

/**
 * Growth indicator with percentage and trend direction
 */
export interface KpiCardGrowth {
	/** Growth percentage (positive or negative) */
	percentage: number;
	/** Formatted label (e.g., '+12% diesen Monat', '+54 Personen') */
	label: string;
	/** Whether growth is positive (true) or negative (false) */
	isPositive: boolean;
}

/**
 * KPI card display variants
 */
export type KpiCardVariant = 'standard' | 'dual';

/**
 * Complete KPI card data structure
 *
 * Supports two variants:
 * - Standard: Single icon, value, and description
 * - Dual: Two icons, two values, and two descriptions side-by-side
 */
export interface KpiCardData {
	/** Unique identifier for the card */
	id: string;

	/** Display variant type */
	variant: KpiCardVariant;

	/** Primary icon configuration */
	icon: KpiCardIcon;

	/** Primary value */
	value: KpiCardValue;

	/** Primary description text */
	description: string;

	/** Optional growth indicator */
	growth?: KpiCardGrowth;

	/** Optional tooltip text shown via info icon */
	tooltip?: string;

	// Dual variant properties (only used when variant === 'dual')

	/** Secondary icon for dual variant */
	iconSecondary?: KpiCardIcon;

	/** Secondary value for dual variant */
	valueSecondary?: KpiCardValue;

	/** Secondary description for dual variant */
	descriptionSecondary?: string;
}
