import { Component, computed, effect, ElementRef, inject, input, OnInit, Renderer2 } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BaseDialog } from '~/common/dialogs/base-dialog';
import { OebButtonComponent } from '~/components/oeb-button.component';
import { Issuer } from '~/issuer/models/issuer.model';
import { Network } from '~/issuer/network.model';
@Component({
	selector: 'quota-exceeded-dialog',
	templateUrl: 'issuer-quotas-quota-exceeded-dialog.component.html',
	styleUrl: 'issuer-quotas-quota-exceeded-dialog.component.scss',
	imports: [OebButtonComponent, TranslatePipe, RouterLink],
})

// TODO component for displaying quotas exceeded notice
export class QuotaExceededDialog extends BaseDialog {
	protected translate = inject(TranslateService);
	issuer = input.required<Issuer | Network>();
	nextLevel = computed(() => {
		return this.issuer()?.quotas?.nextLevel.level;
	});
	nextPrice = computed(() => {
		return this.issuer()?.quotas?.nextLevel.price;
	});
	nextQuotas = computed(() => {
		return this.issuer()?.quotas?.nextLevel.quotas;
	});
	// nextLevel = computed(() => {
	// 	return this.issuer()?.quotas?.level;
	// });

	constructor() {
		const componentElem = inject(ElementRef);
		const renderer = inject(Renderer2);
		super(componentElem, renderer);
	}

	// ngOnInit() {
	// 	if (this.issuer()) {
	// 		console.log(this.issuer().quotas.level);
	// 	}
	// }

	openDialog() {
		this.showModal();
	}

	closeDialog() {
		this.closeModal();
	}
}
