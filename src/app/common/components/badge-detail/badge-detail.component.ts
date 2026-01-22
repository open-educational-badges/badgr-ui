import { Component, Input, inject } from '@angular/core';
import type { PageConfig } from './badge-detail.component.types';
import { LearningPath } from '../../../issuer/models/learningpath.model';
import { RecipientBadgeInstance } from '../../../recipient/models/recipient-badge.model';
import { BadgeInstance } from '../../../issuer/models/badgeinstance.model';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { BgAwaitPromises } from '../../directives/bg-await-promises';
import { FormMessageComponent } from '../form-message.component';
import { BgBreadcrumbsComponent } from '../bg-breadcrumbs/bg-breadcrumbs.component';
import { OebButtonComponent } from '../../../components/oeb-button.component';
import { RouterLink } from '@angular/router';
import { OebDropdownComponent } from '../../../components/oeb-dropdown.component';
import { SvgIconComponent } from '../svg-icon.component';
import { BgImageStatusPlaceholderDirective } from '../../directives/bg-image-status-placeholder.directive';
import { OebCollapsibleComponent } from '../../../components/oeb-collapsible.component';
import { NgIcon } from '@ng-icons/core';
import { InfoIcon } from '../info-icon.component';
import { TimeComponent } from '../time.component';
import { CompetencyAccordionComponent } from '../../../components/accordion.component';
import { BgLearningPathCard } from '../bg-learningpathcard';
import { HourPipe } from '../../pipes/hourPipe';
import { PublicApiLearningPath } from '../../../public/models/public-api.model';
import { ApiImportedBadgeInstance } from '../../../recipient/models/recipient-badge-api.model';
import { RecipientBadgeManager } from '../../../recipient/services/recipient-badge-manager.service';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmH1, HlmP, HlmH3 } from '@spartan-ng/helm/typography';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import {
	ShareBadgeDialogComponent,
	ShareBadgeDialogContext,
} from '~/common/dialogs/oeb-dialogs/share-badge-dialog.component';
import { ApiBadgeInstanceEvidenceItem } from '~/issuer/models/badgeinstance-api.model';
import { TimePeriodPipe } from '../../util/expiration-util';
import { AUTH_PROVIDER } from '~/common/services/authentication-service';
import { toSignal } from '@angular/core/rxjs-interop';

type NormalizedEvidenceItem = {
	url?: string;
	narrative?: string;
};

@Component({
	selector: 'bg-badgedetail',
	templateUrl: './badge-detail.component.html',
	styleUrls: ['./badge-detail.component.scss'],
	imports: [
		BgAwaitPromises,
		FormMessageComponent,
		BgBreadcrumbsComponent,
		HlmH1,
		OebButtonComponent,
		RouterLink,
		OebDropdownComponent,
		SvgIconComponent,
		BgImageStatusPlaceholderDirective,
		OebCollapsibleComponent,
		NgIcon,
		HlmIcon,
		InfoIcon,
		TimeComponent,
		HlmP,
		CompetencyAccordionComponent,
		BgLearningPathCard,
		TranslatePipe,
		HourPipe,
		HlmH3,
		TimePeriodPipe,
	],
})
export class BgBadgeDetail {
	private authService = inject(AUTH_PROVIDER);
	private dialogService = inject(HlmDialogService);
	private translate = inject(TranslateService);
	private recipientManager = inject(RecipientBadgeManager);

	@Input() config: PageConfig;
	@Input() awaitPromises?: Promise<any>[];
	@Input() badge?: RecipientBadgeInstance | BadgeInstance | ApiImportedBadgeInstance;

	isLoggedIn = toSignal(this.authService.isLoggedIn$);

	constructor() {
		this.translate.get('Badge.categories.competency').subscribe((str) => {
			this.competencyBadge = str;
		});
	}

	get normalizedEvidence(): NormalizedEvidenceItem[] {
		if (!this.config.evidence_items) return [];

		return this.config.evidence_items.map((item: any) => ({
			url: (item as ApiBadgeInstanceEvidenceItem).evidence_url ?? (item as any).id,
			narrative: item.narrative,
		}));
	}

	getLearningPaths(): PublicApiLearningPath[] {
		return (this.config.learningPaths as PublicApiLearningPath[]).filter((l) => l.activated);
	}

	get hasCriteria(): boolean {
		return (
			this.config?.awardCriteria &&
			Array.isArray(this.config.awardCriteria) &&
			this.config.awardCriteria.length > 0
		);
	}

	competencyBadge = this.translate.instant('Badge.categories.competency');

	calculateLearningPathStatus(lp: LearningPath | PublicApiLearningPath): { match: string } | { progress: number } {
		if (lp.progress != null) {
			const percentCompleted = lp.progress;
			return { progress: percentCompleted };
		}
		// else {
		// 	return { match: this.calculateMatch(lp) };
		// }
	}

	checkCompleted(lp: LearningPath | PublicApiLearningPath): boolean {
		if (!this.isLoggedIn()) return false;
		if (lp.required_badges_count != lp.badges.length) {
			const userAssertions = this.recipientManager.recipientBadgeList.entities;
			const badgeClassIds = lp.badges.map((b) => b.badge.slug);
			const userBadgeCount = userAssertions.filter((b) =>
				badgeClassIds.some((i) => b.badgeClass.slug == i),
			).length;
			return userBadgeCount >= lp.required_badges_count;
		}
		return lp.completed_at != null;
	}

	calculateStudyLoad(lp: LearningPath | PublicApiLearningPath): number {
		const totalStudyLoad = lp.badges.reduce(
			(acc, b) => acc + b.badge.extensions['extensions:StudyLoadExtension'].StudyLoad,
			0,
		);
		return totalStudyLoad;
	}

	shareBadge() {
		if (this.badge && this.badge instanceof RecipientBadgeInstance)
			this.dialogService.open(ShareBadgeDialogComponent, {
				context: { badge: this.badge } satisfies ShareBadgeDialogContext,
			});
	}
}
