import { ManagedEntity } from '../../common/model/managed-entity';
import { ApiEntityRef } from '../../common/model/entity-ref';
import {
	ApiRecipientBadgeClass,
	ApiRecipientBadgeInstance,
	RecipientBadgeInstanceRef,
} from './recipient-badge-api.model';
import { CommonEntityManager } from '../../entity-manager/services/common-entity-manager.service';
import { LinkedEntitySet } from '../../common/model/linked-entity-set';
import { RecipientBadgeCollection } from './recipient-badge-collection.model';
import { RecipientBadgeCollectionRef } from './recipient-badge-collection-api.model';

export type BadgeMostRelevantStatusType = 'new' | 'expired' | 'pending' | 'imported';

export class RecipientBadgeInstance extends ManagedEntity<ApiRecipientBadgeInstance, RecipientBadgeInstanceRef> {
	get type(): string {
		return this.apiModel.json.type;
	}
	get recipientEmail(): string {
		return this.apiModel.recipient_identifier;
	}
	get badgeClass(): ApiRecipientBadgeClass {
		return this.apiModel.json.badge;
	}
	get issueDate(): Date {
		return this._issueDate
			? this._issueDate
			: (this._issueDate = new Date(this.apiModel.json.issuedOn || this.apiModel.json.validFrom));
	}
	get image(): string {
		return this.apiModel.image;
	}
	get imagePreview(): string {
		return this.apiModel.imagePreview.id;
	}
	get narrative(): string {
		return this.apiModel.narrative;
	}
	get evidence_items(): Array<unknown> {
		return this.apiModel.evidence_items;
	}

	get expiresDate(): Date {
		return this._expiresDate
			? this._expiresDate
			: (this._expiresDate = (this.apiModel.json.expires && new Date(this.apiModel.json.expires)) || null);
	}

	get activityStartDate(): Date | undefined {
		return this.apiModel.json.credentialSubject.activityStartDate
			? new Date(this.apiModel.json.credentialSubject.activityStartDate)
			: undefined;
	}

	get activityEndDate(): Date | undefined {
		return this.apiModel.json.credentialSubject.activityEndDate
			? new Date(this.apiModel.json.credentialSubject.activityEndDate)
			: undefined;
	}

	get activityCity(): string | undefined {
		return this.apiModel.json.credentialSubject.activityCity;
	}

	get activityOnline(): string | undefined {
		return this.apiModel.json.credentialSubject.activityOnline;
	}

	get shareUrl(): string {
		return this.apiModel.shareUrl;
	}

	get courseUrl(): string {
		return this.apiModel.courseUrl;
	}

	get isNew(): boolean {
		return this.apiModel.acceptance === 'Unaccepted';
	}

	get isExpired(): boolean {
		return this.mostRelevantStatus === 'expired';
	}

	get mostRelevantStatus(): BadgeMostRelevantStatusType | null {
		if (this.expiresDate && this.expiresDate < new Date()) {
			return 'expired';
		} else if (this.apiModel.imported) {
			return 'imported';
		} else if (this.apiModel.pending) {
			return 'pending';
		} else if (this.apiModel.acceptance === 'Unaccepted') {
			return 'new';
		}
	}

	get issuerId(): string {
		return this.apiModel.json.badge.issuer.id;
	}

	get criteriaUrl(): string {
		return this.badgeClass.criteria_url || null;
	}

	get criteria(): Array<{ name: string; description: string }> {
		return this.criteria;
	}

	get imported(): boolean {
		return this.apiModel.imported;
	}

	get isNetworkBadge(): boolean {
		return this.apiModel.isNetworkBadge;
	}

	get networkImage(): string {
		return this.apiModel.networkImage;
	}

	get networkName(): string {
		return this.apiModel.networkName;
	}

	get sharedOnNetwork(): { slug: string; name: string; image: string | null; description: string | null } | null {
		return this.apiModel.sharedOnNetwork;
	}

	/**
	 * Cached copy of the immutable issueDate for optimization
	 */
	_issueDate: Date;

	/**
	 * Cached copy of the immutable expiresDate for optimization
	 */
	_expiresDate: Date | null = null;

	collections = new LinkedEntitySet<RecipientBadgeInstance, RecipientBadgeCollection, RecipientBadgeCollectionRef>(
		this,
		() =>
			this.commonManager.recipientBadgeCollectionManager.recipientBadgeCollectionList.loadedPromise.then((list) =>
				list.entities.filter((c) => c.containsBadge(this)),
			),
		(c) => {
			c.addBadge(this);
			this.modifiedCollections.push(c);
		},
		(c) => {
			c.removeBadge(this);
			this.modifiedCollections.push(c);
		},
	);

	/**
	 * List of collection that we've modified to either include or exclude ourselves from.
	 */
	private modifiedCollections: RecipientBadgeCollection[] = [];

	constructor(
		commonManager: CommonEntityManager,
		initialEntity: ApiRecipientBadgeInstance = null,
		onUpdateSubscribed: () => void = undefined,
	) {
		super(commonManager, onUpdateSubscribed);

		if (initialEntity) {
			this.applyApiModel(initialEntity);
		}
	}

	protected buildApiRef(): ApiEntityRef {
		return {
			'@id': String(this.apiModel.id),
			slug: String(this.apiModel.id),
		};
	}

	save(): Promise<this> {
		const collections = this.modifiedCollections;
		this.modifiedCollections = [];

		return Promise.all(collections.map((c) => c.save())).then(() => this);
	}

	revertChanges(): boolean {
		this.modifiedCollections.forEach((c) => c.revertChanges());
		this.modifiedCollections = [];

		return super.revertChanges();
	}

	markAccepted(): Promise<this> {
		if (this.isNew) {
			this.apiModel.acceptance = 'Accepted';

			return this.recipientBadgeManager.recipientBadgeApiService
				.saveInstance(this.apiModel)
				.then((newModel) => this.applyApiModel(newModel));
		} else {
			return Promise.resolve(this);
		}
	}

	hasExtension(extensionName: string) {
		return this.apiModel.extensions && extensionName in this.apiModel.extensions;
	}
	getExtension(extensionName: string, defaultValue) {
		return this.hasExtension(extensionName) ? this.apiModel.extensions[extensionName] : defaultValue;
	}
}
