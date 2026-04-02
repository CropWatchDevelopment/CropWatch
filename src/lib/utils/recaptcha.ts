import { env as publicEnv } from '$env/dynamic/public';

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

let status: RecaptchaStatus = 'idle';
let inflightLoad: Promise<void> | null = null;
let inflightReady: Promise<void> | null = null;
let lastError: Error | null = null;

function getPublicSiteKey(): string | null {
	const key = (publicEnv.PUBLIC_RECAPTCHA_SITE_KEY ?? '').trim();
	return key.length > 0 ? key : null;
}

function hasUsableEnterpriseApi(): boolean {
	return Boolean(
		typeof window !== 'undefined' &&
		window.grecaptcha?.enterprise &&
		typeof window.grecaptcha.enterprise.ready === 'function' &&
		typeof window.grecaptcha.enterprise.execute === 'function'
	);
}

function setStatus(nextStatus: RecaptchaStatus, error: Error | null = null) {
	status = nextStatus;
	lastError = error;
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

	inflightReady = withTimeout(
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
		inflightReady = null;
	});

	return inflightReady;
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

async function ensureRecaptchaReady(): Promise<void> {
	const siteKey = getPublicSiteKey();
	if (!siteKey) {
		const error = new Error('reCAPTCHA is not configured (missing PUBLIC_RECAPTCHA_SITE_KEY)');
		setStatus('error', error);
		throw error;
	}

	if (hasUsableEnterpriseApi() && status === 'ready') {
		return;
	}

	if (!inflightLoad) {
		setStatus('loading');

		inflightLoad = (async () => {
			try {
				await loadRecaptchaScriptElement(siteKey);

				if (!hasUsableEnterpriseApi()) {
					throw new Error('reCAPTCHA script loaded without a usable Enterprise API');
				}

				await waitForEnterpriseReady();
				setStatus('ready');
			} catch (error) {
				const normalizedError = toError(error, 'reCAPTCHA failed to initialize');
				removeRecaptchaArtifacts();
				setStatus('error', normalizedError);
				throw normalizedError;
			} finally {
				inflightLoad = null;
			}
		})();
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

export function getRecaptchaStatus(): RecaptchaStatus {
	return status;
}

export function getRecaptchaError(): Error | null {
	return lastError;
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
		const error = new Error('reCAPTCHA is not configured (missing PUBLIC_RECAPTCHA_SITE_KEY)');
		setStatus('error', error);
		throw error;
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
		const normalizedError = toError(error, 'reCAPTCHA token generation failed');
		removeRecaptchaArtifacts();
		resetInternalState('error');
		lastError = normalizedError;
		throw normalizedError;
	}
}

export function resetRecaptchaFailureState() {
	removeRecaptchaArtifacts();
	delete window.grecaptcha;
	resetInternalState();
}

export function unloadRecaptchaScript() {
	resetRecaptchaFailureState();
}
