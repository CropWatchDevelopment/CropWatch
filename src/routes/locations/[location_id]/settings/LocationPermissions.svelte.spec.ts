import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import LocationPermissions from './LocationPermissions.svelte';

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

let view: ReturnType<typeof renderWithServices> | null = null;

const render = () =>
	(view = renderWithServices(LocationPermissions, {
		props: { data: { locationName: 'Greenhouse A' } }
	}));

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const email = () => byId<HTMLInputElement>('location-permissions-email-input');
const addButton = () => byId<HTMLButtonElement>('location-permissions-add-button');
const levelValue = () =>
	(document.querySelector('input[name="permission_level"]') as HTMLInputElement).value;
const applyToAll = () => byId<HTMLInputElement>('location-permissions-apply-all-input').value;

function typeEmail(value: string) {
	email().value = value;
	email().dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/** Runs the enhance submit function and returns its result callback. */
function submit() {
	if (!forms.submit) throw new Error('the form is not enhanced');
	const callback = forms.submit({ cancel: vi.fn(), formData: new FormData() }) as (input: {
		result: ActionResult;
	}) => Promise<void>;
	flushSync();
	return callback;
}

afterEach(() => {
	view?.unmount();
	view = null;
	forms.submit = null;
	forms.applyAction.mockReset();
	invalidateAll.mockReset();
});

describe('LocationPermissions', () => {
	it('offers Admin for every device by default, once an email is typed', () => {
		render();

		expect(document.body.textContent).toContain(
			m.locations_add_user_permissions_title({ name: 'Greenhouse A' })
		);
		expect(levelValue()).toBe('1');
		expect(byId('location-permissions-level-select').textContent).toContain(
			m.permission_level_admin()
		);
		expect(applyToAll()).toBe('true');
		expect(addButton().disabled).toBe(true);

		typeEmail('  ');
		expect(addButton().disabled).toBe(true);
		typeEmail('ada@example.com');
		expect(addButton().disabled).toBe(false);
	});

	it("labels the email field and the add button's icon in the user's language", () => {
		render();

		expect(email().placeholder).toBe(m.locations_permission_email_placeholder());
		const icon = addButton().querySelector('.cw-icon');
		expect(icon?.getAttribute('role')).toBe('img');
		expect(icon?.getAttribute('aria-label')).toBe(m.locations_add_user_icon_alt());
	});

	it('picks another level and limits the grant to this location', () => {
		render();

		byId<HTMLButtonElement>('location-permissions-level-select').click();
		flushSync();
		const viewer = [...document.querySelectorAll('[role="option"]')].find(
			(option) => option.textContent?.trim() === m.permission_level_viewer()
		) as HTMLElement;
		viewer.click();
		flushSync();
		byId<HTMLInputElement>('location-permissions-apply-all-switch').click();
		flushSync();

		expect(levelValue()).toBe('4');
		expect(applyToAll()).toBe('false');
	});

	it('adds the grant, toasts, clears the email and reloads the data', async () => {
		const view = render();
		typeEmail('ada@example.com');
		const callback = submit();
		expect(addButton().getAttribute('aria-busy')).toBe('true');

		const result: ActionResult = {
			type: 'success',
			status: 200,
			data: { action: 'addPermission', message: ' Permission created ' }
		};
		await callback({ result });
		flushSync();

		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(view.toasts()).toMatchObject([{ tone: 'success', message: 'Permission created' }]);
		expect(email().value).toBe('');
		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(addButton().getAttribute('aria-busy')).toBeNull();
	});

	it('toasts a refusal in red and keeps the email', async () => {
		const view = render();
		typeEmail('ada@example.com');

		await submit()({ result: { type: 'failure', status: 404, data: { message: 'No such user' } } });
		flushSync();

		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: 'No such user' }]);
		expect(email().value).toBe('ada@example.com');
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('stays quiet for results without a message', async () => {
		const view = render();
		typeEmail('ada@example.com');

		await submit()({ result: { type: 'failure', status: 400, data: { message: 42 } } });
		await submit()({ result: { type: 'error', error: new Error('boom') } });

		expect(view.toasts()).toEqual([]);
		expect(forms.applyAction).toHaveBeenCalledTimes(2);
	});

	it('can add again after applying a result failed', async () => {
		render();
		typeEmail('ada@example.com');
		forms.applyAction.mockRejectedValue(new Error('navigation failed'));

		await expect(submit()({ result: { type: 'success', status: 200 } })).rejects.toThrow(
			'navigation failed'
		);
		flushSync();

		expect(addButton().getAttribute('aria-busy')).toBeNull();
		expect(addButton().disabled).toBe(false);
	});
});
