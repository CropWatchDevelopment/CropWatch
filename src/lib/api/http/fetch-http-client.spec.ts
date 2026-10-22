import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api-error';
import { FetchHttpClient, UNAUTHORIZED_RETRY_DELAY_MS } from './fetch-http-client';
import { createFakeFetch, jsonResponse, textResponse, TEST_API_BASE_URL } from '$lib/testing/http';

afterEach(() => {
	vi.restoreAllMocks();
});

function client(
	fetch: typeof globalThis.fetch,
	options: Partial<ConstructorParameters<typeof FetchHttpClient>[0]> = {}
) {
	return new FetchHttpClient({ baseUrl: TEST_API_BASE_URL, fetch, ...options });
}

describe('FetchHttpClient created_at handling', () => {
	it('converts response created_at fields recursively using the configured offset', async () => {
		const fake = createFakeFetch(() =>
			jsonResponse({
				created_at: '2026-03-08 12:00:00',
				nested: { Created_at: '2026-03-08T13:30:45' },
				items: [{ created_at: '2026-03-08T23:15:00Z' }, { created_at: '2026-03-09T00:45:00+00:00' }]
			})
		);

		await expect(client(fake.fetch, { timeZoneOffset: -5 }).request('/x')).resolves.toEqual({
			created_at: '2026-03-08T07:00:00.000-05:00',
			nested: { Created_at: '2026-03-08T08:30:45.000-05:00' },
			items: [
				{ created_at: '2026-03-08T18:15:00.000-05:00' },
				{ created_at: '2026-03-08T19:45:00.000-05:00' }
			]
		});
	});

	it('defaults to UTC (+00:00) and leaves unparseable or non-string values alone', async () => {
		const fake = createFakeFetch(() =>
			jsonResponse([
				{ created_at: '2026-03-08' },
				{ created_at: 'not a date' },
				{ created_at: 42 },
				{ created_at: '' },
				{ created_at: null }
			])
		);

		await expect(client(fake.fetch, { timeZoneOffset: Number.NaN }).request('/x')).resolves.toEqual(
			[
				{ created_at: '2026-03-08T00:00:00.000+00:00' },
				{ created_at: 'not a date' },
				{ created_at: 42 },
				{ created_at: '' },
				{ created_at: null }
			]
		);
	});

	it('formats positive and fractional offsets', async () => {
		const fake = createFakeFetch(() => jsonResponse({ created_at: '2026-03-08T00:00:00Z' }));

		await expect(client(fake.fetch, { timeZoneOffset: 5.5 }).request('/x')).resolves.toEqual({
			created_at: '2026-03-08T05:30:00.000+05:30'
		});
	});

	it('serializes created_at fields (strings and Dates) back to UTC in request bodies', async () => {
		const fake = createFakeFetch();

		await client(fake.fetch).request('/notes', {
			method: 'POST',
			body: {
				created_at: '2026-03-08T07:00:00.000-05:00',
				notes: [{ created_at: new Date('2026-03-08T12:00:00.000Z') }],
				title: 'Fan'
			}
		});

		expect(fake.onlyRequest().body).toEqual({
			created_at: '2026-03-08T12:00:00.000Z',
			notes: [{ created_at: '2026-03-08T12:00:00.000Z' }],
			title: 'Fan'
		});
	});
});

describe('FetchHttpClient requests', () => {
	it('builds the URL from base, path and query, dropping null and undefined values', async () => {
		const fake = createFakeFetch();

		await client(fake.fetch, { baseUrl: `${TEST_API_BASE_URL}///` }).request('devices', {
			query: { a: 1, b: null, c: undefined, d: true, e: new Date('2026-01-01T00:00:00Z') }
		});
		await client(fake.fetch).request('', { query: { skip: undefined } });

		expect(fake.requests.map((r) => r.url)).toEqual([
			`${TEST_API_BASE_URL}/devices?a=1&d=true&e=2026-01-01T00%3A00%3A00.000Z`,
			TEST_API_BASE_URL
		]);
	});

	it('sends the token from a getter, read on every request', async () => {
		const fake = createFakeFetch();
		let token: string | undefined = 'first';
		const http = client(fake.fetch, { authToken: () => token });

		await http.request('/a');
		token = undefined;
		await http.request('/b');

		expect(fake.requests.map((r) => r.headers.get('authorization'))).toEqual([
			'Bearer first',
			null
		]);
	});

	it('lets a request override the token, including with null for none', async () => {
		const fake = createFakeFetch();
		const http = client(fake.fetch, { authToken: 'session' });

		await http.request('/a', { authToken: 'other' });
		await http.request('/b', { authToken: null });

		expect(fake.requests.map((r) => r.headers.get('authorization'))).toEqual([
			'Bearer other',
			null
		]);
	});

	it('keeps caller headers and only adds the defaults that are missing', async () => {
		const fake = createFakeFetch();

		await client(fake.fetch).request('/a', {
			method: 'PUT',
			body: 'raw',
			headers: { Accept: 'application/pdf', 'Content-Type': 'text/plain' }
		});

		const { headers } = fake.onlyRequest();
		expect(headers.get('accept')).toBe('application/pdf');
		expect(headers.get('content-type')).toBe('text/plain');
	});

	it('does not call fetch as a method (the native browser fetch would reject that)', async () => {
		const calls: unknown[] = [];
		const strictFetch = function (this: unknown) {
			calls.push(this);
			return Promise.resolve(jsonResponse({ ok: true }));
		} as unknown as typeof fetch;

		await client(strictFetch).request('/a');

		expect(calls).toEqual([undefined]);
	});
});

describe('FetchHttpClient responses', () => {
	it('returns text for responseType text, stringifying a JSON body', async () => {
		const textFetch = createFakeFetch(() => textResponse('hello'));
		const jsonFetch = createFakeFetch(() => jsonResponse({ a: 1 }));
		const emptyFetch = createFakeFetch(() => new Response(null, { status: 204 }));

		await expect(client(textFetch.fetch).request('/t', { responseType: 'text' })).resolves.toBe(
			'hello'
		);
		await expect(client(jsonFetch.fetch).request('/t', { responseType: 'text' })).resolves.toBe(
			'{"a":1}'
		);
		await expect(client(emptyFetch.fetch).request('/t', { responseType: 'text' })).resolves.toBe(
			'""'
		);
		expect(textFetch.onlyRequest().headers.get('accept')).toBe('text/plain, text/html, */*');
	});

	it('returns null for an empty body and raw text for non-JSON or malformed JSON', async () => {
		const empty = createFakeFetch(() => new Response(null, { status: 204 }));
		const html = createFakeFetch(() => textResponse('<p>hi</p>', { contentType: 'text/html' }));
		const broken = createFakeFetch(() =>
			textResponse('{oops', { contentType: 'application/json' })
		);
		const unlabelled = createFakeFetch(() => new Response('plain'));

		await expect(client(empty.fetch).request('/a')).resolves.toBeNull();
		await expect(client(html.fetch).request('/a')).resolves.toBe('<p>hi</p>');
		await expect(client(broken.fetch).request('/a')).resolves.toBe('{oops');
		await expect(client(unlabelled.fetch).request('/a')).resolves.toBe('plain');
	});

	it('throws ApiError with the URL and parsed body, and logs the failure', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const fake = createFakeFetch(() =>
			jsonResponse({ message: 'Missing' }, { status: 404, statusText: 'Not Found' })
		);

		const thrown = await client(fake.fetch)
			.request('/devices/A', { method: 'DELETE' })
			.catch((e: unknown) => e);

		expect(thrown).toBeInstanceOf(ApiError);
		expect(thrown).toMatchObject({
			name: 'ApiError',
			status: 404,
			message: 'CropWatch API request failed (404 Not Found)',
			payload: { url: `${TEST_API_BASE_URL}/devices/A`, payload: { message: 'Missing' } }
		});
		expect(error).toHaveBeenCalledWith('API request failed', {
			url: `${TEST_API_BASE_URL}/devices/A`,
			method: 'DELETE',
			status: 404,
			statusText: 'Not Found',
			payload: { message: 'Missing' }
		});
	});

	it('does not log a suppressed status, and logs GET for a request without a method', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const missing = createFakeFetch(() => jsonResponse(null, { status: 404 }));
		const broken = createFakeFetch(() => jsonResponse(null, { status: 500 }));

		await expect(
			client(missing.fetch).request('/a', { suppressErrorStatuses: [404] })
		).rejects.toThrow(ApiError);
		expect(error).not.toHaveBeenCalled();

		await expect(
			client(broken.fetch).request('/a', { suppressErrorStatuses: [404] })
		).rejects.toThrow(ApiError);
		expect(error).toHaveBeenCalledWith(
			'API request failed',
			expect.objectContaining({ method: 'GET' })
		);
	});
});

describe('FetchHttpClient unauthorized retry', () => {
	it('retries a 401 once after the delay when enabled', async () => {
		const wait = vi.fn(async () => {});
		let attempt = 0;
		const fake = createFakeFetch(() =>
			++attempt === 1
				? jsonResponse({ message: 'not yet' }, { status: 401 })
				: jsonResponse({ ok: 1 })
		);

		await expect(
			client(fake.fetch, { retryUnauthorizedOnce: true, wait }).request('/a')
		).resolves.toEqual({ ok: 1 });
		expect(fake.requests).toHaveLength(2);
		expect(wait).toHaveBeenCalledWith(UNAUTHORIZED_RETRY_DELAY_MS);
	});

	it('gives up after the second 401', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const wait = vi.fn(async () => {});
		const fake = createFakeFetch(() => jsonResponse(null, { status: 401 }));

		await expect(
			client(fake.fetch, { retryUnauthorizedOnce: true, wait }).request('/a')
		).rejects.toMatchObject({ status: 401 });
		expect(fake.requests).toHaveLength(2);
		expect(wait).toHaveBeenCalledTimes(1);
	});

	it('never retries other failures, nor a 401 when disabled (server side)', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const forbidden = createFakeFetch(() => jsonResponse(null, { status: 403 }));
		const unauthorized = createFakeFetch(() => jsonResponse(null, { status: 401 }));

		await expect(
			client(forbidden.fetch, { retryUnauthorizedOnce: true }).request('/a')
		).rejects.toThrow();
		await expect(client(unauthorized.fetch).request('/a')).rejects.toThrow();
		expect(forbidden.requests).toHaveLength(1);
		expect(unauthorized.requests).toHaveLength(1);
	});

	it('waits with a real timer by default', async () => {
		vi.useFakeTimers();
		try {
			let attempt = 0;
			const fake = createFakeFetch(() =>
				++attempt === 1 ? jsonResponse(null, { status: 401 }) : jsonResponse({ ok: 1 })
			);
			const pending = client(fake.fetch, { retryUnauthorizedOnce: true }).request('/a');

			await vi.advanceTimersByTimeAsync(UNAUTHORIZED_RETRY_DELAY_MS);

			await expect(pending).resolves.toEqual({ ok: 1 });
		} finally {
			vi.useRealTimers();
		}
	});
});
