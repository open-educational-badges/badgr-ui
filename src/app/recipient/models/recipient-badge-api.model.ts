import { ApiBadgeInstanceEvidenceItem } from '~/issuer/models/badgeinstance-api.model';

// export type RecipientBadgeClassSlug = string;
export type RecipientBadgeInstanceUrl = string;
export type RecipientBadgeInstanceSlug = string;
export type RecipientBadgeAcceptance = 'Accepted' | 'Rejected' | 'Unaccepted';

/**
 * On the API, instance slugs can be either a string or a number
 */
export type ApiRecipientBadgeInstanceSlug = string | number;

export interface RecipientBadgeInstanceRef {
	'@id': RecipientBadgeInstanceUrl;
	slug: RecipientBadgeInstanceSlug;
}

export type RecipientBadgeClassUrl = string;
export type RecipientBadgeClassSlug = string;

export interface RecipientBadgeClassRef {
	'@id': RecipientBadgeClassUrl;
	slug: RecipientBadgeClassSlug;
}

export type ApiRecipientBadgeRecipientEmail = string;
export type ApiBadgeRecipientClassBadgeUrl = string;

export interface ApiRecipientBadgeInstance {
	id: ApiRecipientBadgeInstanceSlug;
	json: ApiRecipientBadgeInstanceJson;
	image: string;
	recipient_identifier: string;
	acceptance: RecipientBadgeAcceptance;
	narrative: string;
	evidence_items: ApiBadgeInstanceEvidenceItem[];
	alignment?: Array<unknown>;
	imagePreview: {
		type: 'image';
		id: string;
	};
	issuerImagePreview?: {
		type: 'image';
		id: string;
	};
	shareUrl?: string;
	courseUrl?: string;
	extensions?: object;
	pending?: boolean;
	imported?: boolean;
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

export interface ApiRecipientBadgeRecipient {
	type: string;
	recipient: ApiRecipientBadgeRecipientEmail;
}

export interface AlignmentData {
	targetName: string;
	targetCode: string;
	targetDescription: string;
	frameworkName: string;
	targetUrl?: string;
}

export interface ApiRecipientBadgeClass {
	id: ApiBadgeRecipientClassBadgeUrl;
	alignment: AlignmentData[];
	type: string;
	name: string;
	description: string;
	image: string;
	criteria?: Array<{ name: string; description: string }>;
	criteria_text?: string;
	criteria_url?: string;
	tags: string[];
	issuer: ApiRecipientBadgeIssuer;
	slug?: string;
}

export interface ApiRecipientBadgeInstanceJson {
	id: RecipientBadgeInstanceUrl;
	type: string;
	uid: string;
	recipient: ApiRecipientBadgeRecipient;
	badge: ApiRecipientBadgeClass;
	issuedOn?: string;
	validFrom?: string;
	image: string;
	evidence?: string;
	narrative?: string;
	expires?: string;
	credentialSubject?: ApiCredentialSubject;
}

export interface ApiRecipientBadgeIssuer {
	id: string;
	type: string;
	name: string;
	url: string;
	description: string;
	email: string;
	image?: string;
	slug: string;
}

export type RecipientBadgeInstanceCreationInfo =
	| RecipientBadgeInstanceFromHostedUrl
	| RecipientBadgeInstanceFromImage
	| RecipientBadgeInstanceFromJson;

export interface RecipientBadgeInstanceFromHostedUrl {
	url: string;
}
export interface RecipientBadgeInstanceFromImage {
	image: string;
}
export interface RecipientBadgeInstanceFromJson {
	assertion: string;
}

export interface ApiImportedBadgeInstance {
	id: ApiRecipientBadgeInstanceSlug;
	slug: string;
	json: {
		badge: ApiImportedBadgeInstanceBadge;
		issuedOn: Date;
		recipient: {
			type: string;
			identity: string;
		};
		type: string;
	};
	image: string;
	acceptance: RecipientBadgeAcceptance;
	narrative: string;
	imagePreview: {
		type: 'image';
		id: string;
	};
	issuerImagePreview?: {
		type: 'image';
		id: string;
	};
	extensions: object;
}

interface ApiImportedBadgeInstanceBadge {
	description: string;
	image: string;
	issuer: {
		email: string;
		image: string;
		name: string;
		url: string;
	};
	name: string;
}

export interface ApiCredentialSubject {
	type: string[];
	identifier: Array<{
		type: string;
		identityHash: string;
		identityType: string;
		hashed: boolean;
		salt: string;
		identity?: string;
	}>;
	achievement: {
		id: string;
		type: string[];
		name: string;
		description: string;
		achievementType: string;
		criteria: { narrative: string };
		image: { id: string; type: string };
		evidence?: unknown[];
	};
	activityStartDate?: string;
	activityEndDate?: string;
	activityCity?: string;
	activityOnline?: string;
}
