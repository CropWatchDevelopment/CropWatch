import { PUBLIC_RECAPTCHA_SITE_KEY } from '$env/static/public';

declare global {
	interface Window {
		grecaptcha: {
			enterprise: {
				ready: (callback: () => void) => void;
				execute: (siteKey: string, options: { action: string }) => Promise<string>;
			};
		};
	}
}

let scriptLoaded = false;
let scriptLoading: Promise<boolean> | null = null;

function getPublicSiteKey(): string | null {
	const key = (PUBLIC_RECAPTCHA_SITE_KEY ?? '').trim();
	return key.length > 0 ? key : null;
}

type LoadRecaptchaOptions = {
	/**
	 * Optional hook to keep UI state in sync.
	 * Convention: true while loading, false once loading finishes (success or failure).
	 */
	setLoadingCaptcha?: (loading: boolean) => void;
};

/**
 * Load the reCAPTCHA Enterprise script if not already loaded
 */

export async function loadRecaptchaScript(options: LoadRecaptchaOptions = {}): Promise<boolean> {
	const { setLoadingCaptcha } = options;
	const siteKey = getPublicSiteKey();

	if (!siteKey) {
		console.error(
			'reCAPTCHA is not configured: PUBLIC_RECAPTCHA_SITE_KEY is missing/empty. '
		);
		setLoadingCaptcha?.(false);
		return false;
	}

	// If already loaded, still ensure the UI loading state is cleared.
	if (scriptLoaded) {
		setLoadingCaptcha?.(false);
		return true;
	}

	setLoadingCaptcha?.(true);

	try {
		if (typeof window === 'undefined') {
			return false;
		}

		if (!scriptLoading) {
			scriptLoading = new Promise<boolean>((resolve) => {
				// Check if script already exists
				const existingScript = document.querySelector(
					`script[src*="recaptcha/enterprise.js"]`
				);
				if (existingScript) {
					scriptLoaded = true;
					resolve(true);
					return;
				}

				const script = document.createElement('script');
				script.id = 'cw-recaptcha-enterprise';
				script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`;
				script.async = true;
				script.defer = true;

				script.onload = () => {
					scriptLoaded = true;
					resolve(true);
				};

				script.onerror = () => {
					scriptLoading = null;
					resolve(false);
				};

				document.head.appendChild(script);
			});
		}

		return await scriptLoading;
	} catch (error) {
		console.error('reCAPTCHA load error:', error);
		scriptLoading = null;
		return false;
	} finally {
		setLoadingCaptcha?.(false);
	}
}

/**
 * Execute reCAPTCHA Enterprise and get a token
 * @param action - The action name for this reCAPTCHA execution (e.g., 'LOGIN', 'REGISTER', 'FORGOT_PASSWORD')
 * @returns Promise resolving to the reCAPTCHA token
 */
export async function executeRecaptcha(action: string): Promise<string> {
	const siteKey = getPublicSiteKey();
	if (!siteKey) {
		throw new Error('reCAPTCHA is not configured (missing PUBLIC_RECAPTCHA_SITE_KEY)');
	}

	const loaded = await loadRecaptchaScript();
	if (!loaded) {
		throw new Error('reCAPTCHA script failed to load');
	}

	return new Promise((resolve, reject) => {
		window.grecaptcha.enterprise.ready(() => {
			window.grecaptcha.enterprise
				.execute(siteKey, { action })
				.then(resolve)
				.catch(reject);
		});
	});
}

/**
 * Unload Google reCaptcha from the page
 * @param {String} recaptchaSiteKey
 */
const unload = (recaptchaSiteKey: string) => {
	const nodeBadge = document.querySelector('.grecaptcha-badge');
	if (nodeBadge) {
		nodeBadge.parentElement?.remove();
	}

	// Prefer removing by our known id
	const byId = document.getElementById('cw-recaptcha-enterprise');
	if (byId) byId.remove();

	// Fallback: remove any enterprise scripts (including ones without our id)
	const scripts = document.querySelectorAll('script[src*="recaptcha/enterprise.js"]');
	for (const s of scripts) {
		s.remove();
	}
};

export function unloadRecaptchaScript() {
	if (typeof window === 'undefined') {
		return;
	}
	const siteKey = getPublicSiteKey();
	if (!siteKey) {
		return;
	}
	unload(siteKey);
}