import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeFetch, jsonResponse } from '$lib/testing/http';
import { submitPageAction } from './submit-page-action';

const { invalidateAll, forms } = vi.hoisted(() => ({
	invalidateAll: vi.fn(),
	// SvelteKit's own deserialize needs a started app for its decoders; the
	// stand-in parses the plain-JSON ActionResult bodies these tests answer with.
	forms: { applyAction: vi.fn(), deserialize: vi.fn((text: string) => JSON.parse(text)) }
}));
vi.mock('$app/navigation', () => ({ invalidateAll }));
vi.mock('$app/forms', () => ({ applyAction: forms.applyAction, deserialize: forms.deserialize }));

/** The page's own action endpoint, answering every POST with `result`. */
function answer(result: unknown) {
	const fake = createFakeFetch(() => jsonResponse(result));
	vi.stubGlobal('fetch', fake.fetch);
	return fake;
}

/** The fields of the FormData the action was posted with. */
function sentFields(fake: ReturnType<typeof createFakeFetch>) {
	const init = vi.mocked(fake.fetch).mock.calls[0]?.[1];
	return [...((init?.body as FormData | undefined)?.entries() ?? [])].map(([name, value]) => [
		name,
		String(value)
	]);
}

beforeEach(() => {
	invalidateAll.mockResolvedValue(undefined);
	forms.applyAction.mockResolvedValue(undefined);
});

afterEach(() => {
	invalidateAll.mockReset();
	forms.applyAction.mockReset();
	forms.deserialize.mockClear();
	vi.unstubAllGlobals();
});

describe('submitPageAction', () => {
	it("posts the fields to the page's named action as form data", async () => {
		const fake = answer({ type: 'success', status: 200 });

		await submitPageAction('suspend', { user_id: 'user-7', reason: 'left the team' });

		const request = fake.onlyRequest();
		expect(request.url).toBe('?/suspend');
		expect(request.method).toBe('POST');
		expect(vi.mocked(fake.fetch).mock.calls[0][1]?.body).toBeInstanceOf(FormData);
		expect(sentFields(fake)).toEqual([
			['user_id', 'user-7'],
			['reason', 'left the team']
		]);
	});

	it('posts an empty form when there are no fields', async () => {
		const fake = answer({ type: 'success', status: 204 });

		await submitPageAction('reinstate', {});

		expect(fake.onlyRequest().url).toBe('?/reinstate');
		expect(sentFields(fake)).toEqual([]);
	});

	it('hands the response body to SvelteKit to deserialize', async () => {
		const result = { type: 'success', status: 200, data: { invited: 1 } };
		answer(result);

		await submitPageAction('invite', { email: 'ada@example.com' });

		expect(forms.deserialize).toHaveBeenCalledWith(JSON.stringify(result));
	});

	it('reloads all page data on success, without applying the result', async () => {
		answer({ type: 'success', status: 200 });

		await expect(submitPageAction('remove', { user_id: 'user-7' })).resolves.toEqual({ ok: true });

		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(forms.applyAction).not.toHaveBeenCalled();
	});

	it('waits for the reload before reporting success', async () => {
		answer({ type: 'success', status: 200 });
		let finishReload!: () => void;
		invalidateAll.mockReturnValue(new Promise<void>((resolve) => (finishReload = resolve)));

		let settled = false;
		const submitted = submitPageAction('remove', { user_id: 'user-7' }).then((outcome) => {
			settled = true;
			return outcome;
		});
		await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalled());
		await Promise.resolve();
		expect(settled).toBe(false);

		finishReload();
		await expect(submitted).resolves.toEqual({ ok: true });
	});

	it("applies a failure and returns the action's error message", async () => {
		const result = { type: 'failure', status: 400, data: { error: 'Choose a role' } };
		answer(result);

		await expect(submitPageAction('updateRole', { user_id: 'user-7', role: '' })).resolves.toEqual({
			ok: false,
			error: 'Choose a role'
		});

		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('returns no message for a failure without a text error', async () => {
		answer({ type: 'failure', status: 400, data: { error: 42 } });
		await expect(submitPageAction('invite', {})).resolves.toEqual({ ok: false, error: undefined });

		answer({ type: 'failure', status: 403 });
		await expect(submitPageAction('invite', {})).resolves.toEqual({ ok: false, error: undefined });

		expect(forms.applyAction).toHaveBeenCalledTimes(2);
	});

	it('applies a redirect or an error result and reports no message', async () => {
		const redirect = { type: 'redirect', status: 303, location: '/auth/login' };
		answer(redirect);
		await expect(submitPageAction('remove', { user_id: 'user-7' })).resolves.toEqual({
			ok: false,
			error: undefined
		});
		expect(forms.applyAction).toHaveBeenLastCalledWith(redirect);

		const error = { type: 'error', status: 500, error: { message: 'Internal Error' } };
		answer(error);
		await expect(submitPageAction('remove', { user_id: 'user-7' })).resolves.toEqual({
			ok: false,
			error: undefined
		});
		expect(forms.applyAction).toHaveBeenLastCalledWith(error);
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('waits for the result to be applied before returning', async () => {
		answer({ type: 'failure', status: 400, data: { error: 'Nope' } });
		let finishApply!: () => void;
		forms.applyAction.mockReturnValue(new Promise<void>((resolve) => (finishApply = resolve)));

		let settled = false;
		const submitted = submitPageAction('invite', {}).then((outcome) => {
			settled = true;
			return outcome;
		});
		await vi.waitFor(() => expect(forms.applyAction).toHaveBeenCalled());
		await Promise.resolve();
		expect(settled).toBe(false);

		finishApply();
		await expect(submitted).resolves.toEqual({ ok: false, error: 'Nope' });
	});
});
