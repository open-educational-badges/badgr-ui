import { ApiLearningPath, LearningPathRef } from '../../common/model/learningpath-api.model';
import { ManagedEntity } from '../../common/model/managed-entity';
import { ApiEntityRef } from '../../common/model/entity-ref';
import { CommonEntityManager } from '../../entity-manager/services/common-entity-manager.service';

export class LearningPath extends ManagedEntity<ApiLearningPath, LearningPathRef> {
	areas: any;
	get name(): string {
		return this.apiModel.name;
	}
	set name(name: string) {
		this.apiModel.name = name;
	}

	get description(): string {
		return this.apiModel.description;
	}
	set description(description: string) {
		this.apiModel.description = description;
	}

	get tags(): string[] {
		return this.apiModel.tags;
	}
	set tags(tags: string[]) {
		this.apiModel.tags = tags;
	}

	get badges(): Array<{ badge: any; order: number }> {
		return this.apiModel.badges;
	}

	set badges(badges: Array<{ badge: any; order: number }>) {
		this.apiModel.badges = badges;
	}

	get required_badges_count(): number {
		return this.apiModel.required_badges_count;
	}

	set required_badges_count(count: number) {
		this.apiModel.required_badges_count = count;
	}

	get issuer_id() {
		return this.apiModel.issuer_id;
	}

	set issuer_id(slug: string) {
		this.apiModel.issuer_id = slug;
	}

	get issuer_name() {
		return this.apiModel.issuer_name;
	}

	get progress(): number | null {
		return this.apiModel.progress;
	}

	get completed_at(): Date | null {
		return this.apiModel.completed_at;
	}
	get requested(): boolean | null {
		return this.apiModel.requested;
	}

	get participationBadgeId(): string {
		return this.apiModel.participationBadge_id;
	}

	get participationBadgeImage(): string {
		return this.apiModel.participationBadge_image;
	}

	get issuerOwnerAcceptedTos(): boolean {
		return this.apiModel.issuerOwnerAcceptedTos;
	}

	get activated(): boolean {
		return this.apiModel.activated;
	}

	set activated(active: boolean) {
		this.apiModel.activated = active;
	}

	constructor(
		commonManager: CommonEntityManager,
		initialEntity: ApiLearningPath = null,
		onUpdateSubscribed: () => void = undefined,
	) {
		super(commonManager, onUpdateSubscribed);

		if (initialEntity != null) {
			this.applyApiModel(initialEntity);
		}
	}

	protected buildApiRef(): ApiEntityRef {
		return {
			'@id': '',
			slug: this.apiModel.slug,
		};
	}

	save(): Promise<this> {
		return this.learningPathManager.learningPathApi
			.updateLearningPath(this.issuer_id, this.slug, this.apiModel)
			.catch((e) => {
				this.revertChanges();
				throw e;
			})
			.then((apiLp) => this.applyApiModel(apiLp));
	}
}
