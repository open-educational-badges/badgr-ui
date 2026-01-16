import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, signal, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from '../../../common/services/message.service';
import { Title } from '@angular/platform-browser';
import { AppConfigService } from '../../../common/app-config.service';
import { BaseRoutableComponent } from '../../../common/pages/base-routable.component';
import { BadgeClassManager } from '../../../issuer/services/badgeclass-manager.service';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { FormControl, FormsModule } from '@angular/forms';
import { appearAnimation } from '../../../common/animations/animations';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { CountUpModule } from 'ngx-countup';
import { BadgeLegendComponent } from '../../../common/components/badge-legend/badge-legend.component';
import { NgIcon } from '@ng-icons/core';
import { OebGlobalSortSelectComponent } from '../../../components/oeb-global-sort-select.component';
import { OebSelectComponent } from '../../../components/select.component';
import { SortPipe } from '../../../common/pipes/sortPipe';
import { BgBadgecard } from '../../../common/components/bg-badgecard';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
	combineLatest,
	concatMap,
	debounceTime,
	distinctUntilChanged,
	filter,
	map,
	startWith,
	Subscription,
	switchMap,
	tap,
} from 'rxjs';
import { CatalogService } from '~/catalog/catalog.service';
import { BadgeClassV3 } from '~/issuer/models/badgeclassv3.model';
import { LoadingDotsComponent } from '../../../common/components/loading-dots.component';
import { OebButtonComponent } from '~/components/oeb-button.component';
import { BgAwaitPromises } from '~/common/directives/bg-await-promises';
import { skip } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmInput } from '@spartan-ng/helm/input';
import { OebHeaderText } from '~/components/oeb-header-text.component';
import { IssuerApiService } from '~/issuer/services/issuer-api.service';
import { ApiIssuer } from '~/issuer/models/issuer-api.model';
import { createInfiniteScrollObserver } from '~/catalog/util/intersection-observer';

@Component({
	selector: 'app-badge-catalog',
	templateUrl: './badge-catalog.component.html',
	styleUrls: ['./badge-catalog.component.css'],
	animations: [appearAnimation],
	imports: [
		FormMessageComponent,
		CountUpModule,
		BadgeLegendComponent,
		FormsModule,
		HlmInput,
		NgIcon,
		HlmIcon,
		OebGlobalSortSelectComponent,
		OebSelectComponent,
		SortPipe,
		TranslatePipe,
		BgBadgecard,
		LoadingDotsComponent,
		OebButtonComponent,
		BgAwaitPromises,
		OebHeaderText,
	],
})
export class BadgeCatalogComponent extends BaseRoutableComponent implements OnInit, AfterViewInit, OnDestroy {
	protected title = inject(Title);
	protected messageService = inject(MessageService);
	protected configService = inject(AppConfigService);
	protected badgeClassService = inject(BadgeClassManager);
	protected catalogService = inject(CatalogService);
	protected issuerService = inject(IssuerApiService);
	private translate = inject(TranslateService);

	@ViewChild('loadMore') loadMore: ElementRef | undefined;

	readonly INPUT_DEBOUNCE_TIME = 400;
	readonly BADGES_PER_PAGE = 21; // We show at most 3 columns of badges, so we load 7 rows at a time

	/** The tag selected for filtering {@link badges}. */
	selectedTags = signal<ITag['value'][]>([]);
	selectedTags$ = toObservable(this.selectedTags);

	/** A search string that is used to filter {@link badges}. */
	searchQuery = signal<string>('');
	searchQuery$ = toObservable(this.searchQuery);

	/** A sorting option to sort {@link badges}. */
	sortOption = signal<'name_asc' | 'name_desc' | 'date_asc' | 'date_desc'>('date_desc');
	sortOption$ = toObservable(this.sortOption);

	/**
	 * The 0-indexed current page the component sits on, starting at -1 to
	 * initiate the first load when it is set to 0.
	 */
	currentPage = signal<number>(-1);
	currentPage$ = toObservable(this.currentPage);

	/** Determines whether a legend that explains badge categories is shown. */
	showLegend = signal<boolean>(false);

	/**
	 * The badges resulting from a query to the database with the given inputs of
	 * {@link searchQuery}, {@link selectedTags} and {@link sortOption}
	 */
	badges = signal<BadgeClassV3[]>([]);

	totalBadgeCount = signal<number>(0);

	/** Whether or not a next page of badge classes can be exists to be loaded. */
	hasNext = signal<boolean>(true);

	/**
	 * A signal controlling whether user scrolling should be observed or not.
	 * While new badges are loaded, user scrolling is usually disregarded
	 * and thus should be ignored.
	 **/
	observeScrolling = signal<boolean>(false);
	observeScrolling$ = toObservable(this.observeScrolling);

	/** Unique issuers of all badges. */
	issuers = signal<ApiIssuer[]>([]);
	issuers$ = toObservable(this.issuers);

	/** Selectable options to filter with. */
	tagsOptions = signal<ITag[]>([]);
	tagsOptions$ = toObservable(this.tagsOptions);

	/** A string used for displaying the amount of badges that is aware of the current language. */
	badgesPluralWord = toSignal(
		combineLatest(
			[
				toObservable(this.totalBadgeCount),
				this.translate.onLangChange.pipe(startWith(this.translate.currentLang)),
			],
			(badges, lang) => badges,
		).pipe(
			map((badgeCount) => {
				if (badgeCount === 0) return 'Badge.multiBadges';
				if (badgeCount === 1) return 'Badge.oneBadge';
				return 'Badge.multiBadges';
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
				if (issuers.length === 0) return 'Badge.noIssuers';
				if (issuers.length === 1) return 'Badge.oneIssuer';
				return 'Badge.multiIssuers';
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

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route);
		const title = this.title;

		title.setTitle(`Badges - ${this.configService.theme['serviceName'] || 'Badgr'}`);
	}

	ngOnInit() {
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
					concatMap((i) => this.loadRangeOfBadges(i.page, i.searchQuery, i.tags, i.sortOption)),
				)
				.subscribe((paginatedBadges) => {
					this.totalBadgeCount.set(paginatedBadges.count);
					this.hasNext.set(paginatedBadges?.next !== null);
					if (!paginatedBadges?.previous)
						// on the first page, set the whole array to make sure to not append anything
						this.badges.set(paginatedBadges?.results ?? []);
					else this.badges.update((currentBadges) => [...currentBadges, ...paginatedBadges.results]);
					this.observeScrolling.set(true);
				}),
		);

		// Scroll to the top when something resets
		// the list of badges (e.g. due to filtering)
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

	openLegend() {
		this.showLegend.set(true);
	}

	closeLegend() {
		this.showLegend.set(false);
	}

	onSearchQueryChange(query: string) {
		this.searchQuery.set(query);
		this.currentPage.set(0);
	}

	onLoadMoreClicked() {
		if (this.hasNext()) this.currentPage.update((p) => p + 1);
	}

	/**
	 * TrackByFunction to uniquely identify a BadgeClass
	 * @param index The index of the badgeclass within the iterable
	 * @param item The BadgeClass itself
	 * @returns The badge classes slug which uniquely identifies the badgeclass
	 */
	trackById(index: number, item: BadgeClassV3) {
		return item.slug;
	}

	removeTag(tag) {
		// remove on the control, triggering an update of the setter
		// and thus updating all dependent signals
		this.tagsControl.setValue(this.tagsControl.value.filter((t) => t != tag));
	}

	private fetchIssuers(): Promise<ApiIssuer[]> {
		return this.issuerService.listAllIssuers().then((i) => {
			this.issuers.set(i.filter((x) => !x.is_network && x.verified && x.ownerAcceptedTos));
			return i;
		});
	}

	private fetchAvailableTags(): Promise<ITag[]> {
		return this.catalogService.getBadgeTags().then((t) => {
			const tags: ITag[] = t.map((o) => ({ label: o, value: o }));
			this.tagsOptions.set(tags);
			return tags;
		});
	}

	private async loadRangeOfBadges(
		pageNumber: number,
		searchQuery: string,
		selectedTags: string[],
		sortOption: 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc',
	) {
		return await this.catalogService.getBadges(
			pageNumber * this.BADGES_PER_PAGE,
			this.BADGES_PER_PAGE,
			searchQuery,
			selectedTags,
			sortOption,
		);
	}
}

interface ITag {
	label: string;
	value: string;
}
