import { describe, expect, it } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import { formRequest, testEvent, testLocals, type TestLocals } from '$lib/testing/server';
import { actions, load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<(typeof actions)['updateProfile']>[0];

const apiError = (status: number, message: string) =>
	new ApiError(status, 'Error', { url: 'https://api.cropwatch.test/x', payload: { message } });

function act(name: keyof typeof actions, locals: TestLocals, fields: Record<string, string> = {}) {
	return actions[name](testEvent<ActionEvent>({ locals, request: formRequest(fields) }));
}

describe('profile load', () => {
	it('derives the email, role and LINE link from the layout data', async () => {
		const data = await load(
			testEvent<LoadEvent>({
				parent: {
					profile: { email: ' ada@example.com ', line_id: 'U123' },
					session: { email: 'other@example.com', role: ' admin ' }
				}
			})
		);

		expect(data).toEqual({
			profile: { email: ' ada@example.com ', line_id: 'U123' },
			email: 'ada@example.com',
			role: 'admin',
			lineLinked: true
		});
	});

	it('falls back to the session email and nulls when the profile is missing', async () => {
		const data = await load(testEvent<LoadEvent>({ parent: { session: { email: 'a@b.c' } } }));

		expect(data).toEqual({ profile: null, email: 'a@b.c', role: null, lineLinked: false });
	});
});

describe('updateProfile', () => {
	const fields = {
		username: ' ada ',
		full_name: 'Ada Lovelace',
		employer: 'Analytical',
		website: '',
		phone_number: '123'
	};

	it('saves the trimmed fields', async () => {
		const locals = testLocals();
		locals.services.account.updateProfile.mockResolvedValue({} as never);

		await expect(act('updateProfile', locals, fields)).resolves.toEqual({ success: true });
		expect(locals.services.account.updateProfile).toHaveBeenCalledWith({
			...fields,
			username: 'ada'
		});
	});

	it("returns the API's status and message, echoing the fields back", async () => {
		const locals = testLocals();
		locals.services.account.updateProfile.mockRejectedValue(apiError(409, 'Username taken'));

		await expect(act('updateProfile', locals, fields)).resolves.toMatchObject({
			status: 409,
			data: { error: 'Username taken', username: 'ada', phone_number: '123' }
		});
	});

	it('fails with 500 and the generic message for a network failure', async () => {
		const locals = testLocals();
		locals.services.account.updateProfile.mockRejectedValue(new TypeError('Failed to fetch'));

		await expect(act('updateProfile', locals, fields)).resolves.toMatchObject({
			status: 500,
			data: { error: m.generic_error() }
		});
	});

	it('requires a session', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(act('updateProfile', locals, fields)).resolves.toMatchObject({
			status: 401,
			data: { error: m.auth_not_authenticated() }
		});
		expect(locals.services.account.updateProfile).not.toHaveBeenCalled();
	});
});

describe('LINE actions', () => {
	it('creates a link code', async () => {
		const locals = testLocals();
		locals.services.line.createLineLinkCode.mockResolvedValue({
			code: '123456',
			expiresAt: '2026-10-21T00:10:00Z'
		});

		await expect(act('lineLinkCode', locals)).resolves.toEqual({
			lineCode: '123456',
			lineCodeExpiresAt: '2026-10-21T00:10:00Z'
		});
	});

	it('reports a failed link code as lineError', async () => {
		const locals = testLocals();
		locals.services.line.createLineLinkCode.mockRejectedValue(apiError(503, 'LINE is down'));

		await expect(act('lineLinkCode', locals)).resolves.toMatchObject({
			status: 503,
			data: { lineError: 'LINE is down' }
		});
	});

	it('unlinks LINE, with its own fallback message', async () => {
		const ok = testLocals();
		ok.services.line.unlinkLine.mockResolvedValue(undefined);
		await expect(act('unlinkLine', ok)).resolves.toEqual({ lineUnlinked: true });

		const failing = testLocals();
		failing.services.line.unlinkLine.mockRejectedValue({});
		await expect(act('unlinkLine', failing)).resolves.toMatchObject({
			status: 500,
			data: { lineError: m.line_unlink_failed() }
		});
	});

	it('requires a session for both', async () => {
		for (const name of ['lineLinkCode', 'unlinkLine'] as const) {
			await expect(act(name, testLocals({ jwtString: null }))).resolves.toMatchObject({
				status: 401,
				data: { lineError: m.auth_not_authenticated() }
			});
		}
	});
});

describe('updateEmail', () => {
	it('rejects an address without @, keeping what was typed', async () => {
		const locals = testLocals();

		await expect(act('updateEmail', locals, { email: ' nope ' })).resolves.toMatchObject({
			status: 400,
			data: { emailError: m.profile_email_invalid(), email: 'nope' }
		});
		expect(locals.services.account.updateEmail).not.toHaveBeenCalled();
	});

	it('starts the change and passes the API message on', async () => {
		const locals = testLocals();
		locals.services.account.updateEmail.mockResolvedValue({ message: 'Check your inbox' } as never);

		await expect(act('updateEmail', locals, { email: 'new@example.com' })).resolves.toEqual({
			emailPending: true,
			emailMessage: 'Check your inbox',
			email: 'new@example.com'
		});
		expect(locals.services.account.updateEmail).toHaveBeenCalledWith({ email: 'new@example.com' });
	});

	it('uses null when the API sends no message, and reports failures', async () => {
		const ok = testLocals();
		ok.services.account.updateEmail.mockResolvedValue({} as never);
		await expect(act('updateEmail', ok, { email: 'a@b.c' })).resolves.toMatchObject({
			emailMessage: null
		});

		const failing = testLocals();
		failing.services.account.updateEmail.mockRejectedValue(apiError(422, 'Address in use'));
		await expect(act('updateEmail', failing, { email: 'a@b.c' })).resolves.toMatchObject({
			status: 422,
			data: { emailError: 'Address in use', email: 'a@b.c' }
		});
	});

	it('requires a session', async () => {
		await expect(
			act('updateEmail', testLocals({ jwtString: null }), { email: 'a@b.c' })
		).resolves.toMatchObject({ status: 401, data: { emailError: m.auth_not_authenticated() } });
	});
});
