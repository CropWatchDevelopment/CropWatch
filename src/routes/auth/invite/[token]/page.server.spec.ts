import { describe, expect, it } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { InvitePreviewDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { testEvent, testLocals, type TestLocals } from '$lib/testing/server';
import { actions, load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<(typeof actions)['accept']>[0];

const PREVIEW = { org_name: 'Farm Co', role: 'member' } as unknown as InvitePreviewDto;
const apiError = (status: number, message?: string) =>
	new ApiError(status, 'Error', { url: '', payload: message ? { message } : null });

const accept = (locals: TestLocals) =>
	actions.accept(testEvent<ActionEvent>({ locals, params: { token: 'tok' } }));

describe('invite load', () => {
	it('previews the invite and says whether the visitor is signed in', async () => {
		const locals = testLocals({ jwtString: null });
		locals.services.organizations.previewInvite.mockResolvedValue(PREVIEW);

		await expect(load(testEvent<LoadEvent>({ locals, params: { token: 'tok' } }))).resolves.toEqual(
			{
				preview: PREVIEW,
				loggedIn: false,
				token: 'tok'
			}
		);
		expect(locals.services.organizations.previewInvite).toHaveBeenCalledWith('tok');
	});

	it('shows no preview for an invalid, expired or revoked invite', async () => {
		const locals = testLocals();
		locals.services.organizations.previewInvite.mockRejectedValue(apiError(404));

		await expect(load(testEvent<LoadEvent>({ locals, params: { token: 'tok' } }))).resolves.toEqual(
			{
				preview: null,
				loggedIn: true,
				token: 'tok'
			}
		);
	});
});

describe('invite accept', () => {
	it('accepts the invite', async () => {
		const locals = testLocals();
		locals.services.organizations.acceptInvite.mockResolvedValue({ org_id: 'o', role: 'member' });

		await expect(accept(locals)).resolves.toEqual({ success: true });
		expect(locals.services.organizations.acceptInvite).toHaveBeenCalledWith('tok');
	});

	it('maps conflicts and missing invites to their own messages', async () => {
		const conflict = testLocals();
		conflict.services.organizations.acceptInvite.mockRejectedValue(
			apiError(409, 'already a member')
		);
		const missing = testLocals();
		missing.services.organizations.acceptInvite.mockRejectedValue(apiError(404, 'gone'));

		await expect(accept(conflict)).resolves.toMatchObject({
			status: 409,
			data: { error: m.invite_conflict() }
		});
		await expect(accept(missing)).resolves.toMatchObject({
			status: 404,
			data: { error: m.invite_not_found() }
		});
	});

	it("passes any other failure's message on", async () => {
		const locals = testLocals();
		locals.services.organizations.acceptInvite.mockRejectedValue(apiError(422, 'Invite expired'));
		const unknown = testLocals();
		unknown.services.organizations.acceptInvite.mockRejectedValue({});

		await expect(accept(locals)).resolves.toMatchObject({
			status: 422,
			data: { error: 'Invite expired' }
		});
		await expect(accept(unknown)).resolves.toMatchObject({
			status: 500,
			data: { error: m.generic_error() }
		});
	});

	it('requires a session', async () => {
		await expect(accept(testLocals({ jwtString: null }))).resolves.toMatchObject({
			status: 401,
			data: { error: m.auth_not_authenticated() }
		});
	});
});
