import { AbstractControl } from '@angular/forms';

export class IssuerNameValidator {
	static validIssuerName(control: AbstractControl): { [errorName: string]: string } {
		const nonAsciiRegex = /[^\x00-\x7FäöüßÄÖÜ]/;

		const atIndex = control.value.indexOf('@');
		const nonAsciiMatch = control.value.match(nonAsciiRegex);

		if (atIndex !== -1) {
			return { invalidCharacter: 'Bitte entfernen Sie das @ Zeichen.' };
		} else if (nonAsciiMatch) {
			return { invalidCharacter: `Bitte entfernen Sie das Zeichen: ${nonAsciiMatch[0]}.` };
		}
		return null;
	}
}
