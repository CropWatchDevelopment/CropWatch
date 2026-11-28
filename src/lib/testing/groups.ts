import { flushSync } from 'svelte';
import { m } from '#lib/paraglide/messages.js';

/**
 * Drives the group dialogs a page renders next to its `GroupPicker` (trigger
 * id `pickerId`) the way a user does: through the picker's buttons and the
 * dialogs' own forms.
 */

function typeInto(input: HTMLInputElement, value: string) {
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/** The button called `label` inside the picker's box, or null when the picker does not offer it. */
function pickerButton(pickerId: string, label: string): HTMLButtonElement | null {
	return (
		document
			.getElementById(pickerId)
			?.closest('.cw-dropdown')
			?.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`) ?? null
	);
}

/** The picker's "Add group" button, or null when it is not offered. */
export const addGroupButton = (pickerId: string) => pickerButton(pickerId, m.groups_add());

/** The picker's "Manage groups" button, or null when it is not offered. */
export const manageGroupsButton = (pickerId: string) => pickerButton(pickerId, m.groups_manage());

function press(button: HTMLButtonElement | null, what: string) {
	if (!button) throw new Error(`No "${what}" button in the group picker`);
	button.click();
}

/** "Add group" in the picker: types `name` and submits the dialog. */
export function addGroup(pickerId: string, name: string) {
	press(addGroupButton(pickerId), m.groups_add());
	flushSync();
	const form = document.querySelector<HTMLFormElement>('form.add-group');
	if (!form) throw new Error('No add-group dialog');
	typeInto(form.querySelector('input') as HTMLInputElement, name);
	form.requestSubmit();
	flushSync();
}

/** The Manage dialog's row for the group called `name`. */
function manageRow(name: string): HTMLElement {
	const rename = document.querySelector<HTMLButtonElement>(
		`button[aria-label="${m.groups_rename_aria({ name })}"]`
	);
	const row = rename?.closest('li');
	if (!row) throw new Error(`No managed group "${name}"`);
	return row;
}

/** "Manage groups" in the picker: renames the group `from` to `to`. */
export function renameGroup(pickerId: string, from: string, to: string) {
	press(manageGroupsButton(pickerId), m.groups_manage());
	flushSync();
	const row = manageRow(from);
	(
		row.querySelector(`button[aria-label="${m.groups_rename_aria({ name: from })}"]`) as HTMLElement
	).click();
	flushSync();
	const form = row.querySelector<HTMLFormElement>('form');
	if (!form) throw new Error(`No rename form for "${from}"`);
	typeInto(form.querySelector('input') as HTMLInputElement, to);
	form.requestSubmit();
	flushSync();
}

/** "Manage groups" in the picker: deletes the group `name`, confirming the question. */
export function deleteGroup(pickerId: string, name: string) {
	press(manageGroupsButton(pickerId), m.groups_manage());
	flushSync();
	const row = manageRow(name);
	(
		row.querySelector(`button[aria-label="${m.groups_delete_aria({ name })}"]`) as HTMLElement
	).click();
	flushSync();
	const confirm = [...row.querySelectorAll<HTMLButtonElement>('button')].find(
		(candidate) => candidate.textContent?.trim() === m.action_delete()
	);
	if (!confirm) throw new Error(`No delete confirmation for "${name}"`);
	confirm.click();
	flushSync();
}
