import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DashboardUtilService {
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
}
