import { isRedirect } from '@sveltejs/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { LegalStatusDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { formRequest, testEvent, testLocals, type TestLocals } from '$lib/testing/server';
import { actions, load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<(typeof actions)['default']>[0];

const PENDING = {
	needs_acceptance: true,
	documents: [{ kind: 'terms_of_service', version: '2', accepted: false }]
} as unknown as LegalStatusDto;

async function redirectOf(promise: Promise<unknown>) {
	const thrown = await promise.then(
		() => null,
		(error: unknown) => error
	);
	if (!isRedirect(thrown)) throw new Error('expected a redirect');
	return thrown;
}

function runLoad(locals: TestLocals, url = 'http://localhost/auth/accept-terms?redirect=%2Frules') {
	return load(testEvent<LoadEvent>({ locals, url })) as Promise<unknown>;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('accept-terms load', () => {
	it('shows the documents still to accept', async () => {
		const locals = testLocals();
		locals.services.account.getLegalStatus.mockResolvedValue(PENDING);

		await expect(runLoad(locals)).resolves.toEqual({
			documents: PENDING.documents,
			redirectPath: '/rules'
		});
	});

	it('hands the page a safe redirect target: never another site', async () => {
		const locals = testLocals();
		locals.services.account.getLegalStatus.mockResolvedValue(PENDING);

		await expect(
			runLoad(locals, 'http://localhost/auth/accept-terms?redirect=https%3A%2F%2Fevil.example')
		).resolves.toMatchObject({ redirectPath: '/' });
	});

	it('sends a signed-out visitor to login', async () => {
		const redirect = await redirectOf(runLoad(testLocals({ jwtString: null })));

		expect(redirect.location).toContain('/auth/login');
		expect(redirect.location).toContain('auth-required');
	});

	it('leaves the interstitial when nothing is pending, or the status is unavailable', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const nothingPending = testLocals();
		nothingPending.services.account.getLegalStatus.mockResolvedValue({
			...PENDING,
			needs_acceptance: false
		});
		const malformed = testLocals();
		malformed.services.account.getLegalStatus.mockResolvedValue({
			needs_acceptance: true
		} as unknown as LegalStatusDto);
		const failing = testLocals();
		failing.services.account.getLegalStatus.mockRejectedValue(new Error('down'));

		for (const locals of [nothingPending, malformed, failing]) {
			expect((await redirectOf(runLoad(locals))).location).toBe('/rules');
		}
	});
});

describe('accept-terms action', () => {
	const agreeAll = { agreedPrivacy: 'true', agreedTerms: 'true', agreedEula: 'true' };
	const act = (locals: TestLocals, fields: Record<string, string>) =>
		actions.default(testEvent<ActionEvent>({ locals, request: formRequest(fields) }));

	it('accepts all three documents', async () => {
		const locals = testLocals();
		locals.services.account.acceptLegalDocuments.mockResolvedValue(PENDING);

		await expect(act(locals, agreeAll)).resolves.toEqual({ success: true });
		expect(locals.services.account.acceptLegalDocuments).toHaveBeenCalledWith({
			kinds: ['privacy_policy', 'terms_of_service', 'eula']
		});
	});

	it('requires every box to be ticked', async () => {
		const locals = testLocals();

		await expect(act(locals, { ...agreeAll, agreedEula: 'false' })).resolves.toMatchObject({
			status: 400,
			data: { error: m.auth_must_agree_all_policies() }
		});
		expect(locals.services.account.acceptLegalDocuments).not.toHaveBeenCalled();
	});

	it("reports the API's failure, falling back to the re-accept message", async () => {
		const failing = testLocals();
		failing.services.account.acceptLegalDocuments.mockRejectedValue(
			new ApiError(503, 'Unavailable', { url: '', payload: null })
		);

		await expect(act(failing, agreeAll)).resolves.toMatchObject({
			status: 503,
			data: { error: m.legal_reaccept_failed() }
		});
	});

	it('requires a session', async () => {
		await expect(act(testLocals({ jwtString: null }), agreeAll)).resolves.toMatchObject({
			status: 401,
			data: { error: m.auth_not_authenticated() }
		});
	});
});
