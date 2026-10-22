import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MeContextDto, OrganizationDto } from '$lib/api/api.dtos';
import { orgRoleLabel, orgTypeLabel } from '$lib/auth/org-labels';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import OrganizationPage from './+page.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto }));
// The leave dialog posts to the page action; nothing here submits it.
vi.mock('$app/forms', () => ({ applyAction: vi.fn(), deserialize: vi.fn() }));

function orgContext(overrides: Partial<MeContextDto> = {}): MeContextDto {
	return {
		orgs_enabled: true,
		is_staff: false,
		suspended: false,
		org: { id: 'org-1', type: 'company', name: 'Acme', role: 'member', capabilities: [] },
		guest_orgs: [],
		child_orgs: [],
		...overrides
	};
}

const ORGANIZATION: OrganizationDto = {
	id: 'org-1',
	type: 'personal',
	name: 'Acme Farms',
	role: 'member',
	parent: null,
	created_at: '2026-01-01T00:00:00.000Z'
};

let view: ReturnType<typeof renderWithServices> | null = null;

/** `context: null` renders without any org context. */
function render(
	context: MeContextDto | null = orgContext(),
	organization: OrganizationDto | null = ORGANIZATION
) {
	view = renderWithServices(OrganizationPage, {
		props: { data: { organization } } as never,
		app: { accessToken: 'jwt-token', orgContext: context ?? undefined }
	});
	flushSync();
	return view;
}

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
	vi.restoreAllMocks();
});

const text = () => document.body.textContent ?? '';
const card = (title: string) =>
	[...document.querySelectorAll('.cw-card')].find(
		(candidate) => candidate.querySelector('.cw-card__title')?.textContent === title
	);
/** The organization details, as `[label, value]` pairs. */
const details = () =>
	[...document.querySelectorAll('.org-details__row')].map((row) => [
		row.querySelector('dt')?.textContent?.trim(),
		row.querySelector('dd')?.textContent?.trim()
	]);
const button = (label: string) =>
	[...document.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
		candidate.textContent?.includes(label)
	);
const leaveDialog = () =>
	[...document.querySelectorAll<HTMLDialogElement>('dialog.cw-dialog')].find(
		(candidate) =>
			candidate.querySelector('.cw-dialog__title')?.textContent === m.organization_leave_title()
	)!;

describe('organization page', () => {
	it("shows the caller's organization, preferring the loaded details", () => {
		render();

		expect(document.title).toBe(m.organization_page_title());
		expect(details()).toEqual([
			[m.common_name(), 'Acme Farms'],
			[m.organization_type_label(), orgTypeLabel('personal')],
			[m.organization_role_label(), orgRoleLabel('member')],
			[m.organization_id_label(), 'org-1']
		]);
		expect(document.querySelector('.org-details__id')?.textContent).toBe('org-1');
		expect(text()).not.toContain(m.organization_suspended_notice());
	});

	it('falls back to the context when the details could not be loaded', () => {
		render(orgContext(), null);

		expect(details().slice(0, 2)).toEqual([
			[m.common_name(), 'Acme'],
			[m.organization_type_label(), orgTypeLabel('company')]
		]);
	});

	it('shows the parent organization, by name or by id', () => {
		render(orgContext(), { ...ORGANIZATION, parent: { id: 'org-0', name: 'Holding Co' } });
		expect(card(m.organization_page_title())?.querySelector('.app-notice')?.textContent).toContain(
			m.organization_linked_to({ name: 'Holding Co' })
		);
		view?.unmount();

		render(orgContext(), { ...ORGANIZATION, parent: { id: 'org-0', name: null } });
		expect(card(m.organization_page_title())?.querySelector('.app-notice')?.textContent).toContain(
			m.organization_linked_to({ name: 'org-0' })
		);
	});

	it('says when the caller has no organization', () => {
		render(orgContext({ org: null }));
		expect(text()).toContain(m.organization_none());
		expect(card(m.organization_page_title())).toBeUndefined();
		view?.unmount();

		render(null);
		expect(text()).toContain(m.organization_none());
	});

	it('warns a suspended member', () => {
		render(orgContext({ suspended: true }));

		expect(document.querySelector('.app-notice--warning')?.textContent).toContain(
			m.organization_suspended_notice()
		);
	});

	it('lets everyone but the owner leave, after confirming', () => {
		render(
			orgContext({
				org: { id: 'org-1', type: 'company', name: 'Acme', role: 'owner', capabilities: [] }
			})
		);
		expect(document.querySelector('.org-details__leave')).toBeNull();
		view?.unmount();

		render();
		expect(leaveDialog().open).toBe(false);

		document.querySelector<HTMLButtonElement>('.org-details__leave button')?.click();
		flushSync();

		expect(leaveDialog().open).toBe(true);
	});

	it('can open the leave dialog again after cancelling it', () => {
		render();
		const openDialog = () => {
			document.querySelector<HTMLButtonElement>('.org-details__leave button')?.click();
			flushSync();
		};

		openDialog();
		[...leaveDialog().querySelectorAll<HTMLButtonElement>('button')]
			.find((candidate) => candidate.textContent?.trim() === m.action_cancel())
			?.click();
		flushSync();
		expect(leaveDialog().open).toBe(false);

		openDialog();
		expect(leaveDialog().open).toBe(true);
	});

	it('copies the organization id', async () => {
		const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
		render();
		const copy = document.querySelector<HTMLButtonElement>('.cw-copy__button')!;
		expect(copy.getAttribute('aria-label')).toBe(m.cwui_copy_copy());

		copy.click();

		await vi.waitFor(() => expect(copy.getAttribute('aria-label')).toBe(m.cwui_copy_copied()));
		expect(writeText).toHaveBeenCalledWith('org-1');
	});

	it('lists the organizations the caller is a guest of, with the access expiry', () => {
		render(
			orgContext({
				guest_orgs: [
					{ id: 'org-7', name: 'Partner Farm', expires_at: '2026-12-31T00:00:00.000Z' },
					{ id: 'org-8', name: 'Open Farm', expires_at: null }
				]
			})
		);

		const rows = [...(card(m.organization_guest_orgs_title())?.querySelectorAll('li') ?? [])];
		expect(rows.map((row) => row.querySelector('span')?.textContent)).toEqual([
			'Partner Farm',
			'Open Farm'
		]);
		expect(rows[0].querySelector('.org-list__meta')?.textContent?.trim()).toBe(
			m.organization_guest_until({
				date: new Date('2026-12-31T00:00:00.000Z').toLocaleDateString()
			})
		);
		expect(rows[1].querySelector('.org-list__meta')).toBeNull();
	});

	it('lists the child organizations', () => {
		render(orgContext({ child_orgs: [{ id: 'org-2', name: 'Acme North' }] }));

		expect(card(m.organization_child_orgs_title())?.textContent).toContain('Acme North');
	});

	it('hides the guest and child lists when they are empty', () => {
		render();

		expect(card(m.organization_guest_orgs_title())).toBeUndefined();
		expect(card(m.organization_child_orgs_title())).toBeUndefined();
	});

	it('goes back to the dashboard', () => {
		render();

		button(m.action_back())?.click();

		expect(goto).toHaveBeenCalledWith('/');
	});
});
