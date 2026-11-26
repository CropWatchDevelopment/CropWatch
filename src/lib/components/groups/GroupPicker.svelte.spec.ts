import { flushSync } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import type { GroupDto } from '#lib/api/api.dtos.ts';
import { m } from '#lib/paraglide/messages.js';
import { chooseOption, dropdown } from '#lib/testing/dropdown.ts';
import { createMockServices } from '#lib/testing/mock-services.ts';
import { renderWithServices } from '#lib/testing/render.ts';
import GroupPicker from './GroupPicker.svelte';
import { GroupsController } from './groups-controller.svelte';

let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	groups: GroupDto[],
	props: {
		value?: string;
		name?: string;
		label?: string;
		error?: string;
		disabled?: boolean;
		orgId?: string | null;
	} = {}
) {
	const controller = new GroupsController({
		kind: 'device',
		repository: createMockServices().deviceGroups,
		orgId: props.orgId === undefined ? 'org-1' : props.orgId,
		initial: groups,
		onError: () => {},
		onSuccess: () => {}
	});
	let value = $state(props.value ?? '');
	view = renderWithServices(GroupPicker, {
		props: {
			controller,
			id: 'picker',
			name: props.name,
			label: props.label,
			error: props.error,
			disabled: props.disabled,
			get value() {
				return value;
			},
			set value(next: string) {
				value = next;
			}
		}
	} as never);
	return { controller, value: () => value };
}

const button = (id: string) => document.getElementById(id) as HTMLButtonElement | null;

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('GroupPicker', () => {
	it('offers "no group" and each group name once, and binds the choice', () => {
		const { value } = render(
			[
				{ id: 1, name: 'Barn', org_id: 'org-1', can_manage: false },
				{ id: 2, name: 'Attic', org_id: 'org-1', can_manage: false },
				{ id: 3, name: 'Barn', org_id: 'org-1', can_manage: false }
			],
			{ value: 'Barn' }
		);

		expect(document.body.textContent).toContain(m.common_group());
		expect(dropdown('picker').label()).toBe('Barn');
		expect(dropdown('picker').options()).toEqual([m.groups_none(), 'Attic', 'Barn']);

		chooseOption('picker', 'Attic');
		expect(value()).toBe('Attic');
		chooseOption('picker', m.groups_none());
		expect(value()).toBe('');
	});

	it("keeps a saved group the list doesn't hold", () => {
		render([{ id: 1, name: 'Barn', org_id: 'org-1', can_manage: false }], { value: 'Old shed' });

		expect(dropdown('picker').options()).toEqual([m.groups_none(), 'Old shed', 'Barn']);
	});

	it('posts the name under its field name, with its own label and error', () => {
		render([{ id: 1, name: 'Barn', org_id: 'org-1', can_manage: false }], {
			value: 'Barn',
			name: 'group',
			label: 'Device group',
			error: 'Group refused'
		});

		const posted = document.querySelector<HTMLInputElement>('.cw-dropdown__native-input');
		expect([posted?.name, posted?.value]).toEqual(['group', 'Barn']);
		expect(document.body.textContent).toContain('Device group');
		expect(document.body.textContent).toContain('Group refused');
	});

	it('opens the add dialog, and the manage dialog only when a group can be managed', () => {
		const readOnly = render([{ id: 1, name: 'Barn', org_id: 'org-1', can_manage: false }]);
		expect(button('picker-manage')).toBeNull();
		button('picker-add')?.click();
		flushSync();
		expect(readOnly.controller.addOpen).toBe(true);
		expect(button('picker-add')?.textContent).toContain(m.groups_add());
		view?.unmount();

		const managed = render([{ id: 1, name: 'Barn', org_id: 'org-1', can_manage: true }]);
		expect(button('picker-manage')?.textContent).toContain(m.groups_manage());
		button('picker-manage')?.click();
		flushSync();
		expect(managed.controller.manageOpen).toBe(true);
		expect(managed.controller.addOpen).toBe(false);
	});

	it('offers neither button without the organization, but still the saved choice', () => {
		const { value } = render([{ id: 1, name: 'Barn', org_id: 'org-1', can_manage: true }], {
			orgId: null,
			value: 'Barn'
		});

		expect(button('picker-add')).toBeNull();
		expect(button('picker-manage')).toBeNull();
		expect(dropdown('picker').label()).toBe('Barn');
		chooseOption('picker', m.groups_none());
		expect(value()).toBe('');
	});

	it('disables the choice and both buttons', () => {
		render([{ id: 1, name: 'Barn', org_id: 'org-1', can_manage: true }], { disabled: true });

		expect(dropdown('picker').trigger.disabled).toBe(true);
		expect(button('picker-add')?.disabled).toBe(true);
		expect(button('picker-manage')?.disabled).toBe(true);
	});
});
