import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AppConfigService } from '../common/app-config.service';
import { MessageService } from '../common/services/message.service';
import { SessionService } from '../common/services/session.service';
import { UserProfileManager } from '../common/services/user-profile-manager.service';
import { CommonEntityManager } from '../entity-manager/services/common-entity-manager.service';
import { AUTH_PROVIDER } from '../common/services/authentication-service';

export function createCommonProviders(isLoggedIn = false) {
	return [
		{ provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
		{ provide: Title, useValue: { setTitle: () => {} } },
		{ provide: AppConfigService, useValue: { apiConfig: { baseUrl: 'http://localhost:8000' }, theme: {} } },
		{ provide: MessageService, useValue: { reportHandledError: () => {} } },
		{ provide: SessionService, useValue: { isLoggedIn } },
		{ provide: UserProfileManager, useValue: {} },
		{ provide: CommonEntityManager, useValue: {} },
		{ provide: AUTH_PROVIDER, useValue: {} },
	];
}
