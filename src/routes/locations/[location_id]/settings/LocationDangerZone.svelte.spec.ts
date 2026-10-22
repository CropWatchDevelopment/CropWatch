import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages.js';
import LocationDangerZone from './LocationDangerZone.svelte';

type Submit = (input: Record<string, unknown>) => unknown;

const { forms } = vi.hoisted(() => ({
	forms: { submit: null as Submit | null, submitted: 0 }
}));
// Like the real `use:enhance`, the mock keeps the browser from submitting the
// form itself; tests run the captured submit function with a result of their choosing.
vi.mock('$app/forms', () => ({
	enhance: (form: HTMLFormElement, submit: Submit) => {
		forms.submit = submit;
		const onSubmit = (event: Event) => {
			event.preventDefault();
			forms.submitted += 1;
		};
		form.addEventListener('submit', onSubmit);
		return { destroy: () => form.removeEventListener('submit', onSubmit) };
	}
}));

const NAME = 'Greenhouse A';

function renderDangerZone(deviceCount = 0, form: Record<string, unknown> | null = null) {
	const component = mount(LocationDangerZone, {
		target: document.body,
		props: { locationId: 8, locationName: NAME, deviceCount, form }
	});
	flushSync();
	return component;
}

function byId<T extends HTMLElement>(id: string): T {
	const element = document.getElementById(id);
	if (!element) {
		throw new Error(`#${id} is not rendered`);
	}
	return element as T;
}

function openDialog() {
	byId<HTMLButtonElement>('location-delete-open-button').click();
	flushSync();
}

function typeName(value: string) {
	const input = byId<HTMLInputElement>('location-delete-confirm-input');
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function toggleAcknowledgement() {
	byId<HTMLInputElement>('location-delete-acknowledge-checkbox').click();
	flushSync();
}

afterEach(() => {
	document.body.innerHTML = '';
	forms.submit = null;
	forms.submitted = 0;
});

/** Runs the enhance submit function; returns its cancel spy and result callback. */
function submit() {
	if (!forms.submit) throw new Error('the form is not enhanced');
	const cancel = vi.fn();
	const callback = forms.submit({ cancel, formData: new FormData() }) as
		| ((input: {
				result: ActionResult;
				update: (options?: unknown) => Promise<void>;
		  }) => Promise<void>)
		| undefined;
	flushSync();
	return { cancel, callback };
}

const dialogOpen = () =>
	(
		document
			.getElementById('location-delete-confirm-button')
			?.closest('dialog') as HTMLDialogElement
	).open;

describe('LocationDangerZone', () => {
	it('blocks deleting while devices remain, and says why', () => {
		const component = renderDangerZone(3);

		expect(document.body.textContent).toContain(m.danger_zone_title());
		expect(document.body.textContent).toContain(m.locations_delete_blocked({ count: '3' }));
		expect(byId<HTMLButtonElement>('location-delete-open-button').disabled).toBe(true);

		unmount(component);
	});

	it('spells out what deleting an empty location removes', () => {
		const component = renderDangerZone();
		expect(byId<HTMLButtonElement>('location-delete-open-button').disabled).toBe(false);

		openDialog();
		const text = document.body.textContent ?? '';
		expect(text).toContain(m.danger_zone_irreversible());
		expect(text).toContain(m.locations_delete_item_location());
		expect(text).toContain(m.locations_delete_item_access());
		expect(text).toContain(m.locations_delete_no_devices_note());
		expect(text).toContain(NAME);

		unmount(component);
	});

	it('keeps the delete button locked until the name is typed AND the risk is acknowledged', () => {
		const component = renderDangerZone();
		openDialog();
		const confirmButton = byId<HTMLButtonElement>('location-delete-confirm-button');
		expect(confirmButton.disabled).toBe(true);

		typeName(NAME);
		expect(confirmButton.disabled).toBe(true);

		toggleAcknowledgement();
		expect(confirmButton.disabled).toBe(false);

		typeName('Greenhouse B');
		expect(confirmButton.disabled).toBe(true);
		expect(document.body.textContent).toContain(m.locations_delete_confirm_mismatch());

		unmount(component);
	});

	it('accepts the name as an IME types it (full-width)', () => {
		const component = renderDangerZone();
		openDialog();

		typeName('Ｇｒｅｅｎｈｏｕｓｅ　Ａ');
		toggleAcknowledgement();
		expect(byId<HTMLButtonElement>('location-delete-confirm-button').disabled).toBe(false);

		unmount(component);
	});

	it('clears an earlier confirmation when the dialog is reopened', () => {
		const component = renderDangerZone();
		openDialog();
		typeName(NAME);
		toggleAcknowledgement();

		byId<HTMLButtonElement>('location-delete-dismiss-button').click();
		flushSync();
		openDialog();

		expect(byId<HTMLInputElement>('location-delete-confirm-input').value).toBe('');
		expect(byId<HTMLInputElement>('location-delete-acknowledge-checkbox').checked).toBe(false);
		expect(byId<HTMLButtonElement>('location-delete-confirm-button').disabled).toBe(true);

		unmount(component);
	});

	it('sends the typed name and the acknowledgement with the form', () => {
		const component = renderDangerZone();
		const field = (name: string) =>
			document.querySelector(`#location-delete-form input[name="${name}"]`) as HTMLInputElement;
		expect([field('confirmLocationName').value, field('acknowledged').value]).toEqual(['', '']);

		openDialog();
		typeName('greenhouse a');
		toggleAcknowledgement();

		expect([field('confirmLocationName').value, field('acknowledged').value]).toEqual([
			'greenhouse a',
			'yes'
		]);
		unmount(component);
	});

	it('submits the form from the confirm button once everything is confirmed', () => {
		const component = renderDangerZone();
		openDialog();
		typeName(NAME);
		toggleAcknowledgement();

		byId<HTMLButtonElement>('location-delete-confirm-button').click();

		expect(forms.submitted).toBe(1);
		unmount(component);
	});

	it('never submits without the name, the acknowledgement, or while devices remain', () => {
		const component = renderDangerZone();
		openDialog();
		expect(submit().cancel).toHaveBeenCalled();

		typeName(NAME);
		expect(submit().cancel).toHaveBeenCalled();
		unmount(component);

		const blocked = renderDangerZone(2);
		openDialog();
		typeName(NAME);
		toggleAcknowledgement();
		expect(submit().cancel).toHaveBeenCalled();
		unmount(blocked);
	});

	it('keeps the dialog open while the delete redirects to the list', async () => {
		const component = renderDangerZone();
		openDialog();
		typeName(NAME);
		toggleAcknowledgement();
		const { cancel, callback } = submit();
		expect(cancel).not.toHaveBeenCalled();
		expect(byId('location-delete-confirm-button').getAttribute('aria-busy')).toBe('true');

		const update = vi.fn(async () => {});
		await callback?.({ result: { type: 'redirect', status: 303, location: '/locations' }, update });
		flushSync();

		expect(update).toHaveBeenCalledWith({ reset: false });
		expect(dialogOpen()).toBe(true);
		expect(byId('location-delete-confirm-button').getAttribute('aria-busy')).toBeNull();
		unmount(component);
	});

	it('closes the dialog when the delete is refused, even if the update fails', async () => {
		const component = renderDangerZone();
		openDialog();
		typeName(NAME);
		toggleAcknowledgement();

		const update = vi.fn(async () => {
			throw new Error('update failed');
		});
		await expect(
			submit().callback?.({ result: { type: 'failure', status: 409 }, update })
		).rejects.toThrow('update failed');
		flushSync();

		expect(dialogOpen()).toBe(false);
		expect(byId<HTMLButtonElement>('location-delete-open-button').disabled).toBe(false);
		unmount(component);
	});

	it("shows the delete action's error, and no other action's", () => {
		const component = renderDangerZone(0, { action: 'deleteLocation', message: 'Refused' });
		expect(document.body.textContent).toContain('Refused');
		unmount(component);

		const other = renderDangerZone(0, { action: 'updateLocationName', message: 'Name updated' });
		expect(document.body.textContent).not.toContain('Name updated');
		unmount(other);
	});
});
