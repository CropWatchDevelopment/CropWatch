import { afterEach, describe, expect, it } from 'vitest';
import { buildManifest } from '$lib/pwa/manifest';
import { getLocale, overwriteGetLocale } from '$lib/paraglide/runtime';
import { testEvent } from '$lib/testing/server';
import { GET } from './+server';

type GetEvent = Parameters<typeof GET>[0];

const originalGetLocale = getLocale;

function request(url: string) {
	return GET(testEvent<GetEvent>({ url })) as Response;
}

afterEach(() => {
	overwriteGetLocale(originalGetLocale);
});

describe('GET /manifest.webmanifest', () => {
	it('serves the root-scoped manifest as pretty-printed JSON that is always revalidated', async () => {
		const response = request('http://localhost/manifest.webmanifest');

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate');
		expect(response.headers.get('content-type')).toBe('application/manifest+json; charset=utf-8');
		await expect(response.text()).resolves.toBe(
			JSON.stringify(buildManifest('', getLocale()), null, 2)
		);
	});

	it("is written in the request's locale", async () => {
		overwriteGetLocale(() => 'en');

		const manifest = await request('http://localhost/manifest.webmanifest').json();

		expect(manifest).toEqual(buildManifest('', 'en'));
		expect(manifest.lang).toBe('en-US');
	});

	it('defaults to Japanese', async () => {
		const manifest = await request('http://localhost/manifest.webmanifest').json();

		expect(manifest.lang).toBe('ja-JP');
	});

	it('scopes the manifest to the base path it is served under', async () => {
		const manifest = await request('http://localhost/cropwatch/manifest.webmanifest').json();

		expect(manifest).toEqual(buildManifest('/cropwatch', getLocale()));
		expect(manifest.start_url).toBe('/cropwatch/');
	});

	it('falls back to the root scope for any other path', async () => {
		const manifest = await request('http://localhost/manifest.json').json();

		expect(manifest.scope).toBe('/');
	});
});
