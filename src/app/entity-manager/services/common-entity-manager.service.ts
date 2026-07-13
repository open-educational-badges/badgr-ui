import { Injectable, Injector, inject } from '@angular/core';
import { BadgeClassManager } from '../../issuer/services/badgeclass-manager.service';
import { MessageService } from '../../common/services/message.service';
import { BadgeInstanceManager } from '../../issuer/services/badgeinstance-manager.service';
import { RecipientBadgeManager } from '../../recipient/services/recipient-badge-manager.service';
import { RecipientBadgeCollectionManager } from '../../recipient/services/recipient-badge-collection-manager.service';
import { AppIntegrationManager } from '../../profile/services/app-integration-manager.service';
import { IssuerManager } from '../../issuer/services/issuer-manager.service';
import { UserProfileManager } from '../../common/services/user-profile-manager.service';
import { OAuthManager } from '../../common/services/oauth-manager.service';
import { LearningPathManager } from '../../issuer/services/learningpath-manager.service';
import { PDFTemplateManager } from '../../issuer/services/pdftemplate-manager.service';

/**
 * Common entity manager which orchestrates communication between the various types of managed entities so they can
 * work with one another.
 */
@Injectable({ providedIn: 'root' })
export class CommonEntityManager {
	private injector = inject(Injector);

	get badgeInstanceManager(): BadgeInstanceManager {
		return this.injector.get(BadgeInstanceManager);
	}

	get badgeManager(): BadgeClassManager {
		return this.injector.get(BadgeClassManager);
	}

	get recipientBadgeManager(): RecipientBadgeManager {
		return this.injector.get(RecipientBadgeManager);
	}

	get recipientBadgeCollectionManager(): RecipientBadgeCollectionManager {
		return this.injector.get(RecipientBadgeCollectionManager);
	}

	get appIntegrationManager(): AppIntegrationManager {
		return this.injector.get(AppIntegrationManager);
	}

	get messageService(): MessageService {
		return this.injector.get(MessageService);
	}

	get issuerManager(): IssuerManager {
		return this.injector.get(IssuerManager);
	}

	get profileManager(): UserProfileManager {
		return this.injector.get(UserProfileManager);
	}

	get oAuthManager(): OAuthManager {
		return this.injector.get(OAuthManager);
	}

	get learningpathManager(): LearningPathManager {
		return this.injector.get(LearningPathManager);
	}

	get pdfTemplateManager(): PDFTemplateManager {
		return this.injector.get(PDFTemplateManager);
	}

	/** Inserted by Angular inject() migration for backwards compatibility */
	constructor(...args: unknown[]);

	constructor() {}
}
