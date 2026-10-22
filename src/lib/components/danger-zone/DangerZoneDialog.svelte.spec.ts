import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import DangerZoneDialog from './DangerZoneDialog.svelte';

const onConfirm = vi.fn();

interface DialogState {
	open: boolean;
	confirmValue: string;
	acknowledged: boolean;
	canConfirm: boolean;
	busy: boolean;
	progress: string | null;
	confirmError: string | null;
	note: string | null;
}

let view: ReturnType<typeof renderWithServices> | null = null;

/**
 * Renders the dialog the way an owner does: `open`, `confirmValue` and
 * `acknowledged` are bound, everything else is reactive. Returns that state.
 */
function render(initial: Partial<DialogState> = {}) {
	const state = $state<DialogState>({
		open: true,
		confirmValue: '',
		acknowledged: false,
		canConfirm: false,
		busy: false,
		progress: null,
		confirmError: null,
		note: null,
		...initial
	});
	const props = {
		idPrefix: 'device-delete',
		title: 'Delete device?',
		intro: 'Deleting this device permanently removes:',
		removes: ['All of its readings', 'Its rules and reports'],
		identity: [
			{ label: 'Name', value: 'Freezer A' },
			{ label: 'DevEUI', value: 'A1B2C3D4E5F60708', mono: true }
		],
		confirmLabel: 'Type the device name to confirm',
		acknowledgeLabel: 'I understand this cannot be undone',
		confirmButtonLabel: 'Delete forever',
		onConfirm
	};
	for (const key of Object.keys(state) as (keyof DialogState)[]) {
		Object.defineProperty(props, key, {
			enumerable: true,
			get: () => state[key],
			set: (value: never) => (state[key] = value)
		});
	}
	view = renderWithServices(DangerZoneDialog, { props: props as never });
	flushSync();
	return state;
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const dialog = () => document.querySelector('dialog.cw-dialog') as HTMLDialogElement;
const confirmInput = () => byId<HTMLInputElement>('device-delete-confirm-input');
const acknowledgeBox = () => byId<HTMLInputElement>('device-delete-acknowledge-checkbox');
const dismissButton = () => byId<HTMLButtonElement>('device-delete-dismiss-button');
const confirmButton = () => byId<HTMLButtonElement>('device-delete-confirm-button');
const progressText = () => dialog().querySelector('[role="status"]');

function type(value: string) {
	confirmInput().value = value;
	confirmInput().dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function pressEscape() {
	dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	flushSync();
}

function clickBackdrop() {
	dialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
	flushSync();
}

afterEach(() => {
	view?.unmount();
	view = null;
	onConfirm.mockReset();
});

describe('DangerZoneDialog', () => {
	it('spells out that the delete is irreversible and what it removes', () => {
		render();

		expect(dialog().open).toBe(true);
		expect(dialog().querySelector('.cw-dialog__title')?.textContent).toBe('Delete device?');
		const notice = dialog().querySelector('.app-notice.app-notice--danger') as HTMLElement;
		expect(notice.querySelector('.app-notice__title')?.textContent).toBe(
			m.danger_zone_irreversible()
		);
		expect(notice.querySelector('.app-notice__body > p')?.textContent).toBe(
			'Deleting this device permanently removes:'
		);
		expect(
			[...notice.querySelectorAll('.danger-zone-dialog__list li')].map((item) => item.textContent)
		).toEqual(['All of its readings', 'Its rules and reports']);
	});

	it('names what is being deleted, identifiers in monospace', () => {
		render();

		const identity = dialog().querySelector('dl.danger-zone-dialog__identity') as HTMLElement;
		expect([...identity.querySelectorAll('dt')].map((term) => term.textContent)).toEqual([
			'Name',
			'DevEUI'
		]);
		const [name, devEui] = [...identity.querySelectorAll('dd')];
		expect(name.textContent?.trim()).toBe('Freezer A');
		expect(name.querySelector('code')).toBeNull();
		expect(devEui.querySelector('code')?.textContent).toBe('A1B2C3D4E5F60708');
	});

	it('shows the note only when there is one', () => {
		const state = render();
		expect(dialog().querySelector('.danger-zone-dialog__copy')).toBeNull();

		state.note = 'Its gateway keeps working.';
		flushSync();

		expect(dialog().querySelector('.danger-zone-dialog__copy')?.textContent).toBe(
			'Its gateway keeps working.'
		);
	});

	it('asks for a typed confirmation and an acknowledgement', () => {
		render();

		expect(
			document.querySelector(`label[for="device-delete-confirm-input"]`)?.textContent?.trim()
		).toBe('Type the device name to confirm');
		expect(confirmInput().getAttribute('autocomplete')).toBe('off');
		expect(confirmInput().disabled).toBe(false);
		expect(acknowledgeBox().type).toBe('checkbox');
		expect(acknowledgeBox().checked).toBe(false);
		expect(
			document.querySelector(`label[for="device-delete-acknowledge-checkbox"]`)?.textContent?.trim()
		).toBe('I understand this cannot be undone');
	});

	it('binds the typed confirmation and the acknowledgement back to the owner', () => {
		const state = render();

		type('Freezer A');
		acknowledgeBox().click();
		flushSync();

		expect(state.confirmValue).toBe('Freezer A');
		expect(state.acknowledged).toBe(true);

		state.confirmValue = '';
		state.acknowledged = false;
		flushSync();
		expect(confirmInput().value).toBe('');
		expect(acknowledgeBox().checked).toBe(false);
	});

	it('shows why the typed confirmation does not match', () => {
		render({ confirmValue: 'Freezer', confirmError: 'The name does not match.' });

		expect(dialog().querySelector('.cw-input__message--error')?.textContent).toBe(
			'The name does not match.'
		);
		expect(confirmInput().getAttribute('aria-invalid')).toBe('true');
	});

	it('keeps the delete button disabled until the owner allows it, then confirms', () => {
		const state = render();

		expect(confirmButton().textContent?.trim()).toBe('Delete forever');
		expect(confirmButton().classList.contains('cw-button--danger')).toBe(true);
		expect(confirmButton().disabled).toBe(true);
		confirmButton().click();
		expect(onConfirm).not.toHaveBeenCalled();

		state.canConfirm = true;
		flushSync();
		expect(confirmButton().disabled).toBe(false);

		confirmButton().click();
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(state.open).toBe(true);
	});

	it('closes through the binding when cancelled', () => {
		const state = render({ canConfirm: true });

		expect(dismissButton().textContent?.trim()).toBe(m.action_cancel());
		expect(dismissButton().classList.contains('cw-button--ghost')).toBe(true);
		dismissButton().click();
		flushSync();

		expect(state.open).toBe(false);
		expect(dialog().open).toBe(false);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('opens when the owner opens it', () => {
		const state = render({ open: false });
		expect(dialog().open).toBe(false);

		state.open = true;
		flushSync();

		expect(dialog().open).toBe(true);
	});

	it('can be dismissed with Escape, the backdrop or the close button while idle', () => {
		const state = render();
		pressEscape();
		expect(state.open).toBe(false);

		state.open = true;
		flushSync();
		clickBackdrop();
		expect(state.open).toBe(false);

		state.open = true;
		flushSync();
		(dialog().querySelector('.cw-dialog__close') as HTMLButtonElement).click();
		flushSync();
		expect(state.open).toBe(false);
	});

	it('locks every control and shows the progress while deleting', () => {
		const state = render({
			busy: true,
			canConfirm: true,
			progress: 'Deleting readings…',
			confirmValue: 'Freezer A'
		});

		expect(confirmInput().disabled).toBe(true);
		expect(acknowledgeBox().disabled).toBe(true);
		expect(dismissButton().disabled).toBe(true);
		expect(confirmButton().disabled).toBe(true);
		expect(confirmButton().getAttribute('aria-busy')).toBe('true');
		expect(progressText()?.textContent).toBe('Deleting readings…');
		expect(dialog().querySelector('.cw-dialog__close')).toBeNull();

		pressEscape();
		clickBackdrop();
		expect(state.open).toBe(true);
		expect(dialog().open).toBe(true);
	});

	it('shows progress only while busy', () => {
		const state = render({ progress: 'Deleting readings…' });
		expect(progressText()).toBeNull();

		state.busy = true;
		flushSync();
		expect(progressText()?.textContent).toBe('Deleting readings…');

		state.progress = null;
		flushSync();
		expect(progressText()).toBeNull();
	});
});
