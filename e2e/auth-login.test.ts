import { expect, test, type Page } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:4173';
const validEmail = 'operator@cropwatch.test';
const validPassword = 'CorrectHorseBatteryStaple1!';

function createJwt(expirationOffsetSeconds = 60 * 60) {
	const encode = (value: Record<string, unknown>) =>
		Buffer.from(JSON.stringify(value)).toString('base64url');

	return [
		encode({ alg: 'HS256', typ: 'JWT' }),
		encode({
			sub: 'playwright-user',
			email: validEmail,
			role: 'operator',
			exp: Math.floor(Date.now() / 1000) + expirationOffsetSeconds,
			user_metadata: {
				full_name: 'Playwright Operator',
				name: 'playwright-operator'
			}
		}),
		'test-signature'
	].join('.');
}

async function signIn(page: Page, expirationOffsetSeconds = 60 * 60) {
	await page.context().addCookies([
		{
			name: 'jwt',
			value: createJwt(expirationOffsetSeconds),
			url: baseUrl
		}
	]);
}

async function installRecaptchaScriptMock(page: Page, options: { failFirstLoad?: boolean } = {}) {
	let requestCount = 0;

	await page.route(/https:\/\/www\.google\.com\/recaptcha\/enterprise\.js.*/, async (route) => {
		requestCount += 1;

		if (options.failFirstLoad && requestCount === 1) {
			await route.abort('failed');
			return;
		}

		await route.fulfill({
			status: 200,
			contentType: 'application/javascript',
			body: `
				window.grecaptcha = {
					enterprise: {
						ready(callback) {
							setTimeout(callback, 0);
						},
						execute(_siteKey, { action }) {
							return Promise.resolve(\`\${action.toLowerCase()}-token-\${Date.now()}\`);
						}
					}
				};
			`
		});
	});
}

async function submitLogin(page: Page) {
	// The auth page may still be hydrating while reCAPTCHA warmup resolves.
	await page.waitForTimeout(300);
	await page.locator('input[name="email"]').fill(validEmail);
	await page.locator('input[name="password"]').fill(validPassword);
	const submitButton = page.locator('button[type="submit"]');
	await expect(submitButton).toBeEnabled();
	await submitButton.click();
}

// The app defaults to Japanese; the language cookie makes every page render in
// English from the first (server) render, with no switch click racing hydration.
test.beforeEach(async ({ context }) => {
	await context.addCookies([{ name: 'PARAGLIDE_LOCALE', value: 'en', url: baseUrl }]);
});

test('login succeeds from the auth route without requiring a refresh after an initial reCAPTCHA load failure', async ({
	page
}) => {
	await installRecaptchaScriptMock(page, { failFirstLoad: true });

	await page.goto('/auth/login?redirect=%2Fsettings');
	await submitLogin(page);

	await expect(page).toHaveURL(/\/settings$/);
	await expect(page.getByRole('heading', { name: 'Regional', exact: true })).toBeVisible();
});

test('protected routes redirect to login with a reason and return to the original page after sign in', async ({
	page
}) => {
	await installRecaptchaScriptMock(page);

	await page.goto('/settings');

	await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fsettings&reason=auth-required$/);
	await expect(page.locator('.auth-alert')).toContainText('Please sign in to continue.');

	await submitLogin(page);

	await expect(page).toHaveURL(/\/settings$/);
	await expect(page.getByRole('heading', { name: 'Regional', exact: true })).toBeVisible();
});

test('expired sessions redirect to login with the expired reason copy', async ({ page }) => {
	await signIn(page, -60);
	await page.goto('/settings');

	await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fsettings&reason=expired$/);
	await expect(page.locator('.auth-alert')).toContainText(
		'Your session expired. Sign in again to continue.'
	);
});

test('logout lands on login with the signed-out reason and preserved redirect target', async ({
	page
}) => {
	await signIn(page);
	// A GET only asks: signing out is the POST behind the button.
	await page.goto('/auth/logout?redirect=%2Fsettings');
	await expect(page).toHaveURL(/\/auth\/logout\?redirect=%2Fsettings$/);
	await page.locator('#logout-submit-button').click();

	await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fsettings&reason=signed-out$/);
	await expect(page.locator('.auth-alert')).toContainText('You signed out successfully.');
	const cookies = await page.context().cookies();
	expect(cookies.some((cookie) => cookie.name === 'jwt')).toBe(false);
	// Signing out keeps the language.
	expect(cookies.find((cookie) => cookie.name === 'PARAGLIDE_LOCALE')?.value).toBe('en');
});

test('a forged session cookie is refused on the server', async ({ page }) => {
	await page.context().addCookies([
		{
			name: 'jwt',
			value: createJwt().replace(/test-signature$/, 'forged-signature'),
			url: baseUrl
		}
	]);
	await page.goto('/settings');

	await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fsettings&reason=auth-required$/);
	expect((await page.context().cookies()).some((cookie) => cookie.name === 'jwt')).toBe(false);
});

test('create-account, forgot-password, and check-email routes preserve the original redirect target', async ({
	page
}) => {
	await installRecaptchaScriptMock(page);

	await page.goto('/auth/login?redirect=%2Fsettings');

	await page.getByRole('link', { name: /create account/i }).click();
	await expect(page).toHaveURL(/\/auth\/create-account\?redirect=%2Fsettings$/);

	await page
		.getByRole('link', { name: /sign in/i })
		.first()
		.click();
	await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fsettings$/);

	await page.getByRole('link', { name: /forgot/i }).click();
	await expect(page).toHaveURL(/\/auth\/forgot-password\?redirect=%2Fsettings$/);

	await page.getByRole('link', { name: /back to login/i }).click();
	await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fsettings$/);

	await page.goto('/auth/create-account/check-email?redirect=%2Fsettings');
	await page.getByRole('link', { name: /sign in/i }).click();
	await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fsettings$/);
});
