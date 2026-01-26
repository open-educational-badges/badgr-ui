import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Interface for pie chart segment data
 */
export interface PieChartSegment {
	/** Unique identifier for the segment */
	id: string;
	/** Display label for the segment */
	label: string;
	/** Count/value for this segment */
	count: number;
	/** Percentage of total (0-100) */
	percentage: number;
	/** Fill color for the segment */
	color: string;
	/** Border color for the segment */
	borderColor: string;
	/** Optional: data to pass back on click */
	data?: any;
}

/**
 * Reusable Badge Distribution Pie Chart Component
 *
 * A configurable donut/pie chart for displaying badge distribution data.
 * Supports up to 3 segments with consistent OEB styling.
 *
 * @example
 * ```html
 * <app-badge-distribution-pie-chart
 *   [segments]="badgeTypeStats"
 *   [total]="totalBadges"
 *   totalLabel="Badge Classes"
 *   labelPosition="left"
 *   [labelsClickable]="false">
 * </app-badge-distribution-pie-chart>
 * ```
 */
@Component({
	selector: 'app-badge-distribution-pie-chart',
	standalone: true,
	imports: [CommonModule, TranslatePipe],
	templateUrl: './badge-distribution-pie-chart.component.html',
	styleUrls: ['./badge-distribution-pie-chart.component.scss'],
})
export class BadgeDistributionPieChartComponent {
	// ==========================================
	// Inputs
	// ==========================================

	/**
	 * Pie chart segments (max 3 supported)
	 * Each segment requires: id, label, count, percentage, color, borderColor
	 */
	@Input() segments: PieChartSegment[] = [];

	/**
	 * Total value to display in center of donut
	 */
	@Input() total: number = 0;

	/**
	 * Label for the total value (displayed below the number)
	 * Can be a translation key or plain text
	 */
	@Input() totalLabel: string = 'Dashboard.total';

	/**
	 * Whether to translate the totalLabel
	 */
	@Input() translateTotalLabel: boolean = true;

	/**
	 * Position of the legend/labels
	 * - 'left': Labels appear to the left of the chart
	 * - 'bottom': Labels appear below the chart
	 */
	@Input() labelPosition: 'left' | 'bottom' = 'left';

	/**
	 * Whether labels are clickable (shows arrow and hover effect)
	 */
	@Input() labelsClickable: boolean = false;

	/**
	 * Size variant of the chart
	 * - 'small': 220px chart (for compact layouts)
	 * - 'medium': 280px chart (default)
	 * - 'large': 320px chart (for full-width layouts)
	 */
	@Input() size: 'small' | 'medium' | 'large' = 'medium';

	// ==========================================
	// Outputs
	// ==========================================

	/**
	 * Emitted when a clickable label is clicked
	 * Returns the full segment data
	 */
	@Output() labelClick = new EventEmitter<PieChartSegment>();

	// ==========================================
	// Internal Configuration
	// ==========================================

	/** Gap between segments in pixels */
	private readonly SEGMENT_GAP = 4;

	// ==========================================
	// Computed Properties
	// ==========================================

	/**
	 * Get chart dimensions based on size input
	 */
	get chartDimensions(): { container: number; center: number } {
		switch (this.size) {
			case 'small':
				return { container: 220, center: 130 };
			case 'large':
				return { container: 320, center: 198 };
			case 'medium':
			default:
				return { container: 280, center: 170 };
		}
	}

	/**
	 * All segments for legend display (including 0 count, limited to 3)
	 */
	get allSegments(): PieChartSegment[] {
		return this.segments.slice(0, 3);
	}

	/**
	 * Filter segments to only show those with count > 0 for the pie chart
	 */
	get activeSegments(): PieChartSegment[] {
		return this.segments.filter((s) => s.count > 0).slice(0, 3);
	}

	/**
	 * Check if there is any data to display (at least one segment with count > 0)
	 */
	get hasData(): boolean {
		return this.segments.some((s) => s.count > 0);
	}

	// ==========================================
	// SVG Calculation Methods
	// ==========================================

	/**
	 * Calculate stroke-dasharray with gap between segments
	 * @param percentage - Percentage of the segment (0-100)
	 * @param radius - Radius of the circle (default: 128.5)
	 */
	getStrokeDasharrayWithGap(percentage: number, radius: number = 128.5): string {
		const circumference = 2 * Math.PI * radius;
		const segmentLength = (percentage / 100) * circumference;
		const gapLength = this.SEGMENT_GAP;
		const adjustedLength = Math.max(0, segmentLength - gapLength);
		return `${adjustedLength} ${circumference}`;
	}

	/**
	 * Calculate stroke-dashoffset with gap adjustment
	 * @param index - Index of the segment
	 * @param radius - Radius of the circle (default: 128.5)
	 */
	getStrokeDashoffsetWithGap(index: number, radius: number = 128.5): number {
		const circumference = 2 * Math.PI * radius;
		let offset = 0;
		for (let i = 0; i < index; i++) {
			offset += (this.allSegments[i].percentage / 100) * circumference;
		}
		return -(offset + this.SEGMENT_GAP / 2);
	}

	/**
	 * Calculate coordinates for radial lines at segment boundaries
	 * @param index - Index of the segment
	 * @param radius - Radius for the point
	 * @param coord - 'x' or 'y' coordinate
	 * @param isEnd - Whether this is the end of the segment (vs start)
	 */
	getRadialLineCoord(index: number, radius: number, coord: 'x' | 'y', isEnd: boolean = false): number {
		const centerX = 153.5;
		const centerY = 153.5;

		let anglePercent = 0;
		for (let i = 0; i < index; i++) {
			anglePercent += this.allSegments[i].percentage;
		}
		if (isEnd) {
			anglePercent += this.allSegments[index].percentage;
		}

		// Adjust for gap
		const gapAngle = (this.SEGMENT_GAP / (2 * Math.PI * 128.5)) * 360;
		if (isEnd) {
			anglePercent -= gapAngle / 3.6 / 2;
		} else {
			anglePercent += gapAngle / 3.6 / 2;
		}

		const angleRad = (anglePercent / 100) * 2 * Math.PI;

		if (coord === 'x') {
			return centerX + radius * Math.cos(angleRad);
		} else {
			return centerY + radius * Math.sin(angleRad);
		}
	}

	// ==========================================
	// Event Handlers
	// ==========================================

	/**
	 * Handle label click
	 */
	onLabelClick(segment: PieChartSegment): void {
		if (this.labelsClickable) {
			this.labelClick.emit(segment);
		}
	}
}
