import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrgMemberDto, OrgRole } from '$lib/api/api.dtos';
import { orgRoleLabel } from '$lib/auth/org-labels';
import { m } from '$lib/paraglide/messages.js';
import { createFakeFetch, jsonResponse, type FakeResponder } from '$lib/testing/http';
import { renderWithServices } from '$lib/testing/render';
import ChangeRoleDialog from './ChangeRoleDialog.svelte';

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

/** The page's own `?/updateRole` action, answered with an ActionResult body. */
let respond: FakeResponder;
let fake: ReturnType<typeof createFakeFetch>;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(props: { member?: OrgMemberDto | null; roles?: OrgRole[] } = {}) {
	view = renderWithServices(ChangeRoleDialog, {
		props: { open: true, member: MEMBER, roles: ['manager'], ...props }
	});
	flushSync();
	return view;
}

const dialog = () => document.querySelector<HTMLDialogElement>('dialog.cw-dialog')!;
const button = (label: string) =>
	[...dialog().querySelectorAll<HTMLButtonElement>('button')].find(
		(candidate) => candidate.textContent?.trim() === label
	)!;
const saveButton = () => button(m.action_save_changes());
const trigger = () => dialog().querySelector<HTMLButtonElement>('.cw-dropdown__trigger');
const options = () =>
	[...dialog().querySelectorAll('li[role="option"]')].map((option) => option.textContent?.trim());
/** The fields posted to the action, by name. */
const sentFields = (call = 0) =>
	Object.fromEntries(vi.mocked(fake.fetch).mock.calls[call]?.[1]?.body as FormData);

function chooseRole(role: OrgRole) {
	trigger()?.click();
	flushSync();
	const option = [...dialog().querySelectorAll<HTMLElement>('li[role="option"]')].find(
		(candidate) => candidate.textContent?.trim() === orgRoleLabel(role)
	);
	option?.click();
	flushSync();
}

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

describe('ChangeRoleDialog', () => {
	it('shows the member and the roles they can be given', () => {
		render({ roles: ['manager', 'member'] });

		expect(dialog().open).toBe(true);
		expect(dialog().querySelector('.cw-dialog__title')?.textContent).toBe(
			m.management_change_role_title()
		);
		expect(dialog().querySelector('.role-fields p')?.textContent).toBe('Grace Hopper');
		expect(dialog().textContent).toContain(m.management_invite_role_label());
		// The dialog starts from the member's current role.
		expect(trigger()?.textContent?.trim()).toBe(orgRoleLabel('member'));

		trigger()?.click();
		flushSync();
		expect(options()).toEqual([orgRoleLabel('manager'), orgRoleLabel('member')]);
	});

	it('names the member by email, then by user id, when there is no name', () => {
		render({ member: { ...MEMBER, full_name: null } });
		expect(dialog().querySelector('.role-fields p')?.textContent).toBe('grace@example.com');
		view?.unmount();

		render({ member: { ...MEMBER, full_name: null, email: null } });
		expect(dialog().querySelector('.role-fields p')?.textContent).toBe('user-2');
	});

	it('only lets an offered role be saved', () => {
		render();
		expect(saveButton().disabled).toBe(true);

		chooseRole('manager');

		expect(saveButton().disabled).toBe(false);
	});

	it('has nothing to save while the member keeps the role they have', () => {
		render({ roles: ['manager', 'member'] });

		expect(trigger()?.textContent?.trim()).toBe(orgRoleLabel('member'));
		expect(saveButton().disabled).toBe(true);

		chooseRole('manager');
		expect(saveButton().disabled).toBe(false);
		chooseRole('member');
		expect(saveButton().disabled).toBe(true);
	});

	it("starts from the member's current role every time it opens, after a cancelled choice", () => {
		const props = $state({ open: true, member: MEMBER });
		view = renderWithServices(ChangeRoleDialog, {
			props: {
				roles: ['manager'],
				get open() {
					return props.open;
				},
				set open(value: boolean) {
					props.open = value;
				},
				get member() {
					return props.member;
				}
			}
		});
		flushSync();
		chooseRole('manager');
		expect(saveButton().disabled).toBe(false);
		button(m.action_cancel()).click();
		flushSync();
		expect(props.open).toBe(false);

		// Another member's dialog opens on their own role, with nothing to save.
		props.member = { ...MEMBER, user_id: 'user-4', full_name: 'Sam Member' };
		props.open = true;
		flushSync();
		expect(dialog().open).toBe(true);
		expect(dialog().querySelector('.role-fields p')?.textContent).toBe('Sam Member');
		expect(trigger()?.textContent?.trim()).toBe(orgRoleLabel('member'));
		expect(saveButton().disabled).toBe(true);

		// So does the same member's, reopened.
		chooseRole('manager');
		button(m.action_cancel()).click();
		flushSync();
		props.open = true;
		flushSync();
		expect(trigger()?.textContent?.trim()).toBe(orgRoleLabel('member'));
		expect(saveButton().disabled).toBe(true);
	});

	it('saves the new role through the page action, then reloads and closes', async () => {
		const view = render();
		chooseRole('manager');

		saveButton().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		flushSync();
		expect(fake.onlyRequest()).toMatchObject({ url: '?/updateRole', method: 'POST' });
		expect(sentFields()).toEqual({ user_id: 'user-2', role: 'manager' });
		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(forms.applyAction).not.toHaveBeenCalled();
		expect(view.toasts()).toMatchObject([
			{ tone: 'success', message: m.management_member_updated() }
		]);
		expect(dialog().open).toBe(false);
		// The choice is cleared for the next member.
		expect(trigger()?.textContent?.trim()).toBe(orgRoleLabel('member'));
		expect(saveButton().disabled).toBe(true);
	});

	it("keeps the dialog open and shows the action's error", async () => {
		const failure = { type: 'failure', status: 403, data: { error: 'Managers cannot promote' } };
		respond = () => jsonResponse(failure);
		const view = render();
		chooseRole('manager');

		saveButton().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		flushSync();
		expect(forms.applyAction).toHaveBeenCalledWith(failure);
		expect(invalidateAll).not.toHaveBeenCalled();
		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: 'Managers cannot promote' }]);
		expect(dialog().open).toBe(true);
		expect(saveButton().disabled).toBe(false);
	});

	it('falls back to the generic error when the action gives no message', async () => {
		const view = render();
		chooseRole('manager');

		for (const [index, result] of [
			{ type: 'failure', status: 400 },
			{ type: 'error', status: 500, error: { message: 'boom' } }
		].entries()) {
			respond = () => jsonResponse(result);
			saveButton().click();
			await vi.waitFor(() => expect(view.toasts()).toHaveLength(index + 1));
			await vi.waitFor(() => expect(saveButton().disabled).toBe(false));
		}

		expect(view.toasts()).toMatchObject([
			{ tone: 'danger', message: m.generic_error() },
			{ tone: 'danger', message: m.generic_error() }
		]);
	});

	it('shows the generic error when the request itself fails, and lets the user save again', async () => {
		respond = () => {
			throw new TypeError('Failed to fetch');
		};
		const view = render();
		chooseRole('manager');

		saveButton().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		flushSync();
		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: m.generic_error() }]);
		expect(dialog().open).toBe(true);
		expect(saveButton().disabled).toBe(false);
		expect(saveButton().getAttribute('aria-busy')).toBeNull();
	});

	it('sends one change at a time', async () => {
		let release!: (response: Response) => void;
		respond = () => new Promise((resolve) => (release = resolve));
		const view = render();
		chooseRole('manager');

		saveButton().click();
		flushSync();
		expect(saveButton().disabled).toBe(true);
		expect(saveButton().getAttribute('aria-busy')).toBe('true');
		saveButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));

		release(jsonResponse({ type: 'success', status: 200 }));
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		expect(fake.requests).toHaveLength(1);
	});

	it('closes on cancel without saving', () => {
		render();
		chooseRole('manager');

		button(m.action_cancel()).click();
		flushSync();

		expect(dialog().open).toBe(false);
		expect(fake.requests).toHaveLength(0);
	});

	it('has nothing to change without a member', () => {
		render({ member: null });

		expect(dialog().querySelector('.role-fields')).toBeNull();
		expect(saveButton().disabled).toBe(true);
	});
});
