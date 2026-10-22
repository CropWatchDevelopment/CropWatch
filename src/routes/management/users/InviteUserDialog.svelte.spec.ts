import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrgRole } from '$lib/api/api.dtos';
import { orgRoleLabel } from '$lib/auth/org-labels';
import { m } from '$lib/paraglide/messages.js';
import { createFakeFetch, jsonResponse, type FakeResponder } from '$lib/testing/http';
import { renderWithServices } from '$lib/testing/render';
import InviteUserDialog from './InviteUserDialog.svelte';

const { invalidateAll, forms } = vi.hoisted(() => ({
	invalidateAll: vi.fn(),
	forms: { applyAction: vi.fn(), deserialize: vi.fn((text: string) => JSON.parse(text)) }
}));
vi.mock('$app/navigation', () => ({ invalidateAll }));
vi.mock('$app/forms', () => ({ applyAction: forms.applyAction, deserialize: forms.deserialize }));

/** The page's own `?/invite` action, answered with an ActionResult body. */
let respond: FakeResponder;
let fake: ReturnType<typeof createFakeFetch>;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(props: { roles?: OrgRole[]; orgsEnabled?: boolean } = {}) {
	view = renderWithServices(InviteUserDialog, {
		props: { open: true, roles: ['manager', 'member', 'guest'], orgsEnabled: true, ...props }
	});
	flushSync();
	return view;
}

const dialog = () => document.querySelector<HTMLDialogElement>('dialog.cw-dialog')!;
const button = (label: string) =>
	[...dialog().querySelectorAll<HTMLButtonElement>('button')].find(
		(candidate) => candidate.textContent?.trim() === label
	)!;
const sendButton = () => button(m.management_invite_send());
const input = (name: string) => dialog().querySelector<HTMLInputElement>(`input[name="${name}"]`);
const trigger = () => dialog().querySelector<HTMLButtonElement>('.cw-dropdown__trigger');
/** The fields posted to the action, by name. */
const sentFields = (call = 0) =>
	Object.fromEntries(vi.mocked(fake.fetch).mock.calls[call]?.[1]?.body as FormData);

function type(name: string, value: string) {
	const field = input(name);
	if (!field) throw new Error(`No input "${name}"`);
	field.value = value;
	field.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function chooseRole(role: OrgRole) {
	trigger()?.click();
	flushSync();
	[...dialog().querySelectorAll<HTMLElement>('li[role="option"]')]
		.find((candidate) => candidate.textContent?.trim() === orgRoleLabel(role))
		?.click();
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

describe('InviteUserDialog', () => {
	it('asks for an email and a role, starting with Member', () => {
		render();

		expect(dialog().open).toBe(true);
		expect(dialog().querySelector('.cw-dialog__title')?.textContent).toBe(
			m.management_invite_title()
		);
		expect(dialog().textContent).toContain(m.auth_email_label());
		expect(input('email')?.type).toBe('email');
		expect(input('email')?.placeholder).toBe(m.auth_email_placeholder());
		expect(trigger()?.textContent?.trim()).toBe(orgRoleLabel('member'));
		expect(input('member_expires_on')).toBeNull();

		trigger()?.click();
		flushSync();
		expect(
			[...dialog().querySelectorAll('li[role="option"]')].map((li) => li.textContent?.trim())
		).toEqual([orgRoleLabel('manager'), orgRoleLabel('member'), orgRoleLabel('guest')]);
	});

	it('needs an email longer than three characters', () => {
		render();
		expect(sendButton().disabled).toBe(true);

		type('email', ' a@b ');
		expect(sendButton().disabled).toBe(true);

		type('email', 'a@bc');
		expect(sendButton().disabled).toBe(false);
	});

	it('needs one of the roles the inviter may grant', () => {
		render({ roles: ['manager'] });
		type('email', 'grace@example.com');
		expect(sendButton().disabled).toBe(true);

		chooseRole('manager');

		expect(sendButton().disabled).toBe(false);
	});

	it('cannot send while organizations are disabled', () => {
		render({ orgsEnabled: false });

		type('email', 'grace@example.com');

		expect(sendButton().disabled).toBe(true);
	});

	it('invites a member through the page action, then clears the form and closes', async () => {
		const view = render();
		type('email', '  grace@example.com ');

		sendButton().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		flushSync();
		expect(fake.onlyRequest()).toMatchObject({ url: '?/invite', method: 'POST' });
		expect(sentFields()).toEqual({
			email: 'grace@example.com',
			role: 'member',
			member_expires_on: '',
			member_expires_at: ''
		});
		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(view.toasts()).toMatchObject([{ tone: 'success', message: m.management_invite_sent() }]);
		expect(dialog().open).toBe(false);
		expect(input('email')?.value).toBe('');
		// The role is kept for the next invite.
		expect(trigger()?.textContent?.trim()).toBe(orgRoleLabel('member'));
	});

	it("asks guests for an optional expiry day and sends it with the day's end in this time zone", async () => {
		const view = render();
		type('email', 'guest@example.com');

		chooseRole('guest');

		const expiry = input('member_expires_on');
		expect(expiry?.placeholder).toBe('YYYY-MM-DD');
		expect(dialog().textContent).toContain(m.management_invite_expiry_label());
		expect(dialog().textContent).toContain(m.management_invite_expiry_hint());

		type('member_expires_on', ' 2026-12-31 ');
		sendButton().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		expect(sentFields()).toEqual({
			email: 'guest@example.com',
			role: 'guest',
			member_expires_on: '2026-12-31',
			member_expires_at: new Date(2026, 11, 31, 23, 59, 59).toISOString()
		});
		flushSync();
		expect(input('member_expires_on')?.value).toBe('');
	});

	it('sends no instant for a day that is not a date, and shows why the action refused it', async () => {
		const refusal = {
			type: 'failure',
			status: 400,
			data: { error: m.management_invite_expiry_invalid(), email: 'guest@example.com' }
		};
		respond = () => jsonResponse(refusal);
		const view = render();
		type('email', 'guest@example.com');
		chooseRole('guest');
		type('member_expires_on', '2026-02-30');

		sendButton().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		expect(sentFields()).toEqual({
			email: 'guest@example.com',
			role: 'guest',
			member_expires_on: '2026-02-30',
			member_expires_at: ''
		});
		expect(view.toasts()).toMatchObject([
			{ tone: 'danger', message: m.management_invite_expiry_invalid() }
		]);
		expect(dialog().open).toBe(true);
		expect(input('member_expires_on')?.value).toBe('2026-02-30');
	});

	it('sends no expiry for other roles, even if one was typed as a guest', async () => {
		const view = render();
		type('email', 'grace@example.com');
		chooseRole('guest');
		type('member_expires_on', '2026-12-31');

		chooseRole('manager');
		expect(input('member_expires_on')).toBeNull();
		sendButton().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		expect(sentFields()).toEqual({
			email: 'grace@example.com',
			role: 'manager',
			member_expires_on: '',
			member_expires_at: ''
		});
	});

	it('keeps the dialog and the typed email when the action fails, showing its error', async () => {
		const failure = { type: 'failure', status: 400, data: { error: 'Already a member' } };
		respond = () => jsonResponse(failure);
		const view = render();
		type('email', 'grace@example.com');

		sendButton().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		flushSync();
		expect(forms.applyAction).toHaveBeenCalledWith(failure);
		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: 'Already a member' }]);
		expect(dialog().open).toBe(true);
		expect(input('email')?.value).toBe('grace@example.com');
		expect(sendButton().disabled).toBe(false);
	});

	it('falls back to the generic error when the action gives no message', async () => {
		respond = () => jsonResponse({ type: 'failure', status: 400, data: { error: 42 } });
		const view = render();
		type('email', 'grace@example.com');

		sendButton().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: m.generic_error() }]);
	});

	it('shows the generic error when the request itself fails, and lets the user send again', async () => {
		respond = () => {
			throw new TypeError('Failed to fetch');
		};
		const view = render();
		type('email', 'grace@example.com');

		sendButton().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		flushSync();
		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: m.generic_error() }]);
		expect(dialog().open).toBe(true);
		expect(input('email')?.value).toBe('grace@example.com');
		expect(sendButton().disabled).toBe(false);
		expect(sendButton().getAttribute('aria-busy')).toBeNull();
	});

	it('sends one invite at a time', async () => {
		let release!: (response: Response) => void;
		respond = () => new Promise((resolve) => (release = resolve));
		const view = render();
		type('email', 'grace@example.com');

		sendButton().click();
		flushSync();
		expect(sendButton().disabled).toBe(true);
		sendButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));

		release(jsonResponse({ type: 'success', status: 200 }));
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		expect(fake.requests).toHaveLength(1);
	});

	it('closes on cancel without sending', () => {
		render();

		button(m.action_cancel()).click();
		flushSync();

		expect(dialog().open).toBe(false);
		expect(fake.requests).toHaveLength(0);
	});
});
