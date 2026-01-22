import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Generic podium item interface for Top 3 ranking displays
 */
export interface PodiumItem {
	/** Rank position (1, 2, or 3) */
	rank: 1 | 2 | 3;
	/** Display name */
	name: string;
	/** Count/value to display */
	count: number;
	/** Optional icon name */
	icon?: string;
	/** Color for the count rectangle (gold, silver, bronze) */
	color: string;
	/** Image URL (badge image, institution logo, etc.) */
	image?: string;
	/** ID for routing (badgeId, institutionId, etc.) */
	id?: string;
	/** Custom data for click events */
	data?: any;
}

/**
 * Backward compatibility - alias for existing code
 */
export interface Top3Badge extends PodiumItem {
	badgeId?: string; // Alias for id, for backward compatibility
}

/**
 * Reusable Podium/Ranking Component
 * Displays up to 3 items in a podium layout with images
 * Dynamically adjusts to show only the actual number of items (1, 2, or 3)
 *
 * Use cases:
 * - Top 3 Badges (Dashboard Overview, Gender Detail)
 * - Institutions Ranking
 * - Any Top 3 ranking visualization
 *
 * @example Basic usage with badges:
 * ```html
 * <app-dashboard-top-badges
 *   [top3Badges]="badges"
 *   countLabelKey="Dashboard.badgesAwarded"
 *   routePrefix="/public/badges">
 * </app-dashboard-top-badges>
 * ```
 *
 * @example With click handler instead of routing:
 * ```html
 * <app-dashboard-top-badges
 *   [top3Badges]="institutions"
 *   countLabelKey="Dashboard.issuedBadges"
 *   [enableRouting]="false"
 *   (itemClick)="onInstitutionClick($event)">
 * </app-dashboard-top-badges>
 * ```
 */
@Component({
	selector: 'app-dashboard-top-badges',
	standalone: true,
	imports: [CommonModule, TranslatePipe, RouterLink],
	template: `
		<!-- Podium Display - Dynamic based on item count -->
		@if (top3Badges.length === 0) {
			<!-- Case: No items - Show empty state -->
			<div class="tw-flex tw-items-center tw-justify-center tw-h-48 tw-text-gray-500">
				{{ 'Dashboard.noDataAvailable' | translate }}
			</div>
		} @else {
		<div class="tw-flex tw-flex-col tw-px-4 tw-pt-10 tw-pb-4">
			<!-- Case: Only 1 Item - Center it -->
			@if (top3Badges.length === 1) {
				<!-- Bars Row - Single centered -->
				<div class="tw-flex tw-items-end tw-justify-center tw-gap-6">
					<div class="tw-flex-1 tw-max-w-[140px]">
						<div class="tw-relative tw-w-full">
							@if (top3Badges[0]?.image) {
								@if (useOctagonFrame) {
									<svg class="tw-absolute tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-z-10" style="top: 0; width: 80px; height: 80px;" viewBox="0 0 100 100">
										<defs>
											<clipPath id="imageClip1-1">
												<path d="M 30,4 L 70,4 Q 74,4 77,7 L 93,23 Q 96,26 96,30 L 96,70 Q 96,74 93,77 L 77,93 Q 74,96 70,96 L 30,96 Q 26,96 23,93 L 7,77 Q 4,74 4,70 L 4,30 Q 4,26 7,23 L 23,7 Q 26,4 30,4 Z"/>
											</clipPath>
										</defs>
										<path d="M 30,1 L 70,1 Q 75,1 78.5,4.5 L 95.5,21.5 Q 99,25 99,30 L 99,70 Q 99,75 95.5,78.5 L 78.5,95.5 Q 75,99 70,99 L 30,99 Q 25,99 21.5,95.5 L 4.5,78.5 Q 1,75 1,70 L 1,30 Q 1,25 4.5,21.5 L 21.5,4.5 Q 25,1 30,1 Z" fill="none" stroke="#492E98" stroke-width="1.5"/>
										<path d="M 30,3 L 70,3 Q 74,3 77,6 L 94,23 Q 97,26 97,30 L 97,70 Q 97,74 94,77 L 77,94 Q 74,97 70,97 L 30,97 Q 26,97 23,94 L 6,77 Q 3,74 3,70 L 3,30 Q 3,26 6,23 L 23,6 Q 26,3 30,3 Z" fill="none" stroke="#492E98" stroke-width="1" stroke-dasharray="3,2"/>
										<image [attr.href]="top3Badges[0].image" x="4" y="4" width="92" height="92" clip-path="url(#imageClip1-1)" preserveAspectRatio="xMidYMid slice"/>
									</svg>
								} @else {
									<img [src]="top3Badges[0].image" [alt]="top3Badges[0].name"
										class="tw-absolute tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-z-10 tw-w-20 tw-h-20 tw-object-contain"
										style="top: 0;">
								}
							}
							<div class="tw-w-full" style="height: 160px; background-color: #492E98; border-radius: 8px 8px 0 0;"></div>
						</div>
					</div>
				</div>
				<!-- Count Rectangle -->
				<div class="tw-flex tw-justify-center tw-gap-6 tw-mt-1">
					<div class="tw-flex-1 tw-max-w-[140px]">
						<div class="tw-w-full tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center" style="background-color: #FFCF0F; border-radius: 5px; height: 60px;">
							<span class="tw-text-lg tw-font-normal tw-text-center" style="color: #492E98;">{{ top3Badges[0]?.count || 0 }}</span>
							<span class="tw-text-xs tw-font-normal tw-text-center" style="color: #492E98;">{{ countLabelKey | translate }}</span>
						</div>
					</div>
				</div>
				<!-- Name -->
				<div class="tw-flex tw-justify-center tw-gap-6 tw-mt-3">
					<div class="tw-flex-1 tw-max-w-[140px] tw-text-center tw-px-1">
						@if (enableRouting && getItemId(top3Badges[0])) {
							<a [routerLink]="[routePrefix, getItemId(top3Badges[0])]"
								class="tw-text-sm tw-font-normal tw-leading-tight tw-block tw-no-underline hover:tw-underline"
								style="color: #492E98;">
								{{ top3Badges[0]?.name || 'Item' }}
							</a>
						} @else if (clickable) {
							<button
								(click)="onItemClick(top3Badges[0])"
								class="tw-text-sm tw-font-normal tw-leading-tight tw-block tw-no-underline hover:tw-underline tw-cursor-pointer tw-bg-transparent tw-border-none tw-p-0 tw-w-full"
								style="color: #492E98;">
								{{ top3Badges[0]?.name || 'Item' }}
							</button>
						} @else {
							<span class="tw-text-sm tw-font-normal tw-text-gray-800 tw-leading-tight tw-block">
								{{ top3Badges[0]?.name || 'Item' }}
							</span>
						}
					</div>
				</div>
			}

			<!-- Case: 2 Items - Show 2nd and 1st -->
			@if (top3Badges.length === 2) {
				<!-- Bars Row -->
				<div class="tw-flex tw-items-end tw-justify-center tw-gap-6">
					<!-- 2nd Place Bar -->
					<div class="tw-flex-1 tw-max-w-[140px]">
						<div class="tw-relative tw-w-full">
							@if (top3Badges[1]?.image) {
								@if (useOctagonFrame) {
									<svg class="tw-absolute tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-z-10" style="top: 0; width: 64px; height: 64px;" viewBox="0 0 100 100">
										<defs>
											<clipPath id="imageClip2-2">
												<path d="M 30,4 L 70,4 Q 74,4 77,7 L 93,23 Q 96,26 96,30 L 96,70 Q 96,74 93,77 L 77,93 Q 74,96 70,96 L 30,96 Q 26,96 23,93 L 7,77 Q 4,74 4,70 L 4,30 Q 4,26 7,23 L 23,7 Q 26,4 30,4 Z"/>
											</clipPath>
										</defs>
										<path d="M 30,1 L 70,1 Q 75,1 78.5,4.5 L 95.5,21.5 Q 99,25 99,30 L 99,70 Q 99,75 95.5,78.5 L 78.5,95.5 Q 75,99 70,99 L 30,99 Q 25,99 21.5,95.5 L 4.5,78.5 Q 1,75 1,70 L 1,30 Q 1,25 4.5,21.5 L 21.5,4.5 Q 25,1 30,1 Z" fill="none" stroke="#492E98" stroke-width="1.5"/>
										<path d="M 30,3 L 70,3 Q 74,3 77,6 L 94,23 Q 97,26 97,30 L 97,70 Q 97,74 94,77 L 77,94 Q 74,97 70,97 L 30,97 Q 26,97 23,94 L 6,77 Q 3,74 3,70 L 3,30 Q 3,26 6,23 L 23,6 Q 26,3 30,3 Z" fill="none" stroke="#492E98" stroke-width="1" stroke-dasharray="3,2"/>
										<image [attr.href]="top3Badges[1].image" x="4" y="4" width="92" height="92" clip-path="url(#imageClip2-2)" preserveAspectRatio="xMidYMid slice"/>
									</svg>
								} @else {
									<img [src]="top3Badges[1].image" [alt]="top3Badges[1].name"
										class="tw-absolute tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-z-10 tw-w-16 tw-h-16 tw-object-contain"
										style="top: 0;">
								}
							}
							<div class="tw-w-full" style="height: 120px; background-color: #492E98; border-radius: 8px 8px 0 0;"></div>
						</div>
					</div>
					<!-- 1st Place Bar (Tallest) -->
					<div class="tw-flex-1 tw-max-w-[140px]">
						<div class="tw-relative tw-w-full">
							@if (top3Badges[0]?.image) {
								@if (useOctagonFrame) {
									<svg class="tw-absolute tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-z-10" style="top: 0; width: 80px; height: 80px;" viewBox="0 0 100 100">
										<defs>
											<clipPath id="imageClip2-1">
												<path d="M 30,4 L 70,4 Q 74,4 77,7 L 93,23 Q 96,26 96,30 L 96,70 Q 96,74 93,77 L 77,93 Q 74,96 70,96 L 30,96 Q 26,96 23,93 L 7,77 Q 4,74 4,70 L 4,30 Q 4,26 7,23 L 23,7 Q 26,4 30,4 Z"/>
											</clipPath>
										</defs>
										<path d="M 30,1 L 70,1 Q 75,1 78.5,4.5 L 95.5,21.5 Q 99,25 99,30 L 99,70 Q 99,75 95.5,78.5 L 78.5,95.5 Q 75,99 70,99 L 30,99 Q 25,99 21.5,95.5 L 4.5,78.5 Q 1,75 1,70 L 1,30 Q 1,25 4.5,21.5 L 21.5,4.5 Q 25,1 30,1 Z" fill="none" stroke="#492E98" stroke-width="1.5"/>
										<path d="M 30,3 L 70,3 Q 74,3 77,6 L 94,23 Q 97,26 97,30 L 97,70 Q 97,74 94,77 L 77,94 Q 74,97 70,97 L 30,97 Q 26,97 23,94 L 6,77 Q 3,74 3,70 L 3,30 Q 3,26 6,23 L 23,6 Q 26,3 30,3 Z" fill="none" stroke="#492E98" stroke-width="1" stroke-dasharray="3,2"/>
										<image [attr.href]="top3Badges[0].image" x="4" y="4" width="92" height="92" clip-path="url(#imageClip2-1)" preserveAspectRatio="xMidYMid slice"/>
									</svg>
								} @else {
									<img [src]="top3Badges[0].image" [alt]="top3Badges[0].name"
										class="tw-absolute tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-z-10 tw-w-20 tw-h-20 tw-object-contain"
										style="top: 0;">
								}
							}
							<div class="tw-w-full" style="height: 160px; background-color: #492E98; border-radius: 8px 8px 0 0;"></div>
						</div>
					</div>
				</div>
				<!-- Count Rectangles Row -->
				<div class="tw-flex tw-justify-center tw-gap-6 tw-mt-1">
					<!-- 2nd Place Rectangle -->
					<div class="tw-flex-1 tw-max-w-[140px]">
						<div class="tw-w-full tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center" style="background-color: #DEDEDE; border-radius: 5px; height: 60px;">
							<span class="tw-text-lg tw-font-normal tw-text-center" style="color: #492E98;">{{ top3Badges[1]?.count || 0 }}</span>
							<span class="tw-text-xs tw-font-normal tw-text-center" style="color: #492E98;">{{ countLabelKey | translate }}</span>
						</div>
					</div>
					<!-- 1st Place Rectangle -->
					<div class="tw-flex-1 tw-max-w-[140px]">
						<div class="tw-w-full tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center" style="background-color: #FFCF0F; border-radius: 5px; height: 60px;">
							<span class="tw-text-lg tw-font-normal tw-text-center" style="color: #492E98;">{{ top3Badges[0]?.count || 0 }}</span>
							<span class="tw-text-xs tw-font-normal tw-text-center" style="color: #492E98;">{{ countLabelKey | translate }}</span>
						</div>
					</div>
				</div>
				<!-- Names Row -->
				<div class="tw-flex tw-justify-center tw-gap-6 tw-mt-3">
					<!-- 2nd Place Name -->
					<div class="tw-flex-1 tw-max-w-[140px] tw-text-center tw-px-1">
						@if (enableRouting && getItemId(top3Badges[1])) {
							<a [routerLink]="[routePrefix, getItemId(top3Badges[1])]"
								class="tw-text-sm tw-font-normal tw-leading-tight tw-block tw-no-underline hover:tw-underline"
								style="color: #492E98;">
								{{ top3Badges[1]?.name || 'Item' }}
							</a>
						} @else if (clickable) {
							<button
								(click)="onItemClick(top3Badges[1])"
								class="tw-text-sm tw-font-normal tw-leading-tight tw-block tw-no-underline hover:tw-underline tw-cursor-pointer tw-bg-transparent tw-border-none tw-p-0 tw-w-full"
								style="color: #492E98;">
								{{ top3Badges[1]?.name || 'Item' }}
							</button>
						} @else {
							<span class="tw-text-sm tw-font-normal tw-text-gray-800 tw-leading-tight tw-block">
								{{ top3Badges[1]?.name || 'Item' }}
							</span>
						}
					</div>
					<!-- 1st Place Name -->
					<div class="tw-flex-1 tw-max-w-[140px] tw-text-center tw-px-1">
						@if (enableRouting && getItemId(top3Badges[0])) {
							<a [routerLink]="[routePrefix, getItemId(top3Badges[0])]"
								class="tw-text-sm tw-font-normal tw-leading-tight tw-block tw-no-underline hover:tw-underline"
								style="color: #492E98;">
								{{ top3Badges[0]?.name || 'Item' }}
							</a>
						} @else if (clickable) {
							<button
								(click)="onItemClick(top3Badges[0])"
								class="tw-text-sm tw-font-normal tw-leading-tight tw-block tw-no-underline hover:tw-underline tw-cursor-pointer tw-bg-transparent tw-border-none tw-p-0 tw-w-full"
								style="color: #492E98;">
								{{ top3Badges[0]?.name || 'Item' }}
							</button>
						} @else {
							<span class="tw-text-sm tw-font-normal tw-text-gray-800 tw-leading-tight tw-block">
								{{ top3Badges[0]?.name || 'Item' }}
							</span>
						}
					</div>
				</div>
			}

			<!-- Case: 3 or more Items - Full Podium (2nd - 1st - 3rd) -->
			@if (top3Badges.length >= 3) {
				<!-- Bars Row (aligned at bottom) -->
				<div class="tw-flex tw-items-end tw-justify-center tw-gap-6">
					<!-- 2nd Place Bar -->
					<div class="tw-flex-1 tw-max-w-[140px]">
						<div class="tw-relative tw-w-full">
							@if (top3Badges[1]?.image) {
								@if (useOctagonFrame) {
									<svg class="tw-absolute tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-z-10" style="top: 0; width: 64px; height: 64px;" viewBox="0 0 100 100">
										<defs>
											<clipPath id="imageClip3-2">
												<path d="M 30,4 L 70,4 Q 74,4 77,7 L 93,23 Q 96,26 96,30 L 96,70 Q 96,74 93,77 L 77,93 Q 74,96 70,96 L 30,96 Q 26,96 23,93 L 7,77 Q 4,74 4,70 L 4,30 Q 4,26 7,23 L 23,7 Q 26,4 30,4 Z"/>
											</clipPath>
										</defs>
										<path d="M 30,1 L 70,1 Q 75,1 78.5,4.5 L 95.5,21.5 Q 99,25 99,30 L 99,70 Q 99,75 95.5,78.5 L 78.5,95.5 Q 75,99 70,99 L 30,99 Q 25,99 21.5,95.5 L 4.5,78.5 Q 1,75 1,70 L 1,30 Q 1,25 4.5,21.5 L 21.5,4.5 Q 25,1 30,1 Z" fill="none" stroke="#492E98" stroke-width="1.5"/>
										<path d="M 30,3 L 70,3 Q 74,3 77,6 L 94,23 Q 97,26 97,30 L 97,70 Q 97,74 94,77 L 77,94 Q 74,97 70,97 L 30,97 Q 26,97 23,94 L 6,77 Q 3,74 3,70 L 3,30 Q 3,26 6,23 L 23,6 Q 26,3 30,3 Z" fill="none" stroke="#492E98" stroke-width="1" stroke-dasharray="3,2"/>
										<image [attr.href]="top3Badges[1].image" x="4" y="4" width="92" height="92" clip-path="url(#imageClip3-2)" preserveAspectRatio="xMidYMid slice"/>
									</svg>
								} @else {
									<img [src]="top3Badges[1].image" [alt]="top3Badges[1].name"
										class="tw-absolute tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-z-10 tw-w-16 tw-h-16 tw-object-contain"
										style="top: 0;">
								}
							}
							<div class="tw-w-full" style="height: 120px; background-color: #492E98; border-radius: 8px 8px 0 0;"></div>
						</div>
					</div>
					<!-- 1st Place Bar (Tallest) -->
					<div class="tw-flex-1 tw-max-w-[140px]">
						<div class="tw-relative tw-w-full">
							@if (top3Badges[0]?.image) {
								@if (useOctagonFrame) {
									<svg class="tw-absolute tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-z-10" style="top: 0; width: 80px; height: 80px;" viewBox="0 0 100 100">
										<defs>
											<clipPath id="imageClip3-1">
												<path d="M 30,4 L 70,4 Q 74,4 77,7 L 93,23 Q 96,26 96,30 L 96,70 Q 96,74 93,77 L 77,93 Q 74,96 70,96 L 30,96 Q 26,96 23,93 L 7,77 Q 4,74 4,70 L 4,30 Q 4,26 7,23 L 23,7 Q 26,4 30,4 Z"/>
											</clipPath>
										</defs>
										<path d="M 30,1 L 70,1 Q 75,1 78.5,4.5 L 95.5,21.5 Q 99,25 99,30 L 99,70 Q 99,75 95.5,78.5 L 78.5,95.5 Q 75,99 70,99 L 30,99 Q 25,99 21.5,95.5 L 4.5,78.5 Q 1,75 1,70 L 1,30 Q 1,25 4.5,21.5 L 21.5,4.5 Q 25,1 30,1 Z" fill="none" stroke="#492E98" stroke-width="1.5"/>
										<path d="M 30,3 L 70,3 Q 74,3 77,6 L 94,23 Q 97,26 97,30 L 97,70 Q 97,74 94,77 L 77,94 Q 74,97 70,97 L 30,97 Q 26,97 23,94 L 6,77 Q 3,74 3,70 L 3,30 Q 3,26 6,23 L 23,6 Q 26,3 30,3 Z" fill="none" stroke="#492E98" stroke-width="1" stroke-dasharray="3,2"/>
										<image [attr.href]="top3Badges[0].image" x="4" y="4" width="92" height="92" clip-path="url(#imageClip3-1)" preserveAspectRatio="xMidYMid slice"/>
									</svg>
								} @else {
									<img [src]="top3Badges[0].image" [alt]="top3Badges[0].name"
										class="tw-absolute tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-z-10 tw-w-20 tw-h-20 tw-object-contain"
										style="top: 0;">
								}
							}
							<div class="tw-w-full" style="height: 160px; background-color: #492E98; border-radius: 8px 8px 0 0;"></div>
						</div>
					</div>
					<!-- 3rd Place Bar -->
					<div class="tw-flex-1 tw-max-w-[140px]">
						<div class="tw-relative tw-w-full">
							@if (top3Badges[2]?.image) {
								@if (useOctagonFrame) {
									<svg class="tw-absolute tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-z-10" style="top: 0; width: 64px; height: 64px;" viewBox="0 0 100 100">
										<defs>
											<clipPath id="imageClip3-3">
												<path d="M 30,4 L 70,4 Q 74,4 77,7 L 93,23 Q 96,26 96,30 L 96,70 Q 96,74 93,77 L 77,93 Q 74,96 70,96 L 30,96 Q 26,96 23,93 L 7,77 Q 4,74 4,70 L 4,30 Q 4,26 7,23 L 23,7 Q 26,4 30,4 Z"/>
											</clipPath>
										</defs>
										<path d="M 30,1 L 70,1 Q 75,1 78.5,4.5 L 95.5,21.5 Q 99,25 99,30 L 99,70 Q 99,75 95.5,78.5 L 78.5,95.5 Q 75,99 70,99 L 30,99 Q 25,99 21.5,95.5 L 4.5,78.5 Q 1,75 1,70 L 1,30 Q 1,25 4.5,21.5 L 21.5,4.5 Q 25,1 30,1 Z" fill="none" stroke="#492E98" stroke-width="1.5"/>
										<path d="M 30,3 L 70,3 Q 74,3 77,6 L 94,23 Q 97,26 97,30 L 97,70 Q 97,74 94,77 L 77,94 Q 74,97 70,97 L 30,97 Q 26,97 23,94 L 6,77 Q 3,74 3,70 L 3,30 Q 3,26 6,23 L 23,6 Q 26,3 30,3 Z" fill="none" stroke="#492E98" stroke-width="1" stroke-dasharray="3,2"/>
										<image [attr.href]="top3Badges[2].image" x="4" y="4" width="92" height="92" clip-path="url(#imageClip3-3)" preserveAspectRatio="xMidYMid slice"/>
									</svg>
								} @else {
									<img [src]="top3Badges[2].image" [alt]="top3Badges[2].name"
										class="tw-absolute tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-z-10 tw-w-16 tw-h-16 tw-object-contain"
										style="top: 0;">
								}
							}
							<div class="tw-w-full" style="height: 90px; background-color: #492E98; border-radius: 8px 8px 0 0;"></div>
						</div>
					</div>
				</div>
				<!-- Count Rectangles Row -->
				<div class="tw-flex tw-justify-center tw-gap-6 tw-mt-1">
					<!-- 2nd Place Rectangle -->
					<div class="tw-flex-1 tw-max-w-[140px]">
						<div class="tw-w-full tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center" style="background-color: #DEDEDE; border-radius: 5px; height: 60px;">
							<span class="tw-text-lg tw-font-normal tw-text-center" style="color: #492E98;">{{ top3Badges[1]?.count || 0 }}</span>
							<span class="tw-text-xs tw-font-normal tw-text-center" style="color: #492E98;">{{ countLabelKey | translate }}</span>
						</div>
					</div>
					<!-- 1st Place Rectangle -->
					<div class="tw-flex-1 tw-max-w-[140px]">
						<div class="tw-w-full tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center" style="background-color: #FFCF0F; border-radius: 5px; height: 60px;">
							<span class="tw-text-lg tw-font-normal tw-text-center" style="color: #492E98;">{{ top3Badges[0]?.count || 0 }}</span>
							<span class="tw-text-xs tw-font-normal tw-text-center" style="color: #492E98;">{{ countLabelKey | translate }}</span>
						</div>
					</div>
					<!-- 3rd Place Rectangle -->
					<div class="tw-flex-1 tw-max-w-[140px]">
						<div class="tw-w-full tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center" style="background-color: #DEB200; border-radius: 5px; height: 60px;">
							<span class="tw-text-lg tw-font-normal tw-text-center" style="color: #492E98;">{{ top3Badges[2]?.count || 0 }}</span>
							<span class="tw-text-xs tw-font-normal tw-text-center" style="color: #492E98;">{{ countLabelKey | translate }}</span>
						</div>
					</div>
				</div>
				<!-- Names Row -->
				<div class="tw-flex tw-justify-center tw-gap-6 tw-mt-3">
					<!-- 2nd Place Name -->
					<div class="tw-flex-1 tw-max-w-[140px] tw-text-center tw-px-1">
						@if (enableRouting && getItemId(top3Badges[1])) {
							<a [routerLink]="[routePrefix, getItemId(top3Badges[1])]"
								class="tw-text-sm tw-font-normal tw-leading-tight tw-block tw-no-underline hover:tw-underline"
								style="color: #492E98;">
								{{ top3Badges[1]?.name || 'Item' }}
							</a>
						} @else if (clickable) {
							<button
								(click)="onItemClick(top3Badges[1])"
								class="tw-text-sm tw-font-normal tw-leading-tight tw-block tw-no-underline hover:tw-underline tw-cursor-pointer tw-bg-transparent tw-border-none tw-p-0 tw-w-full"
								style="color: #492E98;">
								{{ top3Badges[1]?.name || 'Item' }}
							</button>
						} @else {
							<span class="tw-text-sm tw-font-normal tw-text-gray-800 tw-leading-tight tw-block">
								{{ top3Badges[1]?.name || 'Item' }}
							</span>
						}
					</div>
					<!-- 1st Place Name -->
					<div class="tw-flex-1 tw-max-w-[140px] tw-text-center tw-px-1">
						@if (enableRouting && getItemId(top3Badges[0])) {
							<a [routerLink]="[routePrefix, getItemId(top3Badges[0])]"
								class="tw-text-sm tw-font-normal tw-leading-tight tw-block tw-no-underline hover:tw-underline"
								style="color: #492E98;">
								{{ top3Badges[0]?.name || 'Item' }}
							</a>
						} @else if (clickable) {
							<button
								(click)="onItemClick(top3Badges[0])"
								class="tw-text-sm tw-font-normal tw-leading-tight tw-block tw-no-underline hover:tw-underline tw-cursor-pointer tw-bg-transparent tw-border-none tw-p-0 tw-w-full"
								style="color: #492E98;">
								{{ top3Badges[0]?.name || 'Item' }}
							</button>
						} @else {
							<span class="tw-text-sm tw-font-normal tw-text-gray-800 tw-leading-tight tw-block">
								{{ top3Badges[0]?.name || 'Item' }}
							</span>
						}
					</div>
					<!-- 3rd Place Name -->
					<div class="tw-flex-1 tw-max-w-[140px] tw-text-center tw-px-1">
						@if (enableRouting && getItemId(top3Badges[2])) {
							<a [routerLink]="[routePrefix, getItemId(top3Badges[2])]"
								class="tw-text-sm tw-font-normal tw-leading-tight tw-block tw-no-underline hover:tw-underline"
								style="color: #492E98;">
								{{ top3Badges[2]?.name || 'Item' }}
							</a>
						} @else if (clickable) {
							<button
								(click)="onItemClick(top3Badges[2])"
								class="tw-text-sm tw-font-normal tw-leading-tight tw-block tw-no-underline hover:tw-underline tw-cursor-pointer tw-bg-transparent tw-border-none tw-p-0 tw-w-full"
								style="color: #492E98;">
								{{ top3Badges[2]?.name || 'Item' }}
							</button>
						} @else {
							<span class="tw-text-sm tw-font-normal tw-text-gray-800 tw-leading-tight tw-block">
								{{ top3Badges[2]?.name || 'Item' }}
							</span>
						}
					</div>
				</div>
			}
		</div>
		}
	`,
	styles: [`
		.podium-position {
			transition: transform 0.2s ease;
		}

		.podium-position:hover {
			transform: translateY(-4px);
		}

		/* Octagon border for institution images - uses drop-shadow for border effect */
		.octagon-border {
			clip-path: polygon(
				30% 0%, 70% 0%,
				100% 30%, 100% 70%,
				70% 100%, 30% 100%,
				0% 70%, 0% 30%
			);
			filter:
				drop-shadow(1.5px 0 0 #492E98)
				drop-shadow(-1.5px 0 0 #492E98)
				drop-shadow(0 1.5px 0 #492E98)
				drop-shadow(0 -1.5px 0 #492E98);
			background: white;
		}
	`]
})
export class DashboardTopBadgesComponent {
	/**
	 * Array of items to display (max 3 will be shown in podium)
	 */
	@Input() top3Badges: Top3Badge[] = [];

	/**
	 * Translation key for the count label (e.g., 'Dashboard.badgesAwarded', 'Dashboard.issuedBadges')
	 * @default 'Dashboard.badgesAwarded'
	 */
	@Input() countLabelKey: string = 'Dashboard.badgesAwarded';

	/**
	 * Route prefix for item links (e.g., '/public/badges', '/issuer/issuers')
	 * @default '/public/badges'
	 */
	@Input() routePrefix: string = '/public/badges';

	/**
	 * Whether to enable routing on item names
	 * Set to false if using itemClick event instead
	 * @default true
	 */
	@Input() enableRouting: boolean = true;

	/**
	 * Whether items are clickable (emits itemClick event)
	 * Only used when enableRouting is false
	 * @default false
	 */
	@Input() clickable: boolean = false;

	/**
	 * Whether to use octagon frame for images (for institutions)
	 * When true, images are displayed in a rounded octagon with solid and dotted borders
	 * @default false
	 */
	@Input() useOctagonFrame: boolean = false;

	/**
	 * Event emitted when an item is clicked (only when clickable=true and enableRouting=false)
	 */
	@Output() itemClick = new EventEmitter<Top3Badge>();

	/**
	 * Get the ID for routing - supports both 'id' and legacy 'badgeId'
	 */
	getItemId(item: Top3Badge | undefined): string | undefined {
		if (!item) return undefined;
		return item.id || item.badgeId;
	}

	/**
	 * Handle item click
	 */
	onItemClick(item: Top3Badge): void {
		if (this.clickable) {
			this.itemClick.emit(item);
		}
	}
}
