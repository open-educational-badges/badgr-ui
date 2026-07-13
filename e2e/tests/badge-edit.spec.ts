import { test, expect } from '@playwright/test';
import { urls, uniqueName, createBadge, selectIconFromLibrary, advanceToSubmit } from '../helpers/badge';
import path from 'path';

test('edits badge name, image, duration and tags', async ({ page }) => {
	const badgeSlug = await createBadge(page, 'participation', uniqueName('Erste Hilfe Kurs'));
	test.info().annotations.push({ type: 'badge-url', description: page.url() });

	await page.goto(urls.badgeEdit(badgeSlug));

	const editedName = uniqueName('Erste Hilfe Kurs Fortgeschritten');

	// Step 1: duration and image first — image upload has async callbacks that
	// can overwrite the name input via form resets, so fill name last
	const form = page.locator('badgeclass-edit-form');
	const nameInput = form.locator('input[type="text"]').first();
	await form.locator('input[type="number"]').nth(0).fill('2');
	await form.locator('input[type="number"]').nth(1).fill('30');
	const earthPath = path.resolve(__dirname, '..', 'fixtures', 'earth.png');
	await selectIconFromLibrary(page, earthPath);

	// Fill name AFTER image upload so any post-upload async resets have settled
	await nameInput.click({ clickCount: 3 });
	await nameInput.fill(editedName);
	await expect(nameInput).toHaveValue(editedName);

	// Step 2: tags
	await page.getByTestId('next-step-btn').locator('button').click();
	await page.locator('div.ng-autocomplete input[type="text"]').waitFor({ state: 'visible', timeout: 5_000 });
	await page.locator('div.ng-autocomplete input[type="text"]').pressSequentially('e2etag');
	await page.locator('div.ng-autocomplete input[type="text"]').press('Enter');

	await advanceToSubmit(page);

	// Confirm the form submitted and navigated away from the edit URL
	await page.waitForURL(/\/badges\/[^/?#]+$/, { timeout: 30_000 });

	// The awardable-badges list endpoint may return a cached response briefly
	// after the PUT. Keep navigating to the detail page until the cache expires
	// and it reflects the updated badge name.
	await expect(async () => {
		await page.goto(urls.badgeDetail(badgeSlug), { waitUntil: 'networkidle' });
		await expect(page.getByTestId('badge-title')).toContainText(editedName);
	}).toPass({ timeout: 20_000, intervals: [1_000, 2_000, 3_000, 5_000] });

	await expect(page.locator('.tag').filter({ hasText: 'e2etag' })).toBeVisible();
	await expect(page.locator('dd').filter({ hasText: /\d+:\d+\s*h/ })).toBeVisible();
});
