import { Component, EventEmitter, input, output } from '@angular/core';
import { HlmTabsModule, HlmTabsTrigger } from './spartan/ui-tabs-helm/src';
import { NgTemplateOutlet } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { type TabsVariants } from './spartan/ui-tabs-helm/src';
import { NgIcon } from '@ng-icons/core';

export const bg = 'tw-block tw-absolute tw-z-0 tw-opacity-80';

export type Tab = {
	key: string;
	icon?: string;
	img?: any;
	title: string;
	count?: number;
	component: any;
};

@Component({
	selector: 'oeb-tabs',
	imports: [HlmTabsModule, HlmTabsTrigger, NgTemplateOutlet, TranslateModule, NgIcon],
	template: `<hlm-tabs class="tw-block tw-w-full" [tab]="activeTab()" (tabActivated)="onTabChange($event)">
		<hlm-tabs-list
			class="tw-w-full tw-max-w-[600px] tw-flex tw-justify-between"
			[class.tw-hidden]="hideTabBar()"
			aria-label="tabs"
		>
			@for (tab of tabs(); track tab) {
				<button
					class="tw-grow tw-px-6 tw-py-2"
					[hlmTabsTrigger]="tab.key"
					[_variant]="variant()"
					[_width]="width()"
				>
					<div class="tw-flex tw-items-center tw-justify-center">
						@if (tab.icon) {
							<ng-icon size="38px" [name]="tab.icon" class="tw-mr-2"></ng-icon>
						} @else if (tab.img) {
							<img class="tw-w-10 tw-mr-2" [src]="tab.img" alt="Tab Image" />
						}
						<span class="tw-text-lg tw-leading-[130%]">{{ tab.title | translate }}</span>
						@if (tab.count !== undefined) {
							@if (countStyle() === 'parentheses') {
								<span class="tw-ml-1 md:tw-text-lg tw-font-semibold"> ({{ tab.count }}) </span>
							} @else {
								<div
									class="md:tw-w-7 md:tw-h-7 tw-h-5 tw-w-5 tw-flex tw-items-center tw-justify-center tw-ml-2 tw-p-1 tw-rounded-full tw-bg-purple tw-text-white tw-text-sm"
								>
									{{ tab.count }}
								</div>
							}
						}
					</div>
				</button>
			}
		</hlm-tabs-list>
		@for (tab of tabs(); track tab) {
			<div [hlmTabsContent]="tab.key" class="tw-mt-6">
				<ng-template *ngTemplateOutlet="tab.component"></ng-template>
			</div>
		}
	</hlm-tabs>`,
})
export class OebTabsComponent {
	image = input<string>();
	imgClass = input<string>();
	tabs = input.required<Tab[]>();
	activeTab = input<string>();
	variant = input<TabsVariants['variant']>('default');
	width = input<TabsVariants['width']>('default');
	countStyle = input<'rounded' | 'parentheses'>('rounded');
	/** When true, hides the tab bar but still renders the active tab content */
	hideTabBar = input<boolean>(false);
	onTabChanged = output<string>();

	onTabChange(tab: string) {
		this.onTabChanged.emit(tab);
	}
}
