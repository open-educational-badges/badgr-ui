import { IBadgeClassV3 } from './badgeclassv3.model';

export interface ILearningPathV3BadgeReference {
	badge: string; // badge slug
	order: number;
}

export interface ILearningPathV3 {
	/** A string representing a Date object at which the LearningPath was created */
	created_at: string;

	/** A string representing a Date object at which the LearningPath was updated */
	updated_at: string;

	/** The slug/entity_id of the learning path */
	slug: string;

	/** The name of the learning path */
	name: string;

	/** The description of the learning path */
	description: string;

	/** Tags associated with the learning path */
	tags: string[];

	/** Array of badge references with their order */
	badges: ILearningPathV3BadgeReference[];

	/** Number of badges required to complete this learning path */
	required_badges_count: number;

	/** Whether the learning path is activated/published */
	activated: boolean;

	/** The issuer slug/entity_id */
	issuer_id: string;

	/** The issuer name */
	issuer_name: string;

	/** The participation badge slug/entity_id */
	participationBadge_id: string;

	/** The participation badge image URL */
	participationBadge_image?: string;

	/** Number of participants in this learning path */
	participant_count?: number;

	/** Whether the issuer owner has accepted terms of service */
	issuerOwnerAcceptedTos?: boolean;

	/** User-specific progress (0-100 or null if not authenticated) */
	progress?: number | null;

	/** Date when user completed the learning path (null if not completed) */
	completed_at?: Date | null;

	/** Array of badge classes the user has completed for this learning path */
	completed_badges?: IBadgeClassV3[] | null;

	/** Whether user has requested to join this learning path */
	requested?: boolean;

	/** Slug of the learning path badge instance if user has completed */
	learningPathBadgeInstanceSlug?: string;
}

export class LearningPathV3 implements ILearningPathV3 {
	created_at: string;
	updated_at: string;
	slug: string;
	name: string;
	description: string;
	tags: string[];
	badges: ILearningPathV3BadgeReference[];
	required_badges_count: number;
	activated: boolean;
	issuer_id: string;
	issuer_name: string;
	participationBadge_id: string;
	participationBadge_image?: string;
	participant_count?: number;
	issuerOwnerAcceptedTos?: boolean;
	progress?: number | null;
	completed_at?: Date | null;
	completed_badges?: IBadgeClassV3[] | null;
	requested?: boolean;
	learningPathBadgeInstanceSlug?: string;

	constructor(data: ILearningPathV3) {
		Object.assign(this, data);
	}

	get createdAt(): Date {
		return new Date(this.created_at);
	}

	get updatedAt(): Date {
		return new Date(this.updated_at);
	}

	get completedAt(): Date | null {
		return this.completed_at ? new Date(this.completed_at) : null;
	}

	get isCompleted(): boolean {
		return this.progress !== null && this.progress >= this.required_badges_count;
	}

	get progressPercentage(): number | null {
		if (this.progress === null) return null;
		const totalBadges = this.badges.length;
		return totalBadges > 0 ? Math.round((this.progress / totalBadges) * 100) : 0;
	}

	get badgeSlugs(): string[] {
		return this.badges.map((b) => b.badge);
	}
}

// Paginated response type for API calls
export interface ILearningPathV3PaginatedResponse {
	count: number;
	next: string | null;
	previous: string | null;
	results: ILearningPathV3[];
}
