import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import * as d3 from 'd3';
import { BadgeAwardData } from '../../models/dashboard-models';

export interface BadgeTypeOption {
	value: string;
	label: string;
}

export interface MonthOption {
	value: number;
	label: string;
	shortLabel: string;
}

@Component({
	selector: 'app-badges-yearly-line-chart',
	standalone: true,
	imports: [CommonModule, FormsModule, TranslateModule],
	templateUrl: './badges-yearly-line-chart.component.html',
	styleUrls: ['./badges-yearly-line-chart.component.scss']
})
export class BadgesYearlyLineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
	@ViewChild('lineChartSvg') lineChartSvg!: ElementRef<SVGSVGElement>;
	@ViewChild('chartTooltip') chartTooltip!: ElementRef<HTMLDivElement>;
	@ViewChild('tooltipDate') tooltipDate!: ElementRef<HTMLDivElement>;
	@ViewChild('tooltipContent') tooltipContent!: ElementRef<HTMLDivElement>;
	@ViewChild('badgeTypeSelect') badgeTypeSelect!: ElementRef<HTMLSelectElement>;
	@ViewChild('badgeTypeTextMeasure') badgeTypeTextMeasure!: ElementRef<HTMLSpanElement>;

	/** Badge award time series data */
	@Input() data: BadgeAwardData[] = [];

	/** Currently selected year */
	@Input() selectedYear: number = new Date().getFullYear();

	/** Currently selected badge type filter */
	@Input() selectedBadgeType: string = 'all';

	/** Currently selected month filter (0 or null = all months, 1-12 = specific month) */
	@Input() selectedMonth: number | null = null;

	/** Available years for filter dropdown */
	@Input() availableYears: number[] = [];

	/** Available badge types for filter dropdown */
	@Input() badgeTypes: BadgeTypeOption[] = [];

	/** Whether to show the year filter dropdown */
	@Input() showYearFilter: boolean = true;

	/** Whether to show the month filter dropdown */
	@Input() showMonthFilter: boolean = true;

	/** Whether to show the badge type filter dropdown */
	@Input() showTypeFilter: boolean = true;

	/** Whether to show the legend */
	@Input() showLegend: boolean = true;

	/** Chart container height in pixels */
	@Input() chartHeight: number = 500;

	/** Whether the component is currently visible (for lazy rendering) */
	@Input() isVisible: boolean = true;

	/** Whether data is currently being loaded (prevents premature rendering) */
	@Input() isLoading: boolean = false;

	/** Event emitted when selected year changes */
	@Output() yearChange = new EventEmitter<number>();

	/** Event emitted when selected month changes */
	@Output() monthChange = new EventEmitter<number | null>();

	/** Event emitted when selected badge type changes */
	@Output() typeChange = new EventEmitter<string>();

	private viewInitialized = false;
	private hasRenderedChart = false;
	private pendingRenderTimeout: any = null;
	private resizeListener: (() => void) | null = null;

	/** Month labels for chart axis - initialized from translations */
	availableMonths: MonthOption[] = [];

	/** Month keys for translation lookup */
	private readonly monthKeys = [
		'january', 'february', 'march', 'april', 'may', 'june',
		'july', 'august', 'september', 'october', 'november', 'december'
	];

	constructor(private translate: TranslateService) {
		this.initializeMonths();
	}

	/**
	 * Initialize month labels from translations
	 */
	private initializeMonths(): void {
		this.availableMonths = this.monthKeys.map((key, index) => ({
			value: index + 1,
			label: this.translate.instant(`Network.Dashboard.badgeTimeline.months.${key}.label`),
			shortLabel: this.translate.instant(`Network.Dashboard.badgeTimeline.months.${key}.short`)
		}));
	}

	ngAfterViewInit(): void {
		this.viewInitialized = true;

		// Setup resize listener with debouncing
		this.resizeListener = this.debounce(() => {
			if (this.isVisible && this.hasRenderedChart && !this.isLoading) {
				this.renderLineChart();
			}
		}, 250);
		window.addEventListener('resize', this.resizeListener);

		// Only render on init if not loading and visible
		if (this.isVisible && !this.isLoading) {
			this.renderChartWhenReady();
		}

		setTimeout(() => this.adjustBadgeTypeSelectWidth(), 0);
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (!this.viewInitialized) return;

		// CRITICAL FIX: Track if loading just finished
		const loadingJustFinished = changes['isLoading'] &&
			changes['isLoading'].previousValue === true &&
			changes['isLoading'].currentValue === false;

		// If loading just finished, always render (data should be updated)
		if (loadingJustFinished && this.isVisible) {
			setTimeout(() => {
				this.renderLineChart();
				this.hasRenderedChart = true;
			}, 0);
			return;
		}

		if (this.isLoading) {
			return;
		}

		if (changes['data'] || changes['selectedYear'] || changes['selectedMonth'] || changes['selectedBadgeType']) {
			if (this.isVisible) {
				this.renderChartWhenReady();
			}
		}

		if (changes['badgeTypes'] || changes['selectedBadgeType']) {
			setTimeout(() => this.adjustBadgeTypeSelectWidth(), 0);
		}

		if (changes['isVisible']?.currentValue === true && !changes['isVisible']?.previousValue) {
			this.renderChartWhenReady();
		}
	}

	ngOnDestroy(): void {
		if (this.resizeListener) {
			window.removeEventListener('resize', this.resizeListener);
		}
		if (this.pendingRenderTimeout) {
			clearTimeout(this.pendingRenderTimeout);
		}
	}

	/**
	 * Debounce helper to prevent excessive re-renders on rapid resize events
	 */
	private debounce(func: Function, wait: number): () => void {
		let timeout: any;
		return () => {
			clearTimeout(timeout);
			timeout = setTimeout(() => func(), wait);
		};
	}

	/**
	 * Renders chart when DOM is ready and container has dimensions
	 * Retries if container is not yet ready (e.g., during tab switching)
	 */
	private renderChartWhenReady(retryCount: number = 0): void {
		// Clear any pending render timeout to avoid duplicate renders
		if (this.pendingRenderTimeout) {
			clearTimeout(this.pendingRenderTimeout);
			this.pendingRenderTimeout = null;
		}

		// Maximum retries to prevent infinite loop
		const maxRetries = 40;
		if (retryCount >= maxRetries) {
			console.warn('[BADGES-YEARLY-LINE-CHART] Max retries reached, chart container still not ready');
			return;
		}

		// Use requestAnimationFrame to wait for DOM to be ready
		requestAnimationFrame(() => {
			const svgElement = this.lineChartSvg?.nativeElement;
			const container = svgElement?.parentElement;

			// Check if SVG element exists
			if (!svgElement) {
				this.pendingRenderTimeout = setTimeout(() => this.renderChartWhenReady(retryCount + 1), 50);
				return;
			}

			// Check if any parent element has 'hidden' attribute (used by tabs system)
			let parentHidden = false;
			let el: HTMLElement | null = container;
			while (el) {
				if (el.hasAttribute('hidden')) {
					parentHidden = true;
					break;
				}
				el = el.parentElement;
			}

			if (parentHidden) {
				this.pendingRenderTimeout = setTimeout(() => this.renderChartWhenReady(retryCount + 1), 50);
				return;
			}

			// Check if container exists and has non-zero dimensions
			if (container && container.clientWidth > 0 && container.clientHeight > 0) {
				this.renderLineChart();
				this.hasRenderedChart = true;
			} else {
				// Container not ready yet, retry after a short delay
				this.pendingRenderTimeout = setTimeout(() => this.renderChartWhenReady(retryCount + 1), 50);
			}
		});
	}

	onYearChange(year: number): void {
		this.yearChange.emit(year);
	}

	onMonthChange(month: number | null): void {
		this.monthChange.emit(month);
	}

	onBadgeTypeChange(type: string): void {
		this.typeChange.emit(type);
		setTimeout(() => this.adjustBadgeTypeSelectWidth(), 0);
	}

	getSelectedBadgeTypeLabel(): string {
		const selected = this.badgeTypes.find(t => t.value === this.selectedBadgeType);
		return selected?.label || '';
	}

	private adjustBadgeTypeSelectWidth(): void {
		if (!this.badgeTypeSelect?.nativeElement || !this.badgeTypeTextMeasure?.nativeElement) return;

		const measureSpan = this.badgeTypeTextMeasure.nativeElement;
		const select = this.badgeTypeSelect.nativeElement;
		const textWidth = measureSpan.offsetWidth;
		const arrowPadding = 28;

		select.style.width = `${textWidth + arrowPadding}px`;
	}

	/**
	 * Get number of days in a given month
	 */
	private getDaysInMonth(year: number, month: number): number {
		return new Date(year, month, 0).getDate();
	}

	private getFilteredBadgeAwards(): BadgeAwardData[] {
		if (!this.data || this.data.length === 0) {
			return [];
		}

		let filtered = this.data.filter(award => award.year === +this.selectedYear);

		// Filter by month if a specific month is selected
		if (this.selectedMonth && this.selectedMonth > 0) {
			filtered = filtered.filter(award => award.month === this.selectedMonth);
		}

		if (this.selectedBadgeType !== 'all') {
			filtered = filtered.filter(award =>
				award.type === this.selectedBadgeType || award.type === 'all'
			);
		}

		return filtered;
	}

	renderLineChart(): void {
		if (!this.lineChartSvg) return;

		const svg = d3.select(this.lineChartSvg.nativeElement);
		svg.selectAll('*').remove(); // Always clear previous chart first

		const container = this.lineChartSvg.nativeElement.parentElement;
		if (!container) return;

		// Get actual container dimensions
		const containerWidth = container.clientWidth;
		const containerHeight = container.clientHeight;

		// Margins - smaller bottom margin because we use horizontal (not rotated) labels
		const margin = { top: 20, right: 30, bottom: 40, left: 60 };
		const width = containerWidth - margin.left - margin.right;
		const height = containerHeight - margin.top - margin.bottom;

		// Ensure minimum dimensions
		if (width <= 0 || height <= 0) return;

		// Get filtered data
		const filteredData = this.getFilteredBadgeAwards();

		if (!this.data || this.data.length === 0 || filteredData.length === 0) {
			// Show "No data" message when data is empty
			svg.append('text')
				.attr('x', width / 2 + margin.left)
				.attr('y', height / 2 + margin.top)
				.attr('text-anchor', 'middle')
				.attr('fill', '#6B7280')
				.style('font-size', '14px')
				.style('font-weight', 'normal')
				.text(this.translate.instant('Dashboard.noDataAvailable') || 'Keine Daten verfügbar');
			return;
		}

		// Check if we're in monthly view (showing days) or yearly view (showing months)
		const isMonthlyView = this.selectedMonth && this.selectedMonth > 0;

		if (isMonthlyView) {
			this.renderDailyChart(svg, filteredData, width, height, margin);
		} else {
			this.renderMonthlyChart(svg, filteredData, width, height, margin);
		}
	}

	/**
	 * Render monthly chart (x-axis shows months JAN-DEC)
	 */
	private renderMonthlyChart(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, filteredData: BadgeAwardData[], width: number, height: number, margin: { top: number; right: number; bottom: number; left: number }): void {
		// Group data by month for line chart
		const monthlyData = d3.group(filteredData, d => d.month);

		// Create chart data for all 12 months - sum all badge counts for each month
		const chartData = Array.from({ length: 12 }, (_, i) => {
			const month = i + 1;
			const items = monthlyData.get(month) || [];
			const total = items.reduce((sum, item) => sum + item.count, 0);
			return {
				month,
				total
			};
		});

		// Create scales
		const xScale = d3.scaleLinear()
			.domain([1, 12])
			.range([0, width]);

		const maxValue = d3.max(chartData, d => d.total) || 30;

		const yScale = d3.scaleLinear()
			.domain([0, maxValue * 1.1]) // Add 10% padding at top
			.nice()
			.range([height, 0]);

		// Create chart group
		const g = svg.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		// Add grid lines
		g.append('g')
			.attr('class', 'grid')
			.attr('opacity', 0.1)
			.call(d3.axisLeft(yScale)
				.tickSize(-width)
				.tickFormat(() => ''));

		// Add axes - use shortLabel for months (horizontal, not rotated)
		g.append('g')
			.attr('transform', `translate(0,${height})`)
			.call(d3.axisBottom(xScale)
				.ticks(12)
				.tickFormat(d => this.availableMonths[+d - 1]?.shortLabel || ''))
			.selectAll('text')
			.style('text-anchor', 'middle')
			.style('font-size', '11px')
			.style('font-weight', 'normal');

		g.append('g')
			.call(d3.axisLeft(yScale))
			.selectAll('text')
			.style('font-size', '12px')
			.style('font-weight', 'normal');

		// Single line generator in OEB Blue
		const lineGenerator = d3.line<any>()
			.defined(d => d.total >= 0)
			.x(d => xScale(d.month))
			.y(d => yScale(d.total))
			.curve(d3.curveMonotoneX);

		// Draw single solid line in OEB Blue
		g.append('path')
			.datum(chartData)
			.attr('fill', 'none')
			.attr('stroke', '#492E98')
			.attr('stroke-width', 3)
			.attr('d', lineGenerator);

		// Draw larger invisible hover areas for better interaction
		g.selectAll('.hover-area')
			.data(chartData)
			.enter()
			.append('circle')
			.attr('class', 'hover-area')
			.attr('cx', d => xScale(d.month))
			.attr('cy', d => yScale(d.total))
			.attr('r', 20)
			.attr('fill', 'none')
			.attr('stroke', 'none')
			.style('opacity', 0)
			.style('visibility', 'hidden')
			.style('cursor', 'pointer')
			.style('pointer-events', 'all')
			.on('mouseover', (event, d) => {
				// Show the visible dot
				g.select(`.dot-${d.month}`)
					.style('visibility', 'visible')
					.style('display', 'block')
					.style('opacity', 1);
				this.showMonthlyTooltip(event, d);
			})
			.on('mouseout', (event, d) => {
				// Hide the visible dot
				g.select(`.dot-${d.month}`)
					.style('opacity', 0)
					.style('display', 'none')
					.style('visibility', 'hidden');
				this.hideTooltip();
			});

		// Draw visible dots (hidden by default, shown on hover)
		g.selectAll('.dot')
			.data(chartData)
			.enter()
			.append('circle')
			.attr('class', d => `dot dot-${d.month}`)
			.attr('cx', d => xScale(d.month))
			.attr('cy', d => yScale(d.total))
			.attr('r', 6)
			.attr('fill', '#492E98')
			.attr('stroke', 'white')
			.attr('stroke-width', 2)
			.style('pointer-events', 'none')
			.style('opacity', 0)
			.style('display', 'none')
			.style('visibility', 'hidden');
	}

	/**
	 * Render daily chart (x-axis shows days 1-28/29/30/31)
	 */
	private renderDailyChart(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, filteredData: BadgeAwardData[], width: number, height: number, margin: { top: number; right: number; bottom: number; left: number }): void {
		const daysInMonth = this.getDaysInMonth(this.selectedYear, this.selectedMonth!);

		// Group data by day for line chart
		const dailyData = d3.group(filteredData, d => d.day || 1);

		// Create chart data for all days in the month
		const chartData = Array.from({ length: daysInMonth }, (_, i) => {
			const day = i + 1;
			const items = dailyData.get(day) || [];
			const total = items.reduce((sum, item) => sum + item.count, 0);
			return {
				day,
				total
			};
		});

		// Create scales
		const xScale = d3.scaleLinear()
			.domain([1, daysInMonth])
			.range([0, width]);

		const maxValue = d3.max(chartData, d => d.total) || 10;

		const yScale = d3.scaleLinear()
			.domain([0, maxValue * 1.1]) // Add 10% padding at top
			.nice()
			.range([height, 0]);

		// Create chart group
		const g = svg.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		// Add grid lines
		g.append('g')
			.attr('class', 'grid')
			.attr('opacity', 0.1)
			.call(d3.axisLeft(yScale)
				.tickSize(-width)
				.tickFormat(() => ''));

		// Add axes - show day numbers
		// Determine tick count based on days in month (show every day, every 2nd, or every 5th)
		const tickCount = daysInMonth <= 15 ? daysInMonth : (daysInMonth <= 20 ? Math.ceil(daysInMonth / 2) : Math.ceil(daysInMonth / 3));

		g.append('g')
			.attr('transform', `translate(0,${height})`)
			.call(d3.axisBottom(xScale)
				.ticks(tickCount)
				.tickFormat(d => String(Math.round(+d))))
			.selectAll('text')
			.style('text-anchor', 'middle')
			.style('font-size', '11px')
			.style('font-weight', 'normal');

		g.append('g')
			.call(d3.axisLeft(yScale))
			.selectAll('text')
			.style('font-size', '12px')
			.style('font-weight', 'normal');

		// Single line generator in OEB Blue
		const lineGenerator = d3.line<any>()
			.defined(d => d.total >= 0)
			.x(d => xScale(d.day))
			.y(d => yScale(d.total))
			.curve(d3.curveMonotoneX);

		// Draw single solid line in OEB Blue
		g.append('path')
			.datum(chartData)
			.attr('fill', 'none')
			.attr('stroke', '#492E98')
			.attr('stroke-width', 3)
			.attr('d', lineGenerator);

		// Draw larger invisible hover areas for better interaction
		g.selectAll('.hover-area')
			.data(chartData)
			.enter()
			.append('circle')
			.attr('class', 'hover-area')
			.attr('cx', d => xScale(d.day))
			.attr('cy', d => yScale(d.total))
			.attr('r', 15)
			.attr('fill', 'none')
			.attr('stroke', 'none')
			.style('opacity', 0)
			.style('visibility', 'hidden')
			.style('cursor', 'pointer')
			.style('pointer-events', 'all')
			.on('mouseover', (event, d) => {
				// Show the visible dot
				g.select(`.dot-${d.day}`)
					.style('visibility', 'visible')
					.style('display', 'block')
					.style('opacity', 1);
				this.showDailyTooltip(event, d);
			})
			.on('mouseout', (event, d) => {
				// Hide the visible dot
				g.select(`.dot-${d.day}`)
					.style('opacity', 0)
					.style('display', 'none')
					.style('visibility', 'hidden');
				this.hideTooltip();
			});

		// Draw visible dots (hidden by default, shown on hover)
		g.selectAll('.dot')
			.data(chartData)
			.enter()
			.append('circle')
			.attr('class', d => `dot dot-${d.day}`)
			.attr('cx', d => xScale(d.day))
			.attr('cy', d => yScale(d.total))
			.attr('r', 6)
			.attr('fill', '#492E98')
			.attr('stroke', 'white')
			.attr('stroke-width', 2)
			.style('pointer-events', 'none')
			.style('opacity', 0)
			.style('display', 'none')
			.style('visibility', 'hidden');
	}

	/** Show tooltip on hover for monthly view */
	private showMonthlyTooltip(event: any, data: any): void {
		if (!this.chartTooltip || !this.tooltipDate || !this.tooltipContent) return;

		const monthLabel = this.availableMonths[data.month - 1]?.label || '';
		const count = data.total;

		// Set month on top, badge count below
		this.tooltipDate.nativeElement.textContent = monthLabel;
		this.tooltipContent.nativeElement.textContent = this.translate.instant('Dashboard.badgesTooltip', { count });

		this.positionTooltip(event);
	}

	/** Show tooltip on hover for daily view */
	private showDailyTooltip(event: any, data: any): void {
		if (!this.chartTooltip || !this.tooltipDate || !this.tooltipContent) return;

		const monthLabel = this.availableMonths[this.selectedMonth! - 1]?.label || '';
		const dayLabel = `${data.day}. ${monthLabel}`;
		const count = data.total;

		// Set day and month on top, badge count below
		this.tooltipDate.nativeElement.textContent = dayLabel;
		this.tooltipContent.nativeElement.textContent = this.translate.instant('Dashboard.badgesTooltip', { count });

		this.positionTooltip(event);
	}

	/** Position tooltip near mouse with boundary checking */
	private positionTooltip(event: any): void {
		const tooltip = this.chartTooltip.nativeElement;
		tooltip.classList.remove('tw-hidden');

		// Position tooltip near mouse with boundary checking
		const container = this.lineChartSvg.nativeElement.parentElement;
		if (container) {
			const rect = container.getBoundingClientRect();
			let left = event.clientX - rect.left + 10;
			let top = event.clientY - rect.top - 40;

			// Boundary checking
			if (left + 150 > rect.width) {
				left = event.clientX - rect.left - 150;
			}
			if (top < 0) {
				top = event.clientY - rect.top + 20;
			}

			tooltip.style.left = `${left}px`;
			tooltip.style.top = `${top}px`;
		}
	}

	/** Hide tooltip */
	private hideTooltip(): void {
		if (!this.chartTooltip) return;
		this.chartTooltip.nativeElement.classList.add('tw-hidden');
	}
}
