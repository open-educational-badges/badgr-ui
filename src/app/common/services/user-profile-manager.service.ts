import { Injectable, inject } from '@angular/core';
import { UserProfileApiService } from './user-profile-api.service';
import { StandaloneEntitySet } from '../model/managed-entity-set';
import { UserProfile } from '../model/user-profile.model';
import { ApiUserProfile } from '../model/user-profile-api.model';
import { CommonEntityManager } from '../../entity-manager/services/common-entity-manager.service';

/**
 * Manager for the singleton `UserProfile` instance that provides access to the current user's profile.
 */
@Injectable({ providedIn: 'root' })
export class UserProfileManager {
	commonEntityManager = inject(CommonEntityManager);
	profileService = inject(UserProfileApiService);

	userProfileSet = new StandaloneEntitySet<UserProfile, ApiUserProfile>(
		(apiModel) => new UserProfile(this.commonEntityManager),
		(apiModel) => UserProfile.currentProfileId,
		() => {
			return this.profileService
				.getProfile()
				.then((p) => [p])
				.catch((e) => []);
		},
	);

	/**
	 * The current userProfile object, which may or may not be present. Note that accessing the property will cause the
	 * profile to be fetched from the server if it has not already been.
	 *
	 * @returns {UserProfile}
	 */
	get userProfile() {
		return this.userProfileSet.entities[0];
	}

	/**
	 * A promise for the loaded user profile.
	 *
	 * @returns {Promise<UserProfile>}
	 */
	get userProfilePromise(): Promise<UserProfile> {
		return this.userProfileSet.loadedPromise.then(() => this.userProfile);
	}

	constructor() {}

	reloadUserProfileSet() {
		return new Promise((resolve, reject) => {
			this.userProfileSet = new StandaloneEntitySet<UserProfile, ApiUserProfile>(
				(apiModel) => new UserProfile(this.commonEntityManager),
				(apiModel) => UserProfile.currentProfileId,
				() => {
					return this.profileService
						.getProfile()
						.then((p) => [p])
						.catch((e) => [])
						.finally(() => {
							resolve('userProfileSet updated');
						});
				},
			);
		});
	}
}
