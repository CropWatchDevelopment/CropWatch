// Opens the rules pages in a visible browser, signed in, on the local mock
// stack (scripts/e2e-stack.mjs): fictional data, no database, no real API.
// For looking at the screens by hand. Nothing is evaluated and nothing is sent.
//
//   node scripts/rules-demo.mjs            English, desktop window
//   node scripts/rules-demo.mjs ja         Japanese
//   node scripts/rules-demo.mjs ja phone   Japanese, phone-sized
//
// Close the browser window (or press Ctrl+C) to stop; the stack this script
// started stops with it. The rules reset on every start.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { chromium } from 'playwright';

const APP = 'http://127.0.0.1:4173';
const API = 'http://127.0.0.1:4174';
const LOGIN = { email: 'operator@cropwatch.test', password: 'CorrectHorseBatteryStaple1!' };
// The login form asks Google for a reCAPTCHA token; the mock stack accepts any.
const RECAPTCHA_STUB = `window.grecaptcha = { enterprise: {
	ready(callback) { setTimeout(callback, 0); },
	execute(_siteKey, { action }) { return Promise.resolve(action.toLowerCase() + '-token-' + Date.now()); }
} };`;

const args = process.argv.slice(2);
const japanese = args.includes('ja');
const phone = args.includes('phone');
// For an unattended check of this script itself: no window, and it ends at the rules list.
const unattended = process.env.RULES_DEMO_UNATTENDED === '1';

const isUp = () =>
	fetch(`${APP}/auth/login`).then(
		(response) => response.ok,
		() => false
	);

/** Starts the mock stack unless one is already serving; resolves once the app answers. */
async function startStack() {
	if (await isUp()) {
		console.log(`Using the stack that is already serving ${APP}.`);
		return null;
	}
	console.log('Building the app and starting the mock stack (about a minute)...');
	const stack = spawn(process.execPath, ['scripts/e2e-stack.mjs'], {
		cwd: fileURLToPath(new URL('..', import.meta.url)),
		detached: true,
		stdio: 'ignore'
	});
	let exited = false;
	stack.once('exit', () => (exited = true));
	for (let waited = 0; waited < 300; waited += 1) {
		if (await isUp()) return stack;
		if (exited)
			throw new Error('The mock stack stopped. Run "node scripts/e2e-stack.mjs" to see why.');
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
	throw new Error('The mock stack did not come up within five minutes.');
}

/** The stack is a process group (it starts the preview server): stop all of it. */
function stopStack(stack) {
	if (!stack?.pid) return;
	try {
		process.kill(-stack.pid, 'SIGTERM');
	} catch {
		// Already gone.
	}
}

const stack = await startStack();
let browser = null;
try {
	browser = await chromium.launch({ headless: unattended });
	const context = await browser.newContext({
		locale: japanese ? 'ja-JP' : 'en-US',
		...(phone
			? {
					viewport: { width: 390, height: 844 },
					deviceScaleFactor: 2,
					isMobile: true,
					hasTouch: true
				}
			: { viewport: unattended ? { width: 1440, height: 900 } : null })
	});
	await context.addCookies([{ name: 'PARAGLIDE_LOCALE', value: japanese ? 'ja' : 'en', url: APP }]);
	await context.route('**/*', (route) => {
		const url = new URL(route.request().url());
		if (url.origin === APP || url.origin === API) return route.fallback();
		if (url.href.startsWith('https://www.google.com/recaptcha/')) {
			return route.fulfill({ contentType: 'application/javascript', body: RECAPTCHA_STUB });
		}
		// Fictional data stays on this machine.
		return route.abort('blockedbyclient');
	});

	const page = await context.newPage();
	await page.goto(`${APP}/auth/login`);
	await page.locator('input[name="email"]').fill(LOGIN.email);
	await page.locator('input[name="password"]').fill(LOGIN.password);
	const submit = page.locator('button[type="submit"]');
	await page.waitForFunction((element) => !element.disabled, await submit.elementHandle());
	await submit.click();
	await page.waitForURL(`${APP}/`);
	await page.goto(`${APP}/rules`);
	await page.locator('.rule-status').first().waitFor();

	if (unattended) {
		console.log(`Rules listed: ${await page.locator('.rule-status').count()}`);
	} else {
		console.log(`Signed in as ${LOGIN.email} at ${APP}/rules (fictional data).`);
		console.log('Close the browser window, or press Ctrl+C here, to stop.');
		process.once('SIGINT', () => void browser?.close());
		process.once('SIGTERM', () => void browser?.close());
		await new Promise((resolve) => browser.once('disconnected', resolve));
	}
} finally {
	await browser?.close().catch(() => {});
	stopStack(stack);
}
