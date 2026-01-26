import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ZipCodeStatisticsData } from '../../models/dashboard-models';

/**
 * ZIP Code KPI Card Component
 *
 * Displays ZIP code (postal code) statistics as a clickable KPI card
 * on the dashboard overview. Shows learner distribution across
 * postal code regions with trends.
 *
 * Features:
 * - Displays top ZIP code areas by learner count
 * - Shows trend indicators (up/down/stable)
 * - Clickable to navigate to ZIP code detail view
 * - Follows existing dashboard card styling
 */
@Component({
	selector: 'app-oeb-dashboard-zip-code-kpi',
	standalone: true,
	imports: [CommonModule, TranslatePipe],
	templateUrl: './oeb-dashboard-zip-code-kpi.component.html',
	styleUrls: ['./oeb-dashboard-zip-code-kpi.component.scss'],
})
export class OebDashboardZipCodeKpiComponent implements OnInit {
	/** ZIP code statistics data */
	@Input() zipCodeData: ZipCodeStatisticsData[] = [];
	/** @deprecated Use zipCodeData instead */
	@Input() set plzData(value: ZipCodeStatisticsData[]) {
		this.zipCodeData = value;
	}

	/** Total number of learners across all ZIP code areas */
	@Input() totalLearners: number = 0;

	/** Number of ZIP code areas represented */
	@Input() totalZipCodeAreas: number = 0;
	/** @deprecated Use totalZipCodeAreas instead */
	@Input() set totalPlzAreas(value: number) {
		this.totalZipCodeAreas = value;
	}

	constructor(private router: Router) {}

	ngOnInit(): void {
		// Component initialization
	}

	/**
	 * Navigate to ZIP code detail view
	 */
	viewZipCodeDetails(): void {
		console.log('[ZIP-KPI] Navigating to ZIP code overview');
		this.router.navigate(['/dashboard/plz-overview']);
	}

	/**
	 * Get the top 3 ZIP code areas by learner count
	 */
	getTopZipCodeAreas(): ZipCodeStatisticsData[] {
		return this.zipCodeData.sort((a, b) => b.learnerCount - a.learnerCount).slice(0, 3);
	}

	/** @deprecated Use viewZipCodeDetails instead */
	viewPlzDetails(): void {
		this.viewZipCodeDetails();
	}

	/** @deprecated Use getTopZipCodeAreas instead */
	getTopPlzAreas(): ZipCodeStatisticsData[] {
		return this.getTopZipCodeAreas();
	}

	/**
	 * Get trend icon based on trend direction
	 */
	getTrendIcon(trend: string): string {
		switch (trend) {
			case 'up':
				return '↗';
			case 'down':
				return '↘';
			case 'stable':
				return '→';
			default:
				return '→';
		}
	}

	/**
	 * Get trend color based on trend direction
	 */
	getTrendColor(trend: string): string {
		switch (trend) {
			case 'up':
				return 'var(--color-green)';
			case 'down':
				return 'var(--color-red)';
			case 'stable':
				return 'var(--color-darkgray)';
			default:
				return 'var(--color-darkgray)';
		}
	}

	/**
	 * Check if component has data to display
	 */
	hasData(): boolean {
		return this.zipCodeData && this.zipCodeData.length > 0;
	}
}
