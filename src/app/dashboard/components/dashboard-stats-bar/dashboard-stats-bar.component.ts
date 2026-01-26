import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAward, lucideClock, lucideWarehouse, lucideUsers } from '@ng-icons/lucide';

/**
 * Statistics summary bar component
 * Displays the 4 main statistics at the top of the dashboard overview
 */
export interface StatItem {
	label: string;
	value: number | string;
	icon: string;
}

@Component({
	selector: 'app-dashboard-stats-bar',
	standalone: true,
	imports: [CommonModule, TranslatePipe, NgIcon],
	providers: [provideIcons({ lucideAward, lucideClock, lucideWarehouse, lucideUsers })],
	templateUrl: './dashboard-stats-bar.component.html',
	styleUrls: ['./dashboard-stats-bar.component.scss'],
})
export class DashboardStatsBarComponent {
	@Input() totalBadges: number = 0;
	@Input() totalCompetencyHours: number = 0;
	@Input() totalInstitutions: number = 0;
	@Input() totalLearners: number = 0;

	get stats(): StatItem[] {
		return [
			{
				label: 'Dashboard.Stats.badges',
				value: this.formatNumber(this.totalBadges),
				icon: 'lucideAward',
			},
			{
				label: 'Dashboard.Stats.competencyHours',
				value: this.formatNumber(this.totalCompetencyHours),
				icon: 'lucideClock',
			},
			{
				label: 'Dashboard.Stats.institutions',
				value: this.formatNumber(this.totalInstitutions),
				icon: 'lucideWarehouse',
			},
			{
				label: 'Dashboard.Stats.learners',
				value: this.formatNumber(this.totalLearners),
				icon: 'lucideUsers',
			},
		];
	}

	private formatNumber(value: number): string {
		if (value >= 1000000) {
			return (value / 1000000).toFixed(1) + 'M';
		} else if (value >= 1000) {
			return (value / 1000).toFixed(1) + 'K';
		}
		return value.toString();
	}
}
