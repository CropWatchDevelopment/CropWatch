import type { ActionResult } from '@sveltejs/kit';
import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import DeviceLicenseCard from './DeviceLicenseCard.svelte';

type Submit = (input: Record<string, unknown>) => unknown;
type AfterSubmit = (input: {
	result: ActionResult;
	update: (options?: { reset?: boolean }) => Promise<void>;
}) => Promise<void>;

const { goto } = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto }));

// Like the real `use:enhance`, the mock keeps the browser from submitting the
// form itself; tests run the captured submit function with a result of their choosing.
const { forms } = vi.hoisted(() => ({ forms: { submit: null as Submit | null, submitted: 0 } }));
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

type License = { id: number; seatIndex: number; manual: boolean };
type FormPayload = { action?: string; success?: boolean; message?: string } | null;

const SEAT: License = { id: 12, seatIndex: 2, manual: false };

let view: ReturnType<typeof renderWithServices> | null = null;

function render(license: License | null, form: FormPayload = null) {
	view = renderWithServices(DeviceLicenseCard, { props: { license, form } });
	return view;
}

const byId = <T extends HTMLElement = HTMLButtonElement>(id: string) =>
	document.getElementById(id) as T | null;
const text = () => document.body.textContent ?? '';
const dialog = () => byId('device-license-unassign-confirm-button')?.closest('dialog') ?? null;

function click(id: string) {
	byId(id)?.click();
	flushSync();
}

/** Runs the enhance submit function as SvelteKit would; returns the result callback. */
function submit(): AfterSubmit {
	if (!forms.submit) throw new Error('the license form is not enhanced');
	const after = forms.submit({ cancel: vi.fn(), formData: new FormData() }) as AfterSubmit;
	flushSync();
	return after;
}

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
	forms.submit = null;
	forms.submitted = 0;
});

describe('DeviceLicenseCard with a license', () => {
	it('shows the seat in use and offers to unassign it', () => {
		render(SEAT);

		expect(text()).toContain(m.devices_license_card_title());
		expect(document.querySelector('.cw-chip')?.textContent?.trim()).toBe(
			m.billing_license_seat({ seat: 3 })
		);
		expect(text()).toContain(m.devices_license_assigned_body());
		expect(
			document.querySelector<HTMLInputElement>('#device-license-form input[name="licenseId"]')
				?.value
		).toBe('12');
		expect(byId('device-license-unassign-button')?.disabled).toBe(false);
		expect(byId('device-license-go-to-billing-button')).toBeNull();
	});

	it('marks a license granted by staff as included', () => {
		render({ ...SEAT, manual: true });

		expect(document.querySelector('.cw-chip')?.textContent?.trim()).toBe(
			m.billing_manual_included()
		);
	});

	it('asks before unassigning, and submits the form on confirm', () => {
		render(SEAT);
		expect(dialog()?.open).toBe(false);

		click('device-license-unassign-button');
		expect(dialog()?.open).toBe(true);
		expect(text()).toContain(m.devices_license_unassign_confirm());

		click('device-license-unassign-confirm-button');
		expect(forms.submitted).toBe(1);
	});

	it('keeps the license when the confirmation is dismissed', () => {
		render(SEAT);
		click('device-license-unassign-button');

		click('device-license-unassign-dismiss-button');

		expect(dialog()?.open).toBe(false);
		expect(forms.submitted).toBe(0);
	});

	it('shows the unassign in progress, then closes the dialog', async () => {
		render(SEAT);
		click('device-license-unassign-button');

		const after = submit();
		expect(byId('device-license-unassign-button')?.disabled).toBe(true);
		expect(byId('device-license-unassign-dismiss-button')?.disabled).toBe(true);
		expect(byId('device-license-unassign-confirm-button')?.getAttribute('aria-busy')).toBe('true');

		const update = vi.fn(async () => {});
		await after({ result: { type: 'success', status: 200 }, update });
		flushSync();

		expect(update).toHaveBeenCalledWith({ reset: false });
		expect(dialog()?.open).toBe(false);
		expect(byId('device-license-unassign-button')?.disabled).toBe(false);
		expect(byId('device-license-unassign-confirm-button')?.getAttribute('aria-busy')).toBeNull();
	});

	it('closes the dialog and stops the progress even if the update fails', async () => {
		render(SEAT);
		click('device-license-unassign-button');

		const update = vi.fn(async () => {
			throw new Error('update failed');
		});
		await expect(submit()({ result: { type: 'failure', status: 409 }, update })).rejects.toThrow(
			'update failed'
		);
		flushSync();

		expect(dialog()?.open).toBe(false);
		expect(byId('device-license-unassign-button')?.disabled).toBe(false);
	});

	it("shows the unassign result as a notice, and no other action's", () => {
		render(SEAT, { action: 'unassignLicense', success: true, message: 'Unassigned' });
		expect(document.querySelector('.app-notice--success')?.textContent).toContain('Unassigned');
		view?.unmount();

		render(SEAT, { action: 'unassignLicense', success: false, message: 'Seat is locked' });
		expect(document.querySelector('.app-notice--danger')?.textContent).toContain('Seat is locked');
		view?.unmount();

		render(SEAT, { action: 'unassignLicense', success: true });
		expect(document.querySelector('.app-notice')).toBeNull();
		view?.unmount();

		render(SEAT, { action: 'updateDevice', success: true, message: 'Device saved' });
		expect(text()).not.toContain('Device saved');
		expect(document.querySelector('.app-notice')).toBeNull();
	});
});

describe('DeviceLicenseCard without a license', () => {
	it('says so and leads to billing', () => {
		render(null);

		expect(document.querySelector('.cw-chip')).toBeNull();
		expect(document.querySelector('.app-notice--neutral')?.textContent).toContain(
			m.devices_license_none_assigned()
		);
		expect(document.querySelector('input[name="licenseId"]')).toBeNull();
		expect(byId('device-license-unassign-button')).toBeNull();

		click('device-license-go-to-billing-button');

		expect(goto).toHaveBeenCalledWith('/account/billing');
	});
});
