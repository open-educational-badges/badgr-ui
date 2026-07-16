import { Observable } from 'rxjs';
import { UpdatableSubject } from '../util/updatable-subject';
import { ApiEntityRef, EntityRef } from './entity-ref';
import { CommonEntityManager } from '../../entity-manager/services/common-entity-manager.service';
import { first } from 'rxjs/operators';

export type AnyManagedEntity = ManagedEntity<unknown, ApiEntityRef>;

// TODO: Managed Entities - make saving / reverting generic so it applies consistently to all entities
// TODO: Managed Entities - handle race conditions in updating. Only allow the latest response to take effect
// TODO: Managed Entities - provide mechanism for delegating to a "detail" entity when it is loaded

export abstract class ManagedEntity<ApiModelType, ApiRefType extends ApiEntityRef> {
	// The subjects below are typed as AnyManagedEntity (not `this`) so that the
	// polymorphic `this` type does not leak into their contravariant positions
	// (rxjs `observers` / `subscribe`), which would otherwise make no subtype
	// satisfy the ManagedEntity constraint under strictFunctionTypes. The public
	// API still exposes the precise `this` type via the casts below.
	get loaded$(): Observable<this> {
		return this.loadedSubject.asObservable() as Observable<this>;
	}
	get changed$(): Observable<this> {
		return this.changedSubject.asObservable() as Observable<this>;
	}

	get loadedPromise(): Promise<this> {
		return this.loadedSubject.pipe(first()).toPromise() as Promise<this>;
	}

	get slug() {
		return this._ref ? this._ref.slug : null;
	}

	get url() {
		return this._ref ? this._ref.url : null;
	}

	get ref(): EntityRef<ApiRefType> {
		return this._ref;
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Manager Accessors
	get commonManager() {
		return this._commonManager;
	}

	get messageService() {
		return this._commonManager.messageService;
	}

	get issuerManager() {
		return this._commonManager.issuerManager;
	}

	get badgeManager() {
		return this._commonManager.badgeManager;
	}

	get learningPathManager() {
		return this._commonManager.learningpathManager;
	}

	get pdfTemplateManager() {
		return this._commonManager.pdfTemplateManager;
	}

	get badgeInstanceManager() {
		return this._commonManager.badgeInstanceManager;
	}

	get recipientBadgeManager() {
		return this._commonManager.recipientBadgeManager;
	}

	get recipientBadgeCollectionManager() {
		return this._commonManager.recipientBadgeCollectionManager;
	}

	get profileManager() {
		return this._commonManager.profileManager;
	}

	get oAuthManager() {
		return this._commonManager.oAuthManager;
	}

	get loaded(): boolean {
		return !!this.apiModel;
	}

	get hasChanges(): boolean {
		return this._apiModelJson !== JSON.stringify(this._apiModel);
	}

	get apiModel() {
		return this._apiModel;
	}

	private _apiModel: ApiModelType;
	private _apiModelJson: string;

	private _ref: EntityRef<ApiRefType>;

	private loadedSubject: UpdatableSubject<AnyManagedEntity>;

	private changedSubject: UpdatableSubject<AnyManagedEntity> = new UpdatableSubject<AnyManagedEntity>();

	constructor(
		private _commonManager: CommonEntityManager,
		onUpdateSubscribed: () => void = undefined,
	) {
		this.loadedSubject = new UpdatableSubject<AnyManagedEntity>(onUpdateSubscribed);
		this.changedSubject.subscribe(this.loadedSubject);
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Core Model Properties
	protected abstract buildApiRef(): ApiRefType;

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Model Updating

	revertChanges(): boolean {
		if (this.hasChanges) {
			// Clear out the existing model and replace all properties with the saved ones from JSON
			// Note that for now, we're not using deepAssign because it has the potential to create unpredictable edge cases
			// based on data, which isn't desirable. This method is more likely to cause problems (because the identity of
			// model children will have changed), but will do so consistently.

			this.apiModel['length'] = 0; // First clear length in case this is an array.
			Object.keys(this.apiModel).forEach((key) => delete this.apiModel[key]); // Delete each property
			Object.assign(this.apiModel, JSON.parse(this._apiModelJson)); // Assign everything back from the saved JSON

			this.handleChangedModel();

			return true;
		} else {
			return false;
		}
	}

	/**
	 * Update the internal model of this entity with the given api model.
	 *
	 * @param model The new API model data to use for this entity
	 * @param externalChange True if the change is external, and subsequent changes should revert to this value. False
	 *    if the change should itself be revertable.
	 */
	applyApiModel(model: ApiModelType, externalChange = true): this {
		if (externalChange) {
			this._apiModelJson = JSON.stringify(model);
		}
		this._apiModel = model;

		return this.handleChangedModel();
	}

	protected onApiModelChanged() {}
	private handleChangedModel(): this {
		this._ref = new EntityRef<ApiRefType>(this.buildApiRef());
		this.onApiModelChanged();
		this.changedSubject.safeNext(this);

		return this;
	}
}

export abstract class LoadingManagedEntity<ApiModelType, ApiRefType extends ApiEntityRef> extends ManagedEntity<
	ApiModelType,
	ApiRefType
> {
	private updateRequested = false;

	get loadRequested() {
		return this.updateRequested;
	}

	constructor(commonManager: CommonEntityManager, initialEntity?: ApiModelType) {
		super(commonManager, () => (!this.updateRequested ? this.update() : void 0));

		if (initialEntity != null) {
			this.applyApiModel(initialEntity);
		}
	}

	protected abstract doUpdate(): Promise<ApiModelType>;

	update(): Promise<this> {
		this.updateRequested = true;
		return this.doUpdate().then(
			(model) => this.applyApiModel(model),
			(error) => this.messageService.reportAndThrowError('Failed to load entity', error),
		);
	}
}
