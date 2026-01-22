import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiCardData } from '../../models/kpi-card.model';
import { KpiCardComponent } from '../kpi-card/kpi-card.component';

@Component({
	selector: 'app-kpi-card-grid',
	standalone: true,
	imports: [CommonModule, KpiCardComponent],
	templateUrl: './kpi-card-grid.component.html',
	styleUrls: ['./kpi-card-grid.component.scss'],
})
export class KpiCardGridComponent {
	@Input() cards: KpiCardData[] = [];
	@Output() cardClick = new EventEmitter<string>();

	onCardClick(cardId: string): void {
		this.cardClick.emit(cardId);
	}
}
