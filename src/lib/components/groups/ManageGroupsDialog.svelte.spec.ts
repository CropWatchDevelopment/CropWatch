import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GroupDto } from '#lib/api/api.dtos.ts';
import { m } from '#lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '#lib/testing/mock-services.ts';
import { renderWithServices } from '#lib/testing/render.ts';
import ManageGroupsDialog from './ManageGroupsDialog.svelte';
import { GroupsController, type GroupKind } from './groups-controller.svelte';

const GROUPS: GroupDto[] = [
	{ id: 1, name: 'Barn', org_id: 'org-1', can_manage: true },
	{ id: 2, name: 'Attic', org_id: 'org-1', can_manage: true },
	{ id: 3, name: 'Shared', org_id: 'org-1', can_manage: false }
];

let view: ReturnType<typeof renderWithServices> | null = null;

function render(options: { kind?: GroupKind; groups?: GroupDto[]; value?: string } = {}) {
	const services: MockServices = createMockServices();
	const onError = vi.fn();
	const controller = new GroupsController({
		kind: options.kind ?? 'location',
		repository: services.locationGroups,
		orgId: 'org-1',
		initial: options.groups ?? GROUPS,
		onError,
		onSuccess: () => {}
	});
	controller.manageOpen = true;
	let value = $state(options.value ?? '');
	view = renderWithServices(ManageGroupsDialog, {
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
	return { controller, services, onError, value: () => value };
}

const dialog = () => document.querySelector<HTMLDialogElement>('dialog.cw-dialog');
const rows = () => [...(dialog()?.querySelectorAll<HTMLElement>('li') ?? [])];
const row = (id: number) => dialog()?.querySelector<HTMLElement>(`li[data-group-id="${id}"]`);
const rowNames = () =>
	rows().map((li) => li.querySelector('.manage-groups__name')?.textContent?.trim());
const click = (element: Element | null | undefined) => {
	(element as HTMLElement).click();
	flushSync();
};
const buttonIn = (scope: Element | null | undefined, label: string) =>
	[...(scope?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
		(button) => button.textContent?.trim() === label || button.getAttribute('aria-label') === label
	);

function typeDraft(id: number, value: string) {
	const input = row(id)?.querySelector('input') as HTMLInputElement;
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('ManageGroupsDialog', () => {
	it('lists only the groups the caller manages, sorted', () => {
		render();

		expect(dialog()?.textContent).toContain(m.groups_manage_title_location());
		expect(dialog()?.textContent).toContain(m.groups_manage_hint());
		expect(rowNames()).toEqual(['Attic', 'Barn']);
		expect(buttonIn(row(1), m.groups_rename_aria({ name: 'Barn' }))).toBeDefined();
		expect(buttonIn(row(1), m.groups_delete_aria({ name: 'Barn' }))).toBeDefined();
	});

	it('says so when the caller manages none', () => {
		render({
			kind: 'device',
			groups: [{ id: 3, name: 'Shared', org_id: 'org-1', can_manage: false }]
		});

		expect(dialog()?.textContent).toContain(m.groups_manage_title_device());
		expect(dialog()?.textContent).toContain(m.groups_manage_empty());
		expect(rows()).toHaveLength(0);
	});

	it('renames a group, and the selected value follows it', async () => {
		const page = render({ value: 'Barn' });
		page.services.locationGroups.renameGroup.mockResolvedValue({
			id: 1,
			name: 'Cellar',
			org_id: 'org-1',
			can_manage: true
		});

		click(buttonIn(row(1), m.groups_rename_aria({ name: 'Barn' })));
		expect((row(1)?.querySelector('input') as HTMLInputElement).value).toBe('Barn');
		typeDraft(1, ' Cellar ');
		click(buttonIn(row(1), m.groups_save()));

		await vi.waitFor(() => expect(page.value()).toBe('Cellar'));
		flushSync();
		expect(page.services.locationGroups.renameGroup).toHaveBeenCalledWith(1, 'Cellar');
		expect(rowNames()).toEqual(['Attic', 'Cellar']);
	});

	it('leaves the selected value when another group is renamed or deleted', async () => {
		const page = render({ value: 'Barn' });
		page.services.locationGroups.renameGroup.mockImplementation(async (id, name) => ({
			id,
			name,
			org_id: 'org-1',
			can_manage: true
		}));
		page.services.locationGroups.deleteGroup.mockResolvedValue(undefined);

		click(buttonIn(row(2), m.groups_rename_aria({ name: 'Attic' })));
		typeDraft(2, 'Loft');
		row(2)?.querySelector('form')?.requestSubmit();
		await vi.waitFor(() => expect(rowNames()).toEqual(['Barn', 'Loft']));
		expect(page.value()).toBe('Barn');

		click(buttonIn(row(2), m.groups_delete_aria({ name: 'Loft' })));
		click(buttonIn(row(2), m.action_delete()));
		await vi.waitFor(() => expect(rowNames()).toEqual(['Barn']));
		expect(page.value()).toBe('Barn');
	});

	it('moves keyboard focus into the rename field and the delete question, and back', async () => {
		render();

		click(buttonIn(row(1), m.groups_rename_aria({ name: 'Barn' })));
		await vi.waitFor(() => expect(document.activeElement).toBe(row(1)?.querySelector('input')));
		click(buttonIn(row(1), m.action_cancel()));
		await vi.waitFor(() =>
			expect(document.activeElement).toBe(buttonIn(row(1), m.groups_rename_aria({ name: 'Barn' })))
		);

		click(buttonIn(row(1), m.groups_delete_aria({ name: 'Barn' })));
		await vi.waitFor(() =>
			expect(document.activeElement).toBe(buttonIn(row(1), m.action_delete()))
		);
		click(buttonIn(row(1), m.action_cancel()));
		await vi.waitFor(() =>
			expect(document.activeElement).toBe(buttonIn(row(1), m.groups_delete_aria({ name: 'Barn' })))
		);
	});

	it('does not call the API for an unchanged name, and can cancel a rename', () => {
		const page = render();

		click(buttonIn(row(1), m.groups_rename_aria({ name: 'Barn' })));
		click(buttonIn(row(1), m.action_cancel()));
		expect(row(1)?.querySelector('input')).toBeNull();

		click(buttonIn(row(1), m.groups_rename_aria({ name: 'Barn' })));
		typeDraft(1, ' Barn ');
		click(buttonIn(row(1), m.groups_save()));

		expect(page.services.locationGroups.renameGroup).not.toHaveBeenCalled();
		expect(row(1)?.querySelector('input')).toBeNull();
	});

	it('will not save an empty or too long name, and keeps the editor open when refused', async () => {
		const page = render();
		page.services.locationGroups.renameGroup.mockRejectedValue(new TypeError('Failed to fetch'));

		click(buttonIn(row(1), m.groups_rename_aria({ name: 'Barn' })));
		typeDraft(1, 'x'.repeat(121));
		expect(row(1)?.textContent).toContain(m.groups_name_too_long({ max: '120' }));
		expect(buttonIn(row(1), m.groups_save())?.disabled).toBe(true);
		row(1)?.querySelector('form')?.requestSubmit();
		typeDraft(1, '  ');
		expect(buttonIn(row(1), m.groups_save())?.disabled).toBe(true);
		expect(page.services.locationGroups.renameGroup).not.toHaveBeenCalled();

		typeDraft(1, 'Cellar');
		click(buttonIn(row(1), m.groups_save()));
		await vi.waitFor(() => expect(page.onError).toHaveBeenCalledWith(m.groups_rename_failed()));
		flushSync();
		expect(row(1)?.querySelector('input')).not.toBeNull();
	});

	it('asks before deleting, and clears the selected value', async () => {
		const page = render({ value: 'Barn' });
		page.services.locationGroups.deleteGroup.mockResolvedValue(undefined);

		click(buttonIn(row(1), m.groups_delete_aria({ name: 'Barn' })));
		expect(row(1)?.textContent).toContain(m.groups_delete_confirm_location({ name: 'Barn' }));
		click(buttonIn(row(1), m.action_cancel()));
		expect(row(1)?.textContent).not.toContain(m.groups_delete_confirm_location({ name: 'Barn' }));
		expect(page.services.locationGroups.deleteGroup).not.toHaveBeenCalled();

		click(buttonIn(row(1), m.groups_delete_aria({ name: 'Barn' })));
		click(buttonIn(row(1), m.action_delete()));

		await vi.waitFor(() => expect(page.value()).toBe(''));
		flushSync();
		expect(page.services.locationGroups.deleteGroup).toHaveBeenCalledWith(1);
		expect(rowNames()).toEqual(['Attic']);
	});

	it('moves focus to the next row after a delete, else the previous one, else Close', async () => {
		const page = render();
		page.services.locationGroups.deleteGroup.mockResolvedValue(undefined);
		const renameButton = (id: number, name: string) =>
			buttonIn(row(id), m.groups_rename_aria({ name }));

		// Attic is the first row: focus goes on to Barn.
		click(buttonIn(row(2), m.groups_delete_aria({ name: 'Attic' })));
		click(buttonIn(row(2), m.action_delete()));
		await vi.waitFor(() => expect(document.activeElement).toBe(renameButton(1, 'Barn')));

		// Barn is now the only row: focus goes to the dialog's Close button.
		click(buttonIn(row(1), m.groups_delete_aria({ name: 'Barn' })));
		click(buttonIn(row(1), m.action_delete()));
		await vi.waitFor(() =>
			expect((document.activeElement as HTMLElement | null)?.id.endsWith('-close')).toBe(true)
		);
		expect(document.activeElement?.textContent?.trim()).toBe(m.action_close());
	});

	it('moves focus back to the previous row after deleting the last one', async () => {
		const page = render();
		page.services.locationGroups.deleteGroup.mockResolvedValue(undefined);

		click(buttonIn(row(1), m.groups_delete_aria({ name: 'Barn' })));
		click(buttonIn(row(1), m.action_delete()));

		await vi.waitFor(() =>
			expect(document.activeElement).toBe(buttonIn(row(2), m.groups_rename_aria({ name: 'Attic' })))
		);
	});

	it('words the delete question for devices, and keeps the row when refused', async () => {
		const page = render({ kind: 'device', value: 'Attic' });
		page.services.locationGroups.deleteGroup.mockRejectedValue(new TypeError('Failed to fetch'));

		click(buttonIn(row(1), m.groups_delete_aria({ name: 'Barn' })));
		expect(row(1)?.textContent).toContain(m.groups_delete_confirm_device({ name: 'Barn' }));
		click(buttonIn(row(1), m.action_delete()));

		await vi.waitFor(() => expect(page.onError).toHaveBeenCalledWith(m.groups_delete_failed()));
		flushSync();
		// Still listed, still asking: the user can retry or cancel.
		expect(rows()).toHaveLength(2);
		expect(row(1)?.textContent).toContain(m.groups_delete_confirm_device({ name: 'Barn' }));
		expect(page.value()).toBe('Attic');
	});

	it('switches between renaming and deleting, and closes clean', () => {
		const page = render();

		click(buttonIn(row(1), m.groups_delete_aria({ name: 'Barn' })));
		click(buttonIn(row(2), m.groups_rename_aria({ name: 'Attic' })));
		expect(row(1)?.textContent).not.toContain(m.groups_delete_confirm_location({ name: 'Barn' }));
		expect(row(2)?.querySelector('input')).not.toBeNull();

		click(buttonIn(row(1), m.groups_delete_aria({ name: 'Barn' })));
		expect(row(2)?.querySelector('input')).toBeNull();

		click(buttonIn(dialog()?.querySelector('.cw-dialog__actions'), m.action_close()));
		expect(page.controller.manageOpen).toBe(false);

		page.controller.manageOpen = true;
		flushSync();
		expect(row(1)?.textContent).not.toContain(m.groups_delete_confirm_location({ name: 'Barn' }));

		click(buttonIn(row(2), m.groups_rename_aria({ name: 'Attic' })));
		click(dialog()?.querySelector('.cw-dialog__close'));
		expect(page.controller.manageOpen).toBe(false);
		page.controller.manageOpen = true;
		flushSync();
		expect(row(2)?.querySelector('input')).toBeNull();
	});
});
