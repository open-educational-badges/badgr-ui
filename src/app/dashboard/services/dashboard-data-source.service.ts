import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Data source type for the dashboard
 */
export type DataSourceType = 'mock' | 'api';

/**
 * DashboardDataSourceService
 *
 * Manages the toggle state between mock data and live API data.
 * This service provides a centralized way to switch data sources
 * across all dashboard components.
 *
 * Features:
 * - Reactive state management with BehaviorSubject
 * - Persistence to localStorage for session continuity
 * - Console logging for debugging
 *
 * Usage:
 * ```typescript
 * constructor(private dataSource: DashboardDataSourceService) {}
 *
 * ngOnInit() {
 *   this.dataSource.dataSource$.subscribe(source => {
 *     console.log('Data source changed to:', source);
 *   });
 * }
 *
 * toggleSource() {
 *   this.dataSource.toggle();
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class DashboardDataSourceService {
	private readonly STORAGE_KEY = 'dashboard_data_source';
	private readonly DEFAULT_SOURCE: DataSourceType = 'mock';

	private dataSourceSubject: BehaviorSubject<DataSourceType>;

	/**
	 * Observable of the current data source type
	 */
	dataSource$: Observable<DataSourceType>;

	constructor() {
		const initialSource = this.loadFromStorage();
		this.dataSourceSubject = new BehaviorSubject<DataSourceType>(initialSource);
		this.dataSource$ = this.dataSourceSubject.asObservable();

		console.log('[DataSource] Initialized with source:', initialSource);
	}

	/**
	 * Get the current data source type synchronously
	 */
	get currentSource(): DataSourceType {
		return this.dataSourceSubject.getValue();
	}

	/**
	 * Check if currently using mock data
	 */
	get isMockData(): boolean {
		return this.currentSource === 'mock';
	}

	/**
	 * Check if currently using API data
	 */
	get isApiData(): boolean {
		return this.currentSource === 'api';
	}

	/**
	 * Set the data source type
	 * @param source - The data source type to set
	 */
	setDataSource(source: DataSourceType): void {
		if (this.currentSource !== source) {
			console.log('[DataSource] Switching from', this.currentSource, 'to', source);
			this.dataSourceSubject.next(source);
			this.saveToStorage(source);
		}
	}

	/**
	 * Toggle between mock and API data sources
	 */
	toggle(): void {
		const newSource: DataSourceType = this.isMockData ? 'api' : 'mock';
		this.setDataSource(newSource);
	}

	/**
	 * Reset to default data source (mock)
	 */
	reset(): void {
		this.setDataSource(this.DEFAULT_SOURCE);
	}

	/**
	 * Load saved data source from localStorage
	 */
	private loadFromStorage(): DataSourceType {
		try {
			const saved = localStorage.getItem(this.STORAGE_KEY);
			if (saved === 'mock' || saved === 'api') {
				return saved;
			}
		} catch (e) {
			console.warn('[DataSource] Error loading from storage:', e);
		}
		return this.DEFAULT_SOURCE;
	}

	/**
	 * Save data source to localStorage
	 */
	private saveToStorage(source: DataSourceType): void {
		try {
			localStorage.setItem(this.STORAGE_KEY, source);
		} catch (e) {
			console.warn('[DataSource] Error saving to storage:', e);
		}
	}
}
