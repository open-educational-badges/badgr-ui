import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { OebFeatureTeaserComponent } from './feature-teaser.component';

@Component({
	standalone: true,
	imports: [OebFeatureTeaserComponent],
	template: `
		<oeb-feature-teaser>
			<h2 teaser-heading data-testid="heading">Heading text</h2>
			<img teaser-image data-testid="image" src="img-1.png" />
			<img teaser-image data-testid="image" src="img-2.png" />
			<p teaser-body data-testid="body">Body text</p>
			<button teaser-action data-testid="action">Click</button>
		</oeb-feature-teaser>
	`,
})
class HostComponent {}

describe('OebFeatureTeaserComponent', () => {
	let fixture: ComponentFixture<HostComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HostComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(HostComponent);
		fixture.detectChanges();
	});

	it('projects content into the heading slot', () => {
		const heading = fixture.debugElement.query(By.css('[data-testid="heading"]'));
		expect(heading).toBeTruthy();
		expect(heading.nativeElement.textContent).toContain('Heading text');
	});

	it('projects multiple images into the image slot', () => {
		const images = fixture.debugElement.queryAll(By.css('[data-testid="image"]'));
		expect(images.length).toBe(2);
	});

	it('projects content into the body slot', () => {
		const body = fixture.debugElement.query(By.css('[data-testid="body"]'));
		expect(body).toBeTruthy();
		expect(body.nativeElement.textContent).toContain('Body text');
	});

	it('projects content into the action slot', () => {
		const action = fixture.debugElement.query(By.css('[data-testid="action"]'));
		expect(action).toBeTruthy();
		expect(action.nativeElement.textContent).toContain('Click');
	});

	it('places image slot before body slot in DOM order', () => {
		const host: HTMLElement = fixture.nativeElement;
		const image = host.querySelector('[data-testid="image"]');
		const body = host.querySelector('[data-testid="body"]');
		expect(image && body && image.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});
});
