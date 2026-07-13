import { test, expect } from '@playwright/test';
import { urls, uniqueName, selectIconFromLibrary } from '../helpers/badge';

test('creates a learning path badge', async ({ page }) => {
	await page.goto(urls.learningPathCreate());

	const form = page.locator('learningpath-edit-form');
	await form.locator('input[type="text"]').first().fill(uniqueName('Lernpfad Web-Entwicklung'));
	await form.locator('textarea').first().fill('Automated E2E test learning path');
	await selectIconFromLibrary(page);

	const lpNext = () => page.getByTestId('lp-next-btn').locator('button');

	// Step 1 → step 2 (badge selection)
	await lpNext().click();

	// Step 2: select the first 2 available badges
	const checkboxes = page.locator('bg-badgecard button[role="checkbox"]');
	await checkboxes.first().waitFor({ state: 'visible', timeout: 15_000 });
	await checkboxes.nth(0).click();
	await page.waitForTimeout(300);
	await checkboxes.nth(1).click();
	await page.waitForTimeout(300);

	// Step 2 → step 3 (sequence)
	await lpNext().click();
	await page.waitForTimeout(600);

	// Step 3 → step 4 (finishing)
	await lpNext().click();
	await page.waitForTimeout(600);

	const lpSubmit = page.getByTestId('lp-submit-btn').locator('button');
	await lpSubmit.waitFor({ state: 'visible', timeout: 10_000 });
	await lpSubmit.click();

	await page.waitForURL(/\/learningpaths\/[^/?#]+/, { timeout: 30_000 });
	test.info().annotations.push({ type: 'badge-url', description: page.url() });
	await expect(page.getByTestId('lp-title')).toBeVisible();
});
