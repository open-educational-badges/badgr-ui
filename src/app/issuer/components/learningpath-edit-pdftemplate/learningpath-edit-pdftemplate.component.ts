import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { BaseAuthenticatedRoutableComponent } from '../../../common/pages/base-authenticated-routable.component';
import { SessionService } from '../../../common/services/session.service';
import { MessageService } from '../../../common/services/message.service';
import { Issuer } from '../../models/issuer.model';
import { IssuerManager } from '../../services/issuer-manager.service';
import { BadgrApiFailure } from '../../../common/services/api-failure';
import { LearningPath } from '~/issuer/models/learningpath.model';
import { AppConfigService } from '../../../common/app-config.service';
import { LinkEntry, BgBreadcrumbsComponent } from '../../../common/components/bg-breadcrumbs/bg-breadcrumbs.component';
import { LearningPathManager } from '../../services/learningpath-manager.service';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { typedFormGroup } from '../../../common/util/typed-forms';
import { BgAwaitPromises } from '../../../common/directives/bg-await-promises';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { OebSelectComponent } from '../../../components/select.component';
import { HlmH1, HlmH2 } from '@spartan-ng/helm/typography';

import { PDFTemplateManager } from '~/issuer/services/pdftemplate-manager.service';
import { ApiPDFTemplate } from '../../../common/model/pdftemplate-api.model';

@Component({
	templateUrl: 'learningpath-edit-pdftemplate.component.html',
	styleUrls: ['./learningpath-edit-pdftemplate.component.scss'],
	imports: [
		BgBreadcrumbsComponent,
		HlmH1,
		BgAwaitPromises,
		FormsModule,
		ReactiveFormsModule,
		HlmH2,
		OebButtonComponent,
		TranslatePipe,
		OebSelectComponent,
	],
})
export class LearningPathEditPDFTemplateComponent extends BaseAuthenticatedRoutableComponent implements OnInit {
	protected title = inject(Title);
	protected messageService = inject(MessageService);
	protected issuerManager = inject(IssuerManager);
	protected learningPathManager = inject(LearningPathManager);
	private configService = inject(AppConfigService);
	private translate = inject(TranslateService);
	protected pdfTemplateManager = inject(PDFTemplateManager);
	protected authService: SessionService;

	issuerSlug: string;
	learningPathSlug: string;
	issuer: Issuer;
	issuerLoaded: Promise<unknown>;
	learningPath: LearningPath;
	learningPathLoaded: Promise<unknown>;
	breadcrumbLinkEntries: LinkEntry[] = [];
	pdfTemplatesPromise: Promise<void>;
	pdfTemplates: ApiPDFTemplate[];
	selectPDFTemplateOptions: Array<{ label: string; value: string | null }> = [];

	@ViewChild('formElem')
	formElem: ElementRef<HTMLFormElement>;

	learningPathForm = typedFormGroup().addControl('pdftemplate', null);

	savePromise: Promise<LearningPath> | null = null;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const sessionService = inject(SessionService);
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route, sessionService);

		this.authService = sessionService;

		this.translate.get('PDFTemplate.lpChooseTemplateHeadline').subscribe((str) => {
			this.title.setTitle(`${str} - ${this.configService.theme['serviceName'] || 'Badgr'}`);
		});

		this.issuerSlug = this.route.snapshot.params['issuerSlug'];
		this.learningPathSlug = this.route.snapshot.params['learningPathSlug'];

		this.learningPathLoaded = this.learningPathManager
			.getLearningPathForIssuer(this.issuerSlug, this.learningPathSlug)
			.then(
				(learningPath) => {
					this.learningPath = learningPath;
					this.learningPathForm.setValue({
						pdftemplate: this.learningPath.pdftemplate,
					});
				},
				(error) =>
					this.messageService.reportLoadingError(
						`Cannot find learningPath ${this.issuerSlug} / ${this.learningPathSlug}`,
						error,
					),
			);

		this.issuerLoaded = this.issuerManager.issuerBySlug(this.issuerSlug).then((issuer) => {
			this.issuer = issuer;
		});

		Promise.all([this.issuerLoaded, this.learningPathLoaded])
			.then(() => {
				this.breadcrumbLinkEntries = [
					{ title: 'Issuers', routerLink: ['/issuer'] },
					{ title: this.issuer.name, routerLink: ['/issuer/issuers', this.issuerSlug] },
					{
						title: this.learningPath.name,
						routerLink: ['/issuer/issuers', this.issuerSlug, 'learningpaths', this.learningPathSlug],
					},
					{ title: this.translate.instant('PDFTemplate.lpChooseTemplateHeadline') },
				];
			})
			.catch((error) => {
				console.error('Error loading instances:', error);
			});
	}

	async ngOnInit() {
		super.ngOnInit();

		await this.issuerLoaded;

		if (this.authService.isLoggedIn && this.issuer instanceof Issuer && this.issuer.currentUserStaffMember) {
			this.getPDFTemplatesForIssuerApi(this.issuer.slug);
			await this.pdfTemplatesPromise;

			this.selectPDFTemplateOptions = this.pdfTemplates.map((t) => ({
				label: t.name,
				value: t.slug,
			}));
			this.selectPDFTemplateOptions.push({
				label: this.translate.instant('PDFTemplate.oebDesign'),
				value: null,
			});
		}
	}

	cancelClicked() {
		this.router.navigate(['issuer/issuers', this.issuerSlug, 'learningpaths', this.learningPathSlug]);
	}

	async onSubmit() {
		const formState = this.learningPathForm.value;
		this.learningPath.pdftemplate = formState.pdftemplate;

		try {
			this.savePromise = this.learningPath.save();
			await this.savePromise;
		} catch (e) {
			this.messageService.reportAndThrowError(
				`Unable to save LearningPath: ${BadgrApiFailure.from(e).firstMessage}`,
				e,
			);
		}

		this.cancelClicked();
	}

	getPDFTemplatesForIssuerApi(issuerSlug) {
		this.pdfTemplatesPromise = this.pdfTemplateManager.getPDFTemplatesForIssuer(issuerSlug).then((pdfTemplates) => {
			this.pdfTemplates = pdfTemplates.sort(
				(a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
			);
		});
	}
}
