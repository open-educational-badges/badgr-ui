import {
	ApiIssuer,
	ApiIssuerStaff,
	IssuerRef,
	IssuerSlug,
	IssuerStaffRef,
	IssuerStaffRoleSlug,
	IssuerUrl,
	ApiNetwork,
	ApiQuotas,
} from './issuer-api.model';
import { ManagedEntity } from '../../common/model/managed-entity';
import { ApiEntityRef } from '../../common/model/entity-ref';
import { CommonEntityManager } from '../../entity-manager/services/common-entity-manager.service';
import { EmbeddedEntitySet } from '../../common/model/managed-entity-set';

export class Issuer extends ManagedEntity<ApiIssuer, IssuerRef> {
	readonly staff = new EmbeddedEntitySet(
		this,
		() => this.apiModel.staff,
		(apiEntry) => new IssuerStaffMember(this),
		IssuerStaffMember.urlFromApiModel,
	);

	protected buildApiRef(): ApiEntityRef {
		return {
			'@id': this.issuerUrl,
			slug: this.apiModel.slug,
		};
	}

	constructor(
		commonManager: CommonEntityManager,
		initialEntity: ApiIssuer = null,
		onUpdateSubscribed: () => void = undefined,
	) {
		super(commonManager, onUpdateSubscribed);

		if (initialEntity != null) {
			this.applyApiModel(initialEntity);
		}
	}

	get issuerUrl(): IssuerUrl {
		return this.apiModel.json.id;
	}

	get slug(): IssuerSlug {
		return this.apiModel.slug;
	}

	get name(): string {
		return this.apiModel.name;
	}

	get description(): string {
		return this.apiModel.description;
	}

	get image(): string {
		return this.apiModel.image;
	}

	get email(): string {
		return this.apiModel.json.email;
	}

	get websiteUrl(): string {
		return this.apiModel.json.url;
	}

	get createdAt(): Date {
		return new Date(this.apiModel.created_at);
	}

	get category(): string {
		return this.apiModel.category;
	}
	get street(): string {
		return this.apiModel.street;
	}
	get streetnumber(): string {
		return this.apiModel.streetnumber;
	}
	get zip(): string {
		return this.apiModel.zip;
	}
	get city(): string {
		return this.apiModel.city;
	}

	get country(): string {
		return this.apiModel.country;
	}

	get state(): string {
		return this.apiModel.state;
	}

	get intendedUseVerified(): boolean {
		return this.apiModel.intendedUseVerified;
	}

	get lat(): number {
		return this.apiModel.lat;
	}
	get lon(): number {
		return this.apiModel.lon;
	}
	get sourceUrl(): string {
		return this.apiModel.source_url;
	}

	get linkedinId(): string {
		return this.apiModel.linkedinId;
	}

	get networks(): ApiNetwork[] {
		return this.apiModel.networks;
	}

	get is_network(): boolean {
		return this.apiModel.is_network;
	}

	get quotas(): ApiQuotas {
		return this.apiModel.quotas;
	}

	public addQuota(quota: string) {
		if (this.apiModel.quotas?.quotas[quota]) {
			this.apiModel.quotas.quotas[quota].used += 1;
			this.apiModel.quotas.quotas[quota].quota -= 1;

			this.applyApiModel(this.apiModel);
		}
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

	get ownerAcceptedTos(): boolean {
		return this.apiModel.ownerAcceptedTos;
	}

	get learningPathCount(): number {
		return this.apiModel.learningPathCount;
	}

	async update(): Promise<this> {
		this.applyApiModel(await this.issuerApiService.getIssuer(this.slug), true);
		return this;
	}

	async delete(): Promise<ApiIssuer> {
		return this.issuerApiService.deleteIssuer(this.slug);
	}

	private get issuerApiService() {
		return this.commonManager.issuerManager.issuerApiService;
	}

	async addStaffMember(role: IssuerStaffRoleSlug, email: string): Promise<this> {
		await this.issuerApiService.updateStaff(this.slug, {
			action: 'add',
			email,
			role,
		});

		return this.update();
	}

	/**
	 * Evaluates if the current user can edit issuer.
	 * This is only if the user is an owner.
	 *
	 * @returns {boolean}
	 */
	get canUpdateDeleteIssuer(): boolean {
		return this.currentUserStaffMember?.canEditIssuer ?? false;
	}

	/**
	 * Evaluates if the current user can create badges.
	 * This is the case if all of the following conditions are fulfilled:
	 * - the issuer is verified
	 * - there is a logged in user
	 * - the logged in user has either the owner or editor role for this issuer
	 *
	 * @returns {boolean} true if the user may create badge, false otherwise
	 */
	get canCreateBadge(): boolean {
		return this.apiModel.verified && (this.currentUserStaffMember?.canEditBadge ?? false);
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
		return this.apiModel.verified && (this.currentUserStaffMember?.canEditBadge ?? false);
	}

	/**
	 * Evaluates if the current user may delete badges, which is the case if all of the
	 * following conditions are fulfilled:
	 * - the issuer is verified
	 * - there is a logged in user
	 * - the logged in user has either the owner or editor role for this issuer
	 * @returns {boolean} true if the user may delete badges, false otherwise
	 */
	get canDeleteBadge(): boolean {
		return this.apiModel.verified && (this.currentUserStaffMember?.canEditBadge ?? false);
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

	static urlFromApiModel(apiIssuer: ApiIssuer): IssuerUrl {
		return apiIssuer.json.id;
	}
}

export class IssuerStaffMember extends ManagedEntity<ApiIssuerStaff, IssuerStaffRef> {
	get roleSlug() {
		return this.apiModel.role;
	}
	get roleInfo() {
		return issuerRoleInfoFor(this.roleSlug);
	}
	get email() {
		return this.apiModel.user.email;
	}
	get telephone() {
		return typeof this.apiModel.user.telephone === 'string'
			? this.apiModel.user.telephone
			: this.apiModel.user.telephone[0];
	}
	get url() {
		return typeof this.apiModel.user.url === 'string' ? this.apiModel.user.url : this.apiModel.user.url[0];
	}
	get firstName() {
		return this.apiModel.user.first_name;
	}
	get lastName() {
		return this.apiModel.user.last_name;
	}

	set roleSlug(role: IssuerStaffRoleSlug) {
		this.apiModel.role = role;
	}

	get isOwner(): boolean {
		return this.roleSlug === 'owner';
	}

	get isEditor(): boolean {
		return this.roleSlug === 'editor';
	}

	/**
	 * Evaluates if the user has the permission to make edits,
	 * specifically to create/edit issuer. This is only if the user
	 * is an owner.
	 *
	 * @returns {boolean}
	 */
	get canEditIssuer(): boolean {
		return this.isOwner;
	}

	/**
	 * Evaluates if the user has the permission to make edits,
	 * specifically to create badges. This is the case if the user
	 * is either an owner, or an editor.
	 *
	 * @returns {boolean}
	 */
	get canEditBadge(): boolean {
		return this.isOwner || this.isEditor;
	}

	/**
	 * Returns a label to use for this member based on the name if it's available (e.g. "Luke Skywalker"), or the email
	 * if it isn't (e.g. "lskywalker@rebel.alliance")
	 *
	 * @returns {string}
	 */
	get nameLabel(): string {
		const names = [this.firstName, this.lastName].filter((n) => n && n.length > 0);
		if (names.length > 0) {
			return names.join(' ');
		} else {
			return this.email;
		}
	}

	/**
	 * Returns a label to use for this member based on the name and email if available (e.g. "Luke Skywalker (lskywalker@rebel.alliance)")
	 *
	 * @returns {string}
	 */
	get fullLabel(): string {
		const names = [this.firstName, this.lastName].filter((n) => n && n.length > 0);
		if (names.length > 0) {
			return names.join(' ') + `(${this.email})`;
		} else {
			return this.email;
		}
	}

	static urlFromApiModel(apiStaff: ApiIssuerStaff) {
		return apiStaff.user ? apiStaff.user.email : '';
	}
	constructor(public issuer: Issuer) {
		super(issuer.commonManager);
	}

	protected buildApiRef(): IssuerStaffRef {
		return {
			'@id': IssuerStaffMember.urlFromApiModel(this.apiModel),
			slug: IssuerStaffMember.urlFromApiModel(this.apiModel),
		};
	}

	async save(): Promise<IssuerStaffMember> {
		await this.issuerManager.issuerApiService.updateStaff(this.issuer.slug, {
			action: 'modify',
			email: this.email,
			role: this.apiModel.role,
		});

		return this.issuer.update().then(() => this);
	}

	async remove(): Promise<Issuer> {
		await this.issuerManager.issuerApiService.updateStaff(this.issuer.slug, {
			action: 'remove',
			email: this.email,
		});

		return this.issuer.update();
	}
}

// ToDo: the following texts are already added to de/en.json files, please make sure to use their reference when reactivating English lang
export const issuerStaffRoles = [
	{
		slug: 'owner',
		label: 'Issuer.addMember_owner',
		indefiniteLabel: 'an owner',
		description: 'Issuer.staffOwnerRights',
	},
	{
		slug: 'editor',
		label: 'Issuer.addMember_editor',
		indefiniteLabel: 'an editor',
		description: 'Issuer.staffEditorRights',
	},
	{
		slug: 'staff',
		label: 'Issuer.addMember_staff',
		indefiniteLabel: 'a staff member',
		description: 'Issuer.staffMemberRights',
	},
];
export function issuerRoleInfoFor(slug: IssuerStaffRoleSlug) {
	return issuerStaffRoles.find((r) => r.slug === slug);
}
