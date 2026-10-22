import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocationOwnerDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import LocationEditPermissions from './LocationEditPermissions.svelte';

const { invalidateAll, page, forms } = vi.hoisted(() => ({
	invalidateAll: vi.fn(),
	page: {
		url: new URL('http://localhost/locations/8/settings'),
		params: { location_id: '8' },
		data: {}
	},
	// SvelteKit's own deserialize needs a started app for its decoders; the
	// stand-in parses the plain-JSON ActionResult bodies these tests answer with.
	forms: { applyAction: vi.fn(), deserialize: vi.fn((text: string) => JSON.parse(text)) }
}));
vi.mock('$app/navigation', () => ({ invalidateAll }));
vi.mock('$app/state', () => ({ page }));
vi.mock('$app/forms', () => ({ applyAction: forms.applyAction, deserialize: forms.deserialize }));

const OWNERS = [
	{
		id: 14,
		user_id: 'user-1',
		location_id: 8,
		owner_id: 3,
		admin_user_id: 'admin-1',
		permission_level: 2,
		profiles: { email: 'ada@example.com', full_name: 'Ada Lovelace' }
	},
	{
		id: 15,
		user_id: 'user-2',
		location_id: 8,
		owner_id: 3,
		admin_user_id: 'admin-1',
		permission_level: '4',
		email: 'bob@example.com',
		name: 'Bob'
	}
] as unknown as LocationOwnerDto[];

/** The settings page's own form action. */
const actionFetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
/** Answers the action the way SvelteKit does: HTTP 200 with an ActionResult, even for a failure. */
const answer = (result: unknown) =>
	actionFetch.mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));

let view: ReturnType<typeof renderWithServices> | null = null;

const render = (locationOwners = OWNERS) =>
	(view = renderWithServices(LocationEditPermissions, { props: { data: { locationOwners } } }));

const byId = <T extends HTMLElement = HTMLButtonElement>(id: string) =>
	document.getElementById(id) as T | null;
const rows = () =>
	[...(view?.target.querySelectorAll('#location-edit-permissions-table tbody tr') ?? [])].map(
		(row) =>
			[...row.querySelectorAll('td')].slice(0, 4).map((cell) => cell.textContent?.trim() ?? '')
	);

async function editRow(id: number) {
	await vi.waitFor(() =>
		expect(byId(`location-edit-permissions-row-${id}-edit-button`)).not.toBeNull()
	);
	byId(`location-edit-permissions-row-${id}-edit-button`)!.click();
	flushSync();
}

function chooseLevel(id: number, label: string) {
	byId(`location-edit-permissions-row-${id}-level-select`)!.click();
	flushSync();
	const option = [...document.querySelectorAll('[role="option"]')].find(
		(candidate) => candidate.textContent?.trim() === label
	) as HTMLElement;
	option.click();
	flushSync();
}

beforeEach(() => {
	vi.stubGlobal('fetch', actionFetch);
});

afterEach(() => {
	view?.unmount();
	view = null;
	actionFetch.mockReset();
	invalidateAll.mockReset();
	forms.applyAction.mockReset();
	forms.deserialize.mockClear();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

/** Whether the row still offers its level dropdown and save button (edit mode). */
const editing = (id: number) =>
	byId(`location-edit-permissions-row-${id}-level-select`) !== null &&
	byId(`location-edit-permissions-row-${id}-save-button`) !== null;

describe('LocationEditPermissions', () => {
	it('lists every grant with its permission level', async () => {
		render();

		await expect.poll(rows).toEqual([
			['14', 'ada@example.com', 'Ada Lovelace', m.permission_level_manager()],
			['15', 'bob@example.com', 'Bob', m.permission_level_viewer()]
		]);
		expect(byId(`location-edit-permissions-row-14-level-select`)).toBeNull();
	});

	it('saves a new level through the settings action, then reloads', async () => {
		const result = { type: 'success', status: 200, data: { message: 'Updated' } };
		answer(result);
		const view = render();
		await editRow(14);

		chooseLevel(14, m.permission_level_viewer());
		byId('location-edit-permissions-row-14-save-button')!.click();

		await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
		const [url, init] = actionFetch.mock.calls[0];
		expect(url).toBe('?/updateUserPermissionLevel');
		expect(init?.method).toBe('POST');
		expect(init?.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
		expect(String(init?.body)).toBe('permission_level=4&email=ada%40example.com&location_id=8');
		expect(forms.deserialize).toHaveBeenCalledWith(JSON.stringify(result));
		await vi.waitFor(() =>
			expect(byId('location-edit-permissions-row-14-edit-button')).not.toBeNull()
		);
		expect(forms.applyAction).not.toHaveBeenCalled();
		expect(view.toasts()).toEqual([]);
	});

	it('shows a refused change, which SvelteKit answers with HTTP 200, and keeps the row editable', async () => {
		const result = {
			type: 'failure',
			status: 409,
			data: { action: 'updateUserPermissionLevel', message: ' The owner keeps Admin ' }
		};
		answer(result);
		const view = render();
		await editRow(15);

		byId('location-edit-permissions-row-15-save-button')!.click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		flushSync();
		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: 'The owner keeps Admin' }]);
		expect(String(actionFetch.mock.calls[0][1]?.body)).toBe(
			'permission_level=4&email=bob%40example.com&location_id=8'
		);
		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(invalidateAll).not.toHaveBeenCalled();
		expect(editing(15)).toBe(true);
	});

	it('explains a refusal without a message with its own', async () => {
		const view = render();
		await editRow(14);

		for (const [index, data] of [{}, { message: '  ' }, { message: 42 }, undefined].entries()) {
			answer({ type: 'failure', status: 400, data });
			byId('location-edit-permissions-row-14-save-button')!.click();
			await vi.waitFor(() => expect(view.toasts()).toHaveLength(index + 1));
		}

		expect(view.toasts()).toMatchObject(
			Array(4).fill({ tone: 'danger', message: m.locations_user_permission_level_update_failed() })
		);
		expect(editing(14)).toBe(true);
	});

	it('keeps the row editable and explains a request that failed on the way', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		actionFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
		// An answer that is not an ActionResult (e.g. a proxy's HTML error page).
		actionFetch.mockResolvedValueOnce(new Response('<h1>Bad gateway</h1>', { status: 502 }));
		const view = render();
		await editRow(15);

		byId('location-edit-permissions-row-15-save-button')!.click();
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		byId('location-edit-permissions-row-15-save-button')!.click();
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(2));
		flushSync();

		expect(view.toasts()).toMatchObject([
			{ tone: 'danger', message: m.locations_user_permission_level_update_failed() },
			{ tone: 'danger', message: m.locations_user_permission_level_update_failed() }
		]);
		expect(consoleError).toHaveBeenCalledWith(
			'Error updating permission level:',
			expect.any(TypeError)
		);
		expect(consoleError).toHaveBeenCalledWith(
			'Error updating permission level:',
			expect.any(SyntaxError)
		);
		expect(forms.applyAction).not.toHaveBeenCalled();
		expect(invalidateAll).not.toHaveBeenCalled();
		expect(editing(15)).toBe(true);
	});

	it('lets SvelteKit apply a redirect or an error result, without a toast of its own', async () => {
		const view = render();
		await editRow(14);

		const redirect = { type: 'redirect', status: 303, location: '/auth/login' };
		answer(redirect);
		byId('location-edit-permissions-row-14-save-button')!.click();
		await vi.waitFor(() => expect(forms.applyAction).toHaveBeenCalledWith(redirect));

		const error = { type: 'error', status: 500, error: { message: 'Internal Error' } };
		answer(error);
		byId('location-edit-permissions-row-14-save-button')!.click();
		await vi.waitFor(() => expect(forms.applyAction).toHaveBeenCalledWith(error));

		expect(view.toasts()).toEqual([]);
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('cancels editing without saving', async () => {
		render();
		await editRow(14);
		expect(byId('location-edit-permissions-row-14-level-select')).not.toBeNull();

		byId('location-edit-permissions-row-14-cancel-button')!.click();
		flushSync();

		expect(byId('location-edit-permissions-row-14-level-select')).toBeNull();
		expect(byId('location-edit-permissions-row-14-edit-button')).not.toBeNull();
		expect(actionFetch).not.toHaveBeenCalled();
	});

	it('asks before removing the grant being edited', async () => {
		render();
		// The table has a dialog of its own (column settings): find the confirmation's.
		const dialog = () =>
			byId('location-delete-permission-confirm-button')!.closest('dialog') as HTMLDialogElement;
		expect(dialog().open).toBe(false);
		await editRow(14);

		byId('location-edit-permissions-row-14-delete-button')!.click();
		flushSync();

		expect(dialog().open).toBe(true);
		expect(dialog().textContent).toContain(
			m.locations_confirm_delete_permission_body({ email: 'ada@example.com' })
		);

		// Cancelling in the dialog reaches this component, so delete can ask again.
		byId('location-delete-permission-cancel-button')!.click();
		flushSync();
		expect(dialog().open).toBe(false);
		byId('location-edit-permissions-row-14-delete-button')!.click();
		flushSync();
		expect(dialog().open).toBe(true);
	});

	it('shows an empty table when nobody else has access', async () => {
		render([]);

		await expect.poll(() => view?.target.textContent).toContain(m.cwui_table_empty());
		expect(view?.target.querySelector('[id$="-edit-button"]')).toBeNull();
	});
});
