import { Component, inject, Input, OnInit } from '@angular/core';
import { animate, animateChild, query, stagger, style, transition, trigger } from '@angular/animations';
import { LearningPathApiService } from '../../services/learningpath-api.service';
import { HlmDialogService } from '../../../components/spartan/ui-dialog-helm/src/lib/hlm-dialog.service';
import { DangerDialogComponentTemplate } from '../../dialogs/oeb-dialogs/danger-dialog-template.component';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { SuccessDialogComponent } from '../../dialogs/oeb-dialogs/success-dialog.component';
import { CommonDialogsService } from '../../services/common-dialogs.service';
import { BaseRoutableComponent } from '../../pages/base-routable.component';
import { BadgeInstanceApiService } from '../../../issuer/services/badgeinstance-api.service';
import { PdfService } from '../../services/pdf.service';
import { SafeResourceUrl } from '@angular/platform-browser';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { BgBadgecard } from '../bg-badgecard';
import { LearningPathGraduatesDatatableComponent } from '../../../components/datatable-learningpath-graduates.component';
import { HlmH2, HlmP, HlmH3 } from '@spartan-ng/helm/typography';
import { ApiLearningPathParticipant } from '~/common/model/learningpath-api.model';
import { Issuer } from '~/issuer/models/issuer.model';
import { Network } from '~/issuer/network.model';
import { PDFTemplateManager } from '~/issuer/services/pdftemplate-manager.service';

@Component({
	selector: 'oeb-learning-path',
	templateUrl: './oeb-learning-path.component.html',
	styleUrl: './oeb-learning-path.component.scss',
	animations: [
		trigger('inOutAnimation', [
			transition(':enter', [
				style({ transform: 'translateX(-120px)', opacity: '0' }),
				animate('.5s ease-out', style({ transform: 'translateX(0px)', opacity: '1' })),
			]),
			// transition(':leave', [style({ opacity: '1' }), animate('.5s ease-out', style({ opacity: '0' }))]),
		]),
		trigger('stagger', [transition(':enter', [query(':enter', stagger('.3s', [animateChild()]))])]),
	],
	imports: [
		HlmH2,
		HlmP,
		RouterLink,
		OebButtonComponent,
		HlmH3,
		BgBadgecard,
		LearningPathGraduatesDatatableComponent,
		TranslatePipe,
	],
})
export class OebLearningPathDetailComponent extends BaseRoutableComponent implements OnInit {
	private learningPathApiService = inject(LearningPathApiService);
	private dialogService = inject(CommonDialogsService);
	private badgeInstanceApiservice = inject(BadgeInstanceApiService);
	private pdfService = inject(PdfService);
	router: Router;
	private translate = inject(TranslateService);
	protected pdfTemplateManager = inject(PDFTemplateManager);

	@Input() learningPath;
	@Input() issuer: Issuer | Network;
	@Input() badges;
	@Input() participants: ApiLearningPathParticipant[];
	loading: any;
	pdfSrc: SafeResourceUrl;

	learningPathEditLink;

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {
		const router = inject(Router);
		const route = inject(ActivatedRoute);

		super(router, route);

		this.router = router;
	}
	private readonly _hlmDialogService = inject(HlmDialogService);

	filterFunction(t): boolean {
		return t.completed_at;
	}
	filterFunctionOngoing(t): boolean {
		return !t.completed_at;
	}

	ngOnInit(): void {
		this.learningPathEditLink = [
			'/issuer/issuers',
			this.issuer.slug,
			'learningpaths',
			this.learningPath.slug,
			'edit',
		];

		this.pdfTemplateManager.getPDFTemplatesForIssuer(this.issuer.slug);
	}

	public deleteLearningPath(learningPathSlug, issuer) {
		const dialogRef = this._hlmDialogService.open(DangerDialogComponentTemplate, {
			context: {
				delete: () => this.deleteLearningPathApi(learningPathSlug, issuer),
				// qrCodeRequested: () => {},
				variant: 'danger',
				text: this.translate.instant('LearningPath.deleteWarning'),
				title: this.translate.instant('General.delete'),
			},
		});
	}

	deleteLearningPathApi(learningPathSlug, issuer) {
		this.learningPathApiService.deleteLearningPath(issuer.slug, learningPathSlug).then(() => {
			this.router.navigate(['issuer/issuers']);
		});
	}

	public openSuccessDialog(recipient) {
		const dialogRef = this._hlmDialogService.open(SuccessDialogComponent, {
			context: {
				recipient: recipient,
				variant: 'success',
			},
		});
	}

	get lpSlug() {
		return this.route.snapshot.params['learningPathSlug'];
	}

	get confirmDialog() {
		return this.dialogService.confirmDialog;
	}

	async revokeLpParticipationBadge(participant: ApiLearningPathParticipant) {
		this.confirmDialog
			.openResolveRejectDialog({
				dialogTitle: this.translate.instant('General.warning'),
				dialogBody: this.translate.instant('Issuer.revokeBadgeWarning', {
					badge: this.learningPath.name,
					recipient: `${participant.user.first_name} ${participant.user.last_name}`,
				}),
				resolveButtonLabel: this.translate.instant('General.revoke'),
				rejectButtonLabel: this.translate.instant('General.cancel'),
			})
			.then(async () => {
				try {
					const revokeResult = await Promise.all([
						this.badgeInstanceApiservice.revokeBadgeInstance(
							this.issuer.slug,
							this.learningPath.participationBadge_id,
							participant.participationBadgeAssertion.slug,
							'revoked',
						),
					]);

					const response = await this.learningPathApiService.getLearningPathParticipants(
						this.learningPath.slug,
					);
					this.participants = response.body;
				} catch (error) {
					console.error(error);
					throw error;
				}
			});
	}

	downloadCertificate(participant: ApiLearningPathParticipant) {
		const instance = participant.participationBadgeAssertion;
		this.pdfService
			.getPdf(instance.slug, 'badges')
			.then((url) => {
				this.pdfSrc = url;
				this.pdfService.downloadPdf(this.pdfSrc, this.learningPath.name, new Date(participant.completed_at));
			})
			.catch((error) => {
				console.log(error);
			});
	}

	get learningPathReverseBadges() {
		return [...this.learningPath.badges].reverse();
	}
}
