import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	globalSetup: './e2e/global-setup.ts',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: 0,
	workers: 1,
	timeout: 90_000,
	reporter: [['html', { open: 'never' }], ['list'], ['json', { outputFile: 'test-results/results.json' }]],
	use: {
		baseURL: process.env.BASE_URL ?? 'https://staging.openbadges.education',
		storageState: 'e2e/.auth/user.json',
		video: 'on',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		launchOptions: {
			slowMo: 800,
		},
	},
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 1440, height: 900 },
			},
		},
	],
});
