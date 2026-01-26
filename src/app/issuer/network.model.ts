import { ManagedEntity } from '~/common/model/managed-entity';
import { ApiIssuer, ApiNetwork, IssuerRef, IssuerStaffRoleSlug, IssuerUrl } from './models/issuer-api.model';
import { CommonEntityManager } from '~/entity-manager/services/common-entity-manager.service';
import { ApiEntityRef } from '~/common/model/entity-ref';
import { Issuer, IssuerStaffMember } from './models/issuer.model';
import { EmbeddedEntitySet } from '~/common/model/managed-entity-set';

export class Network extends ManagedEntity<ApiNetwork, IssuerRef> {
	readonly partner_issuers = new EmbeddedEntitySet(
		this,
		() => this.apiModel.partner_issuers,
		(apiIssuer) => new Issuer(this.commonManager, apiIssuer),
		(apiIssuer) => apiIssuer.json.id,
	);

	readonly staff = new EmbeddedEntitySet(
		this,
		() => this.apiModel.staff,
		(apiEntry) => new IssuerStaffMember(this as unknown as Issuer),
		IssuerStaffMember.urlFromApiModel,
	);

	constructor(
		commonManager: CommonEntityManager,
		initialEntity: ApiNetwork = null,
		onUpdateSubscribed: () => void = undefined,
	) {
		super(commonManager, onUpdateSubscribed);

		if (initialEntity != null) {
			this.applyApiModel(initialEntity);
		}
	}

	protected buildApiRef(): ApiEntityRef {
		return {
			'@id': this.issuerUrl,
			slug: this.apiModel.slug,
		};
	}

	get issuerUrl(): IssuerUrl {
		return this.apiModel.json.id;
	}

	get createdAt(): Date {
		return new Date(this.apiModel.created_at);
	}

	get name(): string {
		return this.apiModel.json.name;
	}

	get description(): string {
		return this.apiModel.json.description;
	}

	get slug(): string {
		return this.apiModel.slug;
	}

	get image(): string | undefined {
		return this.apiModel.json.image;
	}

	get websiteUrl(): string {
		return this.apiModel.json.url;
	}

	get country(): string {
		return this.apiModel.country;
	}

	get state(): string {
		return this.apiModel.state;
	}

	get badgeClassCount(): number {
		const badges = this.commonManager.badgeManager.badgesList;

		if (!badges.loaded) {
			return this.apiModel.badgeClassCount;
		}

		const filteredBadges = badges.entities?.filter((b) => b.issuerSlug === this.slug) || [];

		// If no badges found but API says there should be some, use API value
		if (filteredBadges.length === 0 && this.apiModel.badgeClassCount > 0) {
			return this.apiModel.badgeClassCount;
		}

		return filteredBadges.length;
	}

	get learningpathCount(): number {
		const lps = this.commonManager.learningpathManager.learningPathList;

		if (!lps.loaded) {
			return this.apiModel.learningPathCount;
		}

		const filteredLps = lps.entities?.filter((lp) => lp.issuer_id === this.slug) || [];

		// If no lps found but API says there should be some, use API value
		if (filteredLps.length === 0 && this.apiModel.learningPathCount > 0) {
			return this.apiModel.learningPathCount;
		}

		return filteredLps.length;
	}

	get partnerBadgesCount(): number {
		return this.apiModel.partnerBadgesCount;
	}

	get is_network(): boolean {
		return true;
	}

	get partnerCount(): number {
		return this.partner_issuers.length;
	}

	get current_user_network_role(): IssuerStaffRoleSlug | null {
		return this.apiModel.current_user_network_role;
	}

	get currentUserStaffMember(): IssuerStaffMember {
		if (this.profileManager.userProfile && this.profileManager.userProfile.emails.entities) {
			const emails = this.profileManager.userProfile.emails.entities;

			return (
				this.staff.entities.find(
					(staffMember) => !!emails.find((profileEmail) => profileEmail.email === staffMember.email),
				) || null
			);
		} else {
			return null;
		}
	}

	/**
	 * Evaluates if the current user can create badges.
	 * This is the case if all of the following conditions are fulfilled:
	 * - there is a logged in user
	 * - the logged in user has either the owner or editor role for this issuer
	 *
	 * @returns {boolean} true if the user may create badge, false otherwise
	 */
	get canCreateBadge(): boolean {
		return this.currentUserStaffMember?.canEditBadge ?? false;
	}

	/**
	 * Evaluates if the current user may edit badges, which is the case if all of the
	 * following conditions are fulfilled:
	 * - the issuer is verified
	 * - there is a logged in user
	 * - the logged in user has either the owner or editor role for this issuer
	 * @returns {boolean} true if the user may edit badges, false otherwise
	 */
	get canEditBadge(): boolean {
		return this.currentUserStaffMember?.canEditBadge ?? false;
	}
}
