import { Component, inject } from '@angular/core';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { IssuerEditFormComponent } from '../issuer-edit-form/issuer-edit-form.component';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmH1 } from '@spartan-ng/helm/typography';
import { Title } from '@angular/platform-browser';
import { AppConfigService } from '~/common/app-config.service';
import { MessageService } from '~/common/services/message.service';
import { NetworkManager } from '~/issuer/services/network-manager.service';
import { Network } from '~/issuer/network.model';

@Component({
	selector: 'network-edit',
	templateUrl: './network-edit.component.html',
	imports: [FormMessageComponent, HlmH1, IssuerEditFormComponent, TranslatePipe],
})
export class NetworkEditComponent extends BaseAuthenticatedRoutableComponent {
	protected configService = inject(AppConfigService);
	protected title = inject(Title);
	protected networkManager = inject(NetworkManager);
	protected messageService = inject(MessageService);

	network: Network;
	networkSlug: string;

	constructor() {
		super();

		this.title.setTitle(`Edit Network - ${this.configService.theme['serviceName'] || 'Badgr'}`);
		this.networkSlug = this.route.snapshot.params['networkSlug'];

		this.networkManager.networkBySlug(this.networkSlug).then(
			(network) => {
				this.network = network;

				this.title.setTitle(
					`Network - ${this.network.name} - ${this.configService.theme['serviceName'] || 'Badgr'}`,
				);
			},
			(error) => {
				this.messageService.reportLoadingError(`Issuer '${this.networkSlug}' does not exist.`, error);
			},
		);
	}
}
