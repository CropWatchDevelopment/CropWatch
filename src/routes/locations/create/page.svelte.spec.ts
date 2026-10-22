import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import CreateLocationPage from './+page.svelte';

type Submit = (input: Record<string, unknown>) => unknown;

const { goto, forms } = vi.hoisted(() => ({
	goto: vi.fn(),
	forms: { submit: null as Submit | null, applyAction: vi.fn() }
}));
vi.mock('$app/navigation', () => ({ goto }));
// `use:enhance` hands its submit function to the mock; tests run it the way
// SvelteKit does on submit, with the action result of their choosing.
vi.mock('$app/forms', () => ({
	applyAction: forms.applyAction,
	enhance: (_form: HTMLFormElement, submit: Submit) => {
		forms.submit = submit;
		return { destroy: () => {} };
	}
}));

let view: ReturnType<typeof renderWithServices> | null = null;

function render(form: Record<string, unknown> | null = null) {
	view = renderWithServices(CreateLocationPage, { props: { form, data: {} } as never });
	return view;
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const submitButton = () => byId<HTMLButtonElement>('location-create-submit-button');

function type(id: string, value: string) {
	const input = byId<HTMLInputElement>(id);
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/** Submits through the enhance callback; resolves once the result is handled. */
async function submitWith(result: ActionResult) {
	if (!forms.submit) throw new Error('the form is not enhanced');
	const formElement = byId<HTMLFormElement>('location-create-form');
	const callback = forms.submit({
		action: new URL('http://localhost/locations/create'),
		formData: new FormData(formElement),
		formElement,
		controller: new AbortController(),
		submitter: submitButton(),
		cancel: vi.fn()
	}) as (input: Record<string, unknown>) => Promise<void>;
	flushSync();
	expect(submitButton().getAttribute('aria-busy')).toBe('true');
	await callback({ result, update: vi.fn(), formElement, formData: new FormData(), action: null });
	flushSync();
}

afterEach(() => {
	view?.unmount();
	view = null;
	forms.submit = null;
	forms.applyAction.mockReset();
	goto.mockReset();
});

describe('create location page', () => {
	it('starts empty and needs a name before it can be submitted', () => {
		render();

		expect(byId<HTMLInputElement>('location-create-name-input').value).toBe('');
		expect(document.body.textContent).toContain(m.locations_create_title());
		expect(document.querySelector('.app-notice')).toBeNull();
		expect(submitButton().disabled).toBe(true);

		type('location-create-name-input', '   ');
		expect(submitButton().disabled).toBe(true);
		type('location-create-name-input', 'Barn');
		expect(submitButton().disabled).toBe(false);
	});

	it('posts every field under the name the action reads', () => {
		render();

		type('location-create-name-input', 'Barn');
		type('location-create-description-input', 'North side');
		type('location-create-group-input', 'Farm');
		type('location-create-lat-input', '31.9');
		type('location-create-long-input', '131.4');

		const posted = new FormData(byId<HTMLFormElement>('location-create-form'));
		expect(Object.fromEntries(posted)).toEqual({
			name: 'Barn',
			description: 'North side',
			group: 'Farm',
			lat: '31.9',
			long: '131.4'
		});
		expect(byId<HTMLFormElement>('location-create-form').method).toBe('post');
	});

	it('shows the error and keeps every field after a failed submit', () => {
		render({
			error: 'Latitude must be a number',
			name: 'Barn',
			description: 'North side',
			group: 'Farm',
			lat: 'north',
			long: '131.4'
		});

		expect(document.querySelector('.app-notice--danger')?.textContent?.trim()).toBe(
			'Latitude must be a number'
		);
		expect(
			[
				'location-create-name-input',
				'location-create-description-input',
				'location-create-group-input',
				'location-create-lat-input',
				'location-create-long-input'
			].map((id) => byId<HTMLInputElement>(id).value)
		).toEqual(['Barn', 'North side', 'Farm', 'north', '131.4']);
	});

	it('opens the new location once it is created', async () => {
		const result: ActionResult = {
			type: 'success',
			status: 200,
			data: { success: true, location_id: 42 }
		};
		render();

		await submitWith(result);

		expect(goto).toHaveBeenCalledWith('/locations/42', { invalidateAll: true });
		expect(forms.applyAction).not.toHaveBeenCalled();
		expect(submitButton().getAttribute('aria-busy')).toBeNull();
	});

	it('applies a success that carries no usable id instead of navigating', async () => {
		const result: ActionResult = { type: 'success', status: 200, data: { location_id: '42' } };
		const view = render();

		await submitWith(result);

		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(goto).not.toHaveBeenCalled();
		expect(view.toasts()).toEqual([]);
	});

	it("applies a failure and toasts the action's error", async () => {
		const result: ActionResult = {
			type: 'failure',
			status: 409,
			data: { error: 'Name taken', name: 'Barn' }
		};
		const view = render();

		await submitWith(result);

		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: 'Name taken' }]);
	});

	it('only applies a failure without an error text, or an unexpected error', async () => {
		const view = render();

		await submitWith({ type: 'failure', status: 500, data: {} });
		await submitWith({ type: 'error', status: 500, error: new Error('boom') });

		expect(forms.applyAction).toHaveBeenCalledTimes(2);
		expect(view.toasts()).toEqual([]);
		expect(goto).not.toHaveBeenCalled();
	});

	it('goes back to the list from the back and cancel buttons', () => {
		render();

		byId<HTMLButtonElement>('location-create-back-button').click();
		byId<HTMLButtonElement>('location-create-cancel-button').click();

		expect(goto.mock.calls).toEqual([['/locations'], ['/locations']]);
		expect(document.body.textContent).toContain(m.action_back());
		expect(document.body.textContent).toContain(m.action_cancel());
	});
});
