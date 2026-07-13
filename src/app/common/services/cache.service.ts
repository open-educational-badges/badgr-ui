import { Injectable } from '@angular/core';

interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

interface GetOrFetchOptions<T> {
	shouldCache?: (data: T) => boolean;
}

const DEFAULT_MAX_ENTRIES = 100;

@Injectable({ providedIn: 'root' })
export class CacheService {
	private readonly maxEntries = DEFAULT_MAX_ENTRIES;
	private cache = new Map<string, CacheEntry<unknown>>();
	private inFlight = new Map<string, Promise<unknown>>();

	getOrFetch<T>(
		key: string,
		fetcher: () => Promise<T>,
		ttlMs: number,
		options: GetOrFetchOptions<T> = {},
	): Promise<T> {
		const entry = this.cache.get(key) as CacheEntry<T> | undefined;
		if (entry && Date.now() - entry.timestamp < ttlMs) {
			this.touch(key, entry);
			return Promise.resolve(entry.data);
		}

		const existing = this.inFlight.get(key) as Promise<T> | undefined;
		if (existing) {
			return existing;
		}

		const request = fetcher()
			.then((data) => {
				if (!options.shouldCache || options.shouldCache(data)) {
					this.set(key, data);
				}
				return data;
			})
			.finally(() => {
				this.inFlight.delete(key);
			});

		this.inFlight.set(key, request);
		return request;
	}

	invalidate(keyPrefix: string) {
		for (const key of this.cache.keys()) {
			if (key.startsWith(keyPrefix)) {
				this.cache.delete(key);
			}
		}
	}

	private set<T>(key: string, data: T) {
		// Re-insert to move this key to the most-recently-used position.
		this.cache.delete(key);
		this.cache.set(key, { data, timestamp: Date.now() });
		if (this.cache.size > this.maxEntries) {
			const oldestKey = this.cache.keys().next().value;
			if (oldestKey !== undefined) {
				this.cache.delete(oldestKey);
			}
		}
	}

	private touch<T>(key: string, entry: CacheEntry<T>) {
		this.cache.delete(key);
		this.cache.set(key, entry);
	}
}
