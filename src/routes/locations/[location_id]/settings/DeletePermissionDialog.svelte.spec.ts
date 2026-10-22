import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import DeletePermissionDialog from './DeletePermissionDialog.svelte';
import type { PermissionRow } from './location-permission-rows';

const { invalidateAll, forms } = vi.hoisted(() => ({
	invalidateAll: vi.fn(),
	forms: { applyAction: vi.fn(), deserialize: vi.fn((text: string) => JSON.parse(text)) }
}));
vi.mock('$app/navigation', () => ({ invalidateAll }));
vi.mock('$app/forms', () => ({ applyAction: forms.applyAction, deserialize: forms.deserialize }));

const ADA: PermissionRow = { id: 14, email: 'ada@example.com', name: 'Ada', permission_level: '2' };

/** The settings page's own form action, answered with an ActionResult body. */
const actionFetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
const answer = (result: unknown) =>
	actionFetch.mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));

let view: ReturnType<typeof renderWithServices> | null = null;

function render(props: Record<string, unknown> = {}) {
	view = renderWithServices(DeletePermissionDialog, {
		props: { location_id: '8', openDeletePermissionDialog: true, selectedRow: ADA, ...props }
	});
	flushSync();
	return view;
}

const dialog = () => document.querySelector('dialog.cw-dialog') as HTMLDialogElement;
const confirmButton = () =>
	document.getElementById('location-delete-permission-confirm-button') as HTMLButtonElement;
const sentFields = (call = 0) =>
	[...((actionFetch.mock.calls[call]?.[1]?.body as FormData | undefined)?.entries() ?? [])].map(
		([name, value]) => [name, String(value)]
	);

beforeEach(() => {
	vi.stubGlobal('fetch', actionFetch);
});

afterEach(() => {
	view?.unmount();
	view = null;
	actionFetch.mockReset();
	forms.applyAction.mockReset();
	forms.deserialize.mockClear();
	invalidateAll.mockReset();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('DeletePermissionDialog', () => {
	it("asks to confirm removing the selected user's access", () => {
		render();

		expect(dialog().open).toBe(true);
		expect(dialog().textContent).toContain(m.locations_confirm_delete_permission_title());
		expect(dialog().textContent).toContain(
			m.locations_confirm_delete_permission_body({ email: 'ada@example.com' })
		);
	});

	it("closes from the dialog's own close button", () => {
		render();

		(dialog().querySelector('.cw-dialog__close') as HTMLButtonElement).click();
		flushSync();

		expect(dialog().open).toBe(false);
	});

	it('closes on cancel without removing anything', () => {
		render();

		(document.getElementById('location-delete-permission-cancel-button') as HTMLElement).click();
		flushSync();

		expect(dialog().open).toBe(false);
		expect(actionFetch).not.toHaveBeenCalled();
	});

	it('removes the grant through the settings action, then reloads and closes', async () => {
		const result = { type: 'success', status: 200, data: { message: ' Permission removed ' } };
		answer(result);
		const view = render();

		confirmButton().click();

		await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
		flushSync();
		expect(actionFetch).toHaveBeenCalledWith('?/removePermission', {
			method: 'POST',
			body: expect.any(FormData)
		});
		expect(sentFields()).toEqual([
			['location_id', '8'],
			['permission_id', '14']
		]);
		expect(forms.deserialize).toHaveBeenCalledWith(JSON.stringify(result));
		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(view.toasts()).toMatchObject([{ tone: 'success', message: 'Permission removed' }]);
		expect(dialog().open).toBe(false);
	});

	it('keeps the dialog open and toasts a refusal', async () => {
		answer({ type: 'failure', status: 403, data: { message: 'Not allowed' } });
		const view = render();

		confirmButton().click();

		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		flushSync();
		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: 'Not allowed' }]);
		expect(invalidateAll).not.toHaveBeenCalled();
		expect(dialog().open).toBe(true);
		expect(confirmButton().disabled).toBe(false);
	});

	it('toasts nothing for results without a message', async () => {
		const view = render();
		const results = [
			{ type: 'failure', status: 400 },
			{ type: 'failure', status: 400, data: 'refused' },
			{ type: 'redirect', status: 303, location: '/locations' },
			{ type: 'success', status: 200, data: { message: '' } }
		];

		for (const [index, result] of results.entries()) {
			answer(result);
			confirmButton().click();
			await vi.waitFor(() => expect(forms.applyAction).toHaveBeenCalledTimes(index + 1));
			await vi.waitFor(() => expect(confirmButton().disabled).toBe(false));
		}

		expect(view.toasts()).toEqual([]);
		// Only the success reloads and closes.
		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(dialog().open).toBe(false);
	});

	it('toasts the translated failure when the request itself fails', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		actionFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
		actionFetch.mockRejectedValueOnce({});
		const view = render();

		confirmButton().click();
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(1));
		flushSync();
		confirmButton().click();
		await vi.waitFor(() => expect(view.toasts()).toHaveLength(2));

		// Never the browser's own "Failed to fetch".
		expect(view.toasts()).toMatchObject([
			{ tone: 'danger', message: m.locations_delete_permission_failed() },
			{ tone: 'danger', message: m.locations_delete_permission_failed() }
		]);
		expect(consoleError).toHaveBeenCalledWith('Error deleting permission:', expect.any(TypeError));
		expect(forms.applyAction).not.toHaveBeenCalled();
		expect(dialog().open).toBe(true);
	});

	it('sends one removal at a time', async () => {
		let respond!: (response: Response) => void;
		actionFetch.mockReturnValue(new Promise((resolve) => (respond = resolve)));
		render();

		confirmButton().click();
		flushSync();
		expect(confirmButton().disabled).toBe(true);
		expect(confirmButton().getAttribute('aria-busy')).toBe('true');
		confirmButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));

		respond(new Response(JSON.stringify({ type: 'success', status: 200 }), { status: 200 }));
		await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalled());
		expect(actionFetch).toHaveBeenCalledTimes(1);
	});

	it('sends empty ids when nothing is selected', async () => {
		answer({ type: 'failure', status: 400, data: { message: 'Pick a user' } });
		render({ location_id: undefined, selectedRow: null });
		expect(dialog().textContent).toContain(
			m.locations_confirm_delete_permission_body({ email: '' })
		);

		confirmButton().click();

		await vi.waitFor(() => expect(actionFetch).toHaveBeenCalled());
		expect(sentFields()).toEqual([
			['location_id', ''],
			['permission_id', '']
		]);
	});
});
