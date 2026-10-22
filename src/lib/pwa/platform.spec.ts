import { describe, expect, it } from 'vitest';
import { inAppPath, isInstalledApp, isIosDevice } from './platform';

const IPHONE =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const MAC =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID =
	'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';

describe('isIosDevice', () => {
	it.each([
		['an iPhone', IPHONE, 5, true],
		['an iPad that reports itself as a Mac (touch screen)', MAC, 5, true],
		['a real Mac', MAC, 0, false],
		['an Android phone', ANDROID, 5, false]
	])('%s → %s', (_, userAgent, maxTouchPoints, expected) => {
		expect(isIosDevice({ userAgent, maxTouchPoints })).toBe(expected);
	});
});

describe('isInstalledApp', () => {
	const win = (matching: string | null, standalone?: boolean) => ({
		navigator: { userAgent: IPHONE, maxTouchPoints: 5, standalone },
		matchMedia: (query: string) => ({ matches: query === matching }) as MediaQueryList
	});

	it.each(['standalone', 'fullscreen', 'window-controls-overlay'])(
		'is true in the %s display mode',
		(mode) => {
			expect(isInstalledApp(win(`(display-mode: ${mode})`))).toBe(true);
		}
	);

	it("is true for Safari's Home Screen app (navigator.standalone)", () => {
		expect(isInstalledApp(win(null, true))).toBe(true);
	});

	it('is false in a browser tab', () => {
		expect(isInstalledApp(win('(display-mode: browser)', false))).toBe(false);
	});
});

describe('inAppPath', () => {
	const ORIGIN = 'https://app.cropwatch.io';

	it('keeps path, query and hash of an in-app URL', () => {
		expect(inAppPath(`${ORIGIN}/locations/4/devices/AB?tab=chart#now`, ORIGIN)).toBe(
			'/locations/4/devices/AB?tab=chart#now'
		);
		expect(inAppPath('/rules', ORIGIN)).toBe('/rules');
	});

	it('refuses a URL on another origin', () => {
		expect(inAppPath('https://evil.example/locations', ORIGIN)).toBeNull();
	});
});
