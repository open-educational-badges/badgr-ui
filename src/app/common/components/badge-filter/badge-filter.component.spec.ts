import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BadgeFilterComponent } from './badge-filter.component';
import { TranslateModule } from '@ngx-translate/core';
import { BadgeFilter, EMPTY_BADGE_FILTER } from './badge-filter.types';

describe('BadgeFilterComponent', () => {
	let component: BadgeFilterComponent;
	let fixture: ComponentFixture<BadgeFilterComponent>;
	let emitted: BadgeFilter[];

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [BadgeFilterComponent, TranslateModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(BadgeFilterComponent);
		component = fixture.componentInstance;
		emitted = [];
		component.filterChange.subscribe((f: BadgeFilter) => emitted.push(f));
		fixture.detectChanges();
	});

	afterEach(() => TestBed.resetTestingModule());

	it('emits nothing immediately when keyword is typed (debounce pending)', fakeAsync(() => {
		const input = fixture.nativeElement.querySelector('[data-testid="keyword-input"]') as HTMLInputElement;
		input.value = 'foo';
		input.dispatchEvent(new Event('input'));
		expect(emitted.length).toBe(0);
		tick(300);
	}));

	it('emits keyword after 300ms debounce', fakeAsync(() => {
		const input = fixture.nativeElement.querySelector('[data-testid="keyword-input"]') as HTMLInputElement;
		input.value = 'foo';
		input.dispatchEvent(new Event('input'));
		tick(300);
		expect(emitted.length).toBe(1);
		expect(emitted[0].keyword).toBe('foo');
		expect(emitted[0].fromDate).toBeNull();
		expect(emitted[0].toDate).toBeNull();
	}));

	it('emits fromDate as local start-of-day when set', fakeAsync(() => {
		const input = fixture.nativeElement.querySelector('[data-testid="from-date"]') as HTMLInputElement;
		input.value = '2024-03-15';
		input.dispatchEvent(new Event('change'));
		expect(emitted.length).toBe(1);
		const d = emitted[0].fromDate as Date;
		expect(d).not.toBeNull();
		expect(d.getFullYear()).toBe(2024);
		expect(d.getMonth()).toBe(2); // 0-indexed: March = 2
		expect(d.getDate()).toBe(15);
		expect(d.getHours()).toBe(0);
		expect(d.getMinutes()).toBe(0);
	}));

	it('emits toDate as local end-of-day when set', fakeAsync(() => {
		const input = fixture.nativeElement.querySelector('[data-testid="to-date"]') as HTMLInputElement;
		input.value = '2024-03-15';
		input.dispatchEvent(new Event('change'));
		expect(emitted.length).toBe(1);
		const d = emitted[0].toDate as Date;
		expect(d).not.toBeNull();
		expect(d.getFullYear()).toBe(2024);
		expect(d.getMonth()).toBe(2);
		expect(d.getDate()).toBe(15);
		expect(d.getHours()).toBe(23);
		expect(d.getMinutes()).toBe(59);
		expect(d.getSeconds()).toBe(59);
	}));

	it('emits EMPTY_BADGE_FILTER immediately on reset (no debounce)', fakeAsync(() => {
		component.keyword = 'test';
		component.fromDate = '2024-01-01';
		component.toDate = '2024-12-31';
		const btn = fixture.nativeElement.querySelector('[data-testid="reset-button"]') as HTMLElement;
		btn.click();
		// Immediate — no tick needed
		expect(emitted.length).toBe(1);
		expect(emitted[0]).toEqual(EMPTY_BADGE_FILTER);
		expect(component.keyword).toBe('');
		expect(component.fromDate).toBe('');
		expect(component.toDate).toBe('');
	}));

	it('clears field values on reset', fakeAsync(() => {
		component.keyword = 'test';
		component.fromDate = '2024-01-01';
		component.toDate = '2024-12-31';
		fixture.detectChanges();
		component.reset();
		fixture.detectChanges();
		const kwInput = fixture.nativeElement.querySelector('[data-testid="keyword-input"]') as HTMLInputElement;
		expect(kwInput.value).toBe('');
	}));
});
