import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import screens from './apple-splash-screens.json';
import { APPLE_SPLASH_LINKS, appleSplashPath } from './apple-splash';

describe('appleSplashPath', () => {
	it('names the image by its size in device pixels, per orientation', () => {
		const screen = { width: 393, height: 852, ratio: 3 };

		expect(appleSplashPath(screen, 'portrait')).toBe('/splash/apple-splash-1179x2556.png');
		expect(appleSplashPath(screen, 'landscape')).toBe('/splash/apple-splash-2556x1179.png');
	});
});

describe('APPLE_SPLASH_LINKS', () => {
	it('covers iPhones in portrait and iPads in both orientations', () => {
		expect(APPLE_SPLASH_LINKS).toHaveLength(screens.iphone.length + screens.ipad.length * 2);
		expect(APPLE_SPLASH_LINKS[0]).toEqual({
			path: '/splash/apple-splash-1320x2868.png',
			media:
				'(device-width: 440px) and (device-height: 956px) and ' +
				'(-webkit-device-pixel-ratio: 3) and (orientation: portrait)'
		});
		const landscape = APPLE_SPLASH_LINKS.filter((link) => link.media.includes('landscape'));
		expect(landscape).toHaveLength(screens.ipad.length);
		// Rotated, iOS still reports the portrait device-width and device-height.
		expect(landscape[0]?.media).toContain('(device-width: 1032px) and (device-height: 1376px)');
		expect(landscape[0]?.path).toBe('/splash/apple-splash-2752x2064.png');
	});

	it('links only images that exist (run scripts/generate-pwa-images.mjs after changing the list)', () => {
		const missing = APPLE_SPLASH_LINKS.filter(({ path }) => !existsSync(`static${path}`));

		expect(missing).toEqual([]);
	});
});
