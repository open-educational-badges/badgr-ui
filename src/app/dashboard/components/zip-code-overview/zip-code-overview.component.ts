import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ZipCodeStatisticsData } from '../../models/dashboard-models';

@Component({
	selector: 'app-zip-code-overview',
	standalone: true,
	imports: [CommonModule, TranslatePipe],
	templateUrl: './zip-code-overview.component.html',
	styleUrls: ['./zip-code-overview.component.scss'],
})
export class ZipCodeOverviewComponent implements OnInit {
	zipCodeStatistics: ZipCodeStatisticsData[] = [];
	loading = false;
	error: string | null = null;
	totalLearners = 0;
	metadata: any = null;

	constructor(private router: Router) {}

	ngOnInit(): void {
		this.loading = false;
	}

	viewZipCodeDetails(zipCode: string): void {
		this.router.navigate(['/dashboard/postal-code', zipCode]);
	}

	backToDashboard(): void {
		this.router.navigate(['/dashboard']);
	}

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

	getBarWidth(learnerCount: number): number {
		if (this.totalLearners === 0) return 0;
		return (learnerCount / this.totalLearners) * 100;
	}

	get plzStatistics(): ZipCodeStatisticsData[] {
		return this.zipCodeStatistics;
	}
}
