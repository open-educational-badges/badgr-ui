import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { FormControl, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subscription, combineLatest, firstValueFrom } from 'rxjs';
import {
	debounceTime,
	filter,
	distinctUntilChanged,
	tap,
	concatMap,
	skip,
	map,
	switchMap,
	startWith,
} from 'rxjs/operators';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { CatalogService, PaginatedLearningPath } from '~/catalog/catalog.service';
import { BaseRoutableComponent } from '~/common/pages/base-routable.component';
import { MessageService } from '~/common/services/message.service';
import { AppConfigService } from '~/common/app-config.service';
import { IssuerApiService } from '~/issuer/services/issuer-api.service';
import { SessionService } from '~/common/services/session.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LearningPathV3 } from '~/issuer/models/learningpathv3.model';
import { ApiIssuer } from '~/issuer/models/issuer-api.model';
import { createInfiniteScrollObserver } from '~/catalog/util/intersection-observer';
import { appearAnimation } from '~/common/animations/animations';
import { ITag } from '../badge-catalog/badge-catalog.component';
import { FormMessageComponent } from '~/common/components/form-message.component';
import { BgAwaitPromises } from '~/common/directives/bg-await-promises';
import { CountUpModule } from 'ngx-countup';
import { HlmInput } from '@spartan-ng/helm/input';
import { NgIcon } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { OebGlobalSortSelectComponent } from '~/components/oeb-global-sort-select.component';
import { BgLearningPathCard } from '~/common/components/bg-learningpathcard';
import { OebHeaderText } from '~/components/oeb-header-text.component';
import { LoadingDotsComponent } from '~/common/components/loading-dots.component';
import { OebButtonComponent } from '~/components/oeb-button.component';
import { OebSelectComponent } from '~/components/select.component';
import { SortPipe } from '../../../common/pipes/sortPipe';

@Component({
	selector: 'app-learningpaths-catalog',
	templateUrl: './learningpath-catalog.component.html',
	styleUrls: ['../badge-catalog/badge-catalog.component.css'],
	animations: [appearAnimation],
	imports: [
		FormMessageComponent,
		BgAwaitPromises,
		CountUpModule,
		FormsModule,
		HlmInput,
		NgIcon,
		HlmIcon,
		OebGlobalSortSelectComponent,
		BgLearningPathCard,
		TranslatePipe,
		OebHeaderText,
		LoadingDotsComponent,
		OebButtonComponent,
		OebSelectComponent,
		SortPipe,
	],
})
export class LearningPathsCatalogComponent extends BaseRoutableComponent implements OnInit, AfterViewInit, OnDestroy {
	protected title = inject(Title);
	protected messageService = inject(MessageService);
	protected configService = inject(AppConfigService);
	protected catalogService = inject(CatalogService);
	protected issuerService = inject(IssuerApiService);
	protected sessionService = inject(SessionService);
	private translate = inject(TranslateService);

	@ViewChild('loadMore') loadMore: ElementRef | undefined;

	readonly INPUT_DEBOUNCE_TIME = 400;
	readonly LEARNING_PATHS_PER_PAGE = 21; // We show at most 3 columns, so we load 7 rows at a time

	/** The tag selected for filtering {@link learningPaths}. */
	selectedTags = signal<ITag['value'][]>([]);
	selectedTags$ = toObservable(this.selectedTags);

	/** A search string that is used to filter {@link learningPaths}. */
	searchQuery = signal<string>('');
	searchQuery$ = toObservable(this.searchQuery);

	/** A sorting option to sort {@link learningPaths}. */
	sortOption = signal<'name_asc' | 'name_desc' | 'date_asc' | 'date_desc'>('date_desc');
	sortOption$ = toObservable(this.sortOption);

	/**
	 * The 0-indexed current page the component sits on, starting at -1 to
	 * initiate the first load when it is set to 0.
	 */
	currentPage = signal<number>(-1);
	currentPage$ = toObservable(this.currentPage);

	/** Determines whether a legend that explains learning path categories is shown. */
	showLegend = signal<boolean>(false);

	/**
	 * The learning paths resulting from a query to the database with the given inputs of
	 * {@link searchQuery}, {@link selectedTags} and {@link sortOption}
	 */
	learningPaths = signal<LearningPathV3[]>([]);

	totalLearningPathCount = signal<number>(0);

	/** Whether or not a next page of learning paths can be loaded. */
	hasNext = signal<boolean>(true);

	/**
	 * A signal controlling whether user scrolling should be observed or not.
	 * While new learning paths are loaded, user scrolling is usually disregarded
	 * and thus should be ignored.
	 **/
	observeScrolling = signal<boolean>(false);
	observeScrolling$ = toObservable(this.observeScrolling);

	/** Unique issuers of all learning paths. */
	issuers = signal<ApiIssuer[]>([]);
	issuers$ = toObservable(this.issuers);

	/** Selectable options to filter with. */
	tagsOptions = signal<ITag[]>([]);
	tagsOptions$ = toObservable(this.tagsOptions);

	/** Whether the user is logged in */
	loggedIn = signal<boolean>(false);

	/** A string used for displaying the amount of learning paths that is aware of the current language. */
	learningPathsPluralWord = toSignal(
		combineLatest(
			[
				toObservable(this.totalLearningPathCount),
				this.translate.onLangChange.pipe(startWith(this.translate.currentLang)),
			],
			(count, lang) => count,
		).pipe(
			map((count) => {
				if (count === 0) return 'LearningPath.learningpathsPlural';
				if (count === 1) return 'LearningPath.learningpathSingular';
				return 'LearningPath.learningpathsPlural';
			}),
			switchMap((key) => this.translate.get(key)),
		),
	);

	/** A string used for displaying the amount of issuers that is aware of the current language. */
	issuersPluralWord = toSignal(
		combineLatest(
			[toObservable(this.issuers), this.translate.onLangChange.pipe(startWith(this.translate.currentLang))],
			(issuers, lang) => issuers,
		).pipe(
			map((issuers) => {
				if (issuers.length === 0) return 'LearningPath.institutions';
				if (issuers.length === 1) return 'LearningPath.institution';
				return 'LearningPath.institutions';
			}),
			switchMap((key) => this.translate.get(key)),
		),
	);

	sortOptions = [
		{
			value: 'name_asc',
			label: 'A-Z',
		},
		{
			value: 'name_desc',
			label: 'Z-A',
		},
		{
			value: 'date_asc',
			label: this.translate.instant('General.dateAscending'),
		},
		{
			value: 'date_desc',
			label: this.translate.instant('General.dateDescending'),
		},
	];

	sortControl = new FormControl('');
	tagsControl = new FormControl();
	intersectionObserver: IntersectionObserver | undefined;
	pageSubscriptions: Subscription[] = [];
	// initial values need to be skipped to await the actual loading
	pageReadyPromise: Promise<unknown> = Promise.all([
		firstValueFrom(this.tagsOptions$.pipe(skip(1))),
		firstValueFrom(this.issuers$.pipe(skip(1))),
	]);
	viewInitialized: boolean = false;

	get theme() {
		return this.configService.theme;
	}

	get features() {
		return this.configService.featuresConfig;
	}

	constructor() {
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route);
		const title = this.title;

		title.setTitle(`Learning Paths - ${this.configService.theme['serviceName'] || 'Badgr'}`);
	}

	ngOnInit() {
		this.loggedIn.set(this.sessionService.isLoggedIn);

		this.pageSubscriptions.push(
			this.observeScrolling$.pipe(filter((_) => this.intersectionObserver !== undefined)).subscribe((observe) => {
				if (observe) this.intersectionObserver!.observe(this.loadMore!.nativeElement);
				else this.intersectionObserver!.unobserve(this.loadMore!.nativeElement);
			}),
		);

		this.pageSubscriptions.push(
			combineLatest(
				[this.currentPage$, this.searchQuery$, this.selectedTags$, this.sortOption$],
				(v1, v2, v3, v4) => ({
					page: v1,
					searchQuery: v2,
					tags: v3,
					sortOption: v4,
				}),
			)
				.pipe(
					debounceTime(this.INPUT_DEBOUNCE_TIME),
					filter((i) => i.page >= 0),
					distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
					tap((_) => this.observeScrolling.set(false)),
					concatMap((i) => this.loadRangeOfLearningPaths(i.page, i.searchQuery, i.tags, i.sortOption)),
				)
				.subscribe((paginatedLearningPaths) => {
					this.totalLearningPathCount.set(paginatedLearningPaths.count);
					this.hasNext.set(paginatedLearningPaths?.next !== null);
					if (!paginatedLearningPaths?.previous)
						// on the first page, set the whole array to make sure to not append anything
						this.learningPaths.set(paginatedLearningPaths?.results ?? []);
					else this.learningPaths.update((current) => [...current, ...paginatedLearningPaths.results]);
					this.observeScrolling.set(true);
				}),
		);

		// Scroll to the top when something resets
		// the list of learning paths (e.g. due to filtering)
		this.pageSubscriptions.push(
			this.currentPage$.subscribe((p) => {
				if (p === 0) window?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
			}),
		);

		this.pageSubscriptions.push(
			this.tagsControl.valueChanges.subscribe((value) => {
				this.selectedTags.set(value ?? []);
				if (this.currentPage() > 0) this.currentPage.set(0);
			}),
		);

		this.pageSubscriptions.push(
			this.sortControl.valueChanges.subscribe((value: 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc') => {
				this.sortOption.set(value);
				if (this.currentPage() > 0) this.currentPage.set(0);
			}),
		);

		// Activate the intersection observer once the tags options have been set
		this.pageSubscriptions.push(
			this.tagsOptions$.pipe(skip(1)).subscribe(() => {
				this.observeScrolling.set(true);
			}),
		);

		// load the tags & issuers, kicking off the page load process
		this.fetchIssuers();
		this.fetchAvailableTags();
	}

	ngAfterViewInit(): void {
		this.intersectionObserver = createInfiniteScrollObserver(this.loadMore, {
			hasNext: this.hasNext,
			observeScrolling: this.observeScrolling,
			onLoadMore: () => {
				this.currentPage.update((p) => p + 1);
			},
		});
	}

	ngOnDestroy(): void {
		for (const s of this.pageSubscriptions) s.unsubscribe();
		this.intersectionObserver?.disconnect();
	}

	/**
	 * Loads a range of learning paths from the API based on pagination and filters.
	 */
	private async loadRangeOfLearningPaths(
		page: number,
		searchQuery: string,
		tags: string[],
		sortOption: 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc',
	): Promise<PaginatedLearningPath> {
		const offset = page * this.LEARNING_PATHS_PER_PAGE;
		return this.catalogService.getLearningPaths(
			offset,
			this.LEARNING_PATHS_PER_PAGE,
			searchQuery || undefined,
			tags && tags.length > 0 ? tags : undefined,
			sortOption,
		);
	}

	/**
	 * Fetches all available tags for learning paths from the API.
	 */
	private async fetchAvailableTags(): Promise<void> {
		try {
			const tags = await this.catalogService.getLearningPathTags();
			this.tagsOptions.set(tags.map((tag) => ({ label: tag, value: tag })));
		} catch (error) {
			console.error('Failed to fetch learning path tags:', error);
			this.tagsOptions.set([]);
		}
	}

	/**
	 * Fetches all issuers that have learning paths.
	 */
	private async fetchIssuers(): Promise<void> {
		try {
			this.issuerService.listAllIssuers().then(
				(issuers) => {
					const filteredIssuers = issuers
						.filter((i) => i.verified && !i.source_url)
						.sort((a, b) => a.name.localeCompare(b.name));
					this.issuers.set(filteredIssuers);
				},
				(error) => {
					console.error('Failed to fetch issuers:', error);
					this.messageService.reportAndThrowError(this.translate.instant('Issuer.failLoadissuers'), error);
				},
			);
		} catch (error) {
			console.error('Failed to fetch issuers:', error);
			this.issuers.set([]);
		}
	}

	/**
	 * Calculate the progress display for a learning path.
	 */
	calculateLearningPathStatus(lp: LearningPathV3): { match: string } | { progress: number } {
		if (lp.progress != null) {
			return { progress: lp.progressPercentage ?? 0 };
		} else {
			return { match: `0/${lp.badges.length}` };
		}
	}

	/**
	 * Check if a learning path is completed by the user.
	 */
	checkCompleted(lp: LearningPathV3): boolean {
		return lp.isCompleted;
	}

	/**
	 * Calculate total study load for a learning path.
	 */
	calculateStudyLoad(lp: LearningPathV3): number {
		// This would need to be calculated from the badge data
		// For now, return 0 as the V3 model doesn't include badge details
		return 0;
	}

	/**
	 * Remove a tag from the selected tags.
	 */
	removeTag(tag: string): void {
		const currentTags = this.tagsControl.value || [];
		const updatedTags = currentTags.filter((t: string) => t !== tag);
		this.tagsControl.setValue(updatedTags);
	}

	/**
	 * Handle search query changes with signal update.
	 */
	onSearchQueryChange(query: string): void {
		this.searchQuery.set(query);
		if (this.currentPage() > 0) this.currentPage.set(0);
	}

	/**
	 * Handle manual "Load More" button click.
	 */
	onLoadMoreClicked(): void {
		this.currentPage.update((p) => p + 1);
	}
}
