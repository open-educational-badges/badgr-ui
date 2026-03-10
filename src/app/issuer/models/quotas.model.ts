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
	badge_create: ApiQuotasNumberQuota;
	badge_award: ApiQuotasNumberQuota;
	learningpath_create: ApiQuotasNumberQuota;
	accounts_admin: ApiQuotasNumberQuota;
	accounts_member: ApiQuotasNumberQuota;
	aiskills_requests: ApiQuotasNumberQuota;
	pdfeditor: ApiQuotasBooleanQuota;
	network_memberships: ApiQuotasNumberQuota;
	network_create: ApiQuotasBooleanQuota;
}

export interface QuotaApiResponse {
	enabled_date: number | null;
	quotas: ApiQuota[];
}
