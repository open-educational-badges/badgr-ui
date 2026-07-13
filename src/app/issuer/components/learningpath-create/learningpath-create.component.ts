import { Component, inject } from '@angular/core';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { FormBuilder } from '@angular/forms';
import { SessionService } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { IssuerApiService } from '../../services/issuer-api.service';
import { LearningPathApiService } from '../../../common/services/learningpath-api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { BadgeClassManager } from '../../services/badgeclass-manager.service';
import { LearningPath } from '../../models/learningpath.model';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { BadgeInstanceManager } from '../../services/badgeinstance-manager.service';
import { BadgrApiFailure } from '../../../common/services/api-failure';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { SuccessDialogComponent } from '../../../common/dialogs/oeb-dialogs/success-dialog.component';
import { Issuer } from '../../models/issuer.model';
import { IssuerManager } from '../../services/issuer-manager.service';
import { FormMessageComponent } from '../../../common/components/form-message.component';
import { LearningPathEditFormComponent } from '../learningpath-edit-form/learningpath-edit-form.component';
import { ApiLearningPath } from '../../../common/model/learningpath-api.model';
import { HlmH1, HlmH3 } from '@spartan-ng/helm/typography';

@Component({
	selector: 'learningpath-create',
	templateUrl: './learningpath-create.component.html',
	imports: [BgBreadcrumbsComponent, FormMessageComponent, HlmH1, HlmH3, LearningPathEditFormComponent, TranslatePipe],
})
export class LearningPathCreateComponent extends BaseAuthenticatedRoutableComponent {
	protected formBuilder = inject(FormBuilder);
	protected loginService: SessionService;
	protected messageService = inject(MessageService);
	protected learningPathApiService = inject(LearningPathApiService);
	protected issuerManager = inject(IssuerManager);
	protected issuerApiService = inject(IssuerApiService);
	protected router: Router;
	protected route: ActivatedRoute;
	protected badgeClassService = inject(BadgeClassManager);
	private translate = inject(TranslateService);
	protected badgeInstanceManager = inject(BadgeInstanceManager);

	breadcrumbLinkEntries: LinkEntry[] = [];
	issuerSlug: string;
	issuer: Issuer;

	issuerLoaded: Promise<unknown>;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const loginService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, loginService);
		this.loginService = loginService;
		this.router = router;
		this.route = route;

		this.issuerSlug = this.route.snapshot.params['issuerSlug'];

		this.issuerLoaded = this.issuerManager.issuerBySlugDirect(this.issuerSlug).then((issuer) => {
			this.issuer = issuer;
			this.breadcrumbLinkEntries = [
				{ title: 'Issuers', routerLink: ['/issuer'] },
				{
					title: this.issuer.name,
					routerLink: ['/issuer/issuers', this.issuerSlug],
				},
			];
		});
	}

	private readonly _hlmDialogService = inject(HlmDialogService);
	public openSuccessDialog() {
		const dialogRef = this._hlmDialogService.open(SuccessDialogComponent, {
			context: {
				text: this.translate.instant('LearningPath.createdSuccessfully'),
				variant: 'success',
			},
		});
	}

	learningPathCreated(promise: Promise<LearningPath | ApiLearningPath>) {
		promise.then(
			(lp) => {
				this.router.navigate(['issuer/issuers', this.issuerSlug, 'learningpaths', lp.slug]).then(() => {
					this.openSuccessDialog();
				});
			},
			(error) =>
				this.messageService.reportAndThrowError(
					`Unable to create Badge Class: ${BadgrApiFailure.from(error).firstMessage}`,
					error,
				),
		);
	}
	creationCanceled() {
		this.router.navigate(['issuer/issuers', this.issuerSlug]);
	}
}
