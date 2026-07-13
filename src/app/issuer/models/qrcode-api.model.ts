import { ApiBadgeInstanceEvidenceItem } from './badgeinstance-api.model';
import { Issuer } from './issuer.model';

export interface ApiQRCode {
	title: string;
	createdBy: string;
	slug?: string;
	valid_from?: string;
	expires_at?: string;
	activity_start_date?: string;
	activity_end_date?: string;
	activity_zip?: string;
	activity_city?: string;
	activity_online?: boolean;
	evidence_items?: ApiBadgeInstanceEvidenceItem[];
	badgeclass_id?: string;
	issuer_id?: string;
	request_count?: number;
	notifications?: boolean;
	course_url?: string;
}

export interface NetworkQrCodeGroup {
	issuer: Issuer;
	qrcodes: ApiQRCode[];
	staff: boolean;
}
