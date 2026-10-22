import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatHexPairs } from '$lib/devices/eui';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import SetupOutcome from './SetupOutcome.svelte';
import type { SetupFailure } from './device-setup-flow.svelte';
import { supportHref } from './setup-messages';

const { goto } = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto }));

const DEV_EUI = '00137A10000441DF';

let view: ReturnType<typeof renderWithServices> | null = null;
const callbacks = {
	onretry: vi.fn(),
	onchangeidentity: vi.fn(),
	onchangelicense: vi.fn(),
	onopenlocation: vi.fn()
};

function failure(code: SetupFailure['code'], overrides: Partial<SetupFailure> = {}): SetupFailure {
	return { code, message: null, reference: null, details: {}, ...overrides };
}

function render(value: SetupFailure) {
	view = renderWithServices(SetupOutcome, {
		props: { failure: value, devEui: DEV_EUI, ...callbacks }
	});
	return view;
}

const notice = () => document.querySelector<HTMLElement>('.app-notice');
const title = () => notice()?.querySelector('.app-notice__title')?.textContent ?? '';
const actionButtons = () =>
	[...document.querySelectorAll<HTMLButtonElement>('[id^="device-setup-outcome-"]')].map(
		(button) => ({
			id: button.id.replace('device-setup-outcome-', ''),
			label: button.textContent?.trim(),
			primary: button.classList.contains('cw-button--primary')
		})
	);
const click = (action: string) =>
	document.getElementById(`device-setup-outcome-${action}`)?.click();

/** Records (and cancels) the page navigations a click starts, such as the support mail link. */
function captureNavigations() {
	const urls: string[] = [];
	const navigation = (window as unknown as { navigation: EventTarget }).navigation;
	const onNavigate = (event: Event) => {
		urls.push((event as Event & { destination: { url: string } }).destination.url);
		event.preventDefault();
	};
	navigation.addEventListener('navigate', onNavigate);
	return { urls, stop: () => navigation.removeEventListener('navigate', onNavigate) };
}

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
	for (const callback of Object.values(callbacks)) callback.mockReset();
});

describe('SetupOutcome', () => {
	it('explains a device owned by another account, offering support first', () => {
		render(failure('DEVICE_OWNED_BY_OTHER_ACCOUNT', { reference: 'CW-ABC123' }));

		expect(notice()?.classList).toContain('app-notice--danger');
		expect(notice()?.getAttribute('aria-live')).toBe('polite');
		expect(title()).toBe(m.device_setup_owned_other_title());
		expect(notice()?.textContent).toContain(
			m.device_setup_owned_other_body({ dev_eui: formatHexPairs(DEV_EUI) })
		);
		expect(actionButtons()).toEqual([
			{ id: 'support', label: m.device_setup_contact_support(), primary: true },
			{ id: 'identity', label: m.device_setup_check_dev_eui(), primary: false }
		]);

		click('identity');
		expect(callbacks.onchangeidentity).toHaveBeenCalledTimes(1);
	});

	it('mails support with the reference and the DevEUI', async () => {
		const navigations = captureNavigations();
		try {
			render(failure('NETWORK_EUI_CLAIMED_ELSEWHERE', { reference: 'CW-ABC123' }));
			click('support');

			await expect.poll(() => navigations.urls).toEqual([supportHref('CW-ABC123', DEV_EUI)]);
		} finally {
			navigations.stop();
		}
		expect(title()).toBe(m.device_setup_claimed_elsewhere_title());
		expect(notice()?.textContent).toContain(m.device_setup_claimed_elsewhere_body());
		expect(actionButtons()).toEqual([
			{ id: 'support', label: m.device_setup_contact_support(), primary: true }
		]);
	});

	it('links to a device that is already yours', () => {
		render(
			failure('DEVICE_ALREADY_YOURS', {
				details: { name: '2nd Floor', location_id: 12, location_name: 'Barn' }
			})
		);

		expect(notice()?.classList).toContain('app-notice--warning');
		expect(title()).toBe(m.device_setup_already_yours_title());
		expect(notice()?.textContent).toContain(
			m.device_setup_already_yours_body({ name: '2nd Floor', location: 'Barn' })
		);
		expect(actionButtons()).toEqual([
			{ id: 'open', label: m.device_setup_open_device({ name: '2nd Floor' }), primary: true }
		]);

		click('open');
		expect(goto).toHaveBeenCalledWith(`/locations/12/devices/${DEV_EUI}`);
	});

	it('offers no link when it does not know where your device is', () => {
		render(failure('DEVICE_ALREADY_YOURS', { details: { location_id: '12' } }));

		expect(notice()?.textContent).toContain(
			m.device_setup_already_yours_body({ name: '', location: '—' })
		);
		expect(actionButtons()).toEqual([]);
		expect(notice()?.querySelector('.flex')).toBeNull();
	});

	it('lets the user retry or ask support when the network is unavailable', () => {
		render(failure('NETWORK_UNAVAILABLE'));

		expect(notice()?.classList).toContain('app-notice--danger');
		expect(title()).toBe(m.device_setup_network_unavailable_title());
		expect(notice()?.textContent).toContain(m.device_setup_network_unavailable_body());
		expect(actionButtons()).toEqual([
			{ id: 'retry', label: m.device_setup_retry(), primary: true },
			{ id: 'support', label: m.device_setup_contact_support(), primary: false }
		]);

		click('retry');
		expect(callbacks.onretry).toHaveBeenCalledTimes(1);
	});

	it('points to the location while a setup is already running', () => {
		render(failure('SETUP_IN_PROGRESS'));

		expect(notice()?.classList).toContain('app-notice--warning');
		expect(title()).toBe(m.device_setup_in_progress_title());
		expect(notice()?.textContent).toContain(m.device_setup_in_progress_body());
		expect(actionButtons()).toEqual([
			{ id: 'location', label: m.device_setup_open_location(), primary: true }
		]);

		click('location');
		expect(callbacks.onopenlocation).toHaveBeenCalledTimes(1);
	});

	it('sends an unverifiable device to support', () => {
		render(failure('NETWORK_DEVICE_UNVERIFIABLE'));

		expect(notice()?.classList).toContain('app-notice--warning');
		expect(title()).toBe(m.device_setup_unverifiable_title());
		expect(notice()?.textContent).toContain(m.device_setup_unverifiable_body());
		expect(actionButtons()).toEqual([
			{ id: 'support', label: m.device_setup_contact_support(), primary: true }
		]);
	});

	it('asks for another model on a model mismatch or a model the region lacks', () => {
		render(failure('NETWORK_MODEL_MISMATCH'));
		expect(title()).toBe(m.device_setup_model_mismatch_title());
		expect(notice()?.textContent).toContain(m.device_setup_model_mismatch_body());
		expect(actionButtons()).toEqual([
			{ id: 'model', label: m.device_setup_change_model(), primary: true },
			{ id: 'support', label: m.device_setup_contact_support(), primary: false }
		]);
		click('model');
		expect(callbacks.onchangeidentity).toHaveBeenCalledTimes(1);
		view?.unmount();

		render(failure('MODEL_NOT_AVAILABLE_IN_REGION'));
		expect(notice()?.classList).toContain('app-notice--warning');
		expect(title()).toBe(m.device_setup_model_unavailable_title());
		expect(notice()?.textContent).toContain(m.device_setup_model_unsupported());
		expect(actionButtons().map((action) => action.id)).toEqual(['model', 'support']);
		click('model');
		expect(callbacks.onchangeidentity).toHaveBeenCalledTimes(2);
	});

	it('only explains a rate limit', () => {
		render(failure('RATE_LIMITED'));

		expect(notice()?.classList).toContain('app-notice--warning');
		expect(title()).toBe(m.device_setup_rate_limited_title());
		expect(notice()?.textContent).toContain(m.device_setup_rate_limited());
		expect(actionButtons()).toEqual([]);
	});

	it('offers another license or more licenses when the license is gone', () => {
		for (const code of ['LICENSE_UNAVAILABLE', 'LICENSE_REQUIRED'] as const) {
			render(failure(code));

			expect(notice()?.classList).toContain('app-notice--warning');
			expect(title()).toBe(m.device_setup_license_unavailable_title());
			expect(notice()?.textContent).toContain(m.device_setup_license_unavailable_body());
			expect(actionButtons()).toEqual([
				{ id: 'license', label: m.device_setup_change(), primary: true },
				{ id: 'billing', label: m.device_setup_add_licenses(), primary: false }
			]);
			view?.unmount();
			view = null;
		}

		render(failure('LICENSE_UNAVAILABLE'));
		click('license');
		expect(callbacks.onchangelicense).toHaveBeenCalledTimes(1);
		click('billing');
		expect(goto).toHaveBeenCalledWith('/account/billing');
	});

	it('explains a missing permission without actions', () => {
		render(failure('FORBIDDEN'));

		expect(notice()?.classList).toContain('app-notice--danger');
		expect(title()).toBe(m.device_setup_forbidden_title());
		expect(notice()?.textContent).toContain(m.device_setup_forbidden_body());
		expect(actionButtons()).toEqual([]);
	});

	it('falls back to a generic failure with retry and support, showing the reference', () => {
		render(failure('SETUP_FAILED', { reference: 'CW-XYZ789' }));

		expect(notice()?.classList).toContain('app-notice--danger');
		expect(title()).toBe(m.device_setup_failed_title());
		expect(notice()?.textContent).toContain(m.device_setup_failed_body());
		expect(actionButtons().map((action) => action.id)).toEqual(['retry', 'support']);
		expect(notice()?.textContent).toContain(
			m.device_setup_error_reference({ reference: 'CW-XYZ789' })
		);
	});

	it('shows no reference line without a reference', () => {
		render(failure('UNKNOWN'));

		expect(title()).toBe(m.device_setup_failed_title());
		expect(notice()?.querySelector('.text-xs')).toBeNull();
	});

	it('mails support without a reference when there is none', async () => {
		const navigations = captureNavigations();
		try {
			render(failure('UNKNOWN'));
			click('support');

			await expect.poll(() => navigations.urls).toEqual([supportHref(null, DEV_EUI)]);
		} finally {
			navigations.stop();
		}
	});
});
