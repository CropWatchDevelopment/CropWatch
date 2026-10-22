// Draws the PWA images from the vector logo (static/icons/cropwatch_static.svg),
// on the manifest's background colour. Re-run after changing the logo or the
// screen list:
//
//   node scripts/generate-pwa-images.mjs
//
// - The maskable icons (static/icons/maskable-icon-*.png): Android uses the
//   512 px one for the home screen icon and the launch screen, cropped to its
//   own shape (circle, squircle…). The logo stays inside the middle 80 % circle
//   every shape keeps.
// - The iOS launch images (static/splash/) for every screen in
//   src/lib/pwa/apple-splash-screens.json. File names must match
//   appleSplashPath() in src/lib/pwa/apple-splash.ts.
import { mkdir, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const SPLASH_DIR = `${root}static/splash`;
const BACKGROUND = '#1f283b'; // the manifest's background_color

// Measured from the SVG: drawn at 70 % of the icon and moved up 1.85 %, the
// logo's farthest point is 38 % of the icon's width from its centre (the
// safe zone is 40 %).
const MASKABLE = { sizes: [192, 512], logoScale: 0.7, logoShiftUp: 0.0185 };

const screens = JSON.parse(await readFile(`${root}src/lib/pwa/apple-splash-screens.json`, 'utf8'));
const logo = await readFile(`${root}static/icons/cropwatch_static.svg`, 'utf8');
const logoUrl = `data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}`;

/** Screenshots `body` (HTML) in a CSS-pixel viewport at `ratio` device pixels per CSS pixel. */
async function draw(browser, { width, height, ratio = 1, body, path }) {
	const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: ratio });
	try {
		await page.setContent(
			`<body style="margin:0;height:100vh;display:grid;place-items:center;background:${BACKGROUND}">` +
				`${body}</body>`
		);
		await page.screenshot({ path });
	} finally {
		await page.close();
	}
}

const shots = [
	...screens.iphone.map((screen) => ({ ...screen, orientation: 'portrait' })),
	...screens.ipad.flatMap((screen) => [
		{ ...screen, orientation: 'portrait' },
		{ ...screen, orientation: 'landscape' }
	])
];

await rm(SPLASH_DIR, { recursive: true, force: true });
await mkdir(SPLASH_DIR, { recursive: true });

const browser = await chromium.launch();
try {
	for (const size of MASKABLE.sizes) {
		const logoSize = Math.round(size * MASKABLE.logoScale);
		const shift = Math.round(size * MASKABLE.logoShiftUp);
		await draw(browser, {
			width: size,
			height: size,
			body:
				`<img src="${logoUrl}" width="${logoSize}" height="${logoSize}" alt="" ` +
				`style="transform:translateY(-${shift}px)">`,
			path: `${root}static/icons/maskable-icon-${size}x${size}.png`
		});
	}

	for (const { width, height, ratio, orientation } of shots) {
		const [w, h] = orientation === 'portrait' ? [width, height] : [height, width];
		// The logo takes about a third of the short side, like a native launch screen.
		const size = Math.round(Math.min(w, h) * 0.34);
		await draw(browser, {
			width: w,
			height: h,
			ratio,
			body: `<img src="${logoUrl}" width="${size}" height="${size}" alt="">`,
			path: `${SPLASH_DIR}/apple-splash-${w * ratio}x${h * ratio}.png`
		});
	}
} finally {
	await browser.close();
}

console.log(
	`Wrote ${MASKABLE.sizes.length} maskable icons to static/icons/ and ${shots.length} launch images to static/splash/`
);
