// Google Analytics 4 (gtag.js) plumbing.
//
// SvelteKit is a single-page app after hydration, so GA's automatic page_view
// only fires for the very first server response. We disable that automatic hit
// (`send_page_view: false`) and emit a page_view ourselves on every client-side
// navigation. See Analytics.svelte for the lifecycle wiring.

type GtagArgs = unknown[];

declare global {
	interface Window {
		dataLayer?: unknown[];
		gtag?: (...args: GtagArgs) => void;
	}
}

// The id we have already injected, so initAnalytics is idempotent and
// setAnalyticsUser knows which config to address.
let activeId: string | null = null;

/**
 * Inject gtag.js for `measurementId` and prime the data layer. Browser-only and
 * idempotent — safe to call from afterNavigate on every navigation. The initial
 * automatic page_view is disabled; callers emit page_view via trackPageView.
 */
export function initAnalytics(measurementId: string, options: { userId?: string | null } = {}): void {
	if (typeof window === 'undefined' || !measurementId || activeId === measurementId) {
		return;
	}
	activeId = measurementId;

	const script = document.createElement('script');
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
	document.head.appendChild(script);

	window.dataLayer = window.dataLayer ?? [];
	// gtag.js ONLY processes data-layer entries that are the live `arguments`
	// object — a real array (e.g. from rest params) is silently ignored, so the
	// events queue but never send. Push `arguments`, exactly like the canonical
	// snippet.
	window.gtag = function gtag() {
		// eslint-disable-next-line prefer-rest-params
		window.dataLayer!.push(arguments);
	};
	window.gtag('js', new Date());
	window.gtag('config', measurementId, {
		send_page_view: false,
		...(options.userId ? { user_id: options.userId } : {})
	});
}

/** Emit a page_view for the current document/location. No-op until initAnalytics has run. */
export function trackPageView(path: string): void {
	if (typeof window === 'undefined' || !window.gtag) return;
	window.gtag('event', 'page_view', {
		page_path: path,
		page_location: window.location.href,
		page_title: document.title
	});
}

/** Align GA's user_id with the logged-in user (pass null on logout). No-op until initAnalytics has run. */
export function setAnalyticsUser(userId: string | null): void {
	if (typeof window === 'undefined' || !window.gtag || !activeId) return;
	window.gtag('config', activeId, { user_id: userId });
}
