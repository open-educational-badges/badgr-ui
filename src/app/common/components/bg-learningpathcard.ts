import {
	Component,
	EventEmitter,
	Input,
	HostBinding,
	Output,
	ViewChild,
	ElementRef,
	AfterViewInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgTemplateOutlet, SlicePipe, NgClass } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { BgImageStatusPlaceholderDirective } from '../directives/bg-image-status-placeholder.directive';
import { OebProgressComponent } from '../../components/oeb-progress.component';
import { TranslatePipe } from '@ngx-translate/core';
import { HourPipe } from '../pipes/hourPipe';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmP } from '@spartan-ng/helm/typography';

type MatchOrProgressType = { match?: string; progress?: number };

@Component({
	selector: 'bg-learningpathcard',
	host: {
		class: 'tw-rounded-[10px] tw-h-[410px] tw-max-w-[392px] tw-border-solid tw-relative tw-p-6 tw-block tw-overflow-hidden oeb-badge-card',
	},
	template: `
		@if (disableLink) {
			<ng-container *ngTemplateOutlet="contentTemplate" />
		} @else {
			<a [routerLink]="routePath">
				<ng-container *ngTemplateOutlet="contentTemplate" />
			</a>
		}

		<ng-template #contentTemplate>
			<div class="tw-flex tw-flex-col tw-h-full">
				<div
					class="tw-bg-[var(--color-lightgray)] tw-w-full tw-relative tw-h-[175px] tw-items-center tw-flex tw-justify-center tw-p-2 tw-rounded-[3px]"
				>
					@if (!completed) {
						<div class="tw-absolute tw-top-[10px] tw-right-[10px]">
							<img
								src="assets/oeb/images/learningPath/learningPathIcon.svg"
								class="tw-w-[30px]"
								alt="LearningPath"
							/>
						</div>
					}
					@if (completed) {
						<div
							class="tw-absolute tw-top-[10px] tw-right-[10px] tw-flex tw-justify-center tw-items-center tw-gap-2"
						>
							<div class="tw-inline-block">
								<img
									src="assets/oeb/images/learningPath/learningPathIcon.svg"
									class="tw-w-[30px]"
									alt="LearningPath"
								/>
							</div>
							<div
								class="tw-bg-white tw-inline-flex tw-rounded-full tw-justify-center tw-items-center tw-border-solid tw-border-green tw-border-[3px]"
							>
								<ng-icon
									hlm
									class="tw-text-purple tw-box-border tw-w-[26px] tw-h-[26px]"
									name="lucideCheck"
								/>
							</div>
						</div>
					}

					<img
						class="tw-w-[145px] tw-h-[145px]"
						[loaded-src]="badgeImage"
						[loading-src]="badgeLoadingImageUrl"
						[error-src]="badgeFailedImageUrl"
						width="38"
					/>
				</div>

				<div class="tw-mt-6 tw-pb-2">
					<p #titleElement>
						<span
							class="tw-font-semibold tw-text-oebblack tw-text-[22px] tw-leading-[26px] oeb-break-words"
							>{{ name }}</span
						>
					</p>
					<p class="tw-mt-2">
						<span class="tw-text-purple tw-uppercase">
							{{ 'Issuer.learningPathCreateHeadline' | translate }}
						</span>
					</p>
					<p class="tw-overflow-hidden">
						<a class="tw-whitespace-nowrap tw-overflow-hidden tw-text-ellipsis tw-block tw-text-oebblack">
							{{ 'General.of' | translate }} {{ issuerTitle }}
						</a>
					</p>
				</div>

				<div [ngClass]="middleSectionClass">
					@if (!isProgress) {
						<div class="tw-gap-1 tw-flex tw-flex-wrap">
							@for (tag of tags | slice: 0 : 3; track tag; let last = $last) {
								<div hlmP size="sm" class="oeb-tag">
									{{ tag }}
								</div>
							}
						</div>
					}
					@if (isMatch) {
						<div>
							<div
								class="tw-px-[11.55px] tw-py-[3.85px] tw-bg-lightpurple tw-rounded-[95px] tw-inline-block"
							>
								<span class="tw-text-sm tw-text-purple">{{ this.isMatch }} Badges</span>
							</div>
						</div>
					} @else {
						@if (progress !== null) {
							<div class="tw-w-full tw-flex tw-justify-center tw-items-center">
								<oeb-progress
									class="tw-w-full tw-h-7 tw-relative tw-inline-flex tw-overflow-hidden tw-rounded-3xl tw-bg-white tw-items-center"
									[variant]="'purple'"
									[value]="progressValue"
									[template]="requested ? requestedTemplate : progressTemplate"
								></oeb-progress>
							</div>
						}
					}
					<ng-template #progressTemplate>
						<div class="tw-absolute tw-w-full tw-text-left">
							<span class="tw-ml-2 tw-text-sm tw-text-[#E0F2FE]"
								>{{ 'General.learningPath' | translate }}
								@if (!completed) {
									<span>{{ progressValue }}%</span>
								}
								{{ 'LearningPath.finished' | translate }}</span
							>
						</div>
					</ng-template>
					<ng-template #requestedTemplate>
						<div class="tw-absolute tw-w-full tw-text-left tw-flex tw-items-center">
							<span class="tw-bg-purple tw-rounded-[50%] tw-h-[20px] tw-w-[20px] tw-ml-2">
								<ng-icon hlm variant="sm" class="tw-text-white tw-box-border" name="lucideCheck" />
							</span>
							<span class="tw-ml-2 tw-text-sm tw-text-purple">{{
								'LearningPath.successRequestPath' | translate
							}}</span>
						</div>
					</ng-template>
				</div>

				<div
					[ngClass]="studyLoadClass"
					class="tw-mt-auto tw-flex tw-flex-row tw-gap-4 tw-text-xs tw-items-center"
				>
					<ng-icon hlm name="lucideClock" />
					<span>{{ studyLoad | hourPipe }} {{ 'RecBadge.hours' | translate }}</span>
				</div>
			</div>
		</ng-template>
	`,
	imports: [
		RouterLink,
		NgIcon,
		HlmIcon,
		BgImageStatusPlaceholderDirective,
		HlmP,
		OebProgressComponent,
		SlicePipe,
		TranslatePipe,
		HourPipe,
		NgTemplateOutlet,
		NgClass,
	],
})
export class BgLearningPathCard implements AfterViewInit {
	readonly badgeLoadingImageUrl = 'breakdown/static/images/badge-loading.svg';
	readonly badgeFailedImageUrl = 'breakdown/static/images/badge-failed.svg';
	private _matchOrProgress: MatchOrProgressType;
	isTitleTwoLines = false;

	@ViewChild('titleElement') titleElement?: ElementRef;
	@Input() slug: string;
	@Input() issuerSlug: string;
	@Input() badgeImage: string;
	@Input() name: string;
	@Input() description: string;
	@Input() badgeIssueDate: string;
	@Input() badgeClass: string;
	@Input() issuerTitle: string;
	@Input() tags: string[];
	@Input() public = true;
	@Input() studyLoad: number;
	@Input() completed: boolean = false;
	@Input() requested: boolean = false;
	@Input() progress: number | null = null;
	@Input() match: string | null = null;
	@Output() shareClicked = new EventEmitter<MouseEvent>();
	@Input() disableLink: boolean = false;

	@HostBinding('class') get hostClasses(): string {
		if (this.isProgress && this.progress / this.studyLoad < 1 && !this.completed) {
			return 'tw-bg-[var(--color-lightgreen)] tw-border-purple tw-border';
		} else if (this.isProgress && this.progress / this.studyLoad === 1 && !this.completed && !this.requested) {
			return 'tw-bg-[var(--color-lightgreen)] tw-border-green tw-border-4';
		} else {
			return 'tw-bg-white tw-border-purple tw-border';
		}
	}

	@Input() set matchOrProgress(value: MatchOrProgressType) {
		if (value && 'match' in value && 'progress' in value) {
			throw new Error('Only one of "match" or "progress" can be set.');
		}
		this._matchOrProgress = value;
	}

	ngAfterViewInit() {
		if (this.titleElement) {
			const height = this.titleElement.nativeElement.offsetHeight;
			this.isTitleTwoLines = height > 30;
		}
	}

	get middleSectionClass(): string {
		if (!this.isProgress) {
			return 'tw-pb-[50px]';
		}
		return this.isTitleTwoLines ? 'tw-py-3' : 'tw-pt-6 tw-pb-[26px]';
	}

	get studyLoadClass(): string {
		if (this.completed || this.progressValue === 0) {
			return 'tw-text-darkgrey';
		}
		return 'tw-text-oebblack tw-font-semibold';
	}

	get isMatch(): string | undefined {
		return this._matchOrProgress?.match;
	}

	get isProgress(): boolean {
		return this.progress !== null;
	}

	get progressValue(): number {
		if (this.completed) {
			return 100;
		}
		if (!this.studyLoad || this.studyLoad === 0) {
			return 0;
		}
		return Math.floor(((this.progress ?? 0) / this.studyLoad) * 100);
	}

	get routePath(): any[] {
		if (!this.public && this.issuerSlug) {
			return ['/issuer/issuers/', this.issuerSlug, 'learningpaths', this.slug];
		}

		return ['/public/learningpaths/', this.slug];
	}
}
