import { flushSync, tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type {
	BillingLicense,
	BillingProduct,
	DeviceSubscriptionState,
	ReportingSubscriptionState,
	SubscriptionStateResponse
} from '$lib/api/api.dtos';
import { formatCurrency, formatDate } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import BillingPage from './+page.svelte';

const { goto, invalidateAll, replaceState, appPage } = vi.hoisted(() => ({
	goto: vi.fn(),
	invalidateAll: vi.fn(async () => {}),
	replaceState: vi.fn(),
	appPage: { state: { shallow: 'kept' } }
}));
vi.mock('$app/navigation', () => ({ goto, invalidateAll, replaceState }));
vi.mock('$app/state', () => ({ page: appPage }));

const PERIOD_END = '2026-11-01T00:00:00.000Z';

function subscribedDevice(
	overrides: Partial<DeviceSubscriptionState> = {}
): DeviceSubscriptionState {
	return {
		subscriptionId: 'sub_1',
		status: 'active',
		seats: 5,
		minimumSeats: 3,
		assignedCount: 2,
		availableCount: 3,
		currentPeriodEnd: PERIOD_END,
		cancelAtPeriodEnd: false,
		...overrides
	};
}

const NO_DEVICE_SUB = subscribedDevice({
	subscriptionId: null,
	status: null,
	seats: 0,
	assignedCount: 0,
	availableCount: 0,
	currentPeriodEnd: null
});

function reporting(
	overrides: Partial<ReportingSubscriptionState> = {}
): ReportingSubscriptionState {
	return {
		subscriptionId: null,
		status: null,
		currentPeriodEnd: null,
		cancelAtPeriodEnd: false,
		entitled: false,
		manual: false,
		...overrides
	};
}

function product(priceAmount: number | null, priceCurrency: string | null = 'usd'): BillingProduct {
	return {
		id: 'price_1',
		name: 'Product',
		description: null,
		recurringInterval: 'month',
		prices: [{ amountType: 'per_unit', priceAmount, priceCurrency }]
	};
}

function license(overrides: Partial<BillingLicense>): BillingLicense {
	return {
		id: 1,
		seatIndex: 0,
		status: 'unassigned',
		devEui: null,
		deviceName: null,
		manual: false,
		...overrides
	};
}

interface PageDataInit {
	state?: Partial<SubscriptionStateResponse>;
	products?: { device: BillingProduct | null; reporting: BillingProduct | null };
	devices?: { dev_eui: string; name: string; location_id: number | null }[];
	locations?: { location_id: number; name: string }[];
	devicesLoadFailed?: boolean;
	loadFailed?: boolean;
}

function pageData(init: PageDataInit = {}) {
	return {
		authToken: 'jwt-token',
		state: {
			billingMode: 'stripe' as const,
			device: subscribedDevice(),
			reporting: reporting(),
			licenses: [],
			...init.state
		},
		products: init.products ?? { device: product(1500), reporting: product(5000) },
		devices: init.devices ?? [],
		locations: init.locations ?? [],
		devicesLoadFailed: init.devicesLoadFailed ?? false,
		loadFailed: init.loadFailed ?? false
	};
}

let view: ReturnType<typeof renderWithServices> | null = null;
let services: MockServices;
const originalHref = location.href;

function render(init: PageDataInit = {}) {
	services = createMockServices();
	view = renderWithServices(BillingPage, {
		props: { data: pageData(init) } as never,
		services,
		app: { accessToken: 'jwt-token' }
	});
	return view;
}

afterEach(() => {
	view?.unmount();
	view = null;
	document.body.innerHTML = '';
	history.replaceState(history.state, '', originalHref);
	goto.mockReset();
	invalidateAll.mockReset();
	invalidateAll.mockImplementation(async () => {});
	replaceState.mockReset();
});

const text = () => document.body.textContent ?? '';
const byId = <T extends HTMLElement = HTMLButtonElement>(id: string) =>
	document.getElementById(id) as T | null;
const dialogOf = (buttonId: string) => byId(buttonId)?.closest('dialog') ?? null;
const chips = () => [...document.querySelectorAll('.cw-chip')] as HTMLElement[];
const chip = (label: string) => chips().find((el) => el.textContent?.trim() === label);
const usd = (amount: number) => formatCurrency(amount, 'USD');
/** The "+N licenses = +" start of the add-licenses preview, whatever the amount. */
const addPreviewStart = (count: number) =>
	m.billing_add_licenses_preview({ count, amount: '§' }).split('§')[0];

function type(id: string, value: string) {
	const input = byId<HTMLInputElement>(id);
	if (!input) throw new Error(`No input #${id}`);
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function click(id: string) {
	const button = byId(id);
	if (!button) throw new Error(`No button #${id}`);
	button.click();
	flushSync();
}

/** Opens the assign/move dropdown and picks the option with this label. */
function pickDevice(label: string) {
	click('account-billing-assign-device-select');
	const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
		(el) => el.textContent?.trim() === label
	);
	if (!option) throw new Error(`No option "${label}"`);
	option.click();
	flushSync();
}

const optionLabels = () => {
	click('account-billing-assign-device-select');
	const labels = [...document.querySelectorAll('[role="option"]')].map((el) =>
		el.textContent?.trim()
	);
	click('account-billing-assign-device-select');
	return labels;
};

describe('billing page: device licenses', () => {
	it('shows the subscription, its renewal and what more licenses cost', () => {
		render();

		expect(text()).toContain(m.billing_devices_summary({ total: 5, assigned: 2, available: 3 }));
		expect(text()).toContain(`${usd(15)}${m.billing_per_month()}`);
		expect(chip(m.billing_status_active())?.className).toContain('cw-chip--success');
		expect(text()).toContain(m.billing_renews_on({ date: formatDate(PERIOD_END) }));
		expect(byId<HTMLInputElement>('account-billing-add-licenses-input')?.value).toBe('1');
		expect(text()).toContain(m.billing_add_licenses_preview({ count: 1, amount: usd(15) }));
		expect(text()).toContain(m.billing_reduce_hint());
		expect(text()).toContain(m.billing_device_min_notice({ min: 3 }));
		expect(byId('account-billing-device-cancel-button')?.disabled).toBe(false);
		expect(byId('account-billing-buy-quantity-input')).toBeNull();
		expect(text()).not.toContain(m.billing_manual_notice());
		expect(text()).not.toContain(m.billing_load_error());
	});

	it('adds licenses on top of the current seats, then reloads', async () => {
		const { toasts } = render();
		services.billing.changeDeviceSeats.mockResolvedValue({ seats: 7 });

		type('account-billing-add-licenses-input', '2');
		expect(text()).toContain(m.billing_add_licenses_preview({ count: 2, amount: usd(30) }));
		click('account-billing-add-licenses-button');

		await expect.poll(() => invalidateAll.mock.calls.length).toBe(1);
		expect(services.billing.changeDeviceSeats).toHaveBeenCalledWith({ seats: 7 });
		expect(toasts().at(-1)).toMatchObject({
			tone: 'success',
			message: m.billing_add_licenses_success()
		});
		await expect
			.poll(() => byId<HTMLInputElement>('account-billing-add-licenses-input')?.value)
			.toBe('1');
	});

	it('keeps every action disabled while a change is in flight', async () => {
		render({
			state: {
				licenses: [license({ id: 4 }), license({ id: 5, devEui: 'A1', deviceName: 'Pump' })]
			}
		});
		let finish!: (value: { seats: number }) => void;
		services.billing.changeDeviceSeats.mockReturnValue(
			new Promise((resolve) => (finish = resolve))
		);

		click('account-billing-add-licenses-button');

		for (const id of [
			'account-billing-add-licenses-button',
			'account-billing-device-cancel-button',
			'account-billing-license-4-assign-button',
			'account-billing-license-5-move-button',
			'account-billing-license-5-unassign-button',
			'account-billing-portal-button'
		]) {
			expect(byId(id)?.disabled, id).toBe(true);
		}
		finish({ seats: 6 });
		await expect.poll(() => byId('account-billing-portal-button')?.disabled).toBe(false);
	});

	it('does not offer an invalid addition, or any change once cancellation is scheduled', () => {
		render();
		expect(text()).toContain(addPreviewStart(1));
		type('account-billing-add-licenses-input', '0');

		expect(byId('account-billing-add-licenses-button')?.disabled).toBe(true);
		expect(text()).not.toContain(addPreviewStart(1));
		expect(text()).not.toContain(addPreviewStart(0));
		// A fraction is not rounded down to a whole number of licenses.
		type('account-billing-add-licenses-input', '2.5');
		expect(byId('account-billing-add-licenses-button')?.disabled).toBe(true);
		expect(text()).not.toContain(addPreviewStart(2));
		view?.unmount();

		render({ state: { device: subscribedDevice({ cancelAtPeriodEnd: true }) } });
		expect(text()).toContain(m.billing_ends_on({ date: formatDate(PERIOD_END) }));
		expect(byId('account-billing-add-licenses-button')?.disabled).toBe(true);
		expect(byId('account-billing-device-cancel-button')?.disabled).toBe(true);
	});

	it('cancels the device subscription after confirming', async () => {
		const { toasts } = render();
		services.billing.cancelDeviceSubscription.mockResolvedValue({ status: 'active' });

		click('account-billing-device-cancel-button');
		const dialog = dialogOf('account-billing-device-cancel-confirm-button');
		expect(dialog?.open).toBe(true);
		expect(dialog?.textContent).toContain(m.billing_device_cancel_title());
		expect(dialog?.textContent).toContain(m.billing_device_cancel_body());
		click('account-billing-device-cancel-dismiss-button');
		expect(dialog?.open).toBe(false);

		click('account-billing-device-cancel-button');
		click('account-billing-device-cancel-confirm-button');

		await expect.poll(() => dialog?.open).toBe(false);
		expect(services.billing.cancelDeviceSubscription).toHaveBeenCalledWith({ atPeriodEnd: true });
		expect(toasts().at(-1)).toMatchObject({
			tone: 'success',
			message: m.billing_device_canceled_toast()
		});
		expect(invalidateAll).toHaveBeenCalledTimes(1);
	});

	it('offers a purchase from the minimum when there is no subscription', async () => {
		render({ state: { device: NO_DEVICE_SUB } });
		services.billing.createDeviceCheckout.mockResolvedValue({ checkoutUrl: '#stripe-checkout' });

		expect(byId<HTMLInputElement>('account-billing-buy-quantity-input')?.value).toBe('3');
		expect(text()).toContain(m.billing_buy_preview({ count: 3, amount: usd(45) }));
		expect(text()).toContain(m.billing_device_min_notice({ min: 3 }));
		expect(chip(m.billing_status_none())).toBeDefined();
		expect(byId('account-billing-add-licenses-input')).toBeNull();

		type('account-billing-buy-quantity-input', '2');
		expect(byId('account-billing-buy-devices-button')?.disabled).toBe(true);
		expect(text()).not.toContain(m.billing_buy_preview({ count: 2, amount: usd(30) }));

		// "3.9" does not buy 3.
		type('account-billing-buy-quantity-input', '3.9');
		expect(byId('account-billing-buy-devices-button')?.disabled).toBe(true);
		expect(text()).not.toContain(m.billing_buy_preview({ count: 3, amount: usd(45) }));

		type('account-billing-buy-quantity-input', '4');
		click('account-billing-buy-devices-button');

		// The browser leaves for Stripe Checkout (a fragment here, so the test page stays).
		await expect.poll(() => location.hash).toBe('#stripe-checkout');
		expect(services.billing.createDeviceCheckout).toHaveBeenCalledWith({ quantity: 4 });
		expect(byId('account-billing-buy-devices-button')?.disabled).toBe(true);
	});

	it('reports a failed checkout and lets the user retry', async () => {
		const { toasts } = render({ state: { device: NO_DEVICE_SUB } });
		services.billing.createDeviceCheckout.mockRejectedValue(
			new ApiError(502, 'Bad Gateway', {
				url: 'https://api.cropwatch.test/payments/subscriptions/device/checkout',
				payload: { message: 'Stripe is unavailable' }
			})
		);

		click('account-billing-buy-devices-button');

		await expect
			.poll(() => toasts().at(-1))
			.toMatchObject({ tone: 'danger', message: 'Stripe is unavailable' });
		expect(byId('account-billing-buy-devices-button')?.disabled).toBe(false);
	});

	it('shows staff-managed billing as included, with nothing to buy or cancel', () => {
		render({
			state: {
				billingMode: 'manual',
				device: subscribedDevice({ subscriptionId: null }),
				reporting: reporting({ manual: true, status: null })
			}
		});

		expect(text()).toContain(m.billing_manual_notice());
		expect(
			chips().filter((el) => el.textContent?.trim() === m.billing_manual_included())
		).toHaveLength(2);
		expect(text()).not.toContain(m.billing_per_month());
		for (const id of [
			'account-billing-add-licenses-input',
			'account-billing-buy-quantity-input',
			'account-billing-device-cancel-button',
			'account-billing-reporting-subscribe-button',
			'account-billing-reporting-cancel-button',
			'account-billing-portal-button'
		]) {
			expect(byId(id), id).toBeNull();
		}
	});
});

describe('billing page: reporting', () => {
	it('shows active reporting with its price and renewal, and cancels it after confirming', async () => {
		const { toasts } = render({
			state: { reporting: reporting({ status: 'trialing', currentPeriodEnd: PERIOD_END }) }
		});
		services.billing.cancelReportingSubscription.mockResolvedValue({ status: 'trialing' });

		expect(document.querySelector('.billing-price')?.textContent).toBe(
			`${usd(50)}${m.billing_per_month()}`
		);
		expect(chip(m.billing_status_trialing())?.className).toContain('cw-chip--success');
		expect(text()).toContain(m.billing_renews_on({ date: formatDate(PERIOD_END) }));

		click('account-billing-reporting-cancel-button');
		const dialog = dialogOf('account-billing-reporting-cancel-confirm-button');
		expect(dialog?.open).toBe(true);
		expect(dialog?.textContent).toContain(m.billing_reporting_cancel_body());
		click('account-billing-reporting-cancel-dismiss-button');
		expect(dialog?.open).toBe(false);

		click('account-billing-reporting-cancel-button');
		click('account-billing-reporting-cancel-confirm-button');

		await expect.poll(() => dialog?.open).toBe(false);
		expect(services.billing.cancelReportingSubscription).toHaveBeenCalledWith({
			atPeriodEnd: true
		});
		expect(toasts().at(-1)).toMatchObject({
			tone: 'success',
			message: m.billing_reporting_canceled_toast()
		});
		expect(invalidateAll).toHaveBeenCalledTimes(1);
	});

	it('shows a scheduled reporting cancellation', () => {
		render({
			state: {
				reporting: reporting({
					status: 'past_due',
					currentPeriodEnd: PERIOD_END,
					cancelAtPeriodEnd: true
				})
			},
			products: { device: product(1500), reporting: null }
		});

		expect(chip(m.billing_status_past_due())?.className).toContain('cw-chip--warning');
		expect(text()).toContain(m.billing_ends_on({ date: formatDate(PERIOD_END) }));
		expect(document.querySelector('.billing-price')).toBeNull();
		expect(byId('account-billing-reporting-cancel-button')?.disabled).toBe(true);
	});

	it('offers a reporting subscription with its price', async () => {
		render({ state: { reporting: reporting({ status: 'canceled' }) } });
		services.billing.createReportingCheckout.mockResolvedValue({
			checkoutUrl: '#stripe-reporting'
		});

		expect(text()).toContain(m.billing_reporting_none_notice());
		expect(chip(m.billing_status_canceled())?.className).toContain('cw-chip--danger');
		expect(byId('account-billing-reporting-subscribe-button')?.textContent?.trim()).toBe(
			`${m.billing_reporting_subscribe()} — ${usd(50)}${m.billing_per_month()}`
		);
		click('account-billing-reporting-subscribe-button');

		await expect.poll(() => location.hash).toBe('#stripe-reporting');
		expect(services.billing.createReportingCheckout).toHaveBeenCalledWith();
	});

	it('names the reporting subscription without a price when none is known', () => {
		render({ products: { device: null, reporting: null } });

		expect(byId('account-billing-reporting-subscribe-button')?.textContent?.trim()).toBe(
			m.billing_reporting_subscribe()
		);
		// Without a device price there is no price line and no preview either.
		expect(text()).not.toContain(m.billing_per_month());
	});
});

describe('billing page: prices and statuses', () => {
	it('formats prices in their currency, defaulting to USD', () => {
		render({ products: { device: product(15000, 'jpy'), reporting: product(900, null) } });
		expect(text()).toContain(`${formatCurrency(15000, 'JPY')}${m.billing_per_month()}`);
		expect(document.querySelector('.billing-price')).toBeNull();
		view?.unmount();

		render({
			state: { reporting: reporting({ status: 'active' }) },
			products: { device: product(1500, 'x'), reporting: product(900, null) }
		});
		// An unknown currency code falls back to two decimals.
		expect(text()).toContain(`${formatCurrency(15, 'X')}${m.billing_per_month()}`);
		expect(document.querySelector('.billing-price')?.textContent).toBe(
			`${usd(9)}${m.billing_per_month()}`
		);
	});

	it('shows no price for a product without an amount', () => {
		render({
			products: {
				device: product(null),
				reporting: { ...product(500), prices: [] }
			},
			state: { reporting: reporting({ status: 'active' }) }
		});

		expect(text()).not.toContain(m.billing_per_month());
		expect(text()).not.toContain(addPreviewStart(1));
	});

	it('tones each subscription status', () => {
		render({
			state: {
				device: subscribedDevice({ status: 'past_due' }),
				reporting: reporting({ status: 'incomplete' })
			}
		});
		expect(chip(m.billing_status_past_due())?.className).toContain('cw-chip--warning');
		expect(chip(m.billing_status_none())?.className).toContain('cw-chip--secondary');
		view?.unmount();

		render({ state: { device: subscribedDevice({ status: 'canceled' }) } });
		expect(chip(m.billing_status_canceled())?.className).toContain('cw-chip--danger');
		view?.unmount();

		render({ state: { device: subscribedDevice({ status: 'incomplete' }) } });
		expect(chips().filter((el) => el.textContent?.trim() === m.billing_status_none())).toHaveLength(
			2
		);
	});
});

describe('billing page: licenses', () => {
	const DEVICES = [
		{ dev_eui: 'A1', name: 'Pump', location_id: 8 },
		{ dev_eui: 'B2', name: 'B2', location_id: null },
		{ dev_eui: 'C3', name: 'Heater', location_id: 9 },
		{ dev_eui: 'E5', name: 'Zeta sensor', location_id: 8 },
		{ dev_eui: 'F6', name: 'Alpha sensor', location_id: 8 },
		{ dev_eui: 'G7', name: 'Fan', location_id: 10 },
		{ dev_eui: 'H8', name: 'Orphan', location_id: null },
		// In a location the user cannot see: listed with the devices without one.
		{ dev_eui: 'J9', name: 'Mystery', location_id: 99 }
	];
	const LOCATIONS = [
		{ location_id: 8, name: 'Barn' },
		{ location_id: 10, name: 'Attic' }
	];
	const LICENSES = [
		license({ id: 11, seatIndex: 0, status: 'assigned', devEui: 'A1', deviceName: 'Pump' }),
		license({ id: 12, seatIndex: 1, status: 'assigned', devEui: 'B2', deviceName: null }),
		license({ id: 13, seatIndex: 2, status: 'assigned', devEui: 'C3', deviceName: 'Heater' }),
		license({ id: 14, seatIndex: 3, status: 'assigned', devEui: 'D4', deviceName: 'Gone' }),
		license({ id: 15, seatIndex: 4 }),
		license({ id: 16, seatIndex: 5, manual: true })
	];

	function renderLicenses(init: PageDataInit = {}) {
		return render({
			devices: DEVICES,
			locations: LOCATIONS,
			...init,
			state: { licenses: LICENSES, ...init.state }
		});
	}

	const row = (id: number) =>
		byId(`account-billing-license-${id}-move-button`)?.closest('.license-row') ??
		byId(`account-billing-license-${id}-assign-button`)?.closest('.license-row');

	it('lists each license with its device and location', () => {
		renderLicenses();

		expect(row(11)?.textContent).toContain(m.billing_license_seat({ seat: 1 }));
		const deviceLink = byId<HTMLAnchorElement>('account-billing-license-11-device-link');
		expect(deviceLink?.getAttribute('href')).toBe('/locations/8/devices/A1');
		expect(deviceLink?.textContent).toBe('Pump');
		const locationLink = byId<HTMLAnchorElement>('account-billing-license-11-location-link');
		expect(locationLink?.getAttribute('href')).toBe('/locations/8');
		expect(locationLink?.textContent).toBe('Barn');

		// No location: the device is plain text, named by its DevEUI.
		expect(byId('account-billing-license-12-device-link')).toBeNull();
		expect(row(12)?.textContent).toContain('B2');
		expect(row(12)?.textContent).toContain('—');

		// A location the user cannot see: the device still links, the location is a dash.
		expect(byId('account-billing-license-13-device-link')?.getAttribute('href')).toBe(
			'/locations/9/devices/C3'
		);
		expect(byId('account-billing-license-13-location-link')).toBeNull();
		expect(row(13)?.textContent).toContain('—');

		// A device the user no longer has.
		expect(byId('account-billing-license-14-device-link')).toBeNull();
		expect(row(14)?.textContent).toContain('Gone');

		expect(row(15)?.textContent).toContain(m.billing_license_unassigned());
		expect(byId('account-billing-license-15-unassign-button')).toBeNull();
		// Five Stripe licenses, minimum three: an unassigned one can be cancelled.
		expect(byId('account-billing-license-15-seat-cancel-button')).not.toBeNull();
		// Staff-granted seats cannot.
		expect(byId('account-billing-license-16-seat-cancel-button')).toBeNull();
		expect(byId('account-billing-license-16-assign-button')).not.toBeNull();
	});

	it('only offers cancelling a seat above the minimum', () => {
		renderLicenses({ state: { device: subscribedDevice({ minimumSeats: 5 }) } });

		expect(byId('account-billing-license-15-assign-button')).not.toBeNull();
		expect(byId('account-billing-license-15-seat-cancel-button')).toBeNull();
	});

	it('says when there are no licenses', () => {
		render();

		expect(text()).toContain(m.billing_license_none());
		expect(document.querySelector('.license-row')).toBeNull();
	});

	it('assigns a free license to a device, offering free devices by location then name', async () => {
		const { toasts } = renderLicenses();
		services.billing.assignLicense.mockResolvedValue({} as never);

		click('account-billing-license-15-assign-button');
		const dialog = dialogOf('account-billing-assign-confirm-button');
		expect(dialog?.open).toBe(true);
		expect(dialog?.textContent).toContain(m.billing_assign_title());
		expect(byId('account-billing-assign-confirm-button')?.textContent?.trim()).toBe(
			m.billing_assign()
		);
		expect(byId('account-billing-assign-confirm-button')?.disabled).toBe(true);
		expect(optionLabels()).toEqual([
			'Attic — Fan',
			'Barn — Alpha sensor',
			'Barn — Zeta sensor',
			'Mystery',
			'Orphan'
		]);

		pickDevice('Barn — Alpha sensor');
		click('account-billing-assign-confirm-button');

		await expect.poll(() => dialog?.open).toBe(false);
		expect(services.billing.assignLicense).toHaveBeenCalledWith(15, 'F6');
		expect(toasts().at(-1)).toMatchObject({
			tone: 'success',
			message: m.billing_license_assigned()
		});
		expect(invalidateAll).toHaveBeenCalledTimes(1);
	});

	it('moves an assigned license to another device', async () => {
		const { toasts } = renderLicenses();
		services.billing.moveLicense.mockResolvedValue({} as never);

		click('account-billing-license-11-move-button');
		const dialog = dialogOf('account-billing-assign-confirm-button');
		expect(dialog?.textContent).toContain(m.billing_move_title());
		expect(byId('account-billing-assign-confirm-button')?.textContent?.trim()).toBe(
			m.billing_move()
		);
		pickDevice('Orphan');
		click('account-billing-assign-confirm-button');

		await expect.poll(() => dialog?.open).toBe(false);
		expect(services.billing.moveLicense).toHaveBeenCalledWith(11, 'H8');
		expect(toasts().at(-1)).toMatchObject({ tone: 'success', message: m.billing_license_moved() });
	});

	it('closes the assign dialog on cancel, and says when no device is free', () => {
		renderLicenses({ devices: DEVICES.filter((d) => ['A1', 'B2', 'C3'].includes(d.dev_eui)) });

		click('account-billing-license-15-assign-button');
		const dialog = dialogOf('account-billing-assign-confirm-button');
		expect(dialog?.textContent).toContain(m.billing_assign_no_devices());
		expect(byId('account-billing-assign-device-select')).toBeNull();
		click('account-billing-assign-dismiss-button');

		expect(dialog?.open).toBe(false);
		expect(services.billing.assignLicense).not.toHaveBeenCalled();
	});

	it('says the devices could not be loaded instead of saying none is free', () => {
		renderLicenses({ devices: [], devicesLoadFailed: true });

		click('account-billing-license-15-assign-button');

		const dialog = dialogOf('account-billing-assign-confirm-button');
		const notice = dialog?.querySelector('.app-notice');
		expect(notice?.classList.contains('app-notice--danger')).toBe(true);
		expect(notice?.textContent?.trim()).toBe(m.billing_devices_load_error());
		expect(dialog?.textContent).not.toContain(m.billing_assign_no_devices());
		expect(byId('account-billing-assign-confirm-button')?.disabled).toBe(true);
		// The rest of the page still works from the data that did load.
		expect(row(11)?.textContent).toContain('Pump');
		expect(text()).not.toContain(m.billing_load_error());
	});

	it('unassigns a license', async () => {
		const { toasts } = renderLicenses();
		services.billing.unassignLicense.mockResolvedValue({} as never);

		click('account-billing-license-11-unassign-button');

		await expect
			.poll(() => toasts().at(-1))
			.toMatchObject({ tone: 'success', message: m.billing_license_unassigned_toast() });
		expect(services.billing.unassignLicense).toHaveBeenCalledWith(11);
		expect(invalidateAll).toHaveBeenCalledTimes(1);
	});

	it('cancels a free seat after confirming, or keeps it', async () => {
		const { toasts } = renderLicenses();
		services.billing.cancelLicense.mockResolvedValue({ canceled: true });

		click('account-billing-license-15-seat-cancel-button');
		const dialog = dialogOf('account-billing-seat-cancel-confirm-button');
		expect(dialog?.open).toBe(true);
		expect(dialog?.textContent).toContain(m.billing_seat_cancel_body());
		click('account-billing-seat-cancel-dismiss-button');
		expect(dialog?.open).toBe(false);

		click('account-billing-license-15-seat-cancel-button');
		click('account-billing-seat-cancel-confirm-button');

		await expect.poll(() => dialog?.open).toBe(false);
		expect(services.billing.cancelLicense).toHaveBeenCalledWith(15);
		expect(toasts().at(-1)).toMatchObject({
			tone: 'success',
			message: m.billing_seat_canceled_toast()
		});
	});
});

describe('billing page: around the cards', () => {
	it('warns when the billing details could not be loaded', () => {
		render({ loadFailed: true });

		expect(text()).toContain(m.billing_load_error());
	});

	it('goes back to the dashboard', () => {
		render();

		click('account-billing-back-button');

		expect(goto).toHaveBeenCalledWith('/');
	});

	it('opens the Stripe billing portal, or reports why it cannot', async () => {
		const { toasts } = render();
		services.billing.openBillingPortal
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockResolvedValueOnce({ portalUrl: '#stripe-portal' });

		click('account-billing-portal-button');
		await expect
			.poll(() => toasts().at(-1))
			.toMatchObject({ tone: 'danger', message: m.generic_error() });
		await expect.poll(() => byId('account-billing-portal-button')?.disabled).toBe(false);

		click('account-billing-portal-button');
		await expect.poll(() => location.hash).toBe('#stripe-portal');
		expect(services.billing.openBillingPortal).toHaveBeenCalledTimes(2);
	});

	/** The page's URL as Stripe sends the buyer back to it, with another parameter. */
	function returnFromCheckout(outcome: string) {
		const url = new URL(originalHref);
		url.searchParams.set('tab', 'licenses');
		url.searchParams.set('checkout', outcome);
		history.replaceState(history.state, '', url);
	}

	/** The URL the page put in place of the current one, if it did. */
	async function replacedUrl() {
		await expect.poll(() => replaceState.mock.calls.length).toBe(1);
		const [url, state] = replaceState.mock.calls[0] as [URL | string, unknown];
		expect(state).toBe(appPage.state);
		return new URL(url, location.href);
	}

	it('thanks the buyer back from Checkout, reloads the subscription and drops the flag', async () => {
		returnFromCheckout('success');

		const { toasts } = render();

		await expect
			.poll(() => toasts().at(-1))
			.toMatchObject({ tone: 'success', message: m.billing_checkout_success() });
		expect(invalidateAll).toHaveBeenCalledTimes(1);
		// Shown once: a reload of the page does not thank the buyer again.
		const url = await replacedUrl();
		expect(url.searchParams.has('checkout')).toBe(false);
		expect(url.searchParams.get('tab')).toBe('licenses');
		expect(url.pathname).toBe(location.pathname);
		expect(toasts()).toHaveLength(1);
	});

	it('says nothing was charged after a cancelled Checkout, and drops the flag', async () => {
		returnFromCheckout('cancel');

		const { toasts } = render();

		await expect
			.poll(() => toasts().at(-1))
			.toMatchObject({ tone: 'secondary', message: m.billing_checkout_canceled() });
		expect(invalidateAll).not.toHaveBeenCalled();
		const url = await replacedUrl();
		expect(url.searchParams.has('checkout')).toBe(false);
		expect(url.searchParams.get('tab')).toBe('licenses');
	});

	it('shows no checkout message on a normal visit, and leaves the URL alone', async () => {
		const { toasts } = render();
		await tick();

		expect(toasts()).toEqual([]);
		expect(invalidateAll).not.toHaveBeenCalled();
		expect(replaceState).not.toHaveBeenCalled();
	});

	it('leaves an unknown checkout outcome alone', async () => {
		returnFromCheckout('later');

		const { toasts } = render();
		await tick();

		expect(toasts()).toEqual([]);
		expect(replaceState).not.toHaveBeenCalled();
	});
});
