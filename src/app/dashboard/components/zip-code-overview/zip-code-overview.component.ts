import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ZipCodeStatisticsData } from '../../models/dashboard-api.model';
import { DashboardUtilService } from '~/dashboard/services/util.service';

@Component({
	selector: 'app-zip-code-overview',
	standalone: true,
	imports: [CommonModule, TranslatePipe],
	templateUrl: './zip-code-overview.component.html',
	styleUrls: ['./zip-code-overview.component.scss'],
})
export class ZipCodeOverviewComponent implements OnInit {
	private router = inject(Router);
	public utilService = inject(DashboardUtilService);

	zipCodeStatistics: ZipCodeStatisticsData[] = [];
	loading = false;
	error: string | null = null;
	totalLearners = 0;
	metadata: any = null;

	ngOnInit(): void {
		this.loading = false;
	}

	viewZipCodeDetails(zipCode: string): void {
		this.router.navigate(['/dashboard/postal-code', zipCode]);
	}

	backToDashboard(): void {
		this.router.navigate(['/dashboard']);
	}

	getBarWidth(learnerCount: number): number {
		if (this.totalLearners === 0) return 0;
		return (learnerCount / this.totalLearners) * 100;
	}

	get plzStatistics(): ZipCodeStatisticsData[] {
		return this.zipCodeStatistics;
	}
}
