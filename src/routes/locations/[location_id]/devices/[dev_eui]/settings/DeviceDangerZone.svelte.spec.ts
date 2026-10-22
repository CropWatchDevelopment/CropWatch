import type { ActionResult } from '@sveltejs/kit';
import { flushSync, mount, unmount, type ComponentProps } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import DeviceDangerZone from './DeviceDangerZone.svelte';

type Submit = (input: Record<string, unknown>) => unknown;
type AfterSubmit = (input: {
	result: ActionResult;
	update: (options?: { reset?: boolean }) => Promise<void>;
}) => Promise<void>;

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
		expect(document.body.textContent).toContain(m.danger_zone_title());

		openDialog();
		const text = document.body.textContent ?? '';
		expect(text).toContain(m.danger_zone_irreversible());
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

afterEach(() => {
	forms.submit = null;
	forms.submitted = 0;
});

function renderWith(props: Partial<ComponentProps<typeof DeviceDangerZone>>) {
	const component = mount(DeviceDangerZone, {
		target: document.body,
		props: { devEui: DEV_EUI, deviceName: 'Field sensor', form: null, ...props }
	});
	flushSync();
	return component;
}

function confirmDelete() {
	openDialog();
	typeDevEui(DEV_EUI);
	toggleAcknowledgement();
}

/** Runs the enhance submit function as SvelteKit does on every submit. */
function submit() {
	if (!forms.submit) throw new Error('the delete form is not enhanced');
	const cancel = vi.fn();
	const callback = forms.submit({ cancel, formData: new FormData() }) as AfterSubmit | undefined;
	flushSync();
	return { cancel, callback };
}

/** The API's "still purging, submit again" answer. */
const chunk = (purgedRows?: number): ActionResult => ({
	type: 'failure',
	status: 409,
	data: { action: 'deleteDevice', inProgress: true, purgedRows }
});

const text = () => document.body.textContent ?? '';
const busy = () => byId('device-delete-confirm-button').getAttribute('aria-busy') === 'true';
const dialogOpen = () =>
	(byId('device-delete-confirm-button').closest('dialog') as HTMLDialogElement).open;

describe('DeviceDangerZone delete', () => {
	it('sends the typed DevEUI and the acknowledgement with the form', () => {
		const component = renderDangerZone();
		const field = (name: string) =>
			document.querySelector(`#device-delete-form input[name="${name}"]`) as HTMLInputElement;
		expect([field('confirmDevEui').value, field('acknowledged').value]).toEqual(['', '']);

		openDialog();
		typeDevEui(' 114993489252000024 ');
		toggleAcknowledgement();

		expect([field('confirmDevEui').value, field('acknowledged').value]).toEqual([
			' 114993489252000024 ',
			'yes'
		]);
		unmount(component);
	});

	it('submits the form from the confirm button once everything is confirmed', () => {
		const component = renderDangerZone();
		confirmDelete();

		byId<HTMLButtonElement>('device-delete-confirm-button').click();

		expect(forms.submitted).toBe(1);
		unmount(component);
	});

	it('never submits without the typed DevEUI and the acknowledgement', () => {
		const component = renderDangerZone();
		openDialog();
		expect(submit().cancel).toHaveBeenCalled();

		typeDevEui(DEV_EUI);
		expect(submit().cancel).toHaveBeenCalled();

		toggleAcknowledgement();
		typeDevEui('');
		const { cancel, callback } = submit();
		expect(cancel).toHaveBeenCalled();
		expect(callback).toBeUndefined();
		expect(busy()).toBe(false);
		unmount(component);
	});

	it('re-submits while the API is still purging, showing the rows removed so far', async () => {
		const component = renderDangerZone();
		confirmDelete();
		const update = vi.fn(async () => {});

		const first = submit();
		expect(first.cancel).not.toHaveBeenCalled();
		expect(busy()).toBe(true);
		await first.callback?.({ result: chunk(1500), update });
		flushSync();

		expect(forms.submitted).toBe(1);
		expect(update).not.toHaveBeenCalled();
		expect(text()).toContain(m.devices_delete_progress({ count: (1500).toLocaleString() }));

		const second = submit();
		await second.callback?.({ result: chunk(2500), update });
		flushSync();

		expect(forms.submitted).toBe(2);
		expect(text()).toContain(m.devices_delete_progress({ count: (4000).toLocaleString() }));
		expect(busy()).toBe(true);
		unmount(component);
	});

	it('shows no progress for chunks that report no rows', async () => {
		const component = renderDangerZone();
		confirmDelete();
		const { callback } = submit();
		const update = vi.fn(async () => {});

		await callback?.({ result: chunk(undefined), update });
		flushSync();

		expect(forms.submitted).toBe(1);
		expect(document.querySelector('[role="status"]')).toBeNull();

		await callback?.({ result: chunk(10), update });
		flushSync();
		expect(document.querySelector('[role="status"]')?.textContent).toBe(
			m.devices_delete_progress({ count: (10).toLocaleString() })
		);
		unmount(component);
	});

	it('stops re-submitting after 200 chunks and shows the result instead', async () => {
		const component = renderDangerZone();
		confirmDelete();
		const { callback } = submit();
		const update = vi.fn(async () => {});

		for (let round = 0; round < 200; round += 1) {
			await callback?.({ result: chunk(1), update });
		}
		expect(forms.submitted).toBe(200);
		expect(update).not.toHaveBeenCalled();

		await callback?.({ result: chunk(1), update });
		flushSync();

		expect(forms.submitted).toBe(200);
		expect(update).toHaveBeenCalledWith({ reset: false });
		expect(busy()).toBe(false);
		expect(dialogOpen()).toBe(false);
		unmount(component);
	});

	it('keeps the dialog open while the delete redirects to the location', async () => {
		const component = renderDangerZone();
		confirmDelete();
		const { callback } = submit();
		const update = vi.fn(async () => {});

		await callback?.({
			result: { type: 'redirect', status: 303, location: '/locations/8' },
			update
		});
		flushSync();

		expect(update).toHaveBeenCalledWith({ reset: false });
		expect(dialogOpen()).toBe(true);
		expect(busy()).toBe(false);
		unmount(component);
	});

	it('closes the dialog when the delete is refused, even if the update fails', async () => {
		const component = renderDangerZone();
		confirmDelete();
		const update = vi.fn(async () => {
			throw new Error('update failed');
		});

		await expect(
			submit().callback?.({
				result: { type: 'failure', status: 403, data: { action: 'deleteDevice' } },
				update
			})
		).rejects.toThrow('update failed');
		flushSync();

		expect(forms.submitted).toBe(0);
		expect(dialogOpen()).toBe(false);
		expect(byId<HTMLButtonElement>('device-delete-open-button').disabled).toBe(false);
		unmount(component);
	});

	it("shows the delete action's error, and no other action's", () => {
		const refused = renderWith({ form: { action: 'deleteDevice', message: 'Owner only' } });
		expect(document.querySelector('.app-notice--danger')?.textContent).toContain('Owner only');
		unmount(refused);

		const other = renderWith({ form: { action: 'updateDevice', message: 'Device saved' } });
		expect(text()).not.toContain('Device saved');
		unmount(other);
	});

	it('names the device by its DevEUI, in capitals, when it has no name', () => {
		const component = renderWith({ devEui: ' 2cf7f1c0617000cc ', deviceName: '' });
		openDialog();

		expect(document.querySelector('.cw-dialog__title')?.textContent).toBe(
			m.devices_delete_dialog_title({ name: '2CF7F1C0617000CC' })
		);
		expect(text()).toContain(m.devices_delete_confirm_prompt({ devEui: '2CF7F1C0617000CC' }));
		expect([...document.querySelectorAll('dd')].map((dd) => dd.textContent?.trim())).toEqual([
			'2CF7F1C0617000CC',
			'2CF7F1C0617000CC'
		]);

		typeDevEui('2CF7F1C0617000CC');
		toggleAcknowledgement();
		expect(byId<HTMLButtonElement>('device-delete-confirm-button').disabled).toBe(false);
		unmount(component);
	});
});
