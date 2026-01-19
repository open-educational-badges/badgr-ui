import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { OebCardComponent } from './oeb-card.component';
import { Network } from '~/issuer/network.model';
import { NetworkV3 } from '~/issuer/models/networkv3.model';

@Component({
	selector: 'oeb-entity-card',
	standalone: true,
	imports: [NgClass, TranslatePipe, OebCardComponent],
	template: `
		<oeb-card [ngClass]="cardClasses">
			<!-- Header -->
			<div card-header class="tw-flex tw-gap-4 tw-items-center">
				<img
					[src]="vm.image"
					class="tw-w-[100px] tw-h-[100px] tw-object-contain"
					[ngClass]="{
						'tw-rounded-[10px] tw-bg-white tw-p-2': vm.type === 'network',
						'tw-rounded-full': vm.type === 'issuer',
					}"
					alt="entity image"
				/>

				<div class="tw-flex tw-flex-col">
					<h2
						class="tw-font-bold tw-line-clamp-2"
						[ngClass]="{
							'tw-text-white tw-text-3xl': vm.type === 'network',
							'tw-text-purple tw-text-2xl': vm.type === 'issuer',
						}"
					>
						{{ vm.name }}
					</h2>

					@if (vm.role) {
						<p
							class="tw-font-semibold"
							[ngClass]="{
								'tw-text-white': vm.type === 'network',
								'tw-text-oebblack': vm.type === 'issuer',
							}"
						>
							{{ 'Issuer.yourRole' | translate }} {{ vm.role | translate }}
						</p>
					}
				</div>
			</div>

			<!-- Content -->
			<div
				card-content
				class="tw-mt-4 tw-line-clamp-5"
				[ngClass]="{
					'tw-text-white': vm.type === 'network',
				}"
			>
				{{ vm.description }}
			</div>

			<!-- Footer -->
			<div card-footer class="tw-mt-6">
				<ng-content></ng-content>
			</div>
		</oeb-card>
	`,
})
export class OebEntityCardComponent {
	@Input({ required: true }) vm!: CardVM;

	get cardClasses(): string {
		return this.vm.type === 'network'
			? 'tw-bg-purple tw-border tw-border-[#CFCECE] tw-rounded-[10px] tw-p-6'
			: 'tw-bg-white tw-border tw-border-purple tw-rounded-lg tw-p-8';
	}

	export function toNetworkCardViewModel(
		network: Network | NetworkV3,
		isPublic: boolean
	): CardVM {
		return {
			type: 'network',
			name: network.name,
			slug: network.slug,
			description: network.description,
			image: network.image,
			role: isPublic ? undefined : network.current_user_network_role,
			isPublic,
		};
	}
}
