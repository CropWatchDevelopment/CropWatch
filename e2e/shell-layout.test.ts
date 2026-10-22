import { expect, test, type Page } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:4173';

function createJwt() {
	const encode = (value: Record<string, unknown>) =>
		Buffer.from(JSON.stringify(value)).toString('base64url');

	return [
		encode({ alg: 'HS256', typ: 'JWT' }),
		encode({
			sub: 'playwright-user',
			email: 'operator@cropwatch.test',
			role: 'operator',
			exp: Math.floor(Date.now() / 1000) + 60 * 60,
			user_metadata: {
				full_name: 'Playwright Operator',
				name: 'playwright-operator'
			}
		}),
		'test-signature'
	].join('.');
}

async function signIn(page: Page) {
	await page.context().addCookies([
		{
			name: 'jwt',
			value: createJwt(),
			url: baseUrl
		}
	]);
}

async function readShellMetrics(page: Page) {
	return page.evaluate(() => ({
		viewportHeight: window.innerHeight,
		viewportWidth: window.innerWidth,
		scrollHeight: document.documentElement.scrollHeight,
		scrollWidth: document.documentElement.scrollWidth
	}));
}

// The shell is fixed to the viewport: pages scroll inside it, never the document.
test('authenticated shell owns the viewport', async ({ page }) => {
	await signIn(page);
	await page.goto('/settings');
	await expect(page.locator('.app-shell')).toBeVisible();
	await expect(page.locator('.app-shell__main')).toBeVisible();

	const metrics = await readShellMetrics(page);
	expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.viewportHeight + 1);
	expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
});

test('mobile shell keeps primary actions reachable inside the viewport', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await signIn(page);
	await page.goto('/settings');

	const saveButton = page.locator('#settings-save-button');
	await saveButton.scrollIntoViewIfNeeded();
	await expect(saveButton).toBeInViewport();

	const saveBox = await saveButton.boundingBox();
	expect(saveBox).not.toBeNull();
	expect(saveBox!.x).toBeGreaterThanOrEqual(-1);
	expect(saveBox!.x + saveBox!.width).toBeLessThanOrEqual(391);
	expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(845);

	const metrics = await readShellMetrics(page);
	expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.viewportHeight + 1);
	expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
});
