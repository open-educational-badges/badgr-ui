import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { AUTO_STYLE, animate, state, style, transition, trigger } from '@angular/animations';
import { FormControl, FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { BgImageStatusPlaceholderDirective } from '../directives/bg-image-status-placeholder.directive';
import { RouterLink } from '@angular/router';
import { TimeComponent } from './time.component';
import { OebCheckboxComponent } from '../../components/oeb-checkbox.component';
import { CompetencyAccordionComponent } from '../../components/accordion.component';
import { TranslatePipe } from '@ngx-translate/core';
import { HourPipe } from '../pipes/hourPipe';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmP } from '@spartan-ng/helm/typography';

@Component({
	selector: 'bg-badgecard',
	animations: [
		trigger('showCompetencies', [
			state('true', style({ height: AUTO_STYLE, visibility: AUTO_STYLE })),
			state('false', style({ height: '0', visibility: 'hidden' })),
			transition('false => true', animate(220 + 'ms ease-out')),
			transition('true => false', animate(220 + 'ms ease-in')),
		]),
	],
	host: {
		class: 'tw-rounded-[10px] tw-h-max tw-max-w-[450px] tw-border-solid tw-border-purple tw-border tw-relative tw-p-4 tw-block tw-overflow-hidden oeb-badge-card',
	},
	template: `
		@if (mostRelevantStatus && !showXIcon) {
			<div class="tw-absolute tw-top-0 tw-right-0 tw-bg-purple tw-text-white tw-px-2 tw-py-1">
				{{ 'General.' + mostRelevantStatus | translate }}
			</div>
		}

		<div class="tw-h-[100px]">
			<div class="tw-flex tw-items-center tw-h-full">
				@if (completed) {
					<div class="tw-absolute tw-top-[10px] tw-right-[10px] tw-flex tw-justify-center tw-items-center">
						<div
							class="tw-bg-white tw-inline-flex tw-rounded-full tw-justify-center tw-items-center tw-border-solid tw-border-purple tw-border-[2px] "
						>
							<ng-icon
								hlm
								class="tw-text-purple tw-box-border md:tw-w-[22px] tw-w-[16px] md:tw-h-[22px] tw-h-[16px]"
								name="lucideCheck"
							/>
						</div>
					</div>
				}
				<img
					class="oeb-badgeimage badgeimage-{{ mostRelevantStatus }}"
					[loaded-src]="badgeImage"
					[loading-src]="badgeLoadingImageUrl"
					[error-src]="badgeFailedImageUrl"
				/>
				<div class="tw-flex tw-flex-col tw-flex-wrap tw-pl-4 tw-py-2">
					@if (badgeSlug && !publicUrl && !imported) {
						<a
							class="tw-font-bold text-clamp title-clamp"
							[title]="badgeTitle"
							[routerLink]="['../earned-badge', badgeSlug]"
							hlmP
							size="sm"
							>{{ badgeTitle }}</a
						>
					}
					@if (badgeSlug && !publicUrl && imported) {
						<a
							class="tw-font-bold text-clamp title-clamp"
							[title]="badgeTitle"
							[routerLink]="['../imported-badge', badgeSlug]"
							hlmP
							size="sm"
							>{{ badgeTitle }}</a
						>
					}
					@if (publicUrl) {
						<a
							class="tw-font-bold text-clamp title-clamp"
							hlmP
							size="sm"
							[href]="publicUrl"
							[attr.target]="useBlankHref ? '_blank' : null"
							>{{ badgeTitle }}</a
						>
					}

					<div class="tw-pt-2 tw-flex tw-flex-col tw-flex-wrap">
						@if (issuerSlug && useBlankHref) {
							<a
								hlmP
								size="sm"
								variant="light"
								class="badgecard-x-issuer text-clamp issuer-clamp"
								[title]="issuerTitle"
								[href]="publicIssuerUrl"
								[target]="useBlankHref ? '_blank' : null"
								>{{ issuerTitle }}</a
							>
						} @else if (issuerSlug) {
							<a
								hlmP
								size="sm"
								variant="light"
								class="badgecard-x-issuer text-clamp issuer-clamp"
								[title]="issuerTitle"
								[routerLink]="
									network ? ['/public/networks', issuerSlug] : ['/public/issuers', issuerSlug]
								"
								[target]="useBlankHref ? '_blank' : null"
								>{{ issuerTitle }}</a
							>
						} @else {
							<div class="badgecard-x-issuer">{{ issuerTitle }}</div>
						}
						<time [date]="badgeIssueDate" format="dd.MM.y"></time>
					</div>

					<div class="tw-absolute tw-left-0 tw-bottom-2 tw-w-full">
						<!-- Show Verify or Share Button unless public -->
						<div class="tw-float-right tw-pr-4">
							@if (verifyUrl) {
								<a
									hlmP
									size="sm"
									class="tw-font-bold tw-text-purple tw-no-underline hover:!tw-text-buttonhover tw-cursor-pointer"
									[href]="verifyUrl"
								>
									{{ 'RecBadgeDetail.verify' | translate }}
								</a>
							}
						</div>
					</div>
				</div>
				<div
					class="tw-float-right tw-relative tw-ml-auto tw-flex tw-items-center tw-flex-col tw-mr-2 tw-h-full"
				>
					@if (showCheckbox) {
						<oeb-checkbox
							[noMargin]="true"
							[(ngModel)]="checked"
							(ngModelChange)="changeCheckbox($event)"
						></oeb-checkbox>
					}
					@if (showXIcon) {
						<ng-icon hlm name="lucideX" class="tw-w-8 tw-h-8" (click)="closeFn()"></ng-icon>
					}
					@if (competencies && competencies.length > 0 && !imported) {
						<div class="tw-absolute tw-bottom-0 tw-cursor-pointer" (click)="toggleCompetencies()">
							<ng-icon
								hlm
								class="tw-block tw--mb-4"
								size="lg"
								[name]="showCompetencies ? 'lucideChevronUp' : 'lucideChevronDown'"
							/>
						</div>
					}
				</div>
			</div>
		</div>
		<div [@showCompetencies]="showCompetencies" [class.competencies-hidden]="!showCompetencies">
			<div class="tw-pt-8">
				@if (showCompetencies) {
					@for (competency of competencies; track competency) {
						<div>
							<competency-accordion
								[name]="competency.name"
								[category]="competency.category"
								[description]="competency.description"
								[framework]="competency.framework"
								[framework_identifier]="competency['framework_identifier']"
								[studyload]="(competency.studyLoad | hourPipe) + ' h'"
							></competency-accordion>
						</div>
					}
				}
			</div>
		</div>
		<!--<ul *ngIf="tags && tags.length" class="tw-mt-2 tw-leading-[0px]"><li class="tag tw-mt-2 tw-mr-2" *ngFor="let tag of tags">{{tag}}</li></ul>-->
	`,
	styles: [
		`
			.competencies-hidden {
				height: 0 !important;
				visibility: hidden !important;
				overflow: hidden !important;
			}
			.text-clamp {
				-webkit-line-clamp: 3;
				-webkit-box-orient: vertical;
				overflow: hidden;
				text-overflow: ellipsis;
				display: -webkit-box;
				word-break: break-word;
			}
			.title-clamp {
				-webkit-line-clamp: 3;
			}
			.issuer-clamp {
				-webkit-line-clamp: 1;
			}
		`,
	],
	imports: [
		NgIcon,
		HlmIcon,
		BgImageStatusPlaceholderDirective,
		HlmP,
		RouterLink,
		TimeComponent,
		OebCheckboxComponent,
		FormsModule,
		CompetencyAccordionComponent,
		TranslatePipe,
		HourPipe,
	],
})
export class BgBadgecard {
	readonly badgeLoadingImageUrl = 'breakdown/static/images/badge-loading.svg';
	readonly badgeFailedImageUrl = 'breakdown/static/images/badge-failed.svg';
	@Input() badgeSlug: string;
	@Input() issuerSlug: string;
	@Input() publicUrl: string;
	@Input() publicIssuerUrl: string;
	@Input() badgeImage: string;
	@Input() badgeTitle: string;
	@Input() badgeDescription: string;
	@Input() badgeIssueDate: Date;
	@Input() issuerTitle: string;
	@Input() mostRelevantStatus: 'expired' | 'new' | 'pending' | 'imported' | undefined;
	@Input() verifyUrl: string;
	@Input() public = false;
	@Input() network = false;
	@Input() competencies?: any[];
	@Input() checkboxControl?: FormControl;
	@Input() showCheckbox = false;
	@Input() completed: boolean = false;
	@Output() checkboxChange = new EventEmitter<boolean>();
	@Output() closeEmit = new EventEmitter<any>();
	@Input() checked: boolean = false;
	@Input() tags: string[] = [];
	@Input() showXIcon = false;
	@Input() imported: boolean = false;
	@Input() useBlankHref: boolean = false;

	changeCheckbox(event: boolean) {
		this.checkboxChange.emit(event);
	}

	closeFn() {
		this.closeEmit.emit(this.badgeSlug);
	}

	@HostBinding('class') get hostClasses(): string {
		return this.checked || this.completed ? 'tw-bg-[var(--color-lightgreen)]' : 'tw-bg-white';
	}

	showCompetencies = false;
	toggleCompetencies() {
		this.showCompetencies = !this.showCompetencies;
	}
}
