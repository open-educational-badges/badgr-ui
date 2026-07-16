import { test, expect } from '@playwright/test';
import { urls, uniqueName, selectIconFromLibrary, advanceToSubmit } from '../helpers/badge';

test('badge detail page shows name, description, category and tags after creation', async ({ page }) => {
	const name = uniqueName('Nachhaltigkeit Zertifikat');
	const description = 'E2E Testbeschreibung: Grundlagen der Nachhaltigkeit im beruflichen Kontext.';

	await page.goto(urls.badgeCreate('participation'));
	const form = page.locator('badgeclass-edit-form');

	// Step 1 — details
	await form.locator('input[type="text"]').first().fill(name);
	await form.locator('#badgeclass_description_input textarea').fill(description);

	// Select German language
	const langSelect = form.locator('oeb-select').filter({ hasText: /sprache|language of this/i });
	await langSelect.locator('hlm-select-trigger').click();
	await page
		.locator('hlm-option')
		.filter({ hasText: /deutsch|german/i })
		.first()
		.waitFor({ state: 'visible', timeout: 5_000 });
	await page
		.locator('hlm-option')
		.filter({ hasText: /deutsch|german/i })
		.first()
		.click();

	await selectIconFromLibrary(page);
	await page.getByTestId('next-step-btn').locator('button').click();

	// Tags step — add a tag if the autocomplete input is visible
	const tagInput = page.locator('div.ng-autocomplete input[type="text"]');
	await tagInput.waitFor({ state: 'visible', timeout: 5_000 });
	await tagInput.pressSequentially('nachhaltig');
	await tagInput.press('Enter');

	await advanceToSubmit(page);
	await page.waitForURL(/\/badges\/[^/?#]+$/, { timeout: 30_000 });
	test.info().annotations.push({ type: 'badge-url', description: page.url() });

	// Name
	await expect(page.getByTestId('badge-title')).toContainText(name);
	// Description
	await expect(page.locator('p.tw-text-lg')).toContainText(description);
	// Category
	await expect(page.locator('dd').filter({ hasText: /Teilnahme-Badge|Participation/i })).toBeVisible();
	// Tag
	await expect(page.locator('.tag').filter({ hasText: 'nachhaltig' })).toBeVisible();
});
