import screens from './apple-splash-screens.json';

export interface AppleSplashLink {
	/** Path of the image under static/. */
	path: `/${string}`;
	media: string;
}

type Screen = { width: number; height: number; ratio: number };
type Orientation = 'portrait' | 'landscape';

/** The launch image file for a screen, named by its size in device pixels. */
export function appleSplashPath({ width, height, ratio }: Screen, orientation: Orientation) {
	const [w, h] = orientation === 'portrait' ? [width, height] : [height, width];
	return `/splash/apple-splash-${w * ratio}x${h * ratio}.png` as const;
}

function link(screen: Screen, orientation: Orientation): AppleSplashLink {
	return {
		path: appleSplashPath(screen, orientation),
		// iOS keeps reporting the portrait device-width/height when rotated.
		media:
			`(device-width: ${screen.width}px) and (device-height: ${screen.height}px) and ` +
			`(-webkit-device-pixel-ratio: ${screen.ratio}) and (orientation: ${orientation})`
	};
}

/**
 * The `apple-touch-startup-image` links: iOS ignores the manifest's splash
 * settings and shows a blank screen while a Home Screen app opens unless an
 * image matches the screen exactly. iPhones open apps in portrait; iPads in
 * either orientation.
 */
export const APPLE_SPLASH_LINKS: AppleSplashLink[] = [
	...screens.iphone.map((screen) => link(screen, 'portrait')),
	...screens.ipad.flatMap((screen) => [link(screen, 'portrait'), link(screen, 'landscape')])
];
