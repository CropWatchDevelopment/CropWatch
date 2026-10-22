import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	MeContextDto,
	OrgChildrenDto,
	OrganizationDto,
	OrgParentRequestDto
} from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createFakeFetch, jsonResponse, type FakeResponder } from '$lib/testing/http';
import { renderWithServices } from '$lib/testing/render';
import SettingsPage from './+page.svelte';

const { invalidateAll, forms } = vi.hoisted(() => {
	const submits = new Map<HTMLFormElement, SubmitFunction>();
	return {
		invalidateAll: vi.fn(),
		forms: {
			submits,
			// `use:enhance` without the network: keep each form's submit function
			// so a test can run it, and never let the browser submit the form.
			enhance: vi.fn((form: HTMLFormElement, submit: SubmitFunction) => {
				submits.set(form, submit);
				const block = (event: Event) => event.preventDefault();
				form.addEventListener('submit', block);
				return {
					destroy: () => {
						submits.delete(form);
						form.removeEventListener('submit', block);
					}
				};
			}),
			applyAction: vi.fn(async () => {}),
			deserialize: vi.fn((text: string) => JSON.parse(text))
		}
	};
});
vi.mock('$app/navigation', () => ({ invalidateAll }));
vi.mock('$app/forms', () => ({
	enhance: forms.enhance,
	applyAction: forms.applyAction,
	deserialize: forms.deserialize
}));

const ORGANIZATION: OrganizationDto = {
	id: 'org-1',
	type: 'company',
	name: 'Acme',
	role: 'owner',
	parent: null,
	created_at: '2026-01-01T00:00:00.000Z'
};

const CHILDREN: OrgChildrenDto = {
	children: [
		{ id: 'org-2', name: 'Acme North', type: 'company' },
		{ id: 'org-3', name: 'Acme South', type: 'company' }
	],
	pending_requests: [
		{ id: 'creq-1', child_org_id: 'org-4', status: 'pending', created_at: '2026-02-01T00:00:00Z' },
		{ id: 'creq-2', child_org_id: 'org-5', status: 'declined', created_at: '2026-02-01T00:00:00Z' }
	]
};

const PARENT_REQUESTS: OrgParentRequestDto[] = [
	{
		id: 'preq-1',
		parent_org_id: 'org-8',
		status: 'pending',
		created_at: '2026-03-01T00:00:00Z',
		organizations: { name: 'Holding Co' }
	},
	{ id: 'preq-2', parent_org_id: 'org-9', status: 'pending', created_at: '2026-03-01T00:00:00Z' },
	{ id: 'preq-3', parent_org_id: 'org-7', status: 'accepted', created_at: '2026-03-01T00:00:00Z' }
];

function orgContext(overrides: Partial<MeContextDto> = {}): MeContextDto {
	return {
		orgs_enabled: true,
		is_staff: false,
		suspended: false,
		org: { id: 'org-1', type: 'company', name: 'Acme', role: 'owner', capabilities: [] },
		guest_orgs: [],
		child_orgs: [],
		...overrides
	};
}

interface RenderInit {
	organization?: OrganizationDto | null;
	children?: OrgChildrenDto | null;
	parentRequests?: OrgParentRequestDto[];
	form?: Record<string, unknown> | null;
	/** `null`: no org context at all. */
	context?: MeContextDto | null;
}

/** The page's own actions posted by the row buttons, answered with an ActionResult body. */
let respond: FakeResponder;
let fake: ReturnType<typeof createFakeFetch>;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(init: RenderInit = {}) {
	view = renderWithServices(SettingsPage, {
		props: {
			data: {
				organization: 'organization' in init ? init.organization : ORGANIZATION,
				children: 'children' in init ? init.children : CHILDREN,
				parentRequests: init.parentRequests ?? PARENT_REQUESTS
			},
			form: init.form ?? null
		} as never,
		app: {
			accessToken: 'jwt-token',
			orgContext: 'context' in init ? (init.context ?? undefined) : orgContext()
		}
	});
	flushSync();
	return view;
}

const text = () => document.body.textContent ?? '';
const card = (title: string) =>
	[...document.querySelectorAll('.cw-card')].find(
		(candidate) => candidate.querySelector('.cw-card__title')?.textContent === title
	);
const formFor = (action: string) =>
	document.querySelector<HTMLFormElement>(`form[action="?/${action}"]`);
const inputIn = (action: string, name: string) =>
	formFor(action)?.querySelector<HTMLInputElement>(`input[name="${name}"]`) ?? null;
const submitButton = (action: string) =>
	formFor(action)?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
const buttonsIn = (element: Element | null | undefined) => [
	...(element?.querySelectorAll<HTMLButtonElement>('button') ?? [])
];
const buttonIn = (element: Element | null | undefined, label: string) =>
	buttonsIn(element).find((button) => button.textContent?.trim() === label)!;
const linksCard = () => card(m.management_links_title());
const listRows = () => [...(linksCard()?.querySelectorAll('li') ?? [])];
const rowFor = (needle: string) => listRows().find((row) => row.textContent?.includes(needle));
/** The action posted by a row button, with its fields. */
const sent = (call = 0) => ({
	action: fake.requests[call]?.url,
	fields: Object.fromEntries(vi.mocked(fake.fetch).mock.calls[call]?.[1]?.body as FormData)
});

function type(action: string, name: string, value: string) {
	const field = inputIn(action, name);
	if (!field) throw new Error(`No input "${name}" in ?/${action}`);
	field.value = value;
	field.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/**
 * Runs a form's enhance callback as SvelteKit would: the submit function
 * first (the button starts loading), then the result handler.
 */
async function submit(action: string, result?: ActionResult) {
	const form = formFor(action);
	const submitFn = form && forms.submits.get(form);
	if (!form || !submitFn) throw new Error(`No enhanced form for ?/${action}`);
	const url = new URL(`http://localhost/management/settings?/${action}`);
	const formData = new FormData(form);
	const after = await submitFn({
		action: url,
		formData,
		formElement: form,
		controller: new AbortController(),
		submitter: null,
		cancel: vi.fn()
	});
	flushSync();
	const finish = async (outcome: ActionResult) => {
		if (typeof after === 'function') {
			await after({ action: url, formData, formElement: form, result: outcome, update: vi.fn() });
		}
		flushSync();
	};
	if (result) await finish(result);
	return { formData, finish };
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
	forms.applyAction.mockClear();
	forms.deserialize.mockClear();
});

describe('management settings page: rename', () => {
	it('starts from the current name and needs one to save', () => {
		render();

		expect(document.title).toBe(m.management_settings_title());
		expect(inputIn('rename', 'name')?.value).toBe('Acme');
		expect(submitButton('rename')?.disabled).toBe(false);

		type('rename', 'name', '   ');
		expect(submitButton('rename')?.disabled).toBe(true);
	});

	it('starts empty without an organization', () => {
		render({ organization: null });

		expect(inputIn('rename', 'name')?.value).toBe('');
		expect(submitButton('rename')?.disabled).toBe(true);
	});

	it('saves the typed name, then reloads the page data', async () => {
		const { toasts } = render();
		type('rename', 'name', 'Acme Farms');

		const { formData, finish } = await submit('rename');
		expect(Object.fromEntries(formData)).toEqual({ name: 'Acme Farms' });
		expect(submitButton('rename')?.getAttribute('aria-busy')).toBe('true');

		await finish({ type: 'success', status: 200, data: { success: true } });

		expect(submitButton('rename')?.getAttribute('aria-busy')).toBeNull();
		expect(toasts()).toMatchObject([{ tone: 'success', message: m.management_rename_saved() }]);
		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(forms.applyAction).not.toHaveBeenCalled();
	});

	it("shows why saving failed, and only toasts the action's own error", async () => {
		const { toasts } = render();
		const failure: ActionResult = { type: 'failure', status: 409, data: { error: 'Name taken' } };

		await submit('rename', failure);
		expect(forms.applyAction).toHaveBeenCalledWith(failure);
		expect(toasts()).toMatchObject([{ tone: 'danger', message: 'Name taken' }]);

		await submit('rename', { type: 'failure', status: 400, data: { error: ['nope'] } });
		await submit('rename', { type: 'error', status: 500, error: new Error('boom') });
		expect(forms.applyAction).toHaveBeenCalledTimes(3);
		expect(toasts()).toHaveLength(1);
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it("shows the action's error above the rename form", () => {
		render({ form: { error: 'Name taken' } });

		expect(formFor('rename')?.querySelector('.app-notice--danger')?.textContent).toContain(
			'Name taken'
		);
	});
});

describe('management settings page: organizations switch', () => {
	it('says when organizations are disabled', () => {
		render({ context: orgContext({ orgs_enabled: false }) });
		expect(text()).toContain(m.management_orgs_disabled_notice());
		view?.unmount();

		render({ context: null });
		expect(text()).toContain(m.management_orgs_disabled_notice());
		view?.unmount();

		render();
		expect(text()).not.toContain(m.management_orgs_disabled_notice());
	});
});

describe('management settings page: upgrade', () => {
	const personal: OrganizationDto = { ...ORGANIZATION, type: 'personal' };

	it('offers the upgrade to personal organizations only', () => {
		render();
		expect(formFor('upgrade')).toBeNull();
		view?.unmount();

		render({ organization: personal });
		expect(card(m.management_upgrade_title())?.textContent).toContain(m.management_upgrade_body());
		expect(inputIn('upgrade', 'name')?.value).toBe('');
		expect(submitButton('upgrade')?.disabled).toBe(true);
	});

	it('upgrades under the typed company name', async () => {
		const { toasts } = render({ organization: personal });
		type('upgrade', 'name', 'Acme Inc');
		expect(submitButton('upgrade')?.disabled).toBe(false);

		const { formData, finish } = await submit('upgrade');
		expect(Object.fromEntries(formData)).toEqual({ name: 'Acme Inc' });
		expect(submitButton('upgrade')?.getAttribute('aria-busy')).toBe('true');
		await finish({ type: 'success', status: 200, data: { success: true } });

		expect(submitButton('upgrade')?.getAttribute('aria-busy')).toBeNull();
		expect(toasts()).toMatchObject([{ tone: 'success', message: m.management_upgraded() }]);
		expect(invalidateAll).toHaveBeenCalledTimes(1);
	});

	it('cannot upgrade while organizations are disabled', () => {
		render({ organization: personal, context: orgContext({ orgs_enabled: false }) });
		type('upgrade', 'name', 'Acme Inc');

		expect(inputIn('upgrade', 'name')?.disabled).toBe(true);
		expect(submitButton('upgrade')?.disabled).toBe(true);
	});
});

describe('management settings page: parent link', () => {
	it('shows the parent organization, by name or by id', () => {
		render({ organization: { ...ORGANIZATION, parent: { id: 'org-0', name: 'Holding Co' } } });
		expect(linksCard()?.querySelector('.app-notice')?.textContent).toContain(
			m.organization_linked_to({ name: 'Holding Co' })
		);
		view?.unmount();

		render({ organization: { ...ORGANIZATION, parent: { id: 'org-0', name: null } } });
		expect(linksCard()?.querySelector('.app-notice')?.textContent).toContain(
			m.organization_linked_to({ name: 'org-0' })
		);
		view?.unmount();

		render();
		expect(linksCard()?.querySelector('.app-notice')).toBeNull();
	});

	it('lists the pending requests to become a child organization', () => {
		render();

		expect(linksCard()?.textContent).toContain(m.management_parent_requests_title());
		expect(rowFor('Holding Co')?.textContent).toContain(
			m.management_parent_request_body({ name: 'Holding Co' })
		);
		expect(rowFor('org-9')?.textContent).toContain(
			m.management_parent_request_body({ name: 'org-9' })
		);
		expect(rowFor('org-7')).toBeUndefined();
		expect(buttonsIn(rowFor('Holding Co')).map((button) => button.textContent?.trim())).toEqual([
			m.management_approve(),
			m.management_decline()
		]);
	});

	it('hides the requests section when none are pending', () => {
		render({ parentRequests: [PARENT_REQUESTS[2]] });

		expect(linksCard()?.textContent).not.toContain(m.management_parent_requests_title());
	});

	it('accepts and declines a request through the page action', async () => {
		const { toasts } = render();
		const holding = () => rowFor('Holding Co');

		buttonIn(holding(), m.management_approve()).click();
		await vi.waitFor(() => expect(toasts()).toHaveLength(1));
		await vi.waitFor(() =>
			expect(buttonIn(holding(), m.management_decline()).disabled).toBe(false)
		);
		buttonIn(holding(), m.management_decline()).click();
		await vi.waitFor(() => expect(toasts()).toHaveLength(2));

		expect([sent(0), sent(1)]).toEqual([
			{ action: '?/decideRequest', fields: { request_id: 'preq-1', decision: 'accept' } },
			{ action: '?/decideRequest', fields: { request_id: 'preq-1', decision: 'decline' } }
		]);
		expect(toasts()).toMatchObject([
			{ tone: 'success', message: m.management_link_decided() },
			{ tone: 'success', message: m.management_link_decided() }
		]);
		expect(invalidateAll).toHaveBeenCalledTimes(2);
	});

	it("shows the action's error, or the generic one, when deciding fails", async () => {
		const { toasts } = render();
		const decline = () => buttonIn(rowFor('Holding Co'), m.management_decline());

		respond = () => jsonResponse({ type: 'failure', status: 403, data: { error: 'Not allowed' } });
		decline().click();
		await vi.waitFor(() => expect(toasts()).toHaveLength(1));
		await vi.waitFor(() => expect(decline().disabled).toBe(false));
		respond = () => jsonResponse({ type: 'failure', status: 500 });
		decline().click();
		await vi.waitFor(() => expect(toasts()).toHaveLength(2));

		expect(toasts()).toMatchObject([
			{ tone: 'danger', message: 'Not allowed' },
			{ tone: 'danger', message: m.generic_error() }
		]);
	});

	it('shows the generic error when a decision request fails, and frees the buttons', async () => {
		respond = () => {
			throw new TypeError('Failed to fetch');
		};
		const { toasts } = render();
		const approve = () => buttonIn(rowFor('Holding Co'), m.management_approve());

		approve().click();

		await vi.waitFor(() => expect(toasts()).toHaveLength(1));
		expect(toasts()).toMatchObject([{ tone: 'danger', message: m.generic_error() }]);
		await vi.waitFor(() => expect(approve().getAttribute('aria-busy')).toBeNull());
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('cannot approve while organizations are disabled, but can decline', () => {
		render({ context: orgContext({ orgs_enabled: false }) });

		expect(buttonIn(rowFor('Holding Co'), m.management_approve()).disabled).toBe(true);
		expect(buttonIn(rowFor('Holding Co'), m.management_decline()).disabled).toBe(false);
	});
});

describe('management settings page: child organizations', () => {
	it('lists the children and the pending link requests', () => {
		render();

		expect(rowFor('Acme North')?.textContent).toContain(m.management_unlink());
		expect(rowFor('Acme South')).toBeDefined();
		expect(rowFor('org-4')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
			`${m.management_link_pending()} · org-4`
		);
		expect(rowFor('org-5')).toBeUndefined();
		expect(linksCard()?.textContent).not.toContain(m.management_children_empty());
	});

	it('says when there are no children and nothing pending', () => {
		for (const children of [
			null,
			{ children: [], pending_requests: [] },
			{ children: [], pending_requests: [CHILDREN.pending_requests[1]] }
		]) {
			render({ children });
			expect(linksCard()?.textContent).toContain(m.management_children_empty());
			view?.unmount();
		}

		render({ children: { children: [], pending_requests: [CHILDREN.pending_requests[0]] } });
		expect(linksCard()?.textContent).not.toContain(m.management_children_empty());
	});

	it('unlinks a child through the page action', async () => {
		const { toasts } = render();

		buttonIn(rowFor('Acme North'), m.management_unlink()).click();

		await vi.waitFor(() => expect(toasts()).toHaveLength(1));
		expect(sent()).toEqual({ action: '?/unlinkChild', fields: { child_id: 'org-2' } });
		expect(toasts()).toMatchObject([{ tone: 'success', message: m.management_unlinked() }]);
		expect(invalidateAll).toHaveBeenCalledTimes(1);
	});

	it("shows the action's error, or the generic one, when unlinking fails", async () => {
		const { toasts } = render();
		const unlink = () => buttonIn(rowFor('Acme North'), m.management_unlink());

		respond = () => jsonResponse({ type: 'failure', status: 404, data: { error: 'Not linked' } });
		unlink().click();
		await vi.waitFor(() => expect(toasts()).toHaveLength(1));
		await vi.waitFor(() => expect(unlink().disabled).toBe(false));
		respond = () => jsonResponse({ type: 'redirect', status: 303, location: '/' });
		unlink().click();
		await vi.waitFor(() => expect(toasts()).toHaveLength(2));

		expect(toasts()).toMatchObject([
			{ tone: 'danger', message: 'Not linked' },
			{ tone: 'danger', message: m.generic_error() }
		]);
	});

	it('shows the generic error when an unlink request fails, and frees the button', async () => {
		respond = () => {
			throw new TypeError('Failed to fetch');
		};
		const { toasts } = render();
		const unlink = () => buttonIn(rowFor('Acme North'), m.management_unlink());

		unlink().click();

		await vi.waitFor(() => expect(toasts()).toHaveLength(1));
		expect(toasts()).toMatchObject([{ tone: 'danger', message: m.generic_error() }]);
		await vi.waitFor(() => expect(unlink().getAttribute('aria-busy')).toBeNull());
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('handles one link change at a time', async () => {
		let release!: (response: Response) => void;
		respond = () => new Promise((resolve) => (release = resolve));
		const { toasts } = render();

		buttonIn(rowFor('Acme North'), m.management_unlink()).click();
		flushSync();
		expect(buttonIn(rowFor('Acme North'), m.management_unlink()).getAttribute('aria-busy')).toBe(
			'true'
		);
		buttonIn(rowFor('Acme South'), m.management_unlink()).click();
		buttonIn(rowFor('Holding Co'), m.management_decline()).click();

		release(jsonResponse({ type: 'success', status: 200 }));
		await vi.waitFor(() => expect(toasts()).toHaveLength(1));
		expect(fake.requests).toHaveLength(1);
		expect(sent().fields).toEqual({ child_id: 'org-2' });
	});
});

describe('management settings page: link request', () => {
	it('needs an organization id', () => {
		render();
		expect(submitButton('linkRequest')?.disabled).toBe(true);

		type('linkRequest', 'child_org_id', 'org-6');

		expect(submitButton('linkRequest')?.disabled).toBe(false);
		expect(formFor('linkRequest')?.textContent).toContain(m.management_link_request_hint());
	});

	it('sends the request, then clears the field and reloads', async () => {
		const { toasts } = render();
		type('linkRequest', 'child_org_id', 'org-6');

		const { formData, finish } = await submit('linkRequest');
		expect(Object.fromEntries(formData)).toEqual({ child_org_id: 'org-6' });
		expect(submitButton('linkRequest')?.getAttribute('aria-busy')).toBe('true');
		await finish({ type: 'success', status: 200, data: { success: true } });

		expect(submitButton('linkRequest')?.getAttribute('aria-busy')).toBeNull();
		expect(toasts()).toMatchObject([
			{ tone: 'success', message: m.management_link_request_sent() }
		]);
		expect(inputIn('linkRequest', 'child_org_id')?.value).toBe('');
		expect(invalidateAll).toHaveBeenCalledTimes(1);
	});

	it('keeps the typed id when the request fails', async () => {
		const { toasts } = render();
		type('linkRequest', 'child_org_id', 'org-6');

		await submit('linkRequest', { type: 'failure', status: 404, data: { error: 'Unknown org' } });

		expect(toasts()).toMatchObject([{ tone: 'danger', message: 'Unknown org' }]);
		expect(inputIn('linkRequest', 'child_org_id')?.value).toBe('org-6');
	});

	it('cannot link while organizations are disabled', () => {
		render({ context: orgContext({ orgs_enabled: false }) });
		type('linkRequest', 'child_org_id', 'org-6');

		expect(inputIn('linkRequest', 'child_org_id')?.disabled).toBe(true);
		expect(submitButton('linkRequest')?.disabled).toBe(true);
	});
});

describe('management settings page: ownership transfer', () => {
	it('explains how to transfer ownership', () => {
		render();

		expect(card(m.management_transfer_title())?.textContent).toContain(
			m.management_transfer_body()
		);
	});
});
