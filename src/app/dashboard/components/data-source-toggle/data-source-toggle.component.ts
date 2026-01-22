import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { DashboardDataSourceService, DataSourceType } from '../../services/dashboard-data-source.service';

/**
 * DataSourceToggleComponent
 *
 * A toggle switch component that allows users to switch between
 * mock data and live API data in the dashboard.
 *
 * Features:
 * - Visual toggle switch with smooth animation
 * - Status indicator showing current data source
 * - Reactive updates when source changes externally
 * - Accessible keyboard navigation
 *
 * Usage:
 * ```html
 * <app-data-source-toggle></app-data-source-toggle>
 * ```
 */
@Component({
	selector: 'app-data-source-toggle',
	standalone: true,
	imports: [CommonModule, FormsModule, TranslatePipe],
	template: `
		<div class="data-source-toggle tw-flex tw-items-center tw-gap-3">
			<!-- Mock Label -->
			<span
				class="tw-text-sm tw-font-medium tw-transition-colors tw-duration-200"
				[class.tw-text-gray-400]="isApiData"
				[class.tw-text-purple-600]="!isApiData"
			>
				{{ 'Dashboard.dataSource.mock' | translate }}
			</span>

			<!-- Toggle Switch -->
			<button
				type="button"
				role="switch"
				[attr.aria-checked]="isApiData"
				[attr.aria-label]="'Dashboard.dataSource.toggleLabel' | translate"
				(click)="onToggle()"
				(keydown.enter)="onToggle()"
				(keydown.space)="onToggle(); $event.preventDefault()"
				class="toggle-switch tw-relative tw-inline-flex tw-h-6 tw-w-11 tw-flex-shrink-0 tw-cursor-pointer tw-rounded-full tw-border-2 tw-border-transparent tw-transition-colors tw-duration-200 tw-ease-in-out focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-purple-500 focus:tw-ring-offset-2"
				[class.tw-bg-purple-600]="isApiData"
				[class.tw-bg-gray-300]="!isApiData"
			>
				<span
					class="toggle-dot tw-pointer-events-none tw-inline-block tw-h-5 tw-w-5 tw-transform tw-rounded-full tw-bg-white tw-shadow tw-ring-0 tw-transition tw-duration-200 tw-ease-in-out"
					[class.tw-translate-x-5]="isApiData"
					[class.tw-translate-x-0]="!isApiData"
				>
				</span>
			</button>

			<!-- API Label -->
			<span
				class="tw-text-sm tw-font-medium tw-transition-colors tw-duration-200"
				[class.tw-text-gray-400]="!isApiData"
				[class.tw-text-purple-600]="isApiData"
			>
				{{ 'Dashboard.dataSource.api' | translate }}
			</span>

			<!-- Status Indicator -->
			<div class="tw-ml-2 tw-flex tw-items-center tw-gap-1.5">
				<span
					class="tw-h-2 tw-w-2 tw-rounded-full tw-animate-pulse"
					[class.tw-bg-green-500]="isApiData"
					[class.tw-bg-yellow-500]="!isApiData"
				>
				</span>
				<span class="tw-text-xs tw-text-gray-500">
					{{
						(isApiData ? 'Dashboard.dataSource.liveStatus' : 'Dashboard.dataSource.mockStatus') | translate
					}}
				</span>
			</div>
		</div>
	`,
	styles: [
		`
			.toggle-switch {
				box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
			}

			.toggle-dot {
				box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
			}

			.data-source-toggle {
				padding: 0.5rem 0.75rem;
				background: rgba(255, 255, 255, 0.9);
				border-radius: 0.5rem;
				border: 1px solid #e5e7eb;
			}

			@media (max-width: 640px) {
				.data-source-toggle {
					flex-wrap: wrap;
					justify-content: center;
				}
			}
		`,
	],
})
export class DataSourceToggleComponent implements OnInit, OnDestroy {
	private subscription: Subscription | null = null;

	isApiData = false;

	constructor(private dataSourceService: DashboardDataSourceService) {}

	ngOnInit(): void {
		this.subscription = this.dataSourceService.dataSource$.subscribe((source) => {
			this.isApiData = source === 'api';
		});
	}

	ngOnDestroy(): void {
		this.subscription?.unsubscribe();
	}

	onToggle(): void {
		this.dataSourceService.toggle();
	}

	get currentSource(): DataSourceType {
		return this.dataSourceService.currentSource;
	}
}
