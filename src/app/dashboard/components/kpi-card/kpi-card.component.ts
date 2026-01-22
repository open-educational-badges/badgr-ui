import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { KpiCardData } from '../../models/kpi-card.model';
import { InfoIcon } from '../../../common/components/info-icon.component';

@Component({
	selector: 'app-kpi-card',
	standalone: true,
	imports: [CommonModule, NgIconComponent, InfoIcon],
	templateUrl: './kpi-card.component.html',
	styleUrls: ['./kpi-card.component.scss'],
})
export class KpiCardComponent {
	@Input() cardData!: KpiCardData;
	@Output() cardClick = new EventEmitter<string>();

	isStandard(): boolean {
		return this.cardData.variant === 'standard';
	}

	isDual(): boolean {
		return this.cardData.variant === 'dual';
	}

	onCardClick(): void {
		this.cardClick.emit(this.cardData.id);
	}

	/**
	 * Format description to add line break after hyphen
	 * e.g., "TEILNAHME-Badges" becomes "TEILNAHME-<br>Badges"
	 */
	formatDescription(description: string | undefined): string {
		if (!description) return '';
		return description.replace(/-/g, '-<br>');
	}
}
