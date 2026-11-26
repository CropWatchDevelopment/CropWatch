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

function button(id: string): HTMLButtonElement {
	const element = document.getElementById(id) as HTMLButtonElement | null;
	if (!element) throw new Error(`No button #${id}`);
	return element;
}

/** "Add group" under the picker: types `name` and submits the dialog. */
export function addGroup(pickerId: string, name: string) {
	button(`${pickerId}-add`).click();
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

/** "Manage groups" under the picker: renames the group `from` to `to`. */
export function renameGroup(pickerId: string, from: string, to: string) {
	button(`${pickerId}-manage`).click();
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

/** "Manage groups" under the picker: deletes the group `name`, confirming the question. */
export function deleteGroup(pickerId: string, name: string) {
	button(`${pickerId}-manage`).click();
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
