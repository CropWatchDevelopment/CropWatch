import { describe, expect, it } from 'vitest';

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
});
