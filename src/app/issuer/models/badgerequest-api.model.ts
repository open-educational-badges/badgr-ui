export interface BadgeRequest {
	firstname: string;
	lastname: string;
	email: string;
	ageConfirmation: boolean;
	qrCodeId: string;
	/** ISO date (yyyy-mm-dd), optional */
	dateOfBirth?: string;
}

export interface ApiRequestedBadge {
	id?: number;
	entity_version?: number;
	entity_id: string;
	firstName: string;
	lastName: string;
	email: string;
	dateOfBirth?: string | null;
	requestedOn: string;
	status: string;
	user: null | number;
}
