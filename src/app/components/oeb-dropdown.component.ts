import { NgIcon } from '@ng-icons/core';
import { Component, Input, TemplateRef } from '@angular/core';
import { BrnMenuTrigger } from '@spartan-ng/brain/menu';
import { HlmMenu, HlmMenuItem, HlmMenuItemIcon, HlmMenuLabel } from './spartan/ui-menu-helm/src/index';
import { NgTemplateOutlet } from '@angular/common';
import type { MenuItem } from '../common/components/badge-detail/badge-detail.component.types';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HlmIcon } from '@spartan-ng/helm/icon';

@Component({
	selector: 'oeb-dropdown',
	imports: [
		BrnMenuTrigger,
		HlmMenu,
		HlmMenuItem,
		HlmMenuLabel,
		HlmMenuItemIcon,
		NgTemplateOutlet,
		RouterModule,
		NgIcon,
		HlmIcon,
		TranslateModule,
	],
	template: `
		<button
			[brnMenuTriggerFor]="menu"
			[disabled]="!hasEnabledMenuItem"
			class="disabled:tw-pointer-events-none disabled:tw-opacity-50"
		>
			@if (isTemplate) {
				<ngTemplateOutlet [ngTemplateOutlet]="trigger"></ngTemplateOutlet>
			} @else {
				<button [class]="triggerStyle" [disabled]="!hasEnabledMenuItem">
					@if (noTranslate) {
						{{ trigger }}
					} @else {
						{{ trigger | translate }}
					}
					<ng-icon hlm class="tw-ml-2" name="lucideChevronDown" hlmMenuIcon />
				</button>
			}
		</button>

		<ng-template #menu>
			<hlm-menu class="!tw-border !tw-border-solid !tw-border-[var(--color-purple)] !tw-shadow-none">
				@if (label) {
					<hlm-menu-label>{{ label }}</hlm-menu-label>
				}
				@for (menuItem of menuItems; track menuItem) {
					@if (menuItem.action) {
						<button
							(click)="menuItem.action($event)"
							[size]="size"
							[disabled]="menuItem.disabled"
							hlmMenuItem
						>
							@if (menuItem.icon) {
								<ng-icon hlm [size]="iconClass" name="{{ menuItem.icon }}" hlmMenuIcon />
							}
							@if (noTranslate) {
								{{ menuItem.title }}
							} @else {
								{{ menuItem.title | translate }}
							}
						</button>
					}
					@if (menuItem.routerLink) {
						<button
							routerLinkActive="tw-bg-lightpurple"
							[disabled]="menuItem.disabled"
							[routerLink]="menuItem.routerLink"
							[size]="size"
							hlmMenuItem
						>
							@if (menuItem.icon) {
								<ng-icon
									hlm
									class="tw-mr-3"
									[size]="iconClass"
									name="{{ menuItem.icon }}"
									hlmMenuIcon
								/>
							}
							@if (noTranslate) {
								{{ menuItem.title }}
							} @else {
								{{ menuItem.title | translate }}
							}
						</button>
					}
				}
			</hlm-menu>
		</ng-template>
	`,
	styleUrls: ['../app.component.scss'],
})
export class OebDropdownComponent {
	@Input() trigger: any;
	@Input() size: 'default' | 'sm' | 'lg' = 'default';
	@Input() inset: boolean = false;
	@Input() triggerStyle: string =
		'tw-border tw-border-solid tw-border-purple tw-px-1 tw-py-2 tw-rounded-xl disabled:tw-pointer-events-none disabled:tw-opacity-50';
	@Input() label?: string = '';
	@Input() class?: string = '';
	@Input() menuItems: MenuItem[];
	@Input() noTranslate = false;

	get isTemplate(): boolean {
		return this.trigger instanceof TemplateRef;
	}

	/**
	 * Checks given {@link menuItems} input for enabled items.
	 * Used to disable the trigger depending on its return value.
	 * @returns true when {@link menuItems} is undefined or empty or
	 * any of the menu items is not disabled, false otherwise.
	 */
	get hasEnabledMenuItem(): boolean {
		if (this.menuItems === undefined || this.menuItems === null || this.menuItems.length === 0) return true;
		return this.menuItems.find((m) => !m.disabled) !== undefined;
	}

	get iconClass(): string {
		switch (this.size) {
			case 'sm':
				return '1.25rem';
			case 'lg':
				return '1.75rem';
			default:
				return '1.25rem';
		}
	}
}
