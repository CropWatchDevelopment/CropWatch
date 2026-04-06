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
	return page.evaluate(() => {
		const drawer = document.querySelector('.cw-drawer');
		const bottomChrome = document.querySelector('.app-shell__bottom-chrome');

		return {
			viewportHeight: window.innerHeight,
			viewportWidth: window.innerWidth,
			scrollHeight: document.documentElement.scrollHeight,
			scrollWidth: document.documentElement.scrollWidth,
			drawerBottom: drawer?.getBoundingClientRect().bottom ?? null,
			bottomChromeTop: bottomChrome?.getBoundingClientRect().top ?? null
		};
	});
}

test('authenticated shell owns the viewport and the alerts drawer stays flush', async ({
	page
}) => {
	await signIn(page);
	await page.goto('/settings');
	await expect(page.locator('.app-shell')).toBeVisible();
	await expect(page.locator('.cw-drawer')).toBeVisible();

	const closedMetrics = await readShellMetrics(page);

	expect(closedMetrics.scrollHeight).toBeLessThanOrEqual(closedMetrics.viewportHeight + 1);
	expect(closedMetrics.scrollWidth).toBeLessThanOrEqual(closedMetrics.viewportWidth + 1);
	expect(closedMetrics.drawerBottom).not.toBeNull();
	expect(
		Math.abs(closedMetrics.viewportHeight - Number(closedMetrics.drawerBottom))
	).toBeLessThanOrEqual(1);

	await page.locator('.cw-drawer__header').click();
	await expect(page.locator('.cw-drawer')).toHaveClass(/cw-drawer--open/);

	const openMetrics = await readShellMetrics(page);
	expect(openMetrics.scrollHeight).toBeLessThanOrEqual(openMetrics.viewportHeight + 1);
	expect(openMetrics.scrollWidth).toBeLessThanOrEqual(openMetrics.viewportWidth + 1);
	expect(
		Math.abs(openMetrics.viewportHeight - Number(openMetrics.drawerBottom))
	).toBeLessThanOrEqual(1);
});

test('mobile shell keeps the PWA dock in flow and primary actions clear of bottom chrome', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await signIn(page);
	await page.goto('/settings');

	await page.evaluate(async () => {
		window.localStorage.removeItem('cropwatch.pwa.install-dismissed-at');
		window.localStorage.removeItem('cropwatch.pwa.ios-hint-dismissed-at');

		const dispatchPrompt = () => {
			const event = new Event('beforeinstallprompt');
			Object.defineProperties(event, {
				prompt: {
					value: async () => {}
				},
				userChoice: {
					value: Promise.resolve({ outcome: 'dismissed', platform: 'web' })
				}
			});
			window.dispatchEvent(event);
		};

		for (let attempt = 0; attempt < 20 && !document.querySelector('.pwa-dock'); attempt += 1) {
			dispatchPrompt();
			await new Promise((resolve) => window.setTimeout(resolve, 50));
		}
	});

	const dock = page.locator('.pwa-dock');
	await expect(dock).toBeVisible();

	const saveButton = page.getByRole('button', { name: 'Save settings' });
	await saveButton.scrollIntoViewIfNeeded();

	const dockBox = await dock.boundingBox();
	const saveBox = await saveButton.boundingBox();
	expect(dockBox).not.toBeNull();
	expect(saveBox).not.toBeNull();
	expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(dockBox!.y + 1);

	const metrics = await readShellMetrics(page);
	expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.viewportHeight + 1);
	expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
	expect(metrics.bottomChromeTop).not.toBeNull();
	expect(Math.abs(metrics.viewportHeight - Number(metrics.drawerBottom))).toBeLessThanOrEqual(1);
});
