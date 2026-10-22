import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeContextDto, OrgInviteDto, OrgMemberDto } from '$lib/api/api.dtos';
import { orgRoleLabel } from '$lib/auth/org-labels';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import { m } from '$lib/paraglide/messages.js';
import { createFakeFetch, jsonResponse, type FakeResponder } from '$lib/testing/http';
import { renderWithServices } from '$lib/testing/render';
import UsersPage from './+page.svelte';

const { invalidateAll, forms } = vi.hoisted(() => ({
	invalidateAll: vi.fn(),
	forms: { applyAction: vi.fn(), deserialize: vi.fn((text: string) => JSON.parse(text)) }
}));
vi.mock('$app/navigation', () => ({ invalidateAll }));
vi.mock('$app/forms', () => ({ applyAction: forms.applyAction, deserialize: forms.deserialize }));

function member(overrides: Partial<OrgMemberDto>): OrgMemberDto {
	return {
		user_id: 'user-x',
		email: null,
		full_name: null,
		role: 'member',
		status: 'active',
		expires_at: null,
		suspended_at: null,
		created_at: '2026-01-01T00:00:00.000Z',
		...overrides
	};
}

const OWNER = member({
	user_id: 'user-1',
	email: 'ada@example.com',
	full_name: 'Ada Owner',
	role: 'owner'
});
const MANAGER = member({
	user_id: 'user-3',
	email: 'mia@example.com',
	full_name: 'Mia Manager',
	role: 'manager'
});
const GRACE = member({ user_id: 'user-2', email: 'grace@example.com', full_name: 'Grace Member' });
const SAM = member({
	user_id: 'user-4',
	email: 'sam@example.com',
	full_name: 'Sam Suspended',
	status: 'suspended'
});
const GUEST = member({
	user_id: 'user-5',
	email: 'gus@example.com',
	full_name: 'Gus Guest',
	role: 'guest',
	expires_at: '2026-12-31T00:00:00.000Z'
});
const ANONYMOUS_GUEST = member({ user_id: 'user-6', role: 'guest', status: 'suspended' });
const EMAIL_ONLY_GUEST = member({ user_id: 'user-7', email: 'eve@example.com', role: 'guest' });

function invite(overrides: Partial<OrgInviteDto>): OrgInviteDto {
	return {
		id: 'inv-1',
		email: 'new@example.com',
		role: 'member',
		status: 'pending',
		expires_at: '2026-11-01T00:00:00.000Z',
		created_at: '2026-10-01T00:00:00.000Z',
		member_expires_at: null,
		invited_by: 'user-1',
		...overrides
	};
}

const INVITES = [
	invite({}),
	invite({ id: 'inv-2', email: 'manager@example.com', role: 'manager' }),
	invite({ id: 'inv-3', email: 'done@example.com', status: 'accepted' })
];

function orgContext(
	role: 'owner' | 'manager' | 'member',
	overrides: Partial<MeContextDto> = {}
): MeContextDto {
	return {
		orgs_enabled: true,
		is_staff: false,
		suspended: false,
		org: { id: 'org-1', type: 'company', name: 'Acme', role, capabilities: [] },
		guest_orgs: [],
		child_orgs: [],
		...overrides
	};
}

interface RenderInit {
	/** `null`: no org context at all. */
	context?: MeContextDto | null;
	/** The signed-in user; `null`: no session. */
	userId?: string | null;
	members?: OrgMemberDto[];
	invites?: OrgInviteDto[];
}

/** The page's own actions, answered with an ActionResult body. */
let respond: FakeResponder;
let fake: ReturnType<typeof createFakeFetch>;
let view: ReturnType<typeof renderWithServices> | null = null;

function render({
	context = orgContext('owner'),
	userId = 'user-1',
	members = [OWNER, MANAGER, GRACE, SAM, GUEST, ANONYMOUS_GUEST, EMAIL_ONLY_GUEST],
	invites = INVITES
}: RenderInit = {}) {
	view = renderWithServices(UsersPage, {
		props: { data: { members, invites } } as never,
		app: {
			accessToken: 'jwt-token',
			orgContext: context ?? undefined,
			session: userId === null ? null : ({ sub: userId } as IJWT)
		}
	});
	flushSync();
	return view;
}

const rows = () => [
	...document.querySelectorAll<HTMLTableRowElement>(
		'#management-members-table tr.cw-data-table__row'
	)
];
const cells = (row: HTMLTableRowElement) =>
	[...row.querySelectorAll('td:not(.cw-data-table__td--actions)')].map((td) =>
		td.textContent?.trim()
	);
const rowFor = (name: string) => rows().find((row) => row.textContent?.includes(name));
const buttonsIn = (element: Element | null | undefined) => [
	...(element?.querySelectorAll<HTMLButtonElement>('button') ?? [])
];
const labelsIn = (element: Element | null | undefined) =>
	buttonsIn(element).map((button) => button.textContent?.trim());
const actionsOf = (name: string) =>
	labelsIn(rowFor(name)?.querySelector('.cw-data-table__td--actions'));
const buttonIn = (element: Element | null | undefined, label: string) =>
	buttonsIn(element).find((button) => button.textContent?.trim() === label)!;
const card = (title: string) =>
	[...document.querySelectorAll('.cw-card')].find(
		(candidate) => candidate.querySelector('.cw-card__title')?.textContent === title
	);
const listRows = (title: string) => [...(card(title)?.querySelectorAll('li') ?? [])];
const listRowFor = (title: string, text: string) =>
	listRows(title).find((row) => row.textContent?.includes(text));
const dialog = (title: string) =>
	[...document.querySelectorAll<HTMLDialogElement>('dialog.cw-dialog')].find(
		(candidate) => candidate.querySelector('.cw-dialog__title')?.textContent === title
	)!;
const inviteButton = () =>
	buttonIn(card(m.management_members_title()), m.management_invite_button());
/** The action posted, with its fields. */
const sent = (call = 0) => ({
	action: fake.requests[call]?.url,
	fields: Object.fromEntries(vi.mocked(fake.fetch).mock.calls[call]?.[1]?.body as FormData)
});

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

describe('management users page: members table', () => {
	it('lists the members, without guests, with their role and status', async () => {
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(4));
		expect(rows().map(cells)).toEqual([
			['Ada Owner', 'ada@example.com', orgRoleLabel('owner'), m.management_status_active()],
			['Mia Manager', 'mia@example.com', orgRoleLabel('manager'), m.management_status_active()],
			['Grace Member', 'grace@example.com', orgRoleLabel('member'), m.management_status_active()],
			['Sam Suspended', 'sam@example.com', orgRoleLabel('member'), m.management_status_suspended()]
		]);
		expect(document.title).toBe(m.management_page_title());
		expect(document.body.textContent).not.toContain(m.management_orgs_disabled_notice());
	});

	it('offers the owner every action, except on themselves', async () => {
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(4));

		expect(actionsOf('Ada Owner')).toEqual([]);
		expect(actionsOf('Mia Manager')).toEqual([
			m.management_change_role_title(),
			m.management_suspend(),
			m.action_remove()
		]);
		expect(actionsOf('Grace Member')).toEqual([
			m.management_change_role_title(),
			m.management_suspend(),
			m.action_remove()
		]);
		expect(actionsOf('Sam Suspended')).toEqual([
			m.management_change_role_title(),
			m.management_reinstate(),
			m.action_remove()
		]);
	});

	it('lets a manager suspend and remove members only, never change roles', async () => {
		render({ context: orgContext('manager'), userId: 'user-3' });
		await vi.waitFor(() => expect(rows()).toHaveLength(4));

		expect(actionsOf('Ada Owner')).toEqual([]);
		expect(actionsOf('Mia Manager')).toEqual([]);
		expect(actionsOf('Grace Member')).toEqual([m.management_suspend(), m.action_remove()]);
		expect(actionsOf('Sam Suspended')).toEqual([m.management_reinstate(), m.action_remove()]);
		// Only the owner sees the guests.
		expect(card(m.management_guests_title())).toBeUndefined();
	});

	it('lets staff act with owner authority', async () => {
		render({ context: orgContext('member', { is_staff: true }), userId: 'staff-1' });
		await vi.waitFor(() => expect(rows()).toHaveLength(4));

		expect(actionsOf('Ada Owner')).toEqual([]);
		expect(actionsOf('Grace Member')).toEqual([
			m.management_change_role_title(),
			m.management_suspend(),
			m.action_remove()
		]);
		expect(card(m.management_guests_title())).toBeDefined();
	});

	it('gives a plain member no actions', async () => {
		render({ context: orgContext('member'), userId: 'user-2' });
		await vi.waitFor(() => expect(rows()).toHaveLength(4));

		for (const name of ['Ada Owner', 'Mia Manager', 'Grace Member', 'Sam Suspended']) {
			expect(actionsOf(name), name).toEqual([]);
		}
		expect(inviteButton().disabled).toBe(true);
	});

	it('says when there are no members', async () => {
		render({ members: [] });

		await vi.waitFor(() =>
			expect(card(m.management_members_title())?.textContent).toContain(
				m.management_members_empty()
			)
		);
	});

	it('searches the members by name, email, role and status', async () => {
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(4));
		const search = document.querySelector<HTMLInputElement>(
			'#management-members-table .cw-data-table__search-wrapper input'
		)!;
		const searchFor = (value: string) => {
			search.value = value;
			search.dispatchEvent(new Event('input', { bubbles: true }));
		};
		const names = () => rows().map((row) => cells(row)[0]);

		searchFor(' MIA ');
		await vi.waitFor(() => expect(names()).toEqual(['Mia Manager']));
		searchFor('grace@');
		await vi.waitFor(() => expect(names()).toEqual(['Grace Member']));
		searchFor(orgRoleLabel('manager'));
		await vi.waitFor(() => expect(names()).toEqual(['Mia Manager']));
		searchFor(m.management_status_suspended());
		await vi.waitFor(() => expect(names()).toEqual(['Sam Suspended']));
		searchFor('');
		await vi.waitFor(() => expect(rows()).toHaveLength(4));
	});

	it('pages through more members than fit on one page', async () => {
		const numbered = (n: number) => `Member ${String(n).padStart(2, '0')}`;
		render({
			members: Array.from({ length: 25 }, (_, index) =>
				member({ user_id: `user-${index + 10}`, full_name: numbered(index + 1) })
			)
		});
		const names = () => rows().map((row) => cells(row)[0]);

		await vi.waitFor(() => expect(rows()).toHaveLength(20));
		expect(names()).toEqual(Array.from({ length: 20 }, (_, index) => numbered(index + 1)));

		document
			.querySelector<HTMLButtonElement>(
				`#management-members-table button[aria-label="${m.cwui_table_next_page()}"]`
			)!
			.click();

		await vi.waitFor(() => expect(rows()).toHaveLength(5));
		expect(names()).toEqual([21, 22, 23, 24, 25].map(numbered));
	});

	it('opens the change-role, suspend and remove dialogs for the chosen member', async () => {
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(4));
		const graceActions = () => rowFor('Grace Member')?.querySelector('.cw-data-table__td--actions');

		buttonIn(graceActions(), m.management_change_role_title()).click();
		flushSync();
		const changeRole = dialog(m.management_change_role_title());
		expect(changeRole.open).toBe(true);
		expect(changeRole.querySelector('.role-fields p')?.textContent).toBe('Grace Member');
		// The owner may make a member a manager.
		changeRole.querySelector<HTMLButtonElement>('.cw-dropdown__trigger')?.click();
		flushSync();
		expect(
			[...changeRole.querySelectorAll('li[role="option"]')].map((li) => li.textContent?.trim())
		).toEqual([orgRoleLabel('manager')]);

		buttonIn(graceActions(), m.management_suspend()).click();
		flushSync();
		expect(dialog(m.management_change_role_title()).open).toBe(false);
		expect(dialog(m.management_suspend_title()).open).toBe(true);
		expect(dialog(m.management_suspend_title()).textContent).toContain(
			m.management_suspend_body({ name: 'Grace Member' })
		);

		buttonIn(graceActions(), m.action_remove()).click();
		flushSync();
		expect(dialog(m.management_suspend_title()).open).toBe(false);
		expect(dialog(m.management_remove_title()).open).toBe(true);
		expect(dialog(m.management_remove_title()).textContent).toContain(
			m.management_remove_body({ name: 'Grace Member' })
		);
	});

	it('reinstates a suspended member through the page action', async () => {
		const view = render();
		await vi.waitFor(() => expect(rows()).toHaveLength(4));

		buttonIn(rowFor('Sam Suspended'), m.management_reinstate()).click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		expect(sent()).toEqual({ action: '?/reinstate', fields: { user_id: 'user-4' } });
		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(view.toasts()).toMatchObject([
			{ tone: 'success', message: m.management_reinstated_done() }
		]);
	});

	it("shows the action's error, or the generic one, when reinstating fails", async () => {
		const view = render();
		await vi.waitFor(() => expect(rows()).toHaveLength(4));
		const reinstate = () => buttonIn(rowFor('Sam Suspended'), m.management_reinstate());

		respond = () => jsonResponse({ type: 'failure', status: 403, data: { error: 'Not allowed' } });
		reinstate().click();
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		await vi.waitFor(() => expect(reinstate().disabled).toBe(false));
		respond = () => jsonResponse({ type: 'failure', status: 500 });
		reinstate().click();
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(2));

		expect(view.toasts()).toMatchObject([
			{ tone: 'danger', message: 'Not allowed' },
			{ tone: 'danger', message: m.generic_error() }
		]);
	});

	it('shows the generic error when a reinstate request fails, and frees the button', async () => {
		respond = () => {
			throw new TypeError('Failed to fetch');
		};
		const view = render();
		await vi.waitFor(() => expect(rows()).toHaveLength(4));
		const reinstate = () => buttonIn(rowFor('Sam Suspended'), m.management_reinstate());

		reinstate().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: m.generic_error() }]);
		await vi.waitFor(() => expect(reinstate().getAttribute('aria-busy')).toBeNull());
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('reinstates one person at a time', async () => {
		let release!: (response: Response) => void;
		respond = () => new Promise((resolve) => (release = resolve));
		const view = render();
		await vi.waitFor(() => expect(rows()).toHaveLength(4));
		const reinstate = () => buttonIn(rowFor('Sam Suspended'), m.management_reinstate());

		reinstate().click();
		flushSync();
		expect(reinstate().getAttribute('aria-busy')).toBe('true');
		// Another reinstate (here: a suspended guest's) waits for the first.
		buttonIn(listRowFor(m.management_guests_title(), 'user-6'), m.management_reinstate()).click();

		release(jsonResponse({ type: 'success', status: 200 }));
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		expect(fake.requests).toHaveLength(1);
		expect(sent().fields).toEqual({ user_id: 'user-4' });
	});
});

describe('management users page: inviting', () => {
	it('opens the invite dialog with the roles the owner may grant', async () => {
		render();

		expect(inviteButton().disabled).toBe(false);
		inviteButton().click();
		flushSync();

		const invite = dialog(m.management_invite_title());
		expect(invite.open).toBe(true);
		invite.querySelector<HTMLButtonElement>('.cw-dropdown__trigger')?.click();
		flushSync();
		expect(
			[...invite.querySelectorAll('li[role="option"]')].map((li) => li.textContent?.trim())
		).toEqual([orgRoleLabel('manager'), orgRoleLabel('member'), orgRoleLabel('guest')]);
	});

	it('cannot invite while organizations are disabled, and says so', () => {
		render({ context: orgContext('owner', { orgs_enabled: false }) });

		expect(inviteButton().disabled).toBe(true);
		expect(document.querySelector('.app-notice')?.textContent).toContain(
			m.management_orgs_disabled_notice()
		);
	});

	it('treats a missing org context as no organization features', async () => {
		render({ context: null });

		expect(inviteButton().disabled).toBe(true);
		expect(document.body.textContent).toContain(m.management_orgs_disabled_notice());
		await vi.waitFor(() => expect(rows()).toHaveLength(4));
		expect(actionsOf('Grace Member')).toEqual([]);
	});
});

describe('management users page: dialogs', () => {
	it('can reopen each dialog after it was cancelled', async () => {
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(4));
		const graceActions = () => rowFor('Grace Member')?.querySelector('.cw-data-table__td--actions');
		const cases: [title: string, open: () => void][] = [
			[m.management_invite_title(), () => inviteButton().click()],
			[
				m.management_change_role_title(),
				() => buttonIn(graceActions(), m.management_change_role_title()).click()
			],
			[
				m.management_suspend_title(),
				() => buttonIn(graceActions(), m.management_suspend()).click()
			],
			[m.management_remove_title(), () => buttonIn(graceActions(), m.action_remove()).click()]
		];

		for (const [title, open] of cases) {
			open();
			flushSync();
			expect(dialog(title).open, title).toBe(true);

			buttonIn(dialog(title), m.action_cancel()).click();
			flushSync();
			expect(dialog(title).open, title).toBe(false);

			open();
			flushSync();
			expect(dialog(title).open, title).toBe(true);
			buttonIn(dialog(title), m.action_cancel()).click();
			flushSync();
		}
	});

	it("opens the change-role dialog on each member's own role, after a cancelled choice", async () => {
		render();
		await vi.waitFor(() => expect(rows()).toHaveLength(4));
		const changeRole = () => dialog(m.management_change_role_title());
		const roleTrigger = () =>
			changeRole().querySelector<HTMLButtonElement>('.cw-dropdown__trigger')!;
		const save = () => buttonIn(changeRole(), m.action_save_changes());

		buttonIn(rowFor('Grace Member'), m.management_change_role_title()).click();
		flushSync();
		roleTrigger().click();
		flushSync();
		[...changeRole().querySelectorAll<HTMLElement>('li[role="option"]')]
			.find((option) => option.textContent?.trim() === orgRoleLabel('manager'))!
			.click();
		flushSync();
		expect(save().disabled).toBe(false);
		buttonIn(changeRole(), m.action_cancel()).click();
		flushSync();

		buttonIn(rowFor('Sam Suspended'), m.management_change_role_title()).click();
		flushSync();

		expect(changeRole().open).toBe(true);
		expect(changeRole().querySelector('.role-fields p')?.textContent).toBe('Sam Suspended');
		expect(roleTrigger().textContent?.trim()).toBe(orgRoleLabel('member'));
		expect(save().disabled).toBe(true);
	});

	it('treats nobody as the caller without a session', async () => {
		// A staff user who is also listed as a member could not act on their own row.
		render({ context: orgContext('member', { is_staff: true }), userId: null });
		await vi.waitFor(() => expect(rows()).toHaveLength(4));

		expect(actionsOf('Grace Member')).toEqual([
			m.management_change_role_title(),
			m.management_suspend(),
			m.action_remove()
		]);
	});
});

describe('management users page: guests', () => {
	it('lists the guests for the owner, with their email and access expiry', () => {
		render();

		const rows = listRows(m.management_guests_title());
		expect(rows).toHaveLength(3);
		const gus = listRowFor(m.management_guests_title(), 'Gus Guest');
		expect(gus?.querySelector('.management-list__main')?.textContent).toContain('gus@example.com');
		expect(gus?.textContent).toContain(
			m.organization_guest_until({
				date: new Date('2026-12-31T00:00:00.000Z').toLocaleDateString()
			})
		);
		expect(labelsIn(gus)).toEqual([m.management_suspend(), m.action_remove()]);

		// Without a name the email shows, and without either the user id; no meta line then.
		const eve = listRowFor(m.management_guests_title(), 'eve@example.com');
		expect(eve?.querySelectorAll('.management-list__meta')).toHaveLength(0);
		const anonymous = listRowFor(m.management_guests_title(), 'user-6');
		expect(labelsIn(anonymous)).toEqual([m.management_reinstate(), m.action_remove()]);
	});

	it('opens the suspend and remove dialogs for a guest', () => {
		render();
		const gus = () => listRowFor(m.management_guests_title(), 'Gus Guest');

		buttonIn(gus(), m.management_suspend()).click();
		flushSync();
		expect(dialog(m.management_suspend_title()).textContent).toContain(
			m.management_suspend_body({ name: 'Gus Guest' })
		);

		buttonIn(gus(), m.action_remove()).click();
		flushSync();
		expect(dialog(m.management_remove_title()).open).toBe(true);
		expect(dialog(m.management_remove_title()).textContent).toContain(
			m.management_remove_body({ name: 'Gus Guest' })
		);
	});

	it('reinstates a suspended guest', async () => {
		const view = render();

		buttonIn(listRowFor(m.management_guests_title(), 'user-6'), m.management_reinstate()).click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		expect(sent()).toEqual({ action: '?/reinstate', fields: { user_id: 'user-6' } });
	});

	it('says when there are no guests', () => {
		render({ members: [OWNER, GRACE] });

		expect(card(m.management_guests_title())?.textContent).toContain(m.management_guests_empty());
	});
});

describe('management users page: invites', () => {
	it('lists the pending invites with their role and expiry', () => {
		render();

		const rows = listRows(m.management_invites_title());
		expect(rows).toHaveLength(2);
		expect(rows[0].querySelector('.management-list__main')?.textContent).toContain(
			'new@example.com'
		);
		expect(
			rows[0].querySelector('.management-list__meta')?.textContent?.replace(/\s+/g, ' ').trim()
		).toBe(
			`${orgRoleLabel('member')} · ${m.management_invite_expires({
				date: new Date('2026-11-01T00:00:00.000Z').toLocaleDateString()
			})}`
		);
		expect(rows[1].textContent).toContain('manager@example.com');
		expect(card(m.management_invites_title())?.textContent).not.toContain('done@example.com');
		expect(labelsIn(rows[0])).toEqual([m.management_invite_resend(), m.management_invite_revoke()]);
	});

	it('resends and revokes an invite through the page actions', async () => {
		const view = render();
		const first = () => listRows(m.management_invites_title())[0];

		buttonIn(first(), m.management_invite_resend()).click();
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		await vi.waitFor(() =>
			expect(buttonIn(first(), m.management_invite_revoke()).disabled).toBe(false)
		);
		buttonIn(first(), m.management_invite_revoke()).click();
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(2));

		expect([sent(0), sent(1)]).toEqual([
			{ action: '?/resendInvite', fields: { invite_id: 'inv-1' } },
			{ action: '?/revokeInvite', fields: { invite_id: 'inv-1' } }
		]);
		expect(view.toasts()).toMatchObject([
			{ tone: 'success', message: m.management_invite_resent() },
			{ tone: 'success', message: m.management_invite_revoked() }
		]);
		expect(invalidateAll).toHaveBeenCalledTimes(2);
	});

	it("shows the action's error, or the generic one, when an invite action fails", async () => {
		const view = render();
		const revoke = () =>
			buttonIn(listRows(m.management_invites_title())[0], m.management_invite_revoke());

		respond = () => jsonResponse({ type: 'failure', status: 404, data: { error: 'Gone' } });
		revoke().click();
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		await vi.waitFor(() => expect(revoke().disabled).toBe(false));
		respond = () => jsonResponse({ type: 'error', status: 500, error: { message: 'boom' } });
		revoke().click();
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(2));

		expect(view.toasts()).toMatchObject([
			{ tone: 'danger', message: 'Gone' },
			{ tone: 'danger', message: m.generic_error() }
		]);
	});

	it('shows the generic error when an invite request fails, and frees the buttons', async () => {
		respond = () => {
			throw new TypeError('Failed to fetch');
		};
		const view = render();
		const revoke = () =>
			buttonIn(listRows(m.management_invites_title())[0], m.management_invite_revoke());

		revoke().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: m.generic_error() }]);
		await vi.waitFor(() => expect(revoke().getAttribute('aria-busy')).toBeNull());
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('handles one invite action at a time', async () => {
		let release!: (response: Response) => void;
		respond = () => new Promise((resolve) => (release = resolve));
		const view = render();
		const [first, second] = listRows(m.management_invites_title());

		buttonIn(first, m.management_invite_revoke()).click();
		flushSync();
		expect(buttonIn(first, m.management_invite_resend()).getAttribute('aria-busy')).toBe('true');
		buttonIn(second, m.management_invite_revoke()).click();

		release(jsonResponse({ type: 'success', status: 200 }));
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		expect(fake.requests).toHaveLength(1);
	});

	it('cannot resend while organizations are disabled', () => {
		render({ context: orgContext('owner', { orgs_enabled: false }) });

		const first = listRows(m.management_invites_title())[0];
		expect(buttonIn(first, m.management_invite_resend()).disabled).toBe(true);
		expect(buttonIn(first, m.management_invite_revoke()).disabled).toBe(false);
	});

	it('says when there are no pending invites', () => {
		render({ invites: [invite({ status: 'expired' })] });

		expect(card(m.management_invites_title())?.textContent).toContain(m.management_invites_empty());
	});
});
