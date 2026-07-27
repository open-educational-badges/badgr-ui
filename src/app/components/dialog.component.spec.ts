import { Component, TemplateRef, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { DialogComponent } from './dialog.component';

@Component({
	imports: [],
	template: `
		<ng-template #content>
			<p class="content-probe">CONTENT</p>
		</ng-template>
		<ng-template #header>
			<p class="header-probe">HEADER</p>
		</ng-template>
	`,
})
class TemplateHostComponent {
	content = viewChild.required<TemplateRef<void>>('content');
	header = viewChild.required<TemplateRef<void>>('header');
}

describe('app-dialog', () => {
	let host: ComponentFixture<TemplateHostComponent>;

	function renderDialog(context: Record<string, unknown>): ComponentFixture<DialogComponent> {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			imports: [DialogComponent, TranslateModule.forRoot()],
			providers: [
				{ provide: DIALOG_DATA, useValue: context },
				{ provide: BrnDialogRef, useValue: { close: () => {} } },
			],
		});
		const fixture = TestBed.createComponent(DialogComponent);
		fixture.detectChanges();
		return fixture;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [TemplateHostComponent, TranslateModule.forRoot()] });
		host = TestBed.createComponent(TemplateHostComponent);
		host.detectChanges();
	});

	// Regression: 'info' had no branch in the template, so the dialog rendered an
	// empty shell and the buttons inside the content template were unreachable.
	// See issue #2226 (membership request could not be sent).
	it('renders header and content for the info variant', () => {
		const fixture = renderDialog({
			variant: 'info',
			headerTemplate: host.componentInstance.header(),
			content: host.componentInstance.content(),
		});

		expect(fixture.nativeElement.querySelector('.header-probe')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.content-probe')).not.toBeNull();
	});

	it('renders content next to the checkmark for the success variant', () => {
		const fixture = renderDialog({
			variant: 'success',
			content: host.componentInstance.content(),
		});

		expect(fixture.nativeElement.querySelector('.checkmark')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.content-probe')).not.toBeNull();
	});

	it('renders string content for the success variant', () => {
		const fixture = renderDialog({ variant: 'success', content: '<span class="html-probe">DONE</span>' });

		expect(fixture.nativeElement.querySelector('.html-probe')).not.toBeNull();
	});

	it('renders header and content once for the default variant', () => {
		const fixture = renderDialog({
			variant: 'default',
			headerTemplate: host.componentInstance.header(),
			content: host.componentInstance.content(),
		});

		expect(fixture.nativeElement.querySelectorAll('.header-probe').length).toBe(1);
		expect(fixture.nativeElement.querySelectorAll('.content-probe').length).toBe(1);
	});

	it('renders content once for the danger variant', () => {
		const fixture = renderDialog({ variant: 'danger', content: host.componentInstance.content() });

		expect(fixture.nativeElement.querySelectorAll('.content-probe').length).toBe(1);
	});

	it('renders message and text for the failure variant', () => {
		const fixture = renderDialog({ variant: 'failure', message: 'MESSAGE', text: 'TEXT' });

		expect(fixture.nativeElement.textContent).toContain('MESSAGE');
		expect(fixture.nativeElement.textContent).toContain('TEXT');
		expect(fixture.nativeElement.querySelector('.content-probe')).toBeNull();
	});
});
