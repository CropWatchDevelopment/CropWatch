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

async function openAuthenticatedSettings(page: Page, viewport: { width: number; height: number }) {
	await page.setViewportSize(viewport);
	await signIn(page);
	await page.goto('/settings');
	await expect(page.locator('.app-header')).toBeVisible();
}

async function readHeaderMetrics(page: Page) {
	return page.evaluate(() => {
		function readRect(selector: string) {
			const element = document.querySelector<HTMLElement>(selector);
			if (!element) {
				return null;
			}

			const { x, y, top, right, bottom, left, width, height } =
				element.getBoundingClientRect();
			return { x, y, top, right, bottom, left, width, height };
		}

		const utilityGroup = document.querySelector<HTMLElement>('.app-header__utility-group');
		const navUtilities = document.querySelector<HTMLElement>('.app-sidebar__mobile-utilities');

		return {
			viewportWidth: window.innerWidth,
			viewportHeight: window.innerHeight,
			header: readRect('.app-header'),
			actions: readRect('.app-header .cw-header__actions'),
			profileTrigger: readRect('.app-header .cw-profile-menu__trigger'),
			profileDropdown: readRect('.cw-profile-menu__dropdown'),
			utilityGroupVisible:
				!!utilityGroup &&
				getComputedStyle(utilityGroup).display !== 'none' &&
				utilityGroup.getBoundingClientRect().width > 0,
			navUtilitiesVisible:
				!!navUtilities &&
				getComputedStyle(navUtilities).display !== 'none' &&
				navUtilities.getBoundingClientRect().width > 0
		};
	});
}

function expectRectWithinViewport(
	rect: {
		left: number;
		right: number;
		top: number;
		bottom: number;
	} | null,
	viewport: { width: number; height: number }
) {
	expect(rect).not.toBeNull();
	expect(rect!.left).toBeGreaterThanOrEqual(-1);
	expect(rect!.top).toBeGreaterThanOrEqual(-1);
	expect(rect!.right).toBeLessThanOrEqual(viewport.width + 1);
	expect(rect!.bottom).toBeLessThanOrEqual(viewport.height + 1);
}

for (const viewport of [
	{ name: 'iphone6', width: 320, height: 568 },
	{ name: 'iphonexs', width: 375, height: 812 }
]) {
	test(`mobile header stays within the viewport on ${viewport.name}`, async ({ page }) => {
		test.skip(test.info().project.name !== 'webkit-mobile', 'mobile viewport coverage only');

		await openAuthenticatedSettings(page, viewport);

		const initialMetrics = await readHeaderMetrics(page);
		expectRectWithinViewport(initialMetrics.header, {
			width: initialMetrics.viewportWidth,
			height: initialMetrics.viewportHeight
		});
		expectRectWithinViewport(initialMetrics.actions, {
			width: initialMetrics.viewportWidth,
			height: initialMetrics.viewportHeight
		});
		expectRectWithinViewport(initialMetrics.profileTrigger, {
			width: initialMetrics.viewportWidth,
			height: initialMetrics.viewportHeight
		});
		expect(initialMetrics.utilityGroupVisible).toBe(false);

		await page.locator('.cw-profile-menu__trigger').click();

		const dropdownMetrics = await readHeaderMetrics(page);
		expectRectWithinViewport(dropdownMetrics.profileDropdown, {
			width: dropdownMetrics.viewportWidth,
			height: dropdownMetrics.viewportHeight
		});

		await page.keyboard.press('Escape');
		await page.locator('.cw-header__hamburger').click();
		await expect(page.locator('.app-sidebar__mobile-utilities')).toBeVisible();

		const navMetrics = await readHeaderMetrics(page);
		expect(navMetrics.navUtilitiesVisible).toBe(true);
	});
}

for (const viewport of [
	{ name: 'tablet', width: 768, height: 1024 },
	{ name: 'desktop', width: 1280, height: 900 }
]) {
	test(`wide header keeps controls within the viewport on ${viewport.name}`, async ({ page }) => {
		test.skip(test.info().project.name !== 'chromium', 'wide viewport coverage only');

		await openAuthenticatedSettings(page, viewport);

		const initialMetrics = await readHeaderMetrics(page);
		expectRectWithinViewport(initialMetrics.header, {
			width: initialMetrics.viewportWidth,
			height: initialMetrics.viewportHeight
		});
		expectRectWithinViewport(initialMetrics.actions, {
			width: initialMetrics.viewportWidth,
			height: initialMetrics.viewportHeight
		});
		expectRectWithinViewport(initialMetrics.profileTrigger, {
			width: initialMetrics.viewportWidth,
			height: initialMetrics.viewportHeight
		});
		expect(initialMetrics.utilityGroupVisible).toBe(viewport.name === 'desktop');

		await page.locator('.cw-profile-menu__trigger').click();

		const dropdownMetrics = await readHeaderMetrics(page);
		expectRectWithinViewport(dropdownMetrics.profileDropdown, {
			width: dropdownMetrics.viewportWidth,
			height: dropdownMetrics.viewportHeight
		});
	});
}
