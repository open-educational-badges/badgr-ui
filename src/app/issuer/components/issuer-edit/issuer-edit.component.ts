import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { SessionService } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { IssuerManager } from '../../services/issuer-manager.service';
import { Title } from '@angular/platform-browser';
import { Issuer } from '../../models/issuer.model';
import { UserProfileManager } from '../../../common/services/user-profile-manager.service';
import { AppConfigService } from '../../../common/app-config.service';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { IssuerEditFormComponent } from '../issuer-edit-form/issuer-edit-form.component';
import { HlmH1, HlmP } from '@spartan-ng/helm/typography';

@Component({
	selector: 'issuer-edit',
	templateUrl: './issuer-edit.component.html',
	imports: [FormMessageComponent, BgBreadcrumbsComponent, HlmH1, HlmP, IssuerEditFormComponent, TranslatePipe],
})
export class IssuerEditComponent extends BaseAuthenticatedRoutableComponent {
	protected profileManager = inject(UserProfileManager);
	protected title = inject(Title);
	protected messageService = inject(MessageService);
	protected configService = inject(AppConfigService);
	protected issuerManager = inject(IssuerManager);
	protected translate = inject(TranslateService);

	issuer: Issuer;
	issuerSlug: string;

	issuerLoaded: Promise<unknown>;

	editIssuerCrumbs: LinkEntry[];

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const loginService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, loginService);
		const title = this.title;

		title.setTitle(`Edit Issuer - ${this.configService.theme['serviceName'] || 'Badgr'}`);

		this.issuerSlug = this.route.snapshot.params['issuerSlug'];

		this.issuerLoaded = this.issuerManager.issuerBySlugDirect(this.issuerSlug).then(
			(issuer) => {
				this.issuer = issuer;

				this.editIssuerCrumbs = [
					{ title: 'Issuers', routerLink: ['/issuer'] },
					{ title: issuer.name, routerLink: ['/issuer/issuers/', this.issuerSlug] },
					{ title: 'Edit Issuer' },
				];

				this.title.setTitle(
					`Issuer - ${this.issuer.name} - ${this.configService.theme['serviceName'] || 'Badgr'}`,
				);
			},
			(error) => {
				this.messageService.reportLoadingError(`Issuer '${this.issuerSlug}' does not exist.`, error);
			},
		);
	}
}
