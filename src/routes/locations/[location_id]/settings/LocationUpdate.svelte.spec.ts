import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '$app/forms';
import { m } from '#lib/paraglide/messages.js';
import type { GroupDto } from '#lib/api/api.dtos.ts';
import { chooseOption, dropdown } from '#lib/testing/dropdown.ts';
import { addGroup, deleteGroup, renameGroup } from '#lib/testing/groups.ts';
import { createMockServices } from '#lib/testing/mock-services.ts';
import { renderWithServices } from '#lib/testing/render.ts';
import LocationUpdate from './LocationUpdate.svelte';

type Submit = (input: Record<string, unknown>) => unknown;

const { refreshAll, forms } = vi.hoisted(() => ({
	refreshAll: vi.fn(),
	forms: { submit: null as Submit | null, applyAction: vi.fn() }
}));
vi.mock('$app/navigation', () => ({ refreshAll }));
// `use:enhance` hands its submit function to the mock; tests run it the way
// SvelteKit does on submit, with the action result of their choosing.
vi.mock('$app/forms', () => ({
	applyAction: forms.applyAction,
	enhance: (_form: HTMLFormElement, submit: Submit) => {
		forms.submit = submit;
		return { destroy: () => {} };
	}
}));

type Data = {
	locationId: number;
	locationName: string | null;
	locationGroup: string | null;
	locationGroups?: GroupDto[];
	locationOrgId?: string | null;
};

const GROUPS: GroupDto[] = [
	{ id: 1, name: 'Farm', org_id: 'org-1', can_manage: true },
	{ id: 2, name: 'North', org_id: 'org-1', can_manage: false }
];

let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	initial: Data = {
		locationId: 8,
		locationName: 'Greenhouse A',
		locationGroup: 'Farm',
		locationGroups: GROUPS,
		locationOrgId: 'org-1'
	}
) {
	let data = $state.raw(initial);
	const services = createMockServices();
	view = renderWithServices(LocationUpdate, {
		services,
		props: {
			get data() {
				return data;
			}
		}
	});
	return {
		...view,
		services,
		/** What `refreshAll` hands the page: freshly loaded data. */
		setData(next: Data) {
			data = next;
			flushSync();
		}
	};
}

const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const GROUP_SELECT = 'location-update-group-select';
const group = () => dropdown(GROUP_SELECT).value();
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
		((input: { result: ActionResult }) => Promise<void>) | undefined;
	flushSync();
	return { cancel, callback };
}

afterEach(() => {
	view?.unmount();
	view = null;
	forms.submit = null;
	forms.applyAction.mockReset();
	refreshAll.mockReset();
});

describe('LocationUpdate', () => {
	it('shows the saved name and group, and saves only a real change', () => {
		render();

		expect(document.body.textContent).toContain(m.locations_settings_title());
		expect(input('location-update-name-input').value).toBe('Greenhouse A');
		expect(group()).toBe('Farm');
		expect(dropdown(GROUP_SELECT).options()).toEqual([m.groups_none(), 'Farm', 'North']);
		expect(input('location-update-location-id-input').value).toBe('8');
		expect(saveButton().disabled).toBe(true);

		type('location-update-name-input', 'Greenhouse B');
		expect(saveButton().disabled).toBe(false);
		type('location-update-name-input', ' Greenhouse A ');
		expect(saveButton().disabled).toBe(true);
		chooseOption(GROUP_SELECT, 'North');
		expect(saveButton().disabled).toBe(false);
		type('location-update-name-input', '  ');
		expect(saveButton().disabled).toBe(true);
	});

	it('starts blank when the location has no name or group yet', () => {
		render({ locationId: 8, locationName: null, locationGroup: null });

		expect(input('location-update-name-input').value).toBe('');
		expect(group()).toBe('');
		expect(dropdown(GROUP_SELECT).label()).toBe(m.groups_none());
	});

	it('can clear the group, and keeps the dialogs outside the form', () => {
		render();

		chooseOption(GROUP_SELECT, m.groups_none());

		expect(group()).toBe('');
		expect(saveButton().disabled).toBe(false);
		expect(document.querySelector('#location-update-form dialog')).toBeNull();
		expect(document.querySelectorAll('dialog.cw-dialog')).toHaveLength(2);
	});

	it('selects a group added in the dialog', async () => {
		const view = render();
		view.services.locationGroups.createGroup.mockResolvedValue({
			id: 9,
			name: 'South',
			org_id: 'org-1',
			can_manage: true
		});

		addGroup(GROUP_SELECT, 'South');
		await vi.waitFor(() => expect(group()).toBe('South'));

		// Added to the location's organization.
		expect(view.services.locationGroups.createGroup).toHaveBeenCalledWith('South', 'org-1');
		expect(saveButton().disabled).toBe(false);
	});

	it('offers no new groups without the location organization', () => {
		render({ locationId: 8, locationName: 'A', locationGroup: 'Farm', locationGroups: GROUPS });

		expect(document.getElementById(`${GROUP_SELECT}-add`)).toBeNull();
		expect(group()).toBe('Farm');
	});

	it('follows a rename of the saved group and re-seeds the list from the reload', async () => {
		const page = render();
		page.services.locationGroups.renameGroup.mockResolvedValue({
			id: 1,
			name: 'Fields',
			org_id: 'org-1',
			can_manage: true
		});
		refreshAll.mockImplementation(async () =>
			page.setData({
				locationId: 8,
				locationName: 'Greenhouse A',
				locationGroup: 'Fields',
				locationGroups: [
					{ id: 1, name: 'Fields', org_id: 'org-1', can_manage: true },
					{ id: 2, name: 'North', org_id: 'org-1', can_manage: false },
					{ id: 4, name: 'South', org_id: 'org-1', can_manage: true }
				],
				locationOrgId: 'org-1'
			})
		);

		renameGroup(GROUP_SELECT, 'Farm', 'Fields');

		await vi.waitFor(() => expect(group()).toBe('Fields'));
		expect(refreshAll).toHaveBeenCalledTimes(1);
		expect(dropdown(GROUP_SELECT).options()).toEqual([m.groups_none(), 'Fields', 'North', 'South']);
		// The API already saved the rename: nothing left to save.
		expect(saveButton().disabled).toBe(true);
	});

	it('shows the location without a group after its group is deleted', async () => {
		const page = render();
		page.services.locationGroups.deleteGroup.mockResolvedValue(undefined);
		refreshAll.mockImplementation(async () =>
			page.setData({
				locationId: 8,
				locationName: 'Greenhouse A',
				locationGroup: '',
				locationGroups: [GROUPS[1]],
				locationOrgId: 'org-1'
			})
		);

		deleteGroup(GROUP_SELECT, 'Farm');

		await vi.waitFor(() => expect(group()).toBe(''));
		expect(dropdown(GROUP_SELECT).options()).toEqual([m.groups_none(), 'North']);
		expect(saveButton().disabled).toBe(true);
	});

	it('follows a rename of an unsaved group choice', async () => {
		const managed: GroupDto[] = [
			{ id: 1, name: 'Farm', org_id: 'org-1', can_manage: true },
			{ id: 2, name: 'North', org_id: 'org-1', can_manage: true }
		];
		const page = render({
			locationId: 8,
			locationName: 'Greenhouse A',
			locationGroup: 'Farm',
			locationGroups: managed,
			locationOrgId: 'org-1'
		});
		page.services.locationGroups.renameGroup.mockResolvedValue({ ...managed[1], name: 'Northern' });
		refreshAll.mockImplementation(async () =>
			page.setData({
				locationId: 8,
				locationName: 'Greenhouse A',
				locationGroup: 'Farm',
				locationGroups: [managed[0], { ...managed[1], name: 'Northern' }],
				locationOrgId: 'org-1'
			})
		);
		chooseOption(GROUP_SELECT, 'North');

		renameGroup(GROUP_SELECT, 'North', 'Northern');

		await vi.waitFor(() => expect(group()).toBe('Northern'));
		expect(dropdown(GROUP_SELECT).options()).toEqual([m.groups_none(), 'Farm', 'Northern']);
		expect(saveButton().disabled).toBe(false);
	});

	it('shows what the API has saved after a group change when the choice was untouched', async () => {
		const managed: GroupDto[] = [
			{ id: 1, name: 'Farm', org_id: 'org-1', can_manage: true },
			{ id: 2, name: 'North', org_id: 'org-1', can_manage: true }
		];
		const page = render({
			locationId: 8,
			locationName: 'Greenhouse A',
			locationGroup: 'Farm',
			locationGroups: managed,
			locationOrgId: 'org-1'
		});
		page.services.locationGroups.renameGroup.mockResolvedValue({ ...managed[1], name: 'Northern' });
		// Meanwhile the location was moved to another group elsewhere: the reload has it.
		refreshAll.mockImplementation(async () =>
			page.setData({
				locationId: 8,
				locationName: 'Greenhouse A',
				locationGroup: 'Northern',
				locationGroups: [managed[0], { ...managed[1], name: 'Northern' }],
				locationOrgId: 'org-1'
			})
		);

		renameGroup(GROUP_SELECT, 'North', 'Northern');

		await vi.waitFor(() => expect(group()).toBe('Northern'));
		expect(saveButton().disabled).toBe(true);
	});

	it('keeps an unsaved group choice when another group is renamed', async () => {
		const managed: GroupDto[] = [
			{ id: 1, name: 'Farm', org_id: 'org-1', can_manage: true },
			{ id: 2, name: 'North', org_id: 'org-1', can_manage: true }
		];
		const page = render({
			locationId: 8,
			locationName: 'Greenhouse A',
			locationGroup: 'Farm',
			locationGroups: managed,
			locationOrgId: 'org-1'
		});
		page.services.locationGroups.renameGroup.mockResolvedValue({ ...managed[0], name: 'Fields' });
		refreshAll.mockImplementation(async () =>
			page.setData({
				locationId: 8,
				locationName: 'Greenhouse A',
				locationGroup: 'Fields',
				locationGroups: [{ ...managed[0], name: 'Fields' }, managed[1]],
				locationOrgId: 'org-1'
			})
		);
		chooseOption(GROUP_SELECT, 'North');

		renameGroup(GROUP_SELECT, 'Farm', 'Fields');

		await vi.waitFor(() => expect(refreshAll).toHaveBeenCalled());
		flushSync();
		expect(group()).toBe('North');
		expect(saveButton().disabled).toBe(false);
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
			location: location.pathname,
			data: { action: 'updateLocationName', success: true, message: ' Name updated ' }
		};
		await callback?.({ result });
		flushSync();

		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(view.toasts()).toMatchObject([{ tone: 'success', message: 'Name updated' }]);
		expect(refreshAll).toHaveBeenCalledTimes(1);
		expect(saveButton().getAttribute('aria-busy')).toBeNull();
	});

	it('keeps an unsaved edit when another card reloads the page data', () => {
		const page = render();
		type('location-update-name-input', 'Greenhouse B');
		chooseOption(GROUP_SELECT, 'North');

		// e.g. a permission was just added: same location, freshly loaded.
		page.setData({
			locationId: 8,
			locationName: 'Greenhouse A',
			locationGroup: 'Farm',
			locationGroups: GROUPS
		});

		expect(input('location-update-name-input').value).toBe('Greenhouse B');
		expect(group()).toBe('North');
		expect(saveButton().disabled).toBe(false);
	});

	it('shows the saved values from the reloaded data once the save succeeded', async () => {
		const page = render();
		type('location-update-name-input', '  Greenhouse B ');
		refreshAll.mockImplementation(async () =>
			page.setData({
				locationId: 8,
				locationName: 'Greenhouse B',
				locationGroup: 'Farm',
				// A save can create a group (a name typed by another client): listed now.
				locationGroups: [...GROUPS, { id: 6, name: 'West', org_id: 'org-1', can_manage: true }],
				locationOrgId: 'org-1'
			})
		);

		await submit().callback?.({
			result: {
				type: 'success',
				status: 200,
				location: location.pathname,
				data: { message: 'Name updated' }
			}
		});
		flushSync();

		expect(refreshAll).toHaveBeenCalledTimes(1);
		expect(input('location-update-name-input').value).toBe('Greenhouse B');
		expect(group()).toBe('Farm');
		expect(dropdown(GROUP_SELECT).options()).toEqual([m.groups_none(), 'Farm', 'North', 'West']);
		expect(saveButton().disabled).toBe(true);
	});

	it('toasts a refusal in red and keeps the data', async () => {
		const view = render();
		chooseOption(GROUP_SELECT, 'North');

		await submit().callback?.({
			result: {
				type: 'failure',
				status: 403,
				location: location.pathname,
				data: { message: 'Not allowed' }
			}
		});

		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: 'Not allowed' }]);
		expect(refreshAll).not.toHaveBeenCalled();
		expect(group()).toBe('North');
		expect(saveButton().disabled).toBe(false);
	});

	it('stays quiet for results without a message', async () => {
		const view = render();
		chooseOption(GROUP_SELECT, 'North');

		await submit().callback?.({
			result: { type: 'failure', status: 400, location: location.pathname, data: {} }
		});
		await submit().callback?.({ result: { type: 'redirect', status: 303, location: '/x' } });
		await submit().callback?.({
			result: { type: 'error', error: { status: 500, message: 'boom' } }
		});
		// Last: a success re-seeds the form from the (here unchanged) data, leaving nothing to save.
		await submit().callback?.({
			result: { type: 'success', status: 200, location: location.pathname, data: { message: ' ' } }
		});

		expect(view.toasts()).toEqual([]);
		expect(forms.applyAction).toHaveBeenCalledTimes(4);
		expect(refreshAll).toHaveBeenCalledTimes(1);
	});

	it('can save again after applying a result failed', async () => {
		render();
		chooseOption(GROUP_SELECT, 'North');
		forms.applyAction.mockRejectedValue(new Error('navigation failed'));

		await expect(
			submit().callback?.({
				result: { type: 'success', status: 200, location: location.pathname, data: {} }
			})
		).rejects.toThrow('navigation failed');
		flushSync();

		expect(saveButton().getAttribute('aria-busy')).toBeNull();
		expect(saveButton().disabled).toBe(false);
	});
});
