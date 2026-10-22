/** What the platform checks read from `navigator` (Safari adds `standalone` on iOS). */
export type PlatformNavigator = Pick<Navigator, 'userAgent' | 'maxTouchPoints'> & {
	standalone?: boolean;
};

// The display modes an installed app opens in, per the manifest's display_override.
const INSTALLED_DISPLAY_MODES = ['standalone', 'fullscreen', 'window-controls-overlay'];

/** An iPhone, iPad or iPod. iPadOS 13+ reports itself as a Mac, but one with a touch screen. */
export function isIosDevice({ userAgent, maxTouchPoints }: PlatformNavigator): boolean {
	return (
		/iPad|iPhone|iPod/.test(userAgent) || (userAgent.includes('Macintosh') && maxTouchPoints > 1)
	);
}

/** Running as the installed app (Home Screen, app window) rather than in a browser tab. */
export function isInstalledApp(
	win: Pick<Window, 'matchMedia'> & { navigator: PlatformNavigator }
): boolean {
	return (
		win.navigator.standalone === true ||
		INSTALLED_DISPLAY_MODES.some((mode) => win.matchMedia(`(display-mode: ${mode})`).matches)
	);
}

/** `url` as a path within `origin` (path, query and hash), or null when it points elsewhere. */
export function inAppPath(url: string, origin: string): string | null {
	const target = new URL(url, origin);
	return target.origin === origin ? `${target.pathname}${target.search}${target.hash}` : null;
}
