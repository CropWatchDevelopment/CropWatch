import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrgMemberDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createFakeFetch, jsonResponse, type FakeResponder } from '$lib/testing/http';
import { renderWithServices } from '$lib/testing/render';
import RemoveMemberDialog from './RemoveMemberDialog.svelte';

const { invalidateAll, forms } = vi.hoisted(() => ({
	invalidateAll: vi.fn(),
	forms: { applyAction: vi.fn(), deserialize: vi.fn((text: string) => JSON.parse(text)) }
}));
vi.mock('$app/navigation', () => ({ invalidateAll }));
vi.mock('$app/forms', () => ({ applyAction: forms.applyAction, deserialize: forms.deserialize }));

const MEMBER: OrgMemberDto = {
	user_id: 'user-2',
	email: 'grace@example.com',
	full_name: 'Grace Hopper',
	role: 'member',
	status: 'active',
	expires_at: null,
	suspended_at: null,
	created_at: '2026-01-01T00:00:00.000Z'
};

/** The page's own `?/remove` action, answered with an ActionResult body. */
let respond: FakeResponder;
let fake: ReturnType<typeof createFakeFetch>;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(member: OrgMemberDto | null = MEMBER) {
	view = renderWithServices(RemoveMemberDialog, { props: { open: true, member } });
	flushSync();
	return view;
}

const dialog = () => document.querySelector<HTMLDialogElement>('dialog.cw-dialog')!;
const button = (label: string) =>
	[...dialog().querySelectorAll<HTMLButtonElement>('button')].find(
		(candidate) => candidate.textContent?.trim() === label
	)!;
const removeButton = () => button(m.action_remove());

beforeEach(() => {
	respond = () => jsonResponse({ type: 'success', status: 200 });
	fake = createFakeFetch((request) => respond(request));
	vi.stubGlobal('fetch', fake.fetch);
});

afterEach(() => {
	view?.unmount();
	view = null;
	vi.unstubAllGlobals();
	invalidateAll.mockReset();
	forms.applyAction.mockReset();
	forms.deserialize.mockClear();
});

describe('RemoveMemberDialog', () => {
	it('asks to confirm removing the member, by name, email or id', () => {
		render();
		expect(dialog().open).toBe(true);
		expect(dialog().querySelector('.cw-dialog__title')?.textContent).toBe(
			m.management_remove_title()
		);
		expect(dialog().querySelector('p')?.textContent?.trim()).toBe(
			m.management_remove_body({ name: 'Grace Hopper' })
		);
		view?.unmount();

		render({ ...MEMBER, full_name: null });
		expect(dialog().querySelector('p')?.textContent?.trim()).toBe(
			m.management_remove_body({ name: 'grace@example.com' })
		);
		view?.unmount();

		render({ ...MEMBER, full_name: null, email: null });
		expect(dialog().querySelector('p')?.textContent?.trim()).toBe(
			m.management_remove_body({ name: 'user-2' })
		);
	});

	it('removes the member through the page action, then reloads and closes', async () => {
		const view = render();

		removeButton().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		flushSync();
		expect(fake.onlyRequest()).toMatchObject({ url: '?/remove', method: 'POST' });
		expect(Object.fromEntries(vi.mocked(fake.fetch).mock.calls[0]?.[1]?.body as FormData)).toEqual({
			user_id: 'user-2'
		});
		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(view.toasts()).toMatchObject([
			{ tone: 'success', message: m.management_removed_done() }
		]);
		expect(dialog().open).toBe(false);
	});

	it("stays open and shows the action's error, or the generic one", async () => {
		const failure = { type: 'failure', status: 403, data: { error: 'Not allowed' } };
		respond = () => jsonResponse(failure);
		const view = render();

		removeButton().click();
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		await vi.waitFor(() => expect(removeButton().disabled).toBe(false));
		respond = () => jsonResponse({ type: 'redirect', status: 303, location: '/' });
		removeButton().click();
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(2));

		expect(forms.applyAction).toHaveBeenCalledWith(failure);
		expect(view.toasts()).toMatchObject([
			{ tone: 'danger', message: 'Not allowed' },
			{ tone: 'danger', message: m.generic_error() }
		]);
		expect(invalidateAll).not.toHaveBeenCalled();
		expect(dialog().open).toBe(true);
	});

	it('shows the generic error when the request itself fails, and can try again', async () => {
		respond = () => {
			throw new TypeError('Failed to fetch');
		};
		const view = render();

		removeButton().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		flushSync();
		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: m.generic_error() }]);
		expect(dialog().open).toBe(true);
		expect(removeButton().disabled).toBe(false);
		expect(removeButton().getAttribute('aria-busy')).toBeNull();
	});

	it('sends one removal at a time', async () => {
		let release!: (response: Response) => void;
		respond = () => new Promise((resolve) => (release = resolve));
		const view = render();

		removeButton().click();
		flushSync();
		expect(removeButton().disabled).toBe(true);
		removeButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));

		release(jsonResponse({ type: 'success', status: 200 }));
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		expect(fake.requests).toHaveLength(1);
	});

	it('closes on cancel, and does nothing without a member', () => {
		render(null);
		expect(dialog().querySelector('p')).toBeNull();

		removeButton().click();
		button(m.action_cancel()).click();
		flushSync();

		expect(dialog().open).toBe(false);
		expect(fake.requests).toHaveLength(0);
	});
});
