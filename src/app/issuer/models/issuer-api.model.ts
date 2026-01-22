import { ApiEntityRef } from '../../common/model/entity-ref';

export type IssuerSlug = string;
export type IssuerUrl = string;

export interface IssuerRef {
	'@id': IssuerUrl;
	slug: IssuerSlug;
}

export interface ApiIssuerJsonld {
	'@context': string;
	type: string;
	id: IssuerUrl;

	name: string;
	description: string;
	email: string;
	url: string;
	image: string;
}

export interface ApiBaseIssuer {
	name: string;
	slug: IssuerSlug;
	description: string;
	image: string;
	created_at: string;
	created_by: string;
	staff: ApiIssuerStaff[];
	json: ApiIssuerJsonld;
	country?: string;
	state?: string;
	linkedinId: string;
	badgeClassCount: number;
}

export interface ApiIssuer extends ApiBaseIssuer {
	is_network: false;

	learningPathCount: number;
	verified: boolean;
	intendedUseVerified: boolean;
	ownerAcceptedTos: boolean;

	source_url?: string;
	category?: string;
	street?: string;
	streetnumber?: string;
	zip?: string;
	city?: string;

	country?: string;
	state?: string;

	lat?: number;
	lon?: number;

	networks: ApiNetwork[];
}

export interface ApiNetwork extends ApiBaseIssuer {
	is_network: true;
	partner_issuers: ApiIssuer[];
	current_user_network_role: IssuerStaffRoleSlug | null;
	learningPathCount: number;
	partnerBadgesCount: number;
}

export type ApiAnyIssuer = ApiIssuer | ApiNetwork;

export interface ApiIssuerForCreation {
	name: string;
	description: string;
	image?: string;
	email: string;
	url: string;
	category?: string;
	street?: string;
	streetnumber?: string;
	zip?: string;
	city?: string;
	country?: string;
	state?: string;
	intendedUseVerified: boolean;
	lat?: number;
	lon?: number;

	is_network?: false;
	linkedinId: string;
}

export interface ApiNetworkForCreation {
	name: string;
	description: string;
	image: string;
	url: string;
	country: string;
	state?: string;
	is_network?: boolean;
}

export type IssuerStaffRoleSlug = 'creator' | 'owner' | 'editor' | 'staff';
export interface ApiIssuerStaff {
	role: IssuerStaffRoleSlug;
	user: {
		first_name: string;
		last_name: string;
		email?: string;
		telephone?: string | string[];
		url?: string | string[];
		agreed_terms_version: number;
		latest_terms_version: number;
	};
}

export type IssuerStaffRef = ApiEntityRef;

export interface ApiIssuerStaffOperation {
	action: 'add' | 'modify' | 'remove';
	username?: string;
	email?: string;
	role?: IssuerStaffRoleSlug;
}

export interface ApiIssuerForCreation {
	name: string;
	description: string;
	image?: string;
	email: string;
	url: string;
	category?: string;
	street?: string;
	streetnumber?: string;
	zip?: string;
	city?: string;

	country?: string;
	state?: string;

	intendedUseVerified: boolean;
	linkedinId: string;

	lat?: number;
	lon?: number;
}

export interface ApiIssuerForEditing {
	name: string;
	description: string;
	image?: string;
	email: string;
	url: string;
	category?: string;
	street?: string;
	streetnumber?: string;
	zip?: string;
	city?: string;

	country?: string;
	state?: string;

	intendedUseVerified: boolean;
	linkedinId: string;

	lat?: number;
	lon?: number;
}
