import { Page } from '@playwright/test';
import path from 'path';

const ISSUER_SLUG = () => process.env.ISSUER_SLUG!;

export const urls = {
	badgeCreate: (type: 'participation' | 'competency') => `/issuer/issuers/${ISSUER_SLUG()}/badges/create/${type}`,
	learningPathCreate: () => `/issuer/issuers/${ISSUER_SLUG()}/learningpaths/create`,
	badgeDetail: (slug: string) => `/issuer/issuers/${ISSUER_SLUG()}/badges/${slug}`,
	badgeEdit: (slug: string) => `/issuer/issuers/${ISSUER_SLUG()}/badges/${slug}/edit`,
	badgeIssue: (slug: string) => `/issuer/issuers/${ISSUER_SLUG()}/badges/${slug}/issue`,
	badgeBulk: (slug: string) => `/issuer/issuers/${ISSUER_SLUG()}/badges/${slug}/bulk-import`,
	badgeQr: (slug: string) => `/issuer/issuers/${ISSUER_SLUG()}/badges/${slug}/qr`,
};

export function uniqueName(baseName: string): string {
	return `${baseName} [E2E-${Date.now()}]`;
}

export async function selectIconFromLibrary(page: Page, imagePath?: string): Promise<void> {
	// Noun Project API is unavailable locally — upload the test PNG instead.
	// To re-enable icon search on staging, replace this block with:
	// await page.locator('badgeclass-edit-form #nounProject_span').first().click();
	// await page.locator('#forminput').waitFor({ state: 'visible', timeout: 10_000 });
	// await page.locator('#forminput').fill('certificate');
	// await page.locator('.datatable-x-row').first().waitFor({ state: 'visible', timeout: 15_000 });
	// await page.locator('.datatable-x-row').first().click();
	// await page.locator('#forminput').waitFor({ state: 'hidden', timeout: 10_000 });
	const pngPath = imagePath ?? path.resolve(__dirname, '..', 'fixtures', 'test-badge.png');
	await page.locator('#imageSection input[type="file"]').nth(1).setInputFiles(pngPath);
	// The file is read as a data URL asynchronously — wait for it to complete
	await page.waitForTimeout(2000);
}

export async function clickNext(page: Page): Promise<void> {
	const btn = page.getByTestId('next-step-btn').locator('button');
	await btn.waitFor({ state: 'visible', timeout: 10_000 });
	await btn.click();
	await page.waitForTimeout(600);
}

// Advances through all remaining steps until the submit button is visible.
export async function advanceToSubmit(page: Page): Promise<void> {
	for (let i = 0; i < 6; i++) {
		if (
			await page
				.getByTestId('submit-badge-btn')
				.isVisible({ timeout: 500 })
				.catch(() => false)
		)
			break;
		const nextBtn = page.getByTestId('next-step-btn').locator('button');
		if (await nextBtn.isVisible({ timeout: 500 }).catch(() => false)) {
			await nextBtn.click();
			await page.waitForTimeout(600);
		} else {
			break;
		}
	}
	await page.getByTestId('submit-badge-btn').locator('button').waitFor({ state: 'visible', timeout: 10_000 });
	await page.getByTestId('submit-badge-btn').locator('button').click();
}

export async function createBadge(
	page: Page,
	type: 'participation' | 'competency',
	name: string,
	lang?: 'de' | 'en',
): Promise<string> {
	await page.goto(urls.badgeCreate(type));

	// Step 1 — details
	const form = page.locator('badgeclass-edit-form');
	await form.locator('input[type="text"]').first().fill(name);
	await form.locator('#badgeclass_description_input textarea').fill('Automated E2E test badge');

	if (lang) {
		// The language oeb-select label is "SPRACHE DES BADGES" (DE) or "LANGUAGE OF THIS BADGE" (EN)
		const langSelect = form.locator('oeb-select').filter({ hasText: /sprache|language of this/i });
		await langSelect.locator('hlm-select-trigger').click();
		const optionText = lang === 'de' ? /deutsch|german/i : /englisch|english/i;
		await page
			.locator('hlm-option')
			.filter({ hasText: optionText })
			.first()
			.waitFor({ state: 'visible', timeout: 5_000 });
		await page.locator('hlm-option').filter({ hasText: optionText }).first().click();
	}

	await selectIconFromLibrary(page);
	await clickNext(page);

	if (type === 'competency') {
		// Step 2 — competencies
		const trigger = page.locator('#competencies-by-hand-section');
		if (await trigger.isVisible()) {
			await trigger.click();
		}
		await page.locator('#add-competency-btn').waitFor({ state: 'visible', timeout: 5_000 });
		await page.locator('#add-competency-btn').click();
		await page.locator('oeb-input[id="competencyTitle_0"] input').waitFor({ state: 'visible', timeout: 5_000 });
		await page.locator('oeb-input[id="competencyTitle_0"] input').fill('Testkompetenz');
		await page
			.locator('oeb-input[id="competencyDescriptionInput_0"] textarea')
			.fill('E2E test competency description');
		await page.locator('brn-select[id="competencyCategory_0"] button').click();
		await page.locator('hlm-option').first().waitFor({ state: 'visible', timeout: 5_000 });
		await page.locator('hlm-option').first().click();
		await clickNext(page);
	}

	await advanceToSubmit(page);
	await page.waitForURL(/\/badges\/[^/?#]+$/, { timeout: 30_000 });
	await page.getByTestId('badge-title').waitFor({ state: 'visible', timeout: 10_000 });

	const match = page.url().match(/\/badges\/([^/?#]+)/);
	return match ? match[1] : '';
}
