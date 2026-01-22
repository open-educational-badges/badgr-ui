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

/**
 * Mock KPI card data for dashboard
 *
 * Based on German requirements with 8 cards:
 * 1. Network institutions (standard)
 * 2. Badge types created (standard with growth)
 * 3. Total badges awarded (standard with growth)
 * 4. Participation vs Competency badges (dual variant)
 * 5. Hours of competencies strengthened (standard with growth)
 * 6. Learners with badges (standard with growth)
 * 7. Average badges per month (standard with growth)
 * 8. Learners with network paths (standard with growth)
 */
export const MOCK_KPI_CARDS: KpiCardData[] = [
	{
		id: 'kpi-1',
		variant: 'standard',
		icon: {
			name: 'Building2',
			size: 80,
			color: '#492E98',
		},
		value: {
			raw: 362,
			display: '362',
		},
		description: 'Institutionen im Netzwerk',
	},
	{
		id: 'kpi-2',
		variant: 'standard',
		icon: {
			name: 'Award',
			size: 80,
			color: '#492E98',
		},
		value: {
			raw: 350,
			display: '350',
		},
		description: 'verschiedene Badges erstellt',
		growth: {
			percentage: 12,
			label: '+12% diesen Monat',
			isPositive: true,
		},
	},
	{
		id: 'kpi-3',
		variant: 'standard',
		icon: {
			name: 'Medal',
			size: 80,
			color: '#492E98',
		},
		value: {
			raw: 3467,
			display: '3.467',
		},
		description: 'Badges insgesamt vergeben',
		growth: {
			percentage: 12,
			label: '+12% diesen Monat',
			isPositive: true,
		},
	},
	{
		id: 'kpi-4',
		variant: 'dual',
		icon: {
			name: 'Hexagon',
			size: 28,
			color: '#E4FFE4',
			filled: true,
			borderColor: '#492E98',
		},
		value: {
			raw: 30,
			display: '30',
		},
		description: 'TEILNAHME-Badges',
		iconSecondary: {
			name: 'Octagon',
			size: 28,
			color: '#F1F0FF',
			filled: true,
			borderColor: '#492E98',
		},
		valueSecondary: {
			raw: 38,
			display: '38',
		},
		descriptionSecondary: 'KOMPETENZ-Badges',
	},
	{
		id: 'kpi-5',
		variant: 'standard',
		icon: {
			name: 'Clock',
			size: 80,
			color: '#492E98',
		},
		value: {
			raw: 19876,
			display: '19.876',
		},
		description: 'Stunden Kompetenzen gestärkt',
		growth: {
			percentage: 15,
			label: '+15% diesen Monat',
			isPositive: true,
		},
	},
	{
		id: 'kpi-6',
		variant: 'standard',
		icon: {
			name: 'Users',
			size: 80,
			color: '#492E98',
		},
		value: {
			raw: 2175,
			display: '2.175',
		},
		description: 'Lernende Personen mit Badges',
		growth: {
			percentage: 2.48,
			label: '+54 Personen',
			isPositive: true,
		},
	},
	{
		id: 'kpi-7',
		variant: 'standard',
		icon: {
			name: 'TrendingUp',
			size: 80,
			color: '#492E98',
		},
		value: {
			raw: 54,
			display: '54',
		},
		description: 'Badges durchschnittlich pro Monat',
		growth: {
			percentage: 15,
			label: '+15% diesen Monat',
			isPositive: true,
		},
	},
	{
		id: 'kpi-8',
		variant: 'standard',
		icon: {
			name: 'MapPin',
			size: 80,
			color: '#492E98',
		},
		value: {
			raw: 24,
			display: '24',
		},
		description: 'Lernende mit Netzwerkpfaden',
		growth: {
			percentage: 41.67,
			label: '+10 Personen',
			isPositive: true,
		},
	},
];

/**
 * Helper function to get a KPI card by ID
 */
export function getKpiCardById(id: string): KpiCardData | undefined {
	return MOCK_KPI_CARDS.find((card) => card.id === id);
}

/**
 * Helper function to get all standard variant cards
 */
export function getStandardKpiCards(): KpiCardData[] {
	return MOCK_KPI_CARDS.filter((card) => card.variant === 'standard');
}

/**
 * Helper function to get all dual variant cards
 */
export function getDualKpiCards(): KpiCardData[] {
	return MOCK_KPI_CARDS.filter((card) => card.variant === 'dual');
}

/**
 * Helper function to get cards with growth indicators
 */
export function getKpiCardsWithGrowth(): KpiCardData[] {
	return MOCK_KPI_CARDS.filter((card) => card.growth !== undefined);
}
