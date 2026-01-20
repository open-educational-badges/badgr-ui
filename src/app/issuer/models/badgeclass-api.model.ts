import { IssuerUrl } from './issuer-api.model';
import { ApiEntityRef } from '../../common/model/entity-ref';

export type BadgeClassSlug = string;
export type BadgeClassUrl = string;
export type BadgeClassSqlId = number;
export type BadgeClassRef = ApiEntityRef;

export type BadgeClassLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2';
export type BadgeClassCategory = 'competency' | 'participation' | 'learningpath';
export type BadgeClassCopyPermissions = 'issuer' | 'others' | 'none';

export interface ApiBadgeClassJsonld {
	'@context': string;
	type: string;
	id: BadgeClassUrl;

	name: string;
	image: string;
	description: string;
	criteriaUrl: string;
	criteria_text: string;
	issuer: string;
}

export interface ApiBadgeClassForCreation {
	name: string;
	image: string;
	imageFrame?: boolean;
	description: string;
	course_url?: string;
	criteria_url?: string;
	criteria_text?: string;

	extensions?: object;

	tags?: string[];
	alignment?: ApiBadgeClassAlignment[];
	expiration?: number; // in days
	copy_permissions?: BadgeClassCopyPermissions[];
	criteria?: Array<{ name: string; description: string }>;
}

export interface ApiBadgeClassAlignment {
	target_name: string;
	target_url: string;
	target_description?: string;
	target_framework?: string;
	target_code?: string;
}

export interface ApiBadgeClass extends ApiBadgeClassForCreation {
	id: BadgeClassSqlId;
	issuer: IssuerUrl;
	issuerName: string;

	slug: BadgeClassSlug;

	recipient_count: number;

	created_at: string;
	created_by: string;

	updated_at?: string;

	json: ApiBadgeClassJsonld;
	source_url: string;
	course_url: string;
	issuerVerified: boolean;
	issuerOwnerAcceptedTos: boolean;
	isNetworkBadge: boolean;
	networkImage: string;
	networkName: string;
	sharedOnNetwork: {
		slug: string;
		name: string;
		image: string | null;
		description: string | null;
	} | null;
}

export interface BadgeImageResponse {
	success: boolean;
	image_url: string;
	message: string;
}

export interface ApiBadgeClassNetworkShare {
	id: string;
	badgeclass: ApiBadgeClass;
	network: {
		slug: string;
		name: string;
		image: string;
	};
	shared_at: string;
	shared_by_user: string;
	shared_by_issuer?: {
		slug: string;
		name: string;
		image: string;
	};
	is_active: boolean;
	awarded_count_original_issuer: number;
	recipient_count: number;
}
