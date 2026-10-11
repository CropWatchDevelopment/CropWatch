import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import LocationDangerZone from './LocationDangerZone.svelte';

const NAME = 'Greenhouse A';

function renderDangerZone(deviceCount = 0) {
	const component = mount(LocationDangerZone, {
		target: document.body,
		props: { locationId: 8, locationName: NAME, deviceCount, form: null }
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
});

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
});
