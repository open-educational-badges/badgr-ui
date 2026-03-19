import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { NavigationType, OebIssuerNetworkCard } from '../issuer-network-card/issuer-network-card.component';

@Component({
	selector: 'network-list',
	templateUrl: './network-list.component.html',
	imports: [OebButtonComponent, RouterLink, FormsModule, TranslatePipe, OebIssuerNetworkCard],
})
export class NetworkListComponent {
	readonly router = inject(Router);

	networks = input.required<any[]>();

	handleNavigate(event: NavigationType, network: any) {
		if (event === 'heading') {
			this.router.navigate(['/issuer/networks', network.slug]);
		}
	}
}
