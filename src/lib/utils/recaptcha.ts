import { readPublicConfig } from '$lib/config/public';

declare global {
	interface Window {
		grecaptcha?: {
			enterprise?: {
				ready: (callback: () => void) => void;
				execute: (siteKey: string, options: { action: string }) => Promise<string>;
			};
		};
	}
}

export const RECAPTCHA_ACTIONS = ['LOGIN', 'REGISTER', 'FORGOT_PASSWORD'] as const;

export type RecaptchaAction = (typeof RECAPTCHA_ACTIONS)[number];
export type RecaptchaStatus = 'idle' | 'loading' | 'ready' | 'error';

const SCRIPT_ID = 'cw-recaptcha-enterprise';
const SCRIPT_SRC_MATCHER = 'script[src*="recaptcha/enterprise.js"]';
const READY_TIMEOUT_MS = 8_000;
const EXECUTE_TIMEOUT_MS = 12_000;
// A cold browser frequently fails the very first request to google.com with
// `ERR_NAME_NOT_RESOLVED` before DNS is warm. Retry the script load a few
// times with a short backoff so a transient failure doesn't hard-block login.
const SCRIPT_LOAD_ATTEMPTS = 3;
const SCRIPT_RETRY_BASE_DELAY_MS = 400;
// `window.grecaptcha.enterprise` can lag slightly behind the script's `onload`.
// Poll for it briefly rather than declaring failure on the first synchronous check.
const API_AVAILABILITY_TIMEOUT_MS = 4_000;
const API_POLL_INTERVAL_MS = 100;

let status: RecaptchaStatus = 'idle';
let inflightLoad: Promise<void> | null = null;
let inflightReady: Promise<void> | null = null;

function getPublicSiteKey(): string | null {
	return readPublicConfig().recaptchaSiteKey;
}

function hasUsableEnterpriseApi(): boolean {
	return Boolean(
		typeof window !== 'undefined' &&
		window.grecaptcha?.enterprise &&
		typeof window.grecaptcha.enterprise.ready === 'function' &&
		typeof window.grecaptcha.enterprise.execute === 'function'
	);
}

function setStatus(nextStatus: RecaptchaStatus) {
	status = nextStatus;
}

function toError(error: unknown, fallback: string): Error {
	if (error instanceof Error) {
		return error;
	}

	return new Error(fallback);
}

function getExistingScripts(): HTMLScriptElement[] {
	if (typeof document === 'undefined') {
		return [];
	}

	return Array.from(document.querySelectorAll<HTMLScriptElement>(SCRIPT_SRC_MATCHER));
}

function removeRecaptchaArtifacts() {
	if (typeof document === 'undefined') {
		return;
	}

	document.querySelector('.grecaptcha-badge')?.parentElement?.remove();
	document.getElementById(SCRIPT_ID)?.remove();

	for (const script of getExistingScripts()) {
		script.remove();
	}
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		window.setTimeout(resolve, ms);
	});
}

async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	errorMessage: string
): Promise<T> {
	let timeoutId: number | undefined;

	try {
		return await Promise.race([
			promise,
			new Promise<T>((_, reject) => {
				timeoutId = window.setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
			})
		]);
	} finally {
		if (timeoutId !== undefined) {
			window.clearTimeout(timeoutId);
		}
	}
}

async function waitForEnterpriseReady(): Promise<void> {
	if (inflightReady) {
		return inflightReady;
	}

	if (!hasUsableEnterpriseApi()) {
		throw new Error('reCAPTCHA Enterprise API is unavailable');
	}

	const ready: Promise<void> = withTimeout(
		new Promise<void>((resolve, reject) => {
			try {
				window.grecaptcha!.enterprise!.ready(() => {
					resolve();
				});
			} catch (error) {
				reject(error);
			}
		}),
		READY_TIMEOUT_MS,
		'reCAPTCHA Enterprise did not become ready in time'
	).finally(() => {
		// A reset may have started a newer wait meanwhile: leave that one alone.
		if (inflightReady === ready) inflightReady = null;
	});
	inflightReady = ready;

	return ready;
}

async function loadRecaptchaScriptElement(siteKey: string): Promise<void> {
	const existingScripts = getExistingScripts();
	if (existingScripts.length > 0 && !hasUsableEnterpriseApi()) {
		removeRecaptchaArtifacts();
	}

	if (hasUsableEnterpriseApi()) {
		return;
	}

	await new Promise<void>((resolve, reject) => {
		const script = document.createElement('script');
		script.id = SCRIPT_ID;
		script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`;
		script.async = true;
		script.defer = true;

		script.onload = () => {
			resolve();
		};

		script.onerror = () => {
			script.remove();
			reject(new Error('reCAPTCHA script failed to load'));
		};

		document.head.appendChild(script);
	});
}

async function loadRecaptchaScriptWithRetry(siteKey: string): Promise<void> {
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= SCRIPT_LOAD_ATTEMPTS; attempt += 1) {
		try {
			await loadRecaptchaScriptElement(siteKey);
			return;
		} catch (error) {
			lastError = toError(error, 'reCAPTCHA script failed to load');
			// Drop the failed <script> so the next attempt starts from a clean slate.
			removeRecaptchaArtifacts();
			if (attempt < SCRIPT_LOAD_ATTEMPTS) {
				await delay(SCRIPT_RETRY_BASE_DELAY_MS * attempt);
			}
		}
	}

	throw lastError ?? new Error('reCAPTCHA script failed to load');
}

async function waitForEnterpriseApi(): Promise<void> {
	if (hasUsableEnterpriseApi()) {
		return;
	}

	const deadline = Date.now() + API_AVAILABILITY_TIMEOUT_MS;
	while (Date.now() < deadline) {
		await delay(API_POLL_INTERVAL_MS);
		if (hasUsableEnterpriseApi()) {
			return;
		}
	}

	throw new Error('reCAPTCHA script loaded without a usable Enterprise API');
}

async function ensureRecaptchaReady(): Promise<void> {
	const siteKey = getPublicSiteKey();
	if (!siteKey) {
		setStatus('error');
		throw new Error('reCAPTCHA is not configured (missing PUBLIC_RECAPTCHA_SITE_KEY)');
	}

	if (hasUsableEnterpriseApi() && status === 'ready') {
		return;
	}

	if (!inflightLoad) {
		setStatus('loading');

		const load = (async () => {
			try {
				await loadRecaptchaScriptWithRetry(siteKey);
				await waitForEnterpriseApi();
				await waitForEnterpriseReady();
				setStatus('ready');
			} catch (error) {
				removeRecaptchaArtifacts();
				setStatus('error');
				throw toError(error, 'reCAPTCHA failed to initialize');
			}
		})();
		inflightLoad = load;
		// Registered before any caller awaits `load`, so it runs first. A reset may
		// have started a newer load meanwhile: only ever clear this load's handle.
		const settle = () => {
			if (inflightLoad === load) inflightLoad = null;
		};
		load.then(settle, settle);
	}

	return inflightLoad;
}

function resetInternalState(nextStatus: RecaptchaStatus = 'idle') {
	inflightLoad = null;
	inflightReady = null;
	setStatus(nextStatus);
}

function getExecuteFn() {
	const execute = window.grecaptcha?.enterprise?.execute;
	if (typeof execute !== 'function') {
		throw new Error('reCAPTCHA Enterprise execute API is unavailable');
	}

	return execute;
}

/** Where reCAPTCHA is in its lifecycle (diagnostics and tests). */
export function getRecaptchaStatus(): RecaptchaStatus {
	return status;
}

export async function warmupRecaptcha(): Promise<boolean> {
	try {
		await ensureRecaptchaReady();
		return true;
	} catch {
		return false;
	}
}

export async function runRecaptchaAction(action: RecaptchaAction): Promise<string> {
	await ensureRecaptchaReady();

	const siteKey = getPublicSiteKey();
	if (!siteKey) {
		setStatus('error');
		throw new Error('reCAPTCHA is not configured (missing PUBLIC_RECAPTCHA_SITE_KEY)');
	}

	try {
		const execute = getExecuteFn();
		const token = await withTimeout(
			execute(siteKey, { action }),
			EXECUTE_TIMEOUT_MS,
			'reCAPTCHA token generation timed out'
		);

		if (typeof token !== 'string' || token.length === 0) {
			throw new Error('reCAPTCHA returned an empty token');
		}

		setStatus('ready');
		return token;
	} catch (error) {
		// A failed or timed-out `execute()` does not mean the loaded script is
		// broken — it is usually a transient network blip. Keep the script in
		// place so the next attempt is instant instead of paying for a full
		// re-download + re-init (8s + 12s timeouts). If the Enterprise API has
		// genuinely become unusable, `ensureRecaptchaReady()` detects that via
		// `hasUsableEnterpriseApi()` and reloads it on the next call.
		throw toError(error, 'reCAPTCHA token generation failed');
	}
}

/** Tears reCAPTCHA down (script, badge, API, state) so the next use starts from scratch. */
export function resetRecaptchaFailureState() {
	removeRecaptchaArtifacts();
	if (typeof window !== 'undefined') delete window.grecaptcha;
	resetInternalState();
}
