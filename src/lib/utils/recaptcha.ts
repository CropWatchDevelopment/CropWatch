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
				script.src = `https://www.google.com/recaptcha/enterprise.js?render=${PUBLIC_RECAPTCHA_SITE_KEY}`;
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
	const loaded = await loadRecaptchaScript();
	if (!loaded) {
		throw new Error('reCAPTCHA script failed to load');
	}

	return new Promise((resolve, reject) => {
		window.grecaptcha.enterprise.ready(() => {
			window.grecaptcha.enterprise
				.execute(PUBLIC_RECAPTCHA_SITE_KEY, { action })
				.then(resolve)
				.catch(reject);
		});
	});
}

/**
 * Unload Google reCaptcha from the page
 * @param {String} recaptchaSiteKey
 */
const unload = (recaptchaSiteKey) => {
	const nodeBadge = document.querySelector('.grecaptcha-badge');
	if (nodeBadge) {
		document.body.removeChild(nodeBadge.parentNode);
	}

	const scriptSelector = 'script[src=\'https://www.google.com/recaptcha/api.js?render=' +
		recaptchaSiteKey + '\']';
	const script = document.querySelector(scriptSelector);
	if (script) {
		script.remove();
	}
};

export function unloadRecaptchaScript() {
	if (typeof window === 'undefined') {
		return;
	}
	unload(PUBLIC_RECAPTCHA_SITE_KEY);
}