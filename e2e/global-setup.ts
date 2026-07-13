import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalSetup() {
	const baseURL = process.env.BASE_URL ?? 'https://staging.openbadges.education';
	const browser = await chromium.launch();
	const page = await browser.newPage();

	await page.goto(`${baseURL}/auth/login`);
	await page.locator('input[type="email"]').fill(process.env.STAGING_TEST_EMAIL!);
	await page.locator('input[type="password"]').fill(process.env.STAGING_TEST_PASSWORD!);
	await page.locator('form').getByRole('button', { name: 'Login' }).click();
	await page.waitForURL(/\/issuer/, { timeout: 20_000 });

	const authDir = path.join('e2e', '.auth');
	if (!fs.existsSync(authDir)) {
		fs.mkdirSync(authDir, { recursive: true });
	}
	await page.context().storageState({ path: path.join(authDir, 'user.json') });
	await browser.close();
}

export default globalSetup;
