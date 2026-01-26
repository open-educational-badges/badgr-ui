import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ZipCodeMapComponent } from '../zip-code-map/zip-code-map.component';

export interface Institution {
	id: number;
	name: string;
	type: string;
	address: string;
	zipCode: string;
	badgesIssued: number;
	activeUsers: number;
	joinedDate: string;
	isNew?: boolean;
}

@Component({
	selector: 'app-oeb-dashboard-institutions',
	standalone: true,
	imports: [CommonModule, TranslatePipe, ZipCodeMapComponent],
	templateUrl: './oeb-dashboard-institutions.component.html',
	styleUrls: ['./oeb-dashboard-institutions.component.scss'],
})
export class OebDashboardInstitutionsComponent implements OnInit {
	institutions: Institution[] = [];
	newInstitutions: Institution[] = [];
	loading = false;

	totalInstitutions = 0;
	newInstitutionsCount = 0;

	constructor(private router: Router) {}

	ngOnInit(): void {
		this.loading = false;
	}

	isNewInstitution(institution: Institution): boolean {
		return this.newInstitutions.some((newInst) => newInst.id === institution.id);
	}

	formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		});
	}

	onZipCodeRegionClick(zipCode: string): void {
		this.router.navigate(['/dashboard/postal-code', zipCode]);
	}
}
