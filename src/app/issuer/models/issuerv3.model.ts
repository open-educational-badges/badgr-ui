export interface IIssuerV3 {
	/** A string representing a Date object at which the Issuer was created */
	created_at: string;

	/** A string representing a Date object at which the Issuer was updated */
	updated_at: string;

	/** The user that has created this Issuer */
	created_by: string;

	name: string;
	slug: string;
	description: string;
	image: string;
	email: string;
	url: string;

	verified: boolean;
	owner_accepted_tos: boolean;
	intended_use_verified: boolean;

	badgeClassCount: number;
	learningPathCount: number;
	recipient_count?: number;

	category?: string;
	tags?: string[];

	street?: string;
	streetnumber?: string;
	zip?: string;
	city?: string;
	country?: string;
	state?: string;
	lat?: number;
	lon?: number;

	linkedin_id?: string;

	json: { id: string };
}

export class IssuerV3 implements IIssuerV3 {
	created_at: string;
	updated_at: string;
	created_by: string;
	name: string;
	slug: string;
	description: string;
	image: string;
	email: string;
	url: string;
	verified: boolean;
	owner_accepted_tos: boolean;
	intended_use_verified: boolean;
	badgeClassCount: number;
	learningPathCount: number;
	recipient_count?: number;
	category?: string;
	tags?: string[];
	street?: string;
	streetnumber?: string;
	zip?: string;
	city?: string;
	country?: string;
	state?: string;
	lat?: number;
	lon?: number;
	linkedin_id?: string;
	staff_count?: number;
	json: { id: string };

	constructor(data: IIssuerV3) {
		Object.assign(this, data);
	}

	get createdAt(): Date {
		return new Date(this.created_at);
	}

	get updatedAt(): Date {
		return new Date(this.updated_at);
	}

	get issuerUrl(): string {
		return this.json.id;
	}

	get publicUrl(): string {
		return `/public/issuers/${this.slug}`;
	}

	get hasLocation(): boolean {
		return !!(this.lat && this.lon);
	}
}
