import {
	PublicApiBadgeAssertion,
	PublicApiBadgeAssertion_OB2,
	PublicApiBadgeAssertion_OB3,
} from '~/public/models/public-api.model';

export function isOB2Assertion(assertion: PublicApiBadgeAssertion): assertion is PublicApiBadgeAssertion_OB2 {
	return typeof assertion.type === 'string' && assertion.type === 'Assertion';
}

export function isOB3Assertion(assertion: PublicApiBadgeAssertion): assertion is PublicApiBadgeAssertion_OB3 {
	return Array.isArray(assertion.type) && assertion.type.includes('VerifiableCredential');
}

export function getAssertionExpiration(assertion: PublicApiBadgeAssertion): string | undefined {
	return isOB2Assertion(assertion) ? assertion.expires : assertion.validUntil;
}

export function getAssertionIssuedDate(assertion: PublicApiBadgeAssertion): string | undefined {
	return isOB2Assertion(assertion) ? assertion.issuedOn : assertion.validFrom;
}

export function getAssertionBadgeName(assertion: PublicApiBadgeAssertion): string {
	if (isOB2Assertion(assertion)) {
		return typeof assertion.badge === 'string' ? '' : assertion.badge.name;
	} else {
		return assertion.name;
	}
}

export function getAssertionRecipient(assertion: PublicApiBadgeAssertion): string | undefined {
	const ext = (assertion as any)['extensions:recipientProfile'];
	if (ext && typeof ext === 'object' && 'name' in ext) {
		return ext['name'];
	}

	return undefined;
}

export function getAssertionCourseUrl(assertion: PublicApiBadgeAssertion): string | undefined {
	if (isOB2Assertion(assertion)) {
		return null;
	} else {
		return assertion.courseUrl;
	}
}
