import type { RequestHandler } from './$types';

import { buildManifest } from '$lib/pwa/manifest';
import { getLocale } from '$lib/paraglide/runtime';

const MANIFEST_ROUTE_SUFFIX = '/manifest.webmanifest';

function getBasePath(pathname: string): string {
	return pathname.endsWith(MANIFEST_ROUTE_SUFFIX)
		? pathname.slice(0, -MANIFEST_ROUTE_SUFFIX.length)
		: '';
}

export const GET: RequestHandler = ({ url }) => {
	const manifest = buildManifest(getBasePath(url.pathname), getLocale());

	return new Response(JSON.stringify(manifest, null, 2), {
		headers: {
			'cache-control': 'public, max-age=0, must-revalidate',
			'content-type': 'application/manifest+json; charset=utf-8'
		}
	});
};
