/**
 * Reactive resolved app theme ('light' | 'dark').
 *
 * CwThemePicker (CWUI) writes the resolved theme to
 * `document.documentElement[data-theme]` ('system' is resolved to light/dark
 * there). This singleton mirrors that attribute reactively so components — e.g.
 * CwResponsiveLineChart — can follow the app theme instead of the OS via
 * `theme={appTheme.current}`.
 */
type ResolvedTheme = 'light' | 'dark';

function readTheme(): ResolvedTheme {
	if (typeof document !== 'undefined') {
		const attr = document.documentElement.getAttribute('data-theme');
		if (attr === 'dark' || attr === 'light') return attr;
	}
	if (typeof window !== 'undefined' && window.matchMedia) {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}
	return 'light';
}

function createAppTheme() {
	let theme = $state<ResolvedTheme>(readTheme());

	if (typeof document !== 'undefined') {
		// Mirror future changes from CwThemePicker (it mutates data-theme on <html>).
		const observer = new MutationObserver(() => {
			theme = readTheme();
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme']
		});
	}

	return {
		get current(): ResolvedTheme {
			return theme;
		}
	};
}

export const appTheme = createAppTheme();
