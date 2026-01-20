import {
	ApiBadgeClass,
	ApiBadgeClassAlignment,
	BadgeClassCopyPermissions,
	BadgeClassRef,
	BadgeClassUrl,
} from './badgeclass-api.model';
import { IssuerUrl } from './issuer-api.model';
import { ManagedEntity } from '../../common/model/managed-entity';
import { ApiEntityRef } from '../../common/model/entity-ref';
import { CommonEntityManager } from '../../entity-manager/services/common-entity-manager.service';

export class BadgeClass extends ManagedEntity<ApiBadgeClass, BadgeClassRef> {
	get badgeUrl(): BadgeClassUrl {
		return this.apiModel.json.id;
	}

	get issuerUrl(): IssuerUrl {
		return this.apiModel.issuer;
	}

	get name(): string {
		return this.apiModel.name;
	}
	set name(name: string) {
		this.apiModel.name = name;
	}

	get slug(): string {
		return this.apiModel.slug;
	}

	get description(): string {
		return this.apiModel.description;
	}
	set description(description: string) {
		this.apiModel.json.description = description;
		this.apiModel.description = description;
	}

	get image(): string {
		return this.apiModel.image;
	}
	set image(image: string) {
		this.apiModel.image = image;
	}

	get imageFrame(): boolean {
		return this.apiModel.imageFrame !== undefined ? this.apiModel.imageFrame : true;
	}
	set imageFrame(imageFrame: boolean) {
		this.apiModel.imageFrame = imageFrame;
	}

	get createdAt(): Date {
		return new Date(this.apiModel.created_at);
	}

	get updatedAt(): Date {
		return new Date(this.apiModel.updated_at);
	}

	get createdBy(): string {
		return this.apiModel.created_by;
	}

	get recipientCount(): number {
		return this.apiModel.recipient_count;
	}

	set recipientCount(count: number) {
		this.apiModel.recipient_count = count;
	}

	get courseUrl(): string {
		return this.apiModel.course_url;
	}

	set courseUrl(c: string) {
		this.apiModel.course_url = c;
	}

	get criteria_text(): string {
		return this.apiModel.criteria_text;
	}
	set criteria_text(criteriaText: string) {
		this.apiModel.json.criteria_text = criteriaText;
		this.apiModel.criteria_text = criteriaText;
	}

	get criteria_url(): string {
		return this.apiModel.criteria_url;
	}
	set criteria_url(criteriaUrl: string) {
		this.apiModel.json.criteriaUrl = criteriaUrl;
		this.apiModel.criteria_url = criteriaUrl;
	}

	get criteria(): Array<{ name: string; description: string }> {
		return this.apiModel.criteria;
	}

	set criteria(criteria: Array<{ name: string; description: string }>) {
		this.apiModel.criteria = criteria;
	}

	get tags(): string[] {
		return this.apiModel.tags;
	}
	set tags(tags: string[]) {
		this.apiModel.tags = tags;
	}

	get extension() {
		return this.apiModel.extensions;
	}

	set extension(extensions: object) {
		this.apiModel.extensions = extensions;
	}

	get source_url() {
		return this.apiModel.source_url;
	}

	get issuerVerified() {
		return this.apiModel.issuerVerified;
	}

	hasExtension(extensionName: string) {
		return this.apiModel.extensions && extensionName in this.apiModel.extensions;
	}

	get expiration(): number {
		return this.apiModel.expiration;
	}

	set expiration(days: number | undefined) {
		this.apiModel.expiration = days ?? undefined;
	}

	get issuerSlug(): string {
		return BadgeClass.issuerSlugFromUrl(this.issuerUrl);
	}

	get issuerOwnerAcceptedTos(): boolean {
		return this.apiModel.issuerOwnerAcceptedTos;
	}

	get isNetworkBadge(): boolean {
		return this.apiModel.isNetworkBadge;
	}

	get networkName(): string {
		return this.apiModel.networkName;
	}

	get networkImage(): string {
		return this.apiModel.networkImage;
	}

	get sharedOnNetwork(): { slug: string; name: string; image: string | null; description: string | null } | null {
		return this.apiModel.sharedOnNetwork;
	}

	get alignments() {
		return this.apiModel.alignment;
	}
	set alignments(alignments: ApiBadgeClassAlignment[]) {
		this.apiModel.alignment = alignments;
	}

	get copyPermissions(): BadgeClassCopyPermissions[] {
		return this.apiModel.copy_permissions;
	}
	set copyPermissions(permissions: BadgeClassCopyPermissions[]) {
		this.apiModel.copy_permissions = permissions;
	}

	canCopy(key: BadgeClassCopyPermissions) {
		return this.copyPermissions.indexOf(key) !== -1;
	}

	get issuer() {
		return this.apiModel.issuer;
	}
	get issuerName() {
		return this.apiModel.issuerName;
	}

	// TODO: The API should give us the issuer slug for a badge, and we should not need to parse the URL.
	static issuerSlugForApiBadge(apiBadge: ApiBadgeClass) {
		return BadgeClass.issuerSlugFromUrl(apiBadge.issuer);
	}

	private static issuerSlugFromUrl(issuerUrl: string) {
		return (issuerUrl.match(/\/public\/issuers\/([^\/]+)/) || [])[1] || null;
	}
	constructor(
		commonManager: CommonEntityManager,
		initialEntity: ApiBadgeClass = null,
		onUpdateSubscribed: () => void = undefined,
	) {
		super(commonManager, onUpdateSubscribed);

		if (initialEntity != null) {
			this.applyApiModel(initialEntity);
		}
	}

	protected buildApiRef(): ApiEntityRef {
		return {
			'@id': this.badgeUrl,
			slug: this.apiModel.slug,
		};
	}
	clearExpires(): void {
		this.apiModel.expiration = undefined;
	}

	expirationDateRelative(issuedOn?: Date): Date | undefined {
		if (this.apiModel.expiration) {
			const baseDate = issuedOn ? new Date(issuedOn) : new Date();
			baseDate.setDate(baseDate.getDate() + this.apiModel.expiration);
			return baseDate;
		}
		return undefined;
	}

	update(): Promise<this> {
		return this.badgeManager.badgeClassApi
			.getBadgeForIssuerSlugAndBadgeSlug(this.issuerSlug, this.slug)
			.then((apiBadge) => this.applyApiModel(apiBadge));
	}

	save(): Promise<this> {
		return this.badgeManager.badgeClassApi
			.updateBadgeClass(this.issuerSlug, this.apiModel)
			.catch((e) => {
				this.revertChanges();
				throw e;
			})
			.then((apiBadge) => this.applyApiModel(apiBadge));
	}
}
