import { isRedirect } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	LegalStatusDto,
	MeContextDto,
	PreferencesDto,
	ProfileDto,
	RuleTemplateDto
} from '$lib/api/api.dtos';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import { TEST_JWT, testEvent, testLocals, testServerConfig } from '$lib/testing/server';
import { load } from './+layout.server';

type LoadEvent = Parameters<typeof load>[0];
type Locals = ReturnType<typeof testLocals>;

const PROFILE = { id: 'user-1', full_name: 'Kevin' } as unknown as ProfileDto;
const PREFERENCES = { temperature_unit: 'celsius' } as unknown as PreferencesDto;
const ORG_CONTEXT = {
	orgs_enabled: true,
	is_staff: false,
	suspended: false,
	org: null,
	guest_orgs: [],
	child_orgs: []
} as MeContextDto;
const TRIGGERED_RULES = [{ id: 7, name: 'Too hot' }] as unknown as RuleTemplateDto[];
const LEGAL_OK: LegalStatusDto = { needs_acceptance: false, documents: [] };
const EMPTY_OVERVIEW = {
	deviceStatuses: { online: 0, offline: 0 },
	triggeredRules: [],
	triggeredRulesCount: 0
};

/** Every root-layout request answered successfully. */
function signedIn(overrides: { legal?: unknown; count?: unknown } = {}): Locals {
	const locals = testLocals();
	const { account, devices, organizations, rules } = locals.services;
	account.getUserProfile.mockResolvedValue(PROFILE);
	account.getPreferences.mockResolvedValue(PREFERENCES);
	account.getLegalStatus.mockResolvedValue(
		('legal' in overrides ? overrides.legal : LEGAL_OK) as LegalStatusDto
	);
	organizations.getMeContext.mockResolvedValue(ORG_CONTEXT);
	devices.getDeviceStatuses.mockResolvedValue({ online: 3, offline: 1 });
	rules.getTriggeredRules.mockResolvedValue(TRIGGERED_RULES);
	rules.getTriggeredRulesCount.mockResolvedValue(
		('count' in overrides ? overrides.count : 2) as number
	);
	return locals;
}

function run(locals: Locals, url = 'http://localhost/locations') {
	return load(testEvent<LoadEvent>({ locals, url })) as Promise<Record<string, unknown>>;
}

/** The redirect `load` threw, or `null` when it resolved. */
async function redirectOf(promise: Promise<unknown>) {
	try {
		await promise;
		return null;
	} catch (error) {
		if (isRedirect(error)) return { status: error.status, location: error.location };
		throw error;
	}
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	consoleError.mockRestore();
});

describe('root layout load', () => {
	it('returns the empty shell without calling the API when there is no session', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(run(locals)).resolves.toEqual({
			session: null,
			authToken: null,
			profile: undefined,
			preferences: undefined,
			orgContext: undefined,
			overview: EMPTY_OVERVIEW
		});
		const { account, devices, organizations, rules } = locals.services;
		for (const method of [
			account.getUserProfile,
			account.getPreferences,
			account.getLegalStatus,
			organizations.getMeContext,
			devices.getDeviceStatuses,
			rules.getTriggeredRules,
			rules.getTriggeredRulesCount
		]) {
			expect(method).not.toHaveBeenCalled();
		}
	});

	it('loads the profile, preferences, org context and overview for a session', async () => {
		const locals = signedIn();

		await expect(run(locals)).resolves.toEqual({
			session: locals.jwt,
			authToken: TEST_JWT,
			profile: PROFILE,
			preferences: PREFERENCES,
			orgContext: ORG_CONTEXT,
			overview: {
				deviceStatuses: { online: 3, offline: 1 },
				triggeredRules: TRIGGERED_RULES,
				triggeredRulesCount: 2
			}
		});
		expect(consoleError).not.toHaveBeenCalled();
	});

	it('starts every request once, in the original order', async () => {
		const locals = signedIn();

		await run(locals);

		const { account, devices, organizations, rules } = locals.services;
		const calls = [
			account.getUserProfile,
			account.getPreferences,
			devices.getDeviceStatuses,
			rules.getTriggeredRules,
			rules.getTriggeredRulesCount,
			account.getLegalStatus,
			organizations.getMeContext
		];
		for (const method of calls) {
			expect(method).toHaveBeenCalledTimes(1);
			expect(method).toHaveBeenCalledWith();
		}
		const order = calls.map((method) => method.mock.invocationCallOrder[0]);
		expect(order).toEqual([...order].sort((a, b) => a - b));
	});

	it('sends the same requests as before, with the session token', async () => {
		const fake = createFakeFetch((request) => {
			if (request.path === '/devices/status') return jsonResponse({ online: 1, offline: 0 });
			if (request.path === '/rules/triggered') return jsonResponse([]);
			if (request.path === '/rules/triggered/count') return jsonResponse({ count: 4 });
			if (request.path === '/auth/legal-status') return jsonResponse(LEGAL_OK);
			return jsonResponse({});
		});
		const services = createServerServices({
			fetch: fake.fetch,
			authToken: () => TEST_JWT,
			config: testPublicConfig(),
			serverConfig: testServerConfig()
		});
		const locals = { ...testLocals(), services } as unknown as Locals;

		const data = await run(locals);

		expect(fake.requests.map((request) => `${request.method} ${request.path}`)).toEqual([
			'GET /auth/user-profile',
			'GET /auth/preferences',
			'GET /devices/status',
			'GET /rules/triggered',
			'GET /rules/triggered/count',
			'GET /auth/legal-status',
			'GET /me/context'
		]);
		for (const request of fake.requests) {
			expect(request.headers.get('authorization')).toBe(`Bearer ${TEST_JWT}`);
		}
		expect(data.overview).toEqual({
			deviceStatuses: { online: 1, offline: 0 },
			triggeredRules: [],
			triggeredRulesCount: 4
		});
	});

	it('passes the decoded session through as-is', async () => {
		const jwt = { sub: 'user-9', email: 'nine@example.com', exp: 4102444800 } as IJWT;
		const locals = signedIn();
		locals.jwt = jwt;

		await expect(run(locals)).resolves.toMatchObject({ session: jwt, authToken: TEST_JWT });
	});

	it('reports a session token without a decoded session as no session', async () => {
		const locals = signedIn();
		locals.jwt = null;

		await expect(run(locals)).resolves.toMatchObject({ session: null, authToken: TEST_JWT });
	});

	describe('triggered rule count', () => {
		it.each([
			['a finite number', 5, 5],
			['{ count }', { count: 6 }, 6],
			['{ triggered_count }', { triggered_count: 7 }, 7],
			['{ count: null, triggered_count }', { count: null, triggered_count: 8 }, 8],
			['a non-numeric count', { count: '9', triggered_count: 9 }, 0],
			['a non-finite count', { count: Number.POSITIVE_INFINITY }, 0],
			['NaN', Number.NaN, 0],
			['Infinity', Number.POSITIVE_INFINITY, 0],
			['null', null, 0],
			['a string', '3', 0],
			['an empty object', {}, 0]
		])('reads %s', async (_label, count, expected) => {
			await expect(run(signedIn({ count }))).resolves.toMatchObject({
				overview: { triggeredRulesCount: expected }
			});
		});
	});

	describe('when a request fails', () => {
		const failure = new Error('API down');

		it('leaves the profile out and logs it', async () => {
			const locals = signedIn();
			locals.services.account.getUserProfile.mockRejectedValue(failure);

			const data = await run(locals);

			expect(data.profile).toBeUndefined();
			expect(data.preferences).toEqual(PREFERENCES);
			expect(consoleError).toHaveBeenCalledWith('Failed to fetch authenticated user:', failure);
		});

		it('leaves the preferences out and logs it', async () => {
			const locals = signedIn();
			locals.services.account.getPreferences.mockRejectedValue(failure);

			const data = await run(locals);

			expect(data.preferences).toBeUndefined();
			expect(data.profile).toEqual(PROFILE);
			expect(consoleError).toHaveBeenCalledWith('Failed to fetch preferences:', failure);
		});

		it('fails closed on the org context and logs it', async () => {
			const locals = signedIn();
			locals.services.organizations.getMeContext.mockRejectedValue(failure);

			const data = await run(locals);

			expect(data.orgContext).toBeUndefined();
			expect(consoleError).toHaveBeenCalledWith('Failed to fetch org context:', failure);
		});

		it('falls back per overview figure and logs each one', async () => {
			const locals = signedIn();
			locals.services.devices.getDeviceStatuses.mockRejectedValue(failure);
			locals.services.rules.getTriggeredRules.mockRejectedValue(failure);
			locals.services.rules.getTriggeredRulesCount.mockRejectedValue(failure);

			const data = await run(locals);

			expect(data.overview).toEqual(EMPTY_OVERVIEW);
			expect(consoleError).toHaveBeenCalledWith(
				'Failed to fetch overview device statuses:',
				failure
			);
			expect(consoleError).toHaveBeenCalledWith(
				'Failed to fetch overview triggered rules:',
				failure
			);
			expect(consoleError).toHaveBeenCalledWith(
				'Failed to fetch overview triggered rule count:',
				failure
			);
			expect(consoleError).toHaveBeenCalledTimes(3);
		});

		it('keeps the overview figures that did load', async () => {
			const locals = signedIn();
			locals.services.rules.getTriggeredRules.mockRejectedValue(failure);

			await expect(run(locals)).resolves.toMatchObject({
				overview: {
					deviceStatuses: { online: 3, offline: 1 },
					triggeredRules: [],
					triggeredRulesCount: 2
				}
			});
		});

		it('falls back to the empty overview when the overview cannot even start', async () => {
			const locals = signedIn();
			locals.services.devices.getDeviceStatuses.mockImplementation(() => {
				throw failure;
			});

			const data = await run(locals);

			expect(data.overview).toEqual(EMPTY_OVERVIEW);
			expect(data.profile).toEqual(PROFILE);
			expect(consoleError).toHaveBeenCalledWith('Failed to fetch overview data:', failure);
		});

		it('fails open on the legal status and logs it', async () => {
			const locals = signedIn();
			locals.services.account.getLegalStatus.mockRejectedValue(failure);

			await expect(redirectOf(run(locals))).resolves.toBeNull();
			expect(consoleError).toHaveBeenCalledWith(
				'Failed to fetch legal status (fail-open):',
				failure
			);
		});
	});

	describe('legal acceptance gate', () => {
		const needsAcceptance: LegalStatusDto = { needs_acceptance: true, documents: [] };

		it('redirects to the terms interstitial, carrying the current path', async () => {
			const locals = signedIn({ legal: needsAcceptance });

			await expect(
				redirectOf(run(locals, 'http://localhost/locations/8?tab=devices'))
			).resolves.toEqual({
				status: 303,
				location: '/auth/accept-terms?redirect=%2Flocations%2F8%3Ftab%3Ddevices'
			});
		});

		it('redirects from the dashboard too', async () => {
			await expect(
				redirectOf(run(signedIn({ legal: needsAcceptance }), 'http://localhost/'))
			).resolves.toEqual({ status: 303, location: '/auth/accept-terms?redirect=%2F' });
		});

		it('never redirects on /auth routes', async () => {
			const locals = signedIn({ legal: needsAcceptance });

			await expect(redirectOf(run(locals, 'http://localhost/auth/logout'))).resolves.toBeNull();
		});

		it.each([
			['accepted documents', LEGAL_OK],
			['a non-boolean flag', { needs_acceptance: 'true', documents: [] }],
			['no documents list', { needs_acceptance: true }],
			['an HTML page from an older API', '<!doctype html><html></html>'],
			['an empty answer', null]
		])('does not redirect for %s', async (_label, legal) => {
			await expect(redirectOf(run(signedIn({ legal })))).resolves.toBeNull();
		});

		it('reads the URL untracked, so navigations do not re-run the batch', async () => {
			const locals = signedIn({ legal: needsAcceptance });
			const realUrl = new URL('http://localhost/rules?page=2');
			let untracked = false;
			const read = <K extends 'pathname' | 'search'>(key: K) => {
				if (!untracked) throw new Error(`url.${key} was read outside untrack()`);
				return realUrl[key];
			};
			const event = testEvent<LoadEvent>({ locals });
			Object.assign(event, {
				url: {
					get pathname() {
						return read('pathname');
					},
					get search() {
						return read('search');
					}
				},
				untrack: vi.fn(<T>(fn: () => T): T => {
					untracked = true;
					try {
						return fn();
					} finally {
						untracked = false;
					}
				})
			});

			await expect(redirectOf(load(event) as Promise<unknown>)).resolves.toEqual({
				status: 303,
				location: '/auth/accept-terms?redirect=%2Frules%3Fpage%3D2'
			});
			expect(event.untrack).toHaveBeenCalledTimes(1);
		});
	});
});
