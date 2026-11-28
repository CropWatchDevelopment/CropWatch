import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '$app/forms';
import { m } from '#lib/paraglide/messages.js';
import { chooseOption, dropdown } from '#lib/testing/dropdown.ts';
import { addGroup, addGroupButton, manageGroupsButton, renameGroup } from '#lib/testing/groups.ts';
import { createMockServices } from '#lib/testing/mock-services.ts';
import { renderWithServices } from '#lib/testing/render.ts';
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

const GROUPS = [
	{ id: 1, name: 'Farm', org_id: 'org-1', can_manage: true },
	{ id: 2, name: 'Orchard', org_id: 'org-1', can_manage: false }
];

function render(
	form: Record<string, unknown> | null = null,
	locationGroups = GROUPS,
	orgId: string | null = 'org-1'
) {
	const rendered = renderWithServices(CreateLocationPage, {
		services: createMockServices(),
		props: { form, data: { locationGroups, orgId } } as never
	});
	view = rendered;
	return rendered;
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
		chooseOption('location-create-group-select', 'Farm');
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

	it('offers the groups to pick from, with no group by default, and keeps the dialogs outside the form', () => {
		render();

		expect(dropdown('location-create-group-select').value()).toBe('');
		expect(dropdown('location-create-group-select').options()).toEqual([
			m.groups_none(),
			'Farm',
			'Orchard'
		]);
		expect(manageGroupsButton('location-create-group-select')).not.toBeNull();
		expect(document.querySelector('#location-create-form dialog')).toBeNull();
	});

	it("adds a group to the caller's organization from the dialog and posts it with the new location", async () => {
		const page = render();
		page.services.locationGroups.createGroup.mockResolvedValue({
			id: 9,
			name: 'South',
			org_id: 'org-1',
			can_manage: true
		});

		addGroup('location-create-group-select', 'South');

		await vi.waitFor(() => expect(dropdown('location-create-group-select').value()).toBe('South'));
		expect(page.services.locationGroups.createGroup).toHaveBeenCalledWith('South', 'org-1');
		expect(new FormData(byId<HTMLFormElement>('location-create-form')).getAll('group')).toEqual([
			'South'
		]);
	});

	it('follows a rename of the chosen group made in the manage dialog', async () => {
		const page = render();
		page.services.locationGroups.renameGroup.mockResolvedValue({
			id: 1,
			name: 'Fields',
			org_id: 'org-1',
			can_manage: true
		});
		chooseOption('location-create-group-select', 'Farm');

		renameGroup('location-create-group-select', 'Farm', 'Fields');

		await vi.waitFor(() => expect(dropdown('location-create-group-select').value()).toBe('Fields'));
		expect(page.services.locationGroups.renameGroup).toHaveBeenCalledWith(1, 'Fields');
	});

	it('offers no new groups without an organization to put them in', () => {
		render(null, [], null);

		expect(addGroupButton('location-create-group-select')).toBeNull();
		expect(dropdown('location-create-group-select').options()).toEqual([m.groups_none()]);
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
				'location-create-lat-input',
				'location-create-long-input'
			].map((id) => byId<HTMLInputElement>(id).value)
		).toEqual(['Barn', 'North side', 'north', '131.4']);
		expect(dropdown('location-create-group-select').value()).toBe('Farm');
	});

	it('opens the new location once it is created', async () => {
		const result: ActionResult = {
			type: 'success',
			status: 200,
			location: location.pathname,
			data: { success: true, location_id: 42 }
		};
		render();

		await submitWith(result);

		expect(goto).toHaveBeenCalledWith('/locations/42', { refreshAll: true });
		expect(forms.applyAction).not.toHaveBeenCalled();
		expect(submitButton().getAttribute('aria-busy')).toBeNull();
	});

	it('applies a success that carries no usable id instead of navigating', async () => {
		const result: ActionResult = {
			type: 'success',
			status: 200,
			location: location.pathname,
			data: { location_id: '42' }
		};
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
			location: location.pathname,
			data: { error: 'Name taken', name: 'Barn' }
		};
		const view = render();

		await submitWith(result);

		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: 'Name taken' }]);
	});

	it('only applies a failure without an error text, or an unexpected error', async () => {
		const view = render();

		await submitWith({ type: 'failure', status: 500, location: location.pathname, data: {} });
		await submitWith({ type: 'error', status: 500, error: { status: 500, message: 'boom' } });

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
