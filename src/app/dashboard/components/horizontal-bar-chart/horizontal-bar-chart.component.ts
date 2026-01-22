import { Component, Input, Output, EventEmitter, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClockFading } from '@ng-icons/lucide';

/**
 * Data item for horizontal bar chart
 */
export interface HorizontalBarItem {
	/** Unique identifier for the item */
	id?: string;
	/** Label text displayed on the left side */
	label: string;
	/** Primary value for bar width calculation (e.g., count, percentage, hours) */
	value: number;
	/** Secondary value to display inside the bar (optional, defaults to value) */
	barDisplayValue?: number | string;
	/** Text to display after the bar (optional) */
	afterBarText?: string;
	/** ESCO URI for linking to ESCO database (optional) */
	escoUri?: string;
	/** Custom data that can be passed back on click */
	data?: any;
}

/**
 * Configuration for what to display inside the bar
 */
export type BarContentType = 'percentage' | 'hours' | 'value' | 'custom';

/**
 * Visual variant for the bar chart
 * - 'default': Purple border and text (for competency charts)
 * - 'neutral': Gray border, light blue fill, dark text (for distribution charts)
 */
export type BarChartVariant = 'default' | 'neutral';

/**
 * Reusable Horizontal Bar Chart Component
 *
 * This component displays a list of horizontal bars with labels and optional features:
 * - Configurable label and bar widths
 * - Optional icon inside the bar (e.g., clock for hours)
 * - Optional text after the bar
 * - Optional ESCO links
 * - Click events on bars
 *
 * @example Basic usage with percentage:
 * ```html
 * <app-horizontal-bar-chart
 *   [items]="items"
 *   barContentType="percentage"
 *   barValueSuffix="%">
 * </app-horizontal-bar-chart>
 * ```
 *
 * @example With hours and click handler:
 * ```html
 * <app-horizontal-bar-chart
 *   [items]="items"
 *   barContentType="hours"
 *   [showBarIcon]="true"
 *   [clickable]="true"
 *   (itemClick)="onItemClick($event)">
 * </app-horizontal-bar-chart>
 * ```
 */
@Component({
	selector: 'app-horizontal-bar-chart',
	standalone: true,
	imports: [CommonModule, TranslateModule, NgIcon],
	providers: [provideIcons({ lucideClockFading })],
	templateUrl: './horizontal-bar-chart.component.html',
	styleUrls: ['./horizontal-bar-chart.component.scss'],
})
export class HorizontalBarChartComponent {
	/**
	 * Array of items to display as horizontal bars
	 */
	items = input.required<HorizontalBarItem[]>();

	/**
	 * Width percentage for the label area (left side)
	 * @default 25
	 */
	labelWidthPercent = input<number>(25);

	/**
	 * Width percentage for the bar area (right side)
	 * Automatically calculated as 100 - labelWidthPercent if not provided
	 */
	barAreaWidthPercent = input<number | null>(null);

	/**
	 * Type of content to display inside the bar
	 * - 'percentage': Shows value with % suffix
	 * - 'hours': Shows clock icon with value and 'h' suffix
	 * - 'value': Shows raw value
	 * - 'custom': Uses barDisplayValue as-is
	 * @default 'percentage'
	 */
	barContentType = input<BarContentType>('percentage');

	/**
	 * Suffix to append to the bar value (e.g., '%', 'h')
	 * Only used when barContentType is 'percentage' or 'value'
	 */
	barValueSuffix = input<string>('');

	/**
	 * Whether to show an icon inside the bar
	 * @default false
	 */
	showBarIcon = input<boolean>(false);

	/**
	 * Icon name to display inside the bar (requires showBarIcon=true)
	 * @default 'lucideClockFading'
	 */
	barIconName = input<string>('lucideClockFading');

	/**
	 * Whether to show text after the bar
	 * @default false
	 */
	showAfterBarText = input<boolean>(false);

	/**
	 * Translation key for the text label after the count (e.g., 'Dashboard.Learners.learners')
	 * Used in combination with afterBarText from item
	 */
	afterBarTranslationKey = input<string>('');

	/**
	 * Whether the bars are clickable
	 * @default false
	 */
	clickable = input<boolean>(false);

	/**
	 * Whether to show ESCO links after the label
	 * @default false
	 */
	showEscoLink = input<boolean>(false);

	/**
	 * Visual variant for the bar chart
	 * - 'default': Purple border and text (for competency charts)
	 * - 'neutral': Gray border (#6a6a6a), light blue fill (#c5d1ff), dark text (#2c2c2c)
	 * @default 'default'
	 */
	variant = input<BarChartVariant>('default');

	/**
	 * Minimum bar width percentage to ensure visibility of small values
	 * @default 3
	 */
	minBarWidthPercent = input<number>(3);

	/**
	 * Event emitted when a bar is clicked (only when clickable=true)
	 */
	@Output() itemClick = new EventEmitter<HorizontalBarItem>();

	/**
	 * Computed bar area width - uses provided value or calculates from label width
	 */
	computedBarAreaWidth = computed(() => {
		const provided = this.barAreaWidthPercent();
		return provided !== null ? provided : 100 - this.labelWidthPercent();
	});

	/**
	 * Computed maximum value for scaling bar widths
	 */
	maxValue = computed(() => {
		const itemList = this.items();
		if (!itemList || itemList.length === 0) return 1;
		return Math.max(...itemList.map((item) => item.value)) || 1;
	});

	/**
	 * Calculate bar width as percentage based on item value
	 */
	getBarWidth(value: number): number {
		const max = this.maxValue();
		if (max === 0) return this.minBarWidthPercent();
		const width = (value / max) * 100;
		return Math.max(this.minBarWidthPercent(), width);
	}

	/**
	 * Get the display value for inside the bar
	 */
	getBarDisplayValue(item: HorizontalBarItem): string {
		const contentType = this.barContentType();
		const suffix = this.barValueSuffix();

		// If custom display value is provided, use it
		if (item.barDisplayValue !== undefined) {
			return String(item.barDisplayValue) + suffix;
		}

		switch (contentType) {
			case 'percentage':
				return `${item.value}${suffix || '%'}`;
			case 'hours':
				return `${item.value}${suffix || 'h'}`;
			case 'value':
				return `${item.value}${suffix}`;
			case 'custom':
				return String(item.value);
			default:
				return String(item.value);
		}
	}

	/**
	 * Handle bar click
	 */
	onBarClick(item: HorizontalBarItem): void {
		if (this.clickable()) {
			this.itemClick.emit(item);
		}
	}

	/**
	 * TrackBy function for ngFor
	 */
	trackByItem(index: number, item: HorizontalBarItem): string {
		return item.id || item.label || String(index);
	}

	/**
	 * Get dynamic font size for label based on text length
	 * Ensures text fits within bar height
	 */
	getLabelFontSize(text: string): number {
		const length = text?.length || 0;
		if (length <= 20) return 14;
		if (length <= 30) return 13;
		if (length <= 40) return 12;
		if (length <= 50) return 11;
		if (length <= 60) return 10;
		return 9;
	}

	/**
	 * Get dynamic line height for label
	 */
	getLabelLineHeight(text: string): number {
		const length = text?.length || 0;
		if (length <= 30) return 1.25;
		return 1.2;
	}
}
