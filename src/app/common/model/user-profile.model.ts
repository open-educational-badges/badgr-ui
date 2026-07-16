import { ManagedEntity } from './managed-entity';
import {
	ApiUserProfile,
	ApiUserProfileEmail,
	ApiUserProfileSocialAccount,
	socialAccountProviderInfoForSlug,
	UserProfileEmailRef,
	UserProfileRef,
	UserProfileSocialAccountRef,
} from './user-profile-api.model';
import { StandaloneEntitySet } from './managed-entity-set';
import { CommonEntityManager } from '~/entity-manager/services/common-entity-manager.service';

/**
 * Logical interface to the current user's profile, providing access to personal information (as the entitiy) and
 * access to various managed profile objects.
 */
export class UserProfile extends ManagedEntity<ApiUserProfile, UserProfileRef> {
	protected get profileService() {
		return this.commonManager.profileManager.profileService;
	}

	get isVerified(): boolean {
		return this.emails.entities.filter((x) => x.verified).length > 0;
	}

	get firstName() {
		return this.apiModel.first_name;
	}
	set firstName(firstName: string) {
		this.apiModel.first_name = firstName;
	}

	get lastName() {
		return this.apiModel.last_name;
	}
	set lastName(lastName: string) {
		this.apiModel.last_name = lastName;
	}

	get zipCode() {
		return this.apiModel.zip_code;
	}
	set zipCode(zipCode: string) {
		this.apiModel.zip_code = zipCode;
	}

	get agreedTermsVersion() {
		return this.apiModel.agreed_terms_version;
	}
	get latestTermsVersion() {
		return this.apiModel.latest_terms_version;
	}
	get hasPasswordSet() {
		return this.apiModel.has_password_set;
	}

	get latestTermsDescription() {
		return this.apiModel.latest_terms_description;
	}

	get marketingOptIn() {
		return this.apiModel.marketing_opt_in;
	}
	set marketingOptIn(optedIn: boolean) {
		this.apiModel.marketing_opt_in = true;
	}

	get securePasswordSet() {
		return this.apiModel.secure_password_set;
	}

	set securePasswordSet(secure: boolean) {
		this.apiModel.marketing_opt_in = secure;
	}

	get totpEnabled() {
		return this.apiModel.totp_enabled;
	}

	get mfaReminderDismissed() {
		return this.apiModel.mfa_reminder_dismissed;
	}

	set mfaReminderDismissed(dismissed: boolean) {
		this.apiModel.mfa_reminder_dismissed = dismissed;
	}

	static currentProfileId = 'currentUserProfile';
	/**
	 * List of emails associated with this user's account.
	 *
	 * @type {StandaloneEntitySet<UserProfileEmail, ApiUserProfileEmail>}
	 */
	emails = new StandaloneEntitySet<UserProfileEmail, ApiUserProfileEmail>(
		(apiEntity) => new UserProfileEmail(this),
		(apiModel) => apiModel.id + '',
		() => this.profileService.fetchEmails(),
	);

	/**
	 * List of social accounts associated with this user's account.
	 *
	 * @type {StandaloneEntitySet<UserProfileSocialAccount, ApiUserProfileSocialAccount>}
	 */
	socialAccounts = new StandaloneEntitySet<UserProfileSocialAccount, ApiUserProfileSocialAccount>(
		(apiEntity) => new UserProfileSocialAccount(this),
		(apiModel) => apiModel.id + '',
		() => this.profileService.fetchSocialAccounts(),
	);

	get dateJoined() {
		return new Date(this.apiModel.date_joined);
	}

	protected buildApiRef(): UserProfileRef {
		return {
			'@id': UserProfile.currentProfileId,
			slug: UserProfile.currentProfileId,
		};
	}

	constructor(
		commonManager: CommonEntityManager,
		initialEntity: ApiUserProfile = null,
		onUpdateSubscribed: () => void = undefined,
	) {
		super(commonManager, onUpdateSubscribed);

		if (initialEntity) {
			this.applyApiModel(initialEntity);
		}
	}

	agreeToLatestTerms() {
		this.apiModel.agreed_terms_version = this.apiModel.latest_terms_version;
		return this.save();
	}

	save(): Promise<this> {
		return this.profileService.updateProfile(this.apiModel).then((m) => this.applyApiModel(m));
	}

	update() {
		return this.profileService.getProfile().then((m) => this.applyApiModel(m));
	}

	delete() {
		return this.profileService.deleteOwnProfile();
	}

	addEmail(email: string): Promise<UserProfileEmail> {
		return this.profileService.addEmail(email).then((apiEmail) => this.emails.addOrUpdate(apiEmail));
	}

	updatePassword(newPassword: string, currentPassword: string): Promise<this> {
		return this.profileService.updatePassword(newPassword, currentPassword).then(() => this);
	}
}

export class UserProfileEmail extends ManagedEntity<ApiUserProfileEmail, UserProfileEmailRef> {
	constructor(public profile: UserProfile) {
		super(profile.commonManager);
	}

	protected get profileService() {
		return this.commonManager.profileManager.profileService;
	}

	get numericId() {
		return this.apiModel.id;
	}
	get email() {
		return this.apiModel.email;
	}
	get primary() {
		return this.apiModel.primary;
	}
	get verified() {
		return this.apiModel.verified;
	}

	remove(): Promise<UserProfile> {
		return this.profileService.removeEmail(this.numericId).then(() => {
			this.profile.emails.remove(this);
			return this.profile;
		});
	}

	makePrimary(): Promise<this> {
		return this.profileService.setPrimaryEmail(this.numericId).then(() => this);
	}

	resendVerificationEmail(): Promise<this> {
		return this.profileService.resendVerificationEmail(this.numericId).then(() => this);
	}

	protected buildApiRef(): UserProfileEmailRef {
		return {
			'@id': this.numericId + '',
			slug: this.email,
		};
	}
}

export class UserProfileSocialAccount extends ManagedEntity<ApiUserProfileSocialAccount, UserProfileSocialAccountRef> {
	constructor(public profile: UserProfile) {
		super(profile.commonManager);
	}

	protected get profileService() {
		return this.commonManager.profileManager.profileService;
	}

	get providerSlug() {
		return this.apiModel.provider;
	}

	get providerInfo() {
		return socialAccountProviderInfoForSlug(this.providerSlug);
	}

	/**
	 * Date when account was linked to provider
	 */
	get dateAdded() {
		return new Date(this.apiModel.dateAdded);
	}

	/**
	 * User id from provider (probably not human readable)
	 */
	get uid() {
		return this.apiModel.uid;
	}

	/**
	 * First name from provider (at time of first login)
	 */
	get firstName() {
		return this.apiModel.firstName;
	}

	/**
	 * Last name from provider (at time of first login)
	 */
	get lastName() {
		return this.apiModel.lastName;
	}

	/**
	 * Primary email provided by provider (at time of first login)
	 */
	get primaryEmail() {
		return this.apiModel.primaryEmail;
	}

	/**
	 * URL associated with account (if applicable)
	 */
	get url() {
		return this.apiModel.url;
	}

	/**
	 * Returns a label to use for this account based on the name if it's available (e.g. "Luke Skywalker"), or the email
	 * if it isn't (e.g. "lskywalker@rebel.alliance")
	 *
	 * @returns {string}
	 */
	get nameLabel(): string {
		const names = [this.firstName, this.lastName].filter((n) => n && n.length > 0);
		if (names.length > 0) {
			return names.join(' ');
		} else {
			return this.primaryEmail;
		}
	}

	/**
	 * Returns a label to use for this account based on the name and email if available (e.g. "Luke Skywalker (lskywalker@rebel.alliance)")
	 *
	 * @returns {string}
	 */
	get fullLabel(): string {
		const names = [this.firstName, this.lastName].filter((n) => n && n.length > 0);
		if (names.length > 0) {
			return `${names.join(' ')} (${this.primaryEmail}) (${this.url})`;
		} else if (this.url) {
			return `${this.url}`;
		} else {
			return this.primaryEmail;
		}
	}

	/**
	 * Removes this social account from the user profile.
	 *
	 * @returns {Promise<UserProfile>}
	 */
	remove(): Promise<UserProfile> {
		return this.profileService.removeSocialAccount(this.apiModel.id).then(() => {
			this.profile.socialAccounts.remove(this);
			return this.profile;
		});
	}

	protected buildApiRef(): UserProfileSocialAccountRef {
		return {
			'@id': this.apiModel.id,
			slug: this.apiModel.id,
		};
	}
}
