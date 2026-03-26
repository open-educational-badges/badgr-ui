export interface ApiQuotasNumberQuota {
	used: number;
	quota: number;
	max: number;
	custom: boolean;
}
export interface ApiQuotasBooleanQuota {
	quota: boolean;
	custom: boolean;
}

export interface ApiQuota {
	name: string;
	key: string;
	price: number;
	default: 'ISSUER' | 'NETWORK';

	upgrade: string;
	badge_create: number;
	badge_award: number;
	learningpath_create: number;
	accounts_admin: number;
	accounts_member: number;
	aiskills_requests: number;
	pdfeditor: boolean;
	dashboard: boolean;
	network_memberships: number;
	network_create: boolean;
}

export interface QuotaApiResponse {
	enabled_date: number | null;
	email: string | null;
	quotas: ApiQuota[];
}
