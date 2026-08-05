import { test, expect } from '@playwright/test';
import { urls, uniqueName, createBadge } from '../helpers/badge';
import path from 'path';

test('creates a competency badge and issues it via bulk CSV', async ({ page }) => {
	const badgeSlug = await createBadge(page, 'competency', uniqueName('Digitale Kompetenzen'), 'de');
	test.info().annotations.push({ type: 'badge-url', description: page.url() });

	await page.goto(urls.badgeBulk(badgeSlug));

	const csvPath = path.join(__dirname, '..', 'fixtures', 'bulk-import.csv');
	await page.locator('input[type="file"]').setInputFiles(csvPath);
	await page.locator('#bulk-import-btn:not(.button-is-disabled)').waitFor({ state: 'visible', timeout: 10_000 });

	await page.locator('#bulk-import-btn').click();
	await page.locator('#bulk-preview-btn').waitFor({ state: 'visible', timeout: 10_000 });
	await page.locator('#bulk-preview-btn').click();
	await page.locator('#bulk-confirm-btn').waitFor({ state: 'visible', timeout: 10_000 });
	await page.locator('#bulk-confirm-btn').click();

	await page.waitForURL(/\/badges\/[^/?#]+/, { timeout: 30_000 });
	await expect(page.getByTestId('badge-title')).toBeVisible();
});
