import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

export function getByTestId(fixture: ComponentFixture<any>, id: string) {
	return fixture.debugElement.query(By.css(`[data-testid="${id}"]`));
}
