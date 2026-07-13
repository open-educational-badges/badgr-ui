import { anyIssuerHasNetworkPlan, computeNetworkTabScenario } from './network-list.component';

describe('computeNetworkTabScenario', () => {
	it('returns 1 when no institution', () => {
		expect(computeNetworkTabScenario(false, false, false)).toBe(1);
		expect(computeNetworkTabScenario(false, true, true)).toBe(1);
	});

	it('returns 2 when institution, no plan, no membership', () => {
		expect(computeNetworkTabScenario(true, false, false)).toBe(2);
	});

	it('returns 3 when institution, no plan, has membership', () => {
		expect(computeNetworkTabScenario(true, false, true)).toBe(3);
	});

	it('returns 4 when institution, plan, no membership', () => {
		expect(computeNetworkTabScenario(true, true, false)).toBe(4);
	});

	it('returns 5 when institution, plan, has membership', () => {
		expect(computeNetworkTabScenario(true, true, true)).toBe(5);
	});
});

describe('anyIssuerHasNetworkPlan', () => {
	it('returns true when no issuers have quotas populated (fallback)', () => {
		expect(anyIssuerHasNetworkPlan([{}, {}])).toBeTrue();
	});

	it('returns true when at least one issuer has NETWORK_CREATE > 0', () => {
		const issuers = [
			{ quotas: { quotas: { NETWORK_CREATE: { quota: 0 } } } },
			{ quotas: { quotas: { NETWORK_CREATE: { quota: 1 } } } },
		];
		expect(anyIssuerHasNetworkPlan(issuers)).toBeTrue();
	});

	it('returns false when all issuers with quotas have NETWORK_CREATE === 0', () => {
		const issuers = [
			{ quotas: { quotas: { NETWORK_CREATE: { quota: 0 } } } },
			{ quotas: { quotas: { NETWORK_CREATE: { quota: 0 } } } },
		];
		expect(anyIssuerHasNetworkPlan(issuers)).toBeFalse();
	});

	it('multi-issuer edge case: one with plan, one without → has plan', () => {
		const issuers = [
			{ quotas: { quotas: { NETWORK_CREATE: { quota: 0 } } } },
			{ quotas: { quotas: { NETWORK_CREATE: { quota: 5 } } } },
		];
		expect(anyIssuerHasNetworkPlan(issuers)).toBeTrue();
	});

	it('returns false when single issuer with NETWORK_CREATE === 0', () => {
		expect(anyIssuerHasNetworkPlan([{ quotas: { quotas: { NETWORK_CREATE: { quota: 0 } } } }])).toBeFalse();
	});
});
