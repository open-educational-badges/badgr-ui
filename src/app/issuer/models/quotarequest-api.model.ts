export interface ApiQuotaRequest {
	name: string;
	email: string;
	issuer_id: string;
}

export interface ApiUpgradeQuotaRequest extends ApiQuotaRequest {
	package: string;
}

export interface ApiIndividualQuotaRequest extends ApiQuotaRequest {
	message: string;
}
