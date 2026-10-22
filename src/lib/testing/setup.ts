/**
 * Loaded before every unit-test file (both the node and the browser project).
 *
 * Unit tests must never reach a real API, database or third-party service:
 * every `fetch` a test did not fake is refused and fails that test. Fake the
 * HTTP layer with `createFakeFetch` or the repositories with
 * `createMockServices` (see `$lib/testing`).
 */
import { afterEach } from 'vitest';

const nativeFetch: typeof fetch = globalThis.fetch;
const refused: string[] = [];

function resolve(input: RequestInfo | URL): URL {
	const href = input instanceof Request ? input.url : String(input);
	return new URL(href, globalThis.location?.href ?? 'http://localhost/');
}

/** Requests that never leave the machine: inline data, and (browser mode) the test runner itself. */
function isLocalResource(url: URL): boolean {
	if (url.protocol === 'data:' || url.protocol === 'blob:') return true;
	return globalThis.location !== undefined && url.origin === globalThis.location.origin;
}

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
	const url = resolve(input);
	if (isLocalResource(url)) return nativeFetch(input, init);
	refused.push(`${init?.method ?? 'GET'} ${url.href}`);
	throw new TypeError(
		`Network access is disabled in unit tests (refused ${url.href}). Inject a fake instead.`
	);
};

afterEach(() => {
	if (refused.length === 0) return;
	const attempts = refused.splice(0);
	throw new Error(`A test tried to reach the network:\n  ${attempts.join('\n  ')}`);
});
