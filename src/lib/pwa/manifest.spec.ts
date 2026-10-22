import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { m } from '$lib/paraglide/messages.js';
import { buildManifest } from './manifest';

describe('buildManifest', () => {
	it('builds a root-scoped manifest with installable metadata', () => {
		const manifest = buildManifest('', 'en');

		expect(manifest.id).toBe('/');
		expect(manifest.scope).toBe('/');
		expect(manifest.start_url).toBe('/');
		expect(manifest.display).toBe('standalone');
		expect(manifest.display_override).toEqual(
			expect.arrayContaining(['window-controls-overlay', 'standalone'])
		);
		expect(manifest.icons).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					src: '/icons/maskable-icon-512x512.png',
					purpose: 'maskable'
				})
			])
		);
		expect(manifest.shortcuts.map((shortcut) => shortcut.name)).toEqual([
			'Dashboard',
			'Locations',
			'Rules',
			'Reports'
		]);
	});

	it('prefixes routes and assets when served from a base path', () => {
		const manifest = buildManifest('/cropwatch');

		expect(manifest.id).toBe('/cropwatch/');
		expect(manifest.scope).toBe('/cropwatch/');
		expect(manifest.start_url).toBe('/cropwatch/');
		expect(manifest.icons[0]?.src).toBe('/cropwatch/icons/maskable-icon-192x192.png');
		expect(manifest.shortcuts[1]?.url).toBe('/cropwatch/locations');
	});

	it('describes the whole installable app in English', () => {
		const shortcutIcon = {
			src: '/icons/maskable-icon-192x192.png',
			sizes: '192x192',
			type: 'image/png'
		};

		expect(buildManifest('', 'en')).toEqual({
			id: '/',
			name: 'CropWatch',
			short_name: 'CropWatch',
			description: m.manifest_description({}, { locale: 'en' }),
			lang: 'en-US',
			dir: 'ltr',
			display: 'standalone',
			display_override: ['window-controls-overlay', 'standalone', 'minimal-ui', 'browser'],
			scope: '/',
			start_url: '/',
			background_color: '#1f283b',
			theme_color: '#1f283b',
			categories: ['business', 'productivity', 'utilities'],
			prefer_related_applications: false,
			icons: [
				{ src: '/icons/maskable-icon-192x192.png', sizes: '192x192', type: 'image/png' },
				{ src: '/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png' },
				{
					src: '/icons/maskable-icon-192x192.png',
					sizes: '192x192',
					type: 'image/png',
					purpose: 'maskable'
				},
				{
					src: '/icons/maskable-icon-512x512.png',
					sizes: '512x512',
					type: 'image/png',
					purpose: 'maskable'
				}
			],
			shortcuts: [
				{
					name: 'Dashboard',
					description: m.manifest_shortcut_dashboard_description({}, { locale: 'en' }),
					url: '/',
					icons: [shortcutIcon]
				},
				{
					name: 'Locations',
					description: m.manifest_shortcut_locations_description({}, { locale: 'en' }),
					url: '/locations',
					icons: [shortcutIcon]
				},
				{
					name: 'Rules',
					description: m.manifest_shortcut_rules_description({}, { locale: 'en' }),
					url: '/rules',
					icons: [shortcutIcon]
				},
				{
					name: 'Reports',
					description: m.manifest_shortcut_reports_description({}, { locale: 'en' }),
					url: '/reports',
					icons: [shortcutIcon]
				}
			],
			screenshots: [
				{
					src: '/screenshots/pwa/en/dashboard-narrow.png',
					sizes: '780x1688',
					type: 'image/png',
					form_factor: 'narrow',
					label: m.manifest_screenshot_dashboard({}, { locale: 'en' })
				},
				{
					src: '/screenshots/pwa/en/overview-narrow.png',
					sizes: '780x1688',
					type: 'image/png',
					form_factor: 'narrow',
					label: m.manifest_screenshot_overview({}, { locale: 'en' })
				},
				{
					src: '/screenshots/pwa/en/dashboard-wide.png',
					sizes: '1440x900',
					type: 'image/png',
					form_factor: 'wide',
					label: m.manifest_screenshot_dashboard({}, { locale: 'en' })
				}
			]
		});
	});

	it.each(['ja', 'en'] as const)('lists only %s screenshots that exist', (locale) => {
		const missing = buildManifest('', locale).screenshots.filter(
			({ src }) => !existsSync(`static${src}`)
		);

		// Regenerate with scripts/capture-pwa-screenshots.mjs.
		expect(missing).toEqual([]);
	});

	it('shows screenshots in the language of the manifest, under the base path', () => {
		const manifest = buildManifest('/cropwatch', 'ja');

		expect(manifest.screenshots.map((shot) => shot.src)).toEqual([
			'/cropwatch/screenshots/pwa/ja/dashboard-narrow.png',
			'/cropwatch/screenshots/pwa/ja/overview-narrow.png',
			'/cropwatch/screenshots/pwa/ja/dashboard-wide.png'
		]);
		expect(manifest.screenshots[0]?.label).toBe(
			m.manifest_screenshot_dashboard({}, { locale: 'ja' })
		);
	});

	it('defaults to a root-scoped Japanese manifest', () => {
		const manifest = buildManifest();

		expect(manifest.id).toBe('/');
		expect(manifest.lang).toBe('ja-JP');
		expect(manifest.name).toBe(m.app_name({}, { locale: 'ja' }));
		expect(manifest.description).toBe(m.manifest_description({}, { locale: 'ja' }));
		expect(manifest.shortcuts.map((shortcut) => shortcut.name)).toEqual([
			m.manifest_shortcut_dashboard_name({}, { locale: 'ja' }),
			m.manifest_shortcut_locations_name({}, { locale: 'ja' }),
			m.manifest_shortcut_rules_name({}, { locale: 'ja' }),
			m.manifest_shortcut_reports_name({}, { locale: 'ja' })
		]);
	});

	it('treats "/" as no base path', () => {
		expect(buildManifest('/', 'en')).toEqual(buildManifest('', 'en'));
	});

	it('ignores a trailing slash on the base path', () => {
		const manifest = buildManifest('/cropwatch/', 'en');

		expect(manifest.id).toBe('/cropwatch/');
		expect(manifest.start_url).toBe('/cropwatch/');
		expect(manifest.icons.map((icon) => icon.src)).toEqual([
			'/cropwatch/icons/maskable-icon-192x192.png',
			'/cropwatch/icons/maskable-icon-512x512.png',
			'/cropwatch/icons/maskable-icon-192x192.png',
			'/cropwatch/icons/maskable-icon-512x512.png'
		]);
		expect(manifest.shortcuts.map((shortcut) => shortcut.url)).toEqual([
			'/cropwatch/',
			'/cropwatch/locations',
			'/cropwatch/rules',
			'/cropwatch/reports'
		]);
		expect(manifest.shortcuts[0]?.icons).toEqual([
			{ src: '/cropwatch/icons/maskable-icon-192x192.png', sizes: '192x192', type: 'image/png' }
		]);
	});
});
