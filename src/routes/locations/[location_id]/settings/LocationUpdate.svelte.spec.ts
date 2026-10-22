import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import LocationUpdate from './LocationUpdate.svelte';

type Submit = (input: Record<string, unknown>) => unknown;

const { invalidateAll, forms } = vi.hoisted(() => ({
	invalidateAll: vi.fn(),
	forms: { submit: null as Submit | null, applyAction: vi.fn() }
}));
vi.mock('$app/navigation', () => ({ invalidateAll }));
// `use:enhance` hands its submit function to the mock; tests run it the way
// SvelteKit does on submit, with the action result of their choosing.
vi.mock('$app/forms', () => ({
	applyAction: forms.applyAction,
	enhance: (_form: HTMLFormElement, submit: Submit) => {
		forms.submit = submit;
		return { destroy: () => {} };
	}
}));

type Data = { locationId: number; locationName: string | null; locationGroup: string | null };

let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	initial: Data = { locationId: 8, locationName: 'Greenhouse A', locationGroup: 'Farm' }
) {
	let data = $state.raw(initial);
	view = renderWithServices(LocationUpdate, {
		props: {
			get data() {
				return data;
			}
		}
	});
	return {
		...view,
		/** What `invalidateAll` hands the page: freshly loaded data. */
		setData(next: Data) {
			data = next;
			flushSync();
		}
	};
}

const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const saveButton = () =>
	document.getElementById('location-update-save-button') as HTMLButtonElement;

function type(id: string, value: string) {
	input(id).value = value;
	input(id).dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/** Runs the enhance submit function; returns its result callback (if it did not cancel). */
function submit() {
	if (!forms.submit) throw new Error('the form is not enhanced');
	const cancel = vi.fn();
	const callback = forms.submit({ cancel, formData: new FormData() }) as
		| ((input: { result: ActionResult }) => Promise<void>)
		| undefined;
	flushSync();
	return { cancel, callback };
}

afterEach(() => {
	view?.unmount();
	view = null;
	forms.submit = null;
	forms.applyAction.mockReset();
	invalidateAll.mockReset();
});

describe('LocationUpdate', () => {
	it('shows the saved name and group, and saves only a real change', () => {
		render();

		expect(document.body.textContent).toContain(m.locations_settings_title());
		expect(input('location-update-name-input').value).toBe('Greenhouse A');
		expect(input('location-update-group-input').value).toBe('Farm');
		expect(input('location-update-location-id-input').value).toBe('8');
		expect(saveButton().disabled).toBe(true);

		type('location-update-name-input', 'Greenhouse B');
		expect(saveButton().disabled).toBe(false);
		type('location-update-name-input', ' Greenhouse A ');
		expect(saveButton().disabled).toBe(true);
		type('location-update-group-input', 'North');
		expect(saveButton().disabled).toBe(false);
		type('location-update-name-input', '  ');
		expect(saveButton().disabled).toBe(true);
	});

	it('starts blank when the location has no name or group yet', () => {
		render({ locationId: 8, locationName: null, locationGroup: null });

		expect(input('location-update-name-input').value).toBe('');
		expect(input('location-update-group-input').value).toBe('');
	});

	it('does not submit an unchanged form', () => {
		render();

		const { cancel, callback } = submit();

		expect(cancel).toHaveBeenCalled();
		expect(callback).toBeUndefined();
	});

	it('saves, toasts the success and reloads the page data', async () => {
		const view = render();
		type('location-update-name-input', 'Greenhouse B');
		const { cancel, callback } = submit();
		expect(cancel).not.toHaveBeenCalled();
		expect(saveButton().getAttribute('aria-busy')).toBe('true');

		const result: ActionResult = {
			type: 'success',
			status: 200,
			data: { action: 'updateLocationName', success: true, message: ' Name updated ' }
		};
		await callback?.({ result });
		flushSync();

		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(view.toasts()).toMatchObject([{ tone: 'success', message: 'Name updated' }]);
		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(saveButton().getAttribute('aria-busy')).toBeNull();
	});

	it('keeps an unsaved edit when another card reloads the page data', () => {
		const page = render();
		type('location-update-name-input', 'Greenhouse B');
		type('location-update-group-input', 'North');

		// e.g. a permission was just added: same location, freshly loaded.
		page.setData({ locationId: 8, locationName: 'Greenhouse A', locationGroup: 'Farm' });

		expect(input('location-update-name-input').value).toBe('Greenhouse B');
		expect(input('location-update-group-input').value).toBe('North');
		expect(saveButton().disabled).toBe(false);
	});

	it('shows the saved values from the reloaded data once the save succeeded', async () => {
		const page = render();
		type('location-update-name-input', '  Greenhouse B ');
		invalidateAll.mockImplementation(async () =>
			page.setData({ locationId: 8, locationName: 'Greenhouse B', locationGroup: 'Farm' })
		);

		await submit().callback?.({
			result: { type: 'success', status: 200, data: { message: 'Name updated' } }
		});
		flushSync();

		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(input('location-update-name-input').value).toBe('Greenhouse B');
		expect(input('location-update-group-input').value).toBe('Farm');
		expect(saveButton().disabled).toBe(true);
	});

	it('toasts a refusal in red and keeps the data', async () => {
		const view = render();
		type('location-update-group-input', 'North');

		await submit().callback?.({
			result: { type: 'failure', status: 403, data: { message: 'Not allowed' } }
		});

		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: 'Not allowed' }]);
		expect(invalidateAll).not.toHaveBeenCalled();
		expect(input('location-update-group-input').value).toBe('North');
		expect(saveButton().disabled).toBe(false);
	});

	it('stays quiet for results without a message', async () => {
		const view = render();
		type('location-update-group-input', 'North');

		await submit().callback?.({ result: { type: 'failure', status: 400, data: {} } });
		await submit().callback?.({ result: { type: 'redirect', status: 303, location: '/x' } });
		await submit().callback?.({ result: { type: 'error', error: new Error('boom') } });
		// Last: a success re-seeds the form from the (here unchanged) data, leaving nothing to save.
		await submit().callback?.({ result: { type: 'success', status: 200, data: { message: ' ' } } });

		expect(view.toasts()).toEqual([]);
		expect(forms.applyAction).toHaveBeenCalledTimes(4);
		expect(invalidateAll).toHaveBeenCalledTimes(1);
	});

	it('can save again after applying a result failed', async () => {
		render();
		type('location-update-group-input', 'North');
		forms.applyAction.mockRejectedValue(new Error('navigation failed'));

		await expect(
			submit().callback?.({ result: { type: 'success', status: 200, data: {} } })
		).rejects.toThrow('navigation failed');
		flushSync();

		expect(saveButton().getAttribute('aria-busy')).toBeNull();
		expect(saveButton().disabled).toBe(false);
	});
});
