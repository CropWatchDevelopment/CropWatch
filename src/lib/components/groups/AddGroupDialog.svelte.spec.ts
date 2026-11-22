import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GroupDto } from '$lib/api/api.dtos';
import { ApiError } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import AddGroupDialog from './AddGroupDialog.svelte';
import { GroupsController, type GroupKind } from './groups-controller.svelte';

let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	options: { kind?: GroupKind; groups?: GroupDto[]; value?: string; open?: boolean } = {}
) {
	const services: MockServices = createMockServices();
	const onError = vi.fn();
	const onSuccess = vi.fn();
	const controller = new GroupsController({
		kind: options.kind ?? 'location',
		repository: services.locationGroups,
		orgId: 'org-1',
		initial: options.groups ?? [{ id: 1, name: 'Barn', org_id: 'org-1', can_manage: true }],
		onError,
		onSuccess
	});
	controller.addOpen = options.open ?? true;
	let value = $state(options.value ?? '');
	view = renderWithServices(AddGroupDialog, {
		services,
		props: {
			controller,
			get value() {
				return value;
			},
			set value(next: string) {
				value = next;
			}
		}
	} as never);
	flushSync();
	return { controller, services, onError, onSuccess, value: () => value };
}

const dialog = () => document.querySelector<HTMLDialogElement>('dialog.cw-dialog');
const nameInput = () => dialog()?.querySelector('input') as HTMLInputElement;
const addButton = () =>
	dialog()?.querySelector<HTMLButtonElement>('button[type="submit"]') as HTMLButtonElement;
const buttonLabelled = (label: string) =>
	[...(dialog()?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
		(button) => button.textContent?.trim() === label
	) as HTMLButtonElement;

function typeName(value: string) {
	nameInput().value = value;
	nameInput().dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('AddGroupDialog', () => {
	it('is titled by its pool and needs a name', () => {
		render();

		expect(dialog()?.open).toBe(true);
		expect(dialog()?.textContent).toContain(m.groups_add_title_location());
		expect(dialog()?.textContent).toContain(m.groups_add_hint());
		expect(addButton().textContent).toContain(m.groups_add_submit());
		expect(addButton().disabled).toBe(true);
		typeName('   ');
		expect(addButton().disabled).toBe(true);
		view?.unmount();

		render({ kind: 'device' });
		expect(dialog()?.textContent).toContain(m.groups_add_title_device());
	});

	it('adds the group, selects it and closes', async () => {
		const page = render({ value: 'Barn' });
		page.services.locationGroups.createGroup.mockResolvedValue({
			id: 2,
			name: 'Orchard',
			org_id: 'org-1',
			can_manage: true
		});

		typeName('  Orchard ');
		addButton().click();
		await vi.waitFor(() => expect(page.controller.addOpen).toBe(false));
		flushSync();

		expect(page.services.locationGroups.createGroup).toHaveBeenCalledWith('Orchard', 'org-1');
		expect(page.value()).toBe('Orchard');
		expect(page.onSuccess).toHaveBeenCalledWith(m.groups_created({ name: 'Orchard' }));
		expect(dialog()?.open).toBe(false);
		// Opened again, it starts empty.
		page.controller.addOpen = true;
		flushSync();
		expect(nameInput().value).toBe('');
	});

	it('adds on Enter in the name field', async () => {
		const page = render();
		page.services.locationGroups.createGroup.mockResolvedValue({
			id: 2,
			name: 'Orchard',
			org_id: 'org-1',
			can_manage: true
		});

		typeName('Orchard');
		nameInput().form?.requestSubmit();

		await vi.waitFor(() => expect(page.value()).toBe('Orchard'));
	});

	it('selects a name that is already listed without creating it', async () => {
		const page = render();

		typeName('Barn');
		addButton().click();
		await vi.waitFor(() => expect(page.value()).toBe('Barn'));

		expect(page.services.locationGroups.createGroup).not.toHaveBeenCalled();
		expect(page.onSuccess).toHaveBeenCalledWith(m.groups_exists_selected({ name: 'Barn' }));
	});

	it('stays open with the name when the API refuses it', async () => {
		const page = render({ value: 'Barn' });
		page.services.locationGroups.createGroup.mockRejectedValue(
			new ApiError(403, 'Forbidden', {
				url: '/location-groups',
				payload: { message: 'You cannot add groups here' }
			})
		);

		typeName('Orchard');
		addButton().click();
		await vi.waitFor(() => expect(page.onError).toHaveBeenCalledWith('You cannot add groups here'));
		flushSync();

		expect(page.controller.addOpen).toBe(true);
		expect(nameInput().value).toBe('Orchard');
		expect(page.value()).toBe('Barn');
	});

	it('flags a name longer than 120 characters', () => {
		render();

		typeName('x'.repeat(121));

		expect(dialog()?.textContent).toContain(m.groups_name_too_long({ max: '120' }));
		expect(addButton().disabled).toBe(true);
	});

	it('clears the name when cancelled or closed', () => {
		const page = render();

		typeName('Orchard');
		buttonLabelled(m.action_cancel()).click();
		flushSync();
		expect(page.controller.addOpen).toBe(false);

		page.controller.addOpen = true;
		flushSync();
		expect(nameInput().value).toBe('');

		typeName('Orchard');
		(dialog()?.querySelector('.cw-dialog__close') as HTMLButtonElement).click();
		flushSync();
		expect(page.controller.addOpen).toBe(false);
		page.controller.addOpen = true;
		flushSync();
		expect(nameInput().value).toBe('');
	});
});
