import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ShadowDomComponent } from './shadow-dom.component';

describe('ShadowDomComponent', () => {
	let fixture: ComponentFixture<ShadowDomComponent>;
	let component: ShadowDomComponent;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ShadowDomComponent, TranslateModule.forRoot()],
			providers: [provideRouter([])],
		}).compileComponents();

		fixture = TestBed.createComponent(ShadowDomComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	afterEach(() => {
		fixture.destroy();
	});

	it('scrolls content into view when a tally-form-submitted message is received', () => {
		const scrollSpy = spyOn(Element.prototype, 'scrollIntoView');

		window.dispatchEvent(new MessageEvent('message', { data: { type: 'tally-form-submitted' } }));

		expect(scrollSpy).toHaveBeenCalled();
	});

	it('does not scroll for unrelated message events', () => {
		const scrollSpy = spyOn(Element.prototype, 'scrollIntoView');

		window.dispatchEvent(new MessageEvent('message', { data: { type: 'some-other-event' } }));

		expect(scrollSpy).not.toHaveBeenCalled();
	});

	it('removes the message listener when the component is destroyed', () => {
		const scrollSpy = spyOn(Element.prototype, 'scrollIntoView');

		fixture.destroy();
		window.dispatchEvent(new MessageEvent('message', { data: { type: 'tally-form-submitted' } }));

		expect(scrollSpy).not.toHaveBeenCalled();
	});
});
