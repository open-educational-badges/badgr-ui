import { AfterViewInit, Component, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { BadgeClassEditFormComponent } from './badgeclass-edit-form.component';
import { AsyncPipe } from '@angular/common';
import { AUTH_PROVIDER } from '~/common/services/authentication-service';
import { Issuer } from '~/issuer/models/issuer.model';
import { Network } from '~/issuer/network.model';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { BadgeClassSelectTypeComponent } from '../badgeclass-select-type/badgeclass-select-type.component';
import { LearningPathEditFormComponent } from '../learningpath-edit-form/learningpath-edit-form.component';
import { CommonDialogsService } from '~/common/services/common-dialogs.service';
import { ConfirmDialog } from '~/common/dialogs/confirm-dialog.component';
import { NounprojectDialog } from '~/common/dialogs/nounproject-dialog/nounproject-dialog.component';
import { BadgeClass } from '~/issuer/models/badgeclass.model';
import { ApiBadgeClass } from '~/issuer/models/badgeclass-api.model';
import { CommonEntityManager } from '~/entity-manager/services/common-entity-manager.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgIcon } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { IssuerManager } from '~/issuer/services/issuer-manager.service';
import { LoadingDotsComponent } from '~/common/components/loading-dots.component';
import { OebButtonComponent } from '~/components/oeb-button.component';
import { FormsModule } from '@angular/forms';
import { HlmH1, HlmP } from '@spartan-ng/helm/typography';
import { toObservable } from '@angular/core/rxjs-interop';
import { concat, concatMap, first, from, mergeMap } from 'rxjs';
import { BadgeClassApiService } from '~/issuer/services/badgeclass-api.service';

@Component({
	selector: 'oeb-badgeclass-edit-form',
	template: `
		<base [href]="baseurl()" />
		<confirm-dialog #confirmDialog></confirm-dialog>
		<nounproject-dialog #nounprojectDialog></nounproject-dialog>
		@if (authService.isLoggedIn$ | async) {
			@if (issuer()) {
				@switch (currentRoute()) {
					@case ('select-action') {
						<div class="oeb-section-sm">
							<div class="oeb-headline-container-sm">
								<h1 hlmH1 class="tw-text-purple tw-font-black">
									{{ 'CreateBadge.selectBadge' | translate }}
								</h1>
							</div>
							<div class="md:tw-w-[530px] tw-w-[98%] tw-p-10">
								@if (userBadges()) {
									@for (b of userBadges(); track b) {
										<label class="radio tw-mb-2">
											<input type="radio" [(ngModel)]="badgeSelection" [value]="b" />
											<span class="radio-x-text">{{ b.name }}</span>
										</label>
									}
									<oeb-button
										type="button"
										[variant]="'secondary'"
										(click)="onChooseCreateNewBadge()"
										size="sm"
										[text]="'Issuer.createBadge' | translate"
										class="tw-inline-block tw-mr-4 tw-mt-4"
									/>
									<oeb-button
										type="button"
										[disabled]="!badgeSelection"
										(click)="onChooseBadge()"
										size="sm"
										[text]="'General.next' | translate"
										class="tw-inline-block tw-mt-4"
									/>
								} @else {
									<loading-dots />
								}
							</div>
						</div>
					}
					@case ('select') {
						<badgeclass-select-type />
					}
					@case ('create') {
						@if (badge()) {
							<badgeclass-edit-form
								(save)="onBadgeClassCreated()"
								(cancelEdit)="onCancel()"
								[issuer]="issuer()"
								[badgeClass]="badge()"
								isForked="false"
							/>
						} @else if (category()) {
							<badgeclass-edit-form
								(save)="onBadgeClassCreated()"
								(cancelEdit)="onCancel()"
								[issuer]="issuer()"
								[category]="category()"
								[isForked]="false"
								[initBadgeClass]="null"
							/>
						}
					}
					@case ('create-lp') {
						<learningpath-edit-form
							(save)="onBadgeClassCreated()"
							(cancelEdit)="onCancel()"
							[issuer]="issuer()"
						/>
					}
					@case ('finished') {
						<div class="tw-flex tw-items-center tw-gap-[20px] md:tw-w-[530px] tw-w-[98%] tw-p-10">
							<div class="oeb-icon-circle tw-my-6 tw-bg-green tw-w-[60px] tw-h-[60px]">
								<ng-icon hlm class="tw-text-purple tw-font-bold" size="xl" name="lucideCheck" />
							</div>

							<p
								[innerHTML]="
									badge()
										? ('LearningPath.savedSuccessfully' | translate)
										: ('CreateBadge.successfullyCreated' | translate)
								"
								class="tw-font-normal md:tw-text-[24px] md:tw-leading-[28.8px] tw-text-[16.8px] tw-leading-[px] tw-text-oebblack"
							></p>
						</div>
					}
					@case ('error') {
						<div class="tw-flex tw-items-center tw-gap-[20px] md:tw-w-[530px] tw-w-[98%] tw-p-10">
							<div class="oeb-icon-circle tw-my-6 tw-bg-green tw-w-[60px] tw-h-[60px]">
								<ng-icon hlm class="tw-text-purple tw-font-bold" size="xl" name="lucideAlert" />
							</div>

							<p
								[innerHTML]="'ErrorDialog.title' | translate"
								class="tw-font-normal md:tw-text-[24px] md:tw-leading-[28.8px] tw-text-[16.8px] tw-leading-[px] tw-text-oebblack"
							></p>
							<p
								[innerHTML]="errorContextInfo()"
								class="tw-font-normal md:tw-text-[24px] md:tw-leading-[28.8px] tw-text-[16.8px] tw-leading-[px] tw-text-oebblack"
							></p>
						</div>
					}
					@case ('unknown') {
						<div class="tw-flex tw-items-center tw-gap-[20px] md:tw-w-[530px] tw-w-[98%] tw-p-10">
							<div class="oeb-icon-circle tw-my-6 tw-bg-green tw-w-[60px] tw-h-[60px]">
								<ng-icon hlm class="tw-text-purple tw-font-bold" size="xl" name="lucideCircleAlert" />
							</div>

							<p
								class="tw-font-normal md:tw-text-[24px] md:tw-leading-[28.8px] tw-text-[16.8px] tw-leading-[px] tw-text-oebblack"
							>
								Uh oh! This is not supposed to happen. Something unknown has happened, please report
								this back to us.
							</p>
						</div>
					}
				}
			} @else {
				<div class="oeb-section-sm">
					<div class="oeb-headline-container-sm">
						<h1 hlmH1 class="tw-text-purple tw-font-black">{{ 'CreateBadge.selectIssuer' | translate }}</h1>
					</div>
					<div class="md:tw-w-[530px] tw-w-[98%] tw-p-10">
						@if (userIssuers()) {
							@for (i of userIssuers(); track i) {
								<label class="radio tw-mb-2">
									<input type="radio" [(ngModel)]="issuerSelection" [value]="i" />
									<span class="radio-x-text">{{ i.name }}</span>
								</label>
							}
							@if (userIssuers().length === 0) {
								<p hlmP>{{ 'CreateBadge.noIssuersAvailable' | translate }}</p>
							}
							<oeb-button
								type="button"
								[disabled]="!issuerSelection"
								(click)="onChooseIssuer()"
								size="sm"
								[text]="'General.next' | translate"
								class="tw-inline-block tw-mt-4"
							/>
						} @else {
							<loading-dots />
						}
					</div>
				</div>
			}
		} @else {
			<div class="tw-flex tw-items-center tw-gap-[20px] md:tw-w-[530px] tw-w-[98%] tw-p-10">
				<div class="oeb-icon-circle tw-my-6 tw-bg-green tw-w-[60px] tw-h-[60px]">
					<ng-icon hlm class="tw-text-purple tw-font-bold" size="xl" name="lucideLock" />
				</div>

				<p
					[innerHTML]="'Profile.loggingIn' | translate"
					class="tw-font-normal md:tw-text-[24px] md:tw-leading-[28.8px] tw-text-[16.8px] tw-leading-[px] tw-text-oebblack"
				></p>
			</div>
		}
	`,
	styleUrl: './oeb-badgeclass-edit-form.component.css',
	imports: [
		BadgeClassEditFormComponent,
		AsyncPipe,
		BadgeClassSelectTypeComponent,
		LearningPathEditFormComponent,
		ConfirmDialog,
		NounprojectDialog,
		NgIcon,
		HlmIcon,
		TranslatePipe,
		LoadingDotsComponent,
		OebButtonComponent,
		FormsModule,
		HlmP,
		HlmH1,
	],
})
export class OebBadgeClassEditForm implements AfterViewInit {
	/**
	 * Output fired when the badge creation/editing process finishes
	 * and there is nothing left for the user to do. The boolean indicates
	 * whether the process was successful or not.
	 */
	readonly finished = output<boolean>();

	/** URL of the server hosting the web component */
	readonly baseurl = input.required<SafeResourceUrl, string>({
		transform: (url: string | undefined) =>
			url ? this.domSanitizer.bypassSecurityTrustResourceUrl(url) : this.domSanitizer.bypassSecurityTrustHtml(''),
	});

	/** Authorization token to be used for communication with the server */
	readonly token = input.required<string>();

	/**
	 * Configuration object for the process.
	 * When passing undefined for the issuer, the web component will allow
	 * the user to choose an issuer before proceeding.
	 * When passing undefined for the badge, the web component assumes that
	 * a bade is to be created. If instead a badge selection should be shown,
	 * set showBadgeSelection to true. When ture, this option will override
	 * any option you will set for the badge parameter.
	 */
	readonly config = input<{
		issuer: Issuer | Network | undefined;
		badge: ApiBadgeClass | undefined;
		showBadgeSelection: boolean | undefined;
	}>();

	readonly badge = computed(() => {
		if (this.config()?.showBadgeSelection) return this.chosenBadge();
		if (this.config()?.badge) return new BadgeClass(this.entityManager, this.config().badge);
		else return undefined;
	});
	readonly userBadges = signal<BadgeClass[]>(undefined);
	readonly chosenBadge = signal<BadgeClass | undefined>(undefined);

	readonly issuer = computed(() => {
		if (this.config()?.issuer) return this.config()?.issuer;
		else return this.chosenIssuer();
	});
	readonly issuer$ = toObservable(this.issuer);
	readonly userIssuers = signal<Issuer[]>(undefined);
	readonly chosenIssuer = signal<Issuer | Network | undefined>(undefined);
	readonly category = signal<string>('participation');
	readonly errorContextInfo = signal<string>('');
	readonly domSanitizer = inject(DomSanitizer);
	readonly authService = inject(AUTH_PROVIDER);
	readonly commonDialogsService = inject(CommonDialogsService);
	readonly confirmDialog = viewChild.required<ConfirmDialog>('confirmDialog');
	readonly nounprojectDialog = viewChild.required<NounprojectDialog>('nounprojectDialog');
	readonly router = inject(Router);
	readonly activatedRoute = inject(ActivatedRoute);
	readonly entityManager = inject(CommonEntityManager);
	readonly issuerManager = inject(IssuerManager);
	readonly badgeClassApi = inject(BadgeClassApiService);
	readonly currentRoute = signal<
		'initial' | 'select-action' | 'select' | 'create' | 'create-lp' | 'finished' | 'error' | 'unknown'
	>('initial');

	issuerSelection: Issuer | Network | undefined = undefined;
	badgeSelection: BadgeClass | undefined = undefined;

	private signInEffect = effect(() => {
		const t = this.token();
		if (t === undefined) return;
		(async () => {
			await this.handleSignInWithToken(t);
		})();
	});

	private initialRouteEffect = effect(
		() => {
			if (this.config()) {
				if (this.config()?.issuer)
					this.activatedRoute.snapshot.params['issuerSlug'] = this.config().issuer.slug;
				if (this.config()?.showBadgeSelection) this.currentRoute.set('select-action');
				else this.currentRoute.set(this.config().badge ? 'create' : 'select');
				// Run the initial routing only once -> destroy it here and use manualCleanup
				this.initialRouteEffect.destroy();
			}
		},
		{ manualCleanup: true },
	);

	constructor() {
		this.router.events.subscribe((event) => {
			if (event instanceof NavigationEnd) {
				const url = event.url;
				const routeForUrl = (url) => {
					if (url === undefined) return 'initial';
					if (url.toString().indexOf('/badges/select') >= 0) return 'select';
					if (url.toString().indexOf('/badges/create') >= 0) return 'create';
					if (url.toString().indexOf('/learningpaths/create') >= 0) return 'create-lp';
					return 'unknown';
				};
				if (url.toString().indexOf('create/participation') >= 0) this.category.set('participation');
				if (url.toString().indexOf('create/competency') >= 0) this.category.set('competency');
				this.currentRoute.set(routeForUrl(url));
			}
		});

		this.authService.isLoggedIn$
			.pipe(
				first((loggedIn) => loggedIn === true),
				concatMap((_) =>
					this.issuer$.pipe(
						first((i) => i !== undefined),
						mergeMap((i) => from(this.badgeClassApi.getBadgesForIssuer(i.slug))),
					),
				),
			)
			.subscribe({
				next: (b) => {
					if (b.length === 0) this.currentRoute.set('select');
					else this.userBadges.set(b.map((badge) => new BadgeClass(this.entityManager, badge)));
				},
				error: (err) => {
					console.error(err);
					this.errorContextInfo.set('message' in err ? err.message : err.toString());
					this.currentRoute.set('error');
					this.finished.emit(false);
				},
			});
	}

	ngAfterViewInit(): void {
		this.commonDialogsService.init(this.confirmDialog(), undefined, undefined, this.nounprojectDialog());
	}

	async handleSignInWithToken(token: string) {
		try {
			await this.authService.validateToken(token);
			this.issuerManager.myIssuers$.subscribe((issuers) => this.userIssuers.set(issuers));
		} catch {
			this.currentRoute.set('error');
			this.errorContextInfo.set('AUTH_FAILED');
			this.finished.emit(false);
		}
	}

	onCancel() {
		if (this.config()?.showBadgeSelection) this.currentRoute.set('select-action');
		else this.currentRoute.set(this.config()?.badge ? 'create' : 'select');
	}

	onBadgeClassCreated() {
		this.currentRoute.set('finished');
		this.finished.emit(true);
	}

	onChooseIssuer() {
		if (this.issuerSelection) {
			this.activatedRoute.snapshot.params['issuerSlug'] = this.issuerSelection.slug;
			this.chosenIssuer.set(this.issuerSelection);
		}
	}

	onChooseCreateNewBadge() {
		this.currentRoute.set('select');
	}

	onChooseBadge() {
		if (this.badgeSelection) {
			this.chosenBadge.set(this.badgeSelection);

			if (
				this.badgeSelection.hasExtension('extensions:CategoryExtension') &&
				this.badgeSelection.extension['extensions:CategoryExtension'].category === 'learningpath'
			)
				this.currentRoute.set('create-lp');
			else this.currentRoute.set('create');
		}
	}
}
