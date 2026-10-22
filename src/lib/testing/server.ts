import { vi } from 'vitest';
import type { PublicConfig } from '$lib/config/public';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import type { ServerConfig } from '$lib/server/config';
import { testPublicConfig } from './http';
import { createMockServerServices, type MockServerServices } from './mock-server-services';

export const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';
export const TEST_JWT = 'jwt-token';

export interface TestLocals {
	jwt: IJWT | null;
	jwtString: string | null;
	config: { public: PublicConfig; server: ServerConfig };
	services: MockServerServices;
}

/** Server config for tests: nothing points at a real service. */
export function testServerConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
	return {
		supabase: { url: 'https://project.supabase.test', anonKey: 'anon-key' },
		recaptcha: {
			projectId: 'project',
			apiKey: 'api-key',
			siteKey: 'site-key',
			apiBaseUrl: 'https://recaptcha.test',
			logLevel: 'silent'
		},
		libellus: { baseUrl: 'https://libellus.test/api/', apiToken: 'libellus-token' },
		orgsEnabled: false,
		...overrides
	};
}

/**
 * `locals` as `hooks.server.ts` leaves them: a signed-in session (pass
 * `jwtString: null` for none), test config and mock services.
 */
export function testLocals(
	overrides: {
		jwt?: IJWT | null;
		jwtString?: string | null;
		config?: { public?: PublicConfig; server?: ServerConfig };
		services?: MockServerServices;
	} = {}
): TestLocals {
	const jwtString = overrides.jwtString === undefined ? TEST_JWT : overrides.jwtString;
	const jwt =
		overrides.jwt !== undefined
			? overrides.jwt
			: jwtString
				? ({ sub: TEST_USER_ID, email: 'user@example.com', exp: 4102444800 } as IJWT)
				: null;
	return {
		jwt,
		jwtString,
		config: {
			public: overrides.config?.public ?? testPublicConfig(),
			server: overrides.config?.server ?? testServerConfig()
		},
		services: overrides.services ?? createMockServerServices()
	};
}

/** A form POST, as `use:enhance` or a plain `<form method="POST">` sends it. */
export function formRequest(
	fields: Record<string, string | string[]>,
	url = 'http://localhost/',
	headers: Record<string, string> = {}
): Request {
	const body = new URLSearchParams();
	for (const [name, value] of Object.entries(fields)) {
		for (const entry of Array.isArray(value) ? value : [value]) body.append(name, entry);
	}
	return new Request(url, {
		method: 'POST',
		body,
		headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers }
	});
}

export interface TestEventInit {
	locals?: TestLocals;
	params?: Record<string, string>;
	url?: string | URL;
	request?: Request;
	/** What `await parent()` resolves to. */
	parent?: Record<string, unknown>;
	fetch?: typeof fetch;
	cookies?: Partial<import('@sveltejs/kit').Cookies>;
}

/**
 * The event a load, action or endpoint receives. `E` is the route's own event
 * type, e.g. `testEvent<Parameters<typeof load>[0]>({ … })`.
 */
export function testEvent<E>(init: TestEventInit = {}): E {
	const url = new URL(init.url ?? 'http://localhost/');
	return {
		locals: init.locals ?? testLocals(),
		params: init.params ?? {},
		url,
		request: init.request ?? new Request(url),
		parent: vi.fn(async () => init.parent ?? {}),
		fetch:
			init.fetch ??
			vi.fn(() => Promise.reject(new Error('event.fetch was called; use locals.services'))),
		cookies: {
			get: vi.fn(),
			getAll: vi.fn(() => []),
			set: vi.fn(),
			delete: vi.fn(),
			serialize: vi.fn(),
			...init.cookies
		},
		setHeaders: vi.fn(),
		depends: vi.fn(),
		untrack: <T>(fn: () => T) => fn(),
		route: { id: null },
		isDataRequest: false,
		isSubRequest: false
	} as unknown as E;
}
