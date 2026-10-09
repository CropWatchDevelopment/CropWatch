import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import DeviceDangerZone from './DeviceDangerZone.svelte';

const DEV_EUI = '114993489252000024';

function renderDangerZone() {
	const component = mount(DeviceDangerZone, {
		target: document.body,
		props: { devEui: DEV_EUI, deviceName: 'Field sensor', form: null }
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
	byId<HTMLButtonElement>('device-delete-open-button').click();
	flushSync();
}

function typeDevEui(value: string) {
	const input = byId<HTMLInputElement>('device-delete-confirm-input');
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function toggleAcknowledgement() {
	byId<HTMLInputElement>('device-delete-acknowledge-checkbox').click();
	flushSync();
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('DeviceDangerZone', () => {
	it('presents a danger zone and spells out what deleting removes', () => {
		const component = renderDangerZone();
		expect(document.body.textContent).toContain(m.devices_danger_zone_title());

		openDialog();
		const text = document.body.textContent ?? '';
		expect(text).toContain(m.devices_delete_irreversible());
		expect(text).toContain(m.devices_delete_item_history());
		expect(text).toContain(m.devices_delete_item_access());
		expect(text).toContain('Field sensor');
		expect(text).toContain(DEV_EUI);

		unmount(component);
	});

	it('keeps the delete button locked until the DevEUI is typed AND the risk is acknowledged', () => {
		const component = renderDangerZone();
		openDialog();
		const confirmButton = byId<HTMLButtonElement>('device-delete-confirm-button');
		expect(confirmButton.disabled).toBe(true);

		typeDevEui(DEV_EUI);
		expect(confirmButton.disabled).toBe(true);

		toggleAcknowledgement();
		expect(confirmButton.disabled).toBe(false);

		// Editing the DevEUI away from an exact match locks it again.
		typeDevEui(DEV_EUI.slice(0, -1));
		expect(confirmButton.disabled).toBe(true);

		unmount(component);
	});

	it('does not unlock on the acknowledgement alone', () => {
		const component = renderDangerZone();
		openDialog();

		toggleAcknowledgement();
		expect(byId<HTMLButtonElement>('device-delete-confirm-button').disabled).toBe(true);

		unmount(component);
	});

	it('flags a wrong DevEUI once it is fully typed', () => {
		const component = renderDangerZone();
		openDialog();

		typeDevEui('114993489252000025');
		expect(document.body.textContent).toContain(m.devices_delete_confirm_mismatch());

		unmount(component);
	});

	it('clears an earlier confirmation when the dialog is reopened', () => {
		const component = renderDangerZone();
		openDialog();
		typeDevEui(DEV_EUI);
		toggleAcknowledgement();

		byId<HTMLButtonElement>('device-delete-dismiss-button').click();
		flushSync();
		openDialog();

		expect(byId<HTMLInputElement>('device-delete-confirm-input').value).toBe('');
		expect(byId<HTMLInputElement>('device-delete-acknowledge-checkbox').checked).toBe(false);
		expect(byId<HTMLButtonElement>('device-delete-confirm-button').disabled).toBe(true);

		unmount(component);
	});
});
