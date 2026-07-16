import { AbstractControl } from '@angular/forms';

interface ValidationResult {
	[errorName: string]: boolean;
}

export class JsonValidator {
	static validJson(control: AbstractControl): ValidationResult {
		if (typeof control.value === 'string' && control.value.length > 0) {
			try {
				JSON.parse(control.value);
			} catch (err) {
				return { invalidJson: true };
			}
		}

		return null;
	}
}
