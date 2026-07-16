import { TestBed } from '@angular/core/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
	let service: CacheService;

	beforeEach(() => {
		jasmine.clock().install();
		jasmine.clock().mockDate(new Date(0));
		TestBed.configureTestingModule({});
		service = TestBed.inject(CacheService);
	});

	afterEach(() => {
		jasmine.clock().uninstall();
	});

	it('returns the fetched value and caches it', async () => {
		const fetcher = jasmine.createSpy('fetcher').and.returnValue(Promise.resolve('value'));

		const first = await service.getOrFetch('k', fetcher, 1000);
		const second = await service.getOrFetch('k', fetcher, 1000);

		expect(first).toBe('value');
		expect(second).toBe('value');
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('refetches after the TTL has elapsed', async () => {
		const fetcher = jasmine.createSpy('fetcher').and.returnValues(Promise.resolve('a'), Promise.resolve('b'));

		const first = await service.getOrFetch('k', fetcher, 1000);
		jasmine.clock().tick(1001);
		const second = await service.getOrFetch('k', fetcher, 1000);

		expect(first).toBe('a');
		expect(second).toBe('b');
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('deduplicates concurrent in-flight requests for the same key', async () => {
		let resolveFn!: (v: string) => void;
		const fetcher = jasmine.createSpy('fetcher').and.callFake(
			() =>
				new Promise<string>((resolve) => {
					resolveFn = resolve;
				}),
		);

		const p1 = service.getOrFetch('k', fetcher, 1000);
		const p2 = service.getOrFetch('k', fetcher, 1000);
		resolveFn('value');
		const [v1, v2] = await Promise.all([p1, p2]);

		expect(v1).toBe('value');
		expect(v2).toBe('value');
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('does not cache rejected fetches and allows a retry to succeed', async () => {
		const fetcher = jasmine
			.createSpy('fetcher')
			.and.returnValues(Promise.reject(new Error('boom')), Promise.resolve('ok'));

		await expectAsync(service.getOrFetch('k', fetcher, 1000)).toBeRejectedWithError('boom');
		const second = await service.getOrFetch('k', fetcher, 1000);

		expect(second).toBe('ok');
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('skips caching when shouldCache returns false', async () => {
		const fetcher = jasmine
			.createSpy('fetcher')
			.and.returnValues(Promise.resolve({ status: 404 }), Promise.resolve({ status: 200 }));
		const shouldCache = (data: { status: number }) => data.status === 200;

		const first = await service.getOrFetch('k', fetcher, 1000, { shouldCache });
		const second = await service.getOrFetch('k', fetcher, 1000, { shouldCache });
		const third = await service.getOrFetch('k', fetcher, 1000, { shouldCache });

		expect(first.status).toBe(404);
		expect(second.status).toBe(200);
		expect(third.status).toBe(200);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('invalidate removes entries matching the prefix only', async () => {
		const a = jasmine.createSpy('a').and.returnValue(Promise.resolve('A'));
		const b = jasmine.createSpy('b').and.returnValue(Promise.resolve('B'));
		const other = jasmine.createSpy('other').and.returnValue(Promise.resolve('X'));

		await service.getOrFetch('cms:page:home', a, 1000);
		await service.getOrFetch('cms:post:hello', b, 1000);
		await service.getOrFetch('other:thing', other, 1000);

		service.invalidate('cms:');

		await service.getOrFetch('cms:page:home', a, 1000);
		await service.getOrFetch('cms:post:hello', b, 1000);
		await service.getOrFetch('other:thing', other, 1000);

		expect(a).toHaveBeenCalledTimes(2);
		expect(b).toHaveBeenCalledTimes(2);
		expect(other).toHaveBeenCalledTimes(1);
	});

	it('evicts the least-recently-used entry when over the max size', async () => {
		// Default cap is 100. Fill it, then add one more and confirm the
		// least-recently-used key (the first inserted) was evicted.
		const maxEntries = 100;
		for (let i = 0; i < maxEntries; i++) {
			await service.getOrFetch(`k:${i}`, () => Promise.resolve(i), 60_000);
		}

		// Touch k:0 so it becomes most-recently-used.
		await service.getOrFetch('k:0', () => Promise.resolve(-1), 60_000);

		// Insert a new key — should evict k:1, not k:0.
		await service.getOrFetch('k:new', () => Promise.resolve('new'), 60_000);

		const k0Fetcher = jasmine.createSpy('k0').and.returnValue(Promise.resolve('refetched'));
		const k1Fetcher = jasmine.createSpy('k1').and.returnValue(Promise.resolve('refetched'));
		await service.getOrFetch('k:0', k0Fetcher, 60_000);
		await service.getOrFetch('k:1', k1Fetcher, 60_000);

		expect(k0Fetcher).not.toHaveBeenCalled();
		expect(k1Fetcher).toHaveBeenCalledTimes(1);
	});
});
