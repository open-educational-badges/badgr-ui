import { test, expect } from '@playwright/test';
import { urls, uniqueName, createBadge } from '../helpers/badge';

test('creates a participation badge and issues it by email', async ({ page }) => {
	const badgeSlug = await createBadge(page, 'participation', uniqueName('Projektmanagement Grundlagen'), 'de');
	test.info().annotations.push({ type: 'badge-url', description: page.url() });

	await page.goto(urls.badgeIssue(badgeSlug));
	await page.locator('oeb-input').first().locator('input').fill('Test Recipient');
	await page.locator('input[type="email"]').fill('test-recipient@example.com');
	await page.locator('#issue-badge-btn').click();

	await expect(page.locator('oeb-success-dialog')).toBeVisible({ timeout: 30_000 });
});

test('creates a participation badge and generates a QR code award', async ({ page }) => {
	const badgeSlug = await createBadge(page, 'participation', uniqueName('Teamarbeit Workshop'));
	test.info().annotations.push({ type: 'badge-url', description: page.url() });

	await page.goto(urls.badgeQr(badgeSlug));
	await page.locator('oeb-input').nth(0).locator('input').fill('E2E QR Code Test');
	await page.locator('oeb-input').nth(1).locator('input').fill('E2E Test Runner');
	await page.locator('#qr-generate-btn').click();

	await page.waitForURL(/\/qr\/.+\/generate/, { timeout: 30_000 });
	await expect(page.locator('qrcode')).toBeVisible();
});
