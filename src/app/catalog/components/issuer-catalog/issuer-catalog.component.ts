import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { FormControl, FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Map, NavigationControl, Popup } from 'maplibre-gl';
import {
	combineLatest,
	concatMap,
	debounceTime,
	distinctUntilChanged,
	filter,
	firstValueFrom,
	skip,
	Subscription,
	tap,
} from 'rxjs';

import { BaseRoutableComponent } from '../../../common/pages/base-routable.component';
import { SessionService } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { AppConfigService } from '../../../common/app-config.service';
import { UserProfileManager } from '../../../common/services/user-profile-manager.service';

import { CatalogService } from '~/catalog/catalog.service';
import { IssuerV3 } from '~/issuer/models/issuerv3.model';

import { preloadImageURL } from '../../../common/util/file-util';
import { appearAnimation } from '../../../common/animations/animations';

import { FormMessageComponent } from '~/common/components/form-message.component';
import { OebHeaderText } from '~/components/oeb-header-text.component';
import { CountUpModule } from 'ngx-countup';
import { NgIcon } from '@ng-icons/core';
import { OebGlobalSortSelectComponent } from '~/components/oeb-global-sort-select.component';
import { OebSelectComponent } from '~/components/select.component';
import { LoadingDotsComponent } from '~/common/components/loading-dots.component';
import { OebButtonComponent } from '~/components/oeb-button.component';
import { IssuerCardComponent } from '~/components/issuer-card/issuer-card.component';
import { NgClass } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { BgAwaitPromises } from '~/common/directives/bg-await-promises';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { createInfiniteScrollObserver } from '~/catalog/util/intersection-observer';

@Component({
	selector: 'app-issuer-catalog',
	templateUrl: './issuer-catalog.component.html',
	styleUrls: ['./issuer-catalog.component.css'],
	animations: [appearAnimation],
	imports: [
		TranslatePipe,
		FormMessageComponent,
		OebHeaderText,
		OebGlobalSortSelectComponent,
		OebSelectComponent,
		CountUpModule,
		NgIcon,
		NgClass,
		FormsModule,
		LoadingDotsComponent,
		OebButtonComponent,
		IssuerCardComponent,
		BgAwaitPromises,
		HlmInput,
		HlmIcon,
	],
})
export class IssuerCatalogComponent extends BaseRoutableComponent implements OnInit, AfterViewInit, OnDestroy {
	router = inject(Router);
	route = inject(ActivatedRoute);
	private title = inject(Title);
	private translate = inject(TranslateService);
	private configService = inject(AppConfigService);
	private profileManager = inject(UserProfileManager);
	private catalogService = inject(CatalogService);

	mapObject;
	@ViewChild('map')
	private mapContainer: ElementRef<HTMLElement>;

	issuerGeoJson;

	@ViewChild('loadMore') loadMore: ElementRef | undefined;

	readonly INPUT_DEBOUNCE_TIME = 400;
	readonly ISSUERS_PER_PAGE = 20;

	readonly issuerPlaceholderSrc = preloadImageURL('../../../../breakdown/static/images/placeholderavatar-issuer.svg');

	badgesDisplay: 'grid' | 'map' = 'grid';
	loggedIn = false;

	plural: any = {};
	issuerKeys: Record<string, any> = {};

	intersectionObserver?: IntersectionObserver;

	issuers = signal<IssuerV3[]>([]);
	totalCount = signal<number>(0);
	hasNext = signal<boolean>(true);

	currentPage = signal<number>(-1);
	currentPage$ = toObservable(this.currentPage);

	observeScrolling = signal<boolean>(false);
	observeScrolling$ = toObservable(this.observeScrolling);

	searchQuery = signal<string>('');
	searchQuery$ = toObservable(this.searchQuery);

	categoryFilter = signal<string>('');
	categoryFilter$ = toObservable(this.categoryFilter);

	sortOption = signal<'badges_desc' | 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc'>('badges_desc');
	sortOption$ = toObservable(this.sortOption);

	categoryControl = new FormControl('');
	sortControl = new FormControl('badges_desc');

	pageReadyPromise: Promise<unknown> = firstValueFrom(toObservable(this.issuers).pipe(skip(1)));

	pageSubscriptions: Subscription[] = [];

	categoryOptions = [
		{ label: 'Issuer.categories.schule', value: 'schule' },
		{ label: 'Issuer.categories.hochschule', value: 'hochschule' },
		{ label: 'Issuer.categories.jugendhilfe', value: 'jugendhilfe' },
		{ label: 'Issuer.categories.andere', value: 'andere' },
		{ label: 'Issuer.categories.allCategories', value: '' },
	];

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
			value: 'badge_desc',
			label: this.translate.instant('Issuer.badgeCount'),
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

	constructor() {
		super(inject(Router), inject(ActivatedRoute));
		this.title.setTitle(`Issuers – ${this.configService.theme['serviceName'] || 'Badgr'}`);
	}

	ngOnInit(): void {
		this.prepareTexts();

		this.pageSubscriptions.push(
			this.translate.onLangChange.subscribe(() => {
				this.prepareTexts();
			}),
		);
		this.pageSubscriptions.push(
			this.observeScrolling$.pipe(filter(() => this.intersectionObserver !== undefined)).subscribe((observe) => {
				if (observe) this.intersectionObserver!.observe(this.loadMore!.nativeElement);
				else this.intersectionObserver!.unobserve(this.loadMore!.nativeElement);
			}),
		);

		this.pageSubscriptions.push(
			combineLatest(
				[this.currentPage$, this.searchQuery$, this.categoryFilter$, this.sortOption$],
				(page, search, category, sort) => ({
					page,
					search,
					category,
					sort,
				}),
			)
				.pipe(
					debounceTime(this.INPUT_DEBOUNCE_TIME),
					filter((i) => i.page >= 0),
					distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
					tap(() => this.observeScrolling.set(false)),
					concatMap((i) => this.loadRangeOfIssuers(i.page, i.search, i.category, i.sort)),
				)
				.subscribe((response) => {
					this.totalCount.set(response.count);
					this.hasNext.set(response.next !== null);

					if (!response.previous) {
						this.issuers.set(response.results);
					} else {
						this.issuers.update((curr) => [...curr, ...response.results]);
					}

					this.observeScrolling.set(true);
				}),
		);

		this.pageSubscriptions.push(
			this.currentPage$.subscribe((p) => {
				if (p === 0) window?.scrollTo({ top: 0, behavior: 'smooth' });
			}),
		);

		this.pageSubscriptions.push(
			this.categoryControl.valueChanges.subscribe((value) => {
				this.categoryFilter.set(value ?? '');
				if (this.currentPage() > 0) this.currentPage.set(0);
			}),
		);

		this.pageSubscriptions.push(
			this.sortControl.valueChanges.subscribe((value: any) => {
				this.sortOption.set(value);
				if (this.currentPage() > 0) this.currentPage.set(0);
			}),
		);

		this.currentPage.set(0);
	}

	ngAfterViewInit(): void {
		this.intersectionObserver = createInfiniteScrollObserver(this.loadMore, {
			hasNext: this.hasNext,
			observeScrolling: this.observeScrolling,
			onLoadMore: () => {
				this.currentPage.update((p) => p + 1);
			},
		});

		const initialState = { lng: 10.5, lat: 51, zoom: 5 };
		const style: any = {
			version: 8,
			sources: {
				osm: {
					type: 'raster',
					tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
					tileSize: 256,
					attribution:
						'Map data & geocoding from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
					maxzoom: 19,
				},
			},
			layers: [
				{
					id: 'osm',
					type: 'raster',
					source: 'osm', // This must match the source key above
				},
			],
			glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
		};
		this.mapObject = new Map({
			container: this.mapContainer.nativeElement,
			style: style,
			center: [initialState.lng, initialState.lat],
			zoom: initialState.zoom,
		});

		this.mapObject.addControl(new NavigationControl());
		this.mapObject.on('load', () => {
			// Add an image to use as a custom marker
			this.mapObject.loadImage(
				'https://maplibre.org/maplibre-gl-js-docs/assets/osgeo-logo.png',
				function (error, image) {
					if (error) throw error;
					this.mapObject.addImage('custom-marker', image);
				},
			);
		});
	}

	ngOnDestroy(): void {
		this.pageSubscriptions.forEach((s) => s.unsubscribe());
		this.intersectionObserver?.disconnect();
	}

	private async loadRangeOfIssuers(
		pageNumber: number,
		searchQuery: string,
		category: string,
		sortOption: 'badges_desc' | 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc',
	) {
		return await this.catalogService.getIssuers(
			pageNumber * this.ISSUERS_PER_PAGE,
			this.ISSUERS_PER_PAGE,
			searchQuery,
			category,
			undefined,
			sortOption,
		);
	}

	onSearchQueryChange(query: string) {
		this.searchQuery.set(query);
		this.currentPage.set(0);
	}

	onLoadMoreClicked() {
		if (this.hasNext()) this.currentPage.update((p) => p + 1);
	}

	private prepareTexts(): void {
		this.issuerKeys = {
			schule: this.translate.instant('Issuer.schoolLabel'),
			hochschule: this.translate.instant('Issuer.universityLabel'),
			jugendhilfe: this.translate.instant('Issuer.youthWelfare'),
			andere: this.translate.instant('Issuer.othersLabel'),
			'n/a': this.translate.instant('General.notSpecified') ?? 'Keine Angabe',
		};

		this.plural = {
			issuer: {
				'=0': this.translate.instant('Issuer.noInstitutions'),
				'=1': '1 ' + this.translate.instant('Issuer.institution'),
				other: this.translate.instant('General.institutions'),
			},
			issuerText: {
				'=0': this.translate.instant('Issuer.institutionsIssued'),
				'=1': '1 ' + this.translate.instant('Issuer.institutionIssued'),
				other: '# ' + this.translate.instant('Issuer.institutionsIssued'),
			},
			badges: {
				'=0': this.translate.instant('Issuer.noBadges'),
				'=1': '<strong class="u-text-bold">1</strong> Badge',
				other: '<strong class="u-text-bold">#</strong> Badges',
			},
			learningPath: {
				'=0': this.translate.instant('General.noLearningPaths'),
				'=1': '1 ' + this.translate.instant('General.learningPath'),
				other: '# ' + this.translate.instant('General.learningPaths'),
			},
			recipient: {
				'=0': this.translate.instant('Issuer.noRecipient'),
				'=1': '1 ' + this.translate.instant('Issuer.recipient'),
				other: '# ' + this.translate.instant('Issuer.recipients'),
			},
		};
	}

	generateGeoJSON(issuers) {
		this.issuerGeoJson = {
			type: 'FeatureCollection',
			features: issuers
				.filter((issuer) => issuer.lat !== null && issuer.lon !== null)
				.map((issuer) => ({
					type: 'Feature',
					properties: {
						name: issuer.name,
						slug: issuer.slug,
						img: issuer.image,
						description: issuer.description,
						category: issuer.category,
					},
					geometry: {
						type: 'Point',
						coordinates: [issuer.lon, issuer.lat],
					},
				})),
		};

		if (!this.mapObject.getSource('issuers')) {
			this.mapObject.addSource('issuers', {
				type: 'geojson',
				data: this.issuerGeoJson,
				cluster: true,
				clusterRadius: 10,
			});
			this.mapObject.addLayer({
				id: 'issuers',
				type: 'circle',
				source: 'issuers',
				filter: ['!', ['has', 'point_count']],
				paint: {
					'circle-radius': {
						base: 4,
						stops: [
							[12, 6],
							[22, 180],
						],
					},
					'circle-color': [
						'match',
						['get', 'category'],
						'schule',
						'#fbb03b',
						'hochschule',
						'#e55e5e',
						'jugendhilfe',
						'#7e73ff',
						'andere',
						'#3bb2d0',
						'n/a',
						'#223b53',
						/* other */ '#ccc',
					],
				},
			});

			this.mapObject.addLayer({
				id: 'issuersCluster',
				type: 'circle',
				source: 'issuers',
				filter: ['has', 'point_count'],
				paint: {
					'circle-radius': {
						base: 10,
						stops: [
							[12, 10],
							[22, 180],
						],
					},
					'circle-color': [
						'match',
						['get', 'category'],
						'schule',
						'#fbb03b',
						'hochschule',
						'#e55e5e',
						'jugendhilfe',
						'#7e73ff',
						'andere',
						'#3bb2d0',
						'n/a',
						'#223b53',
						/* other */ '#ccc',
					],
				},
			});

			this.mapObject.addLayer({
				id: 'cluster-count',
				type: 'symbol',
				source: 'issuers',
				filter: ['has', 'point_count'],
				layout: {
					'text-field': '{point_count_abbreviated}',
					'text-font': ['Open Sans Regular'],
					'text-size': 12,
				},
			});

			this.mapObject.on('click', 'issuers', (e) => {
				// Copy coordinates array.
				const coordinates = e.features[0].geometry.coordinates.slice();
				const name = e.features[0].properties.name;
				const slug = e.features[0].properties.slug;
				const desc = e.features[0].properties.description;
				const img = e.features[0].properties.img;

				// Ensure that if the map is zoomed out such that multiple
				// copies of the feature are visible, the popup appears
				// over the copy being pointed to.
				while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
					coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
				}

				new Popup()
					.setLngLat(coordinates)
					.setHTML(
						'<div style="padding:5px"><a href="public/issuers/' +
							slug +
							'">' +
							name +
							'</a><br><p>' +
							desc +
							'</p></div>',
					)
					.addTo(this.mapObject);
			});

			this.mapObject.on('click', 'issuersCluster', (e) => {
				const coordinates = e.features[0].geometry.coordinates.slice();

				const features = this.mapObject.queryRenderedFeatures(e.point, {
					layers: ['issuersCluster'],
				});

				const clusterId = features[0].properties.cluster_id;
				var pointCount = features[0].properties.point_count;

				var htmlString = '<div style="padding:5px"><ul>';

				this.mapObject.getSource('issuers').getClusterLeaves(clusterId, pointCount, 0, (error, features) => {
					features.forEach((feature) => {
						htmlString +=
							'<li><a href="public/issuers/' +
							feature.properties.slug +
							'"><div class="color ' +
							feature.properties.category +
							'"></div>' +
							feature.properties.name +
							'</li>';
					});
					htmlString += '</ul></div>';

					new Popup().setLngLat(coordinates).setHTML(htmlString).addTo(this.mapObject);
				});
			});

			// Change the cursor to a pointer when the mouse is over the places layer.
			this.mapObject.on('mouseenter', 'issuers', () => {
				this.mapObject.getCanvas().style.cursor = 'pointer';
			});

			// Change it back to a pointer when it leaves.
			this.mapObject.on('mouseleave', 'issuers', () => {
				this.mapObject.getCanvas().style.cursor = '';
			});
		} else {
			this.mapObject.getSource('issuers').setData(this.issuerGeoJson);
		}
	}

	openMap(): void {
		this.badgesDisplay = 'map';
		setTimeout(() => this.mapObject.resize(), 50);
	}

	openGrid(): void {
		this.badgesDisplay = 'grid';
	}

	navigateToIssuer(issuer: IssuerV3): void {
		if (!this.loggedIn) {
			this.router.navigate(['/public/issuers/', issuer.slug]);
			return;
		}

		this.profileManager.userProfilePromise.then(() => {
			this.router.navigate(['/issuer/issuers/', issuer.slug]);
		});
	}

	get theme() {
		return this.configService.theme;
	}

	get issuersPluralWord(): string {
		return this.totalCount() === 1 ? '1 Institution' : this.translate.instant('General.institutions');
	}
}
