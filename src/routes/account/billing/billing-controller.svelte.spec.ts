import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { DeviceSubscriptionState } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices } from '$lib/testing/mock-services';
import { BillingController } from './billing-controller.svelte';

function device(overrides: Partial<DeviceSubscriptionState> = {}): DeviceSubscriptionState {
	return {
		subscriptionId: 'sub_1',
		status: 'active',
		seats: 5,
		minimumSeats: 3,
		assignedCount: 2,
		availableCount: 3,
		currentPeriodEnd: '2026-11-01T00:00:00.000Z',
		cancelAtPeriodEnd: false,
		...overrides
	};
}

const apiError = (message: string, status = 400) =>
	new ApiError(status, 'Error', {
		url: 'https://api.cropwatch.test/payments',
		payload: { message }
	});

function setup(state: DeviceSubscriptionState = device()) {
	const { billing } = createMockServices();
	const toast = { add: vi.fn(() => 'toast-1') };
	const invalidateAll = vi.fn(async () => {});
	const redirect = vi.fn();
	const controller = new BillingController({
		billing,
		toast,
		invalidateAll,
		redirect,
		device: () => state
	});
	return { controller, billing, toast, invalidateAll, redirect };
}

/** A promise the test settles by hand, to look at the state mid-request. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}

describe('BillingController quantities', () => {
	it('starts a purchase at the minimum and an addition at one', () => {
		const { controller } = setup(device({ minimumSeats: 4 }));

		expect(controller.buyQty).toBe('4');
		expect(controller.buyCount).toBe(4);
		expect(controller.buyValid).toBe(true);
		expect(controller.addQty).toBe('1');
		expect(controller.addCount).toBe(1);
		expect(controller.addValid).toBe(true);
		expect(controller.busy).toBe(false);
	});

	it('accepts whole quantities from the minimum (purchase) or one (addition) up', () => {
		const { controller } = setup();

		for (const [qty, valid] of [
			['2', false],
			['3', true],
			['12', true],
			[' 4 ', true],
			['', false],
			['abc', false],
			// Never cut down to a whole number: "3.9" is not 3.
			['3.9', false],
			['4.0', false],
			['3abc', false],
			['-3', false]
		] as const) {
			controller.buyQty = qty;
			expect(controller.buyValid, `buy ${qty}`).toBe(valid);
		}
		for (const [qty, valid] of [
			['0', false],
			['1', true],
			['', false],
			['-2', false],
			['2.5', false],
			['1.', false],
			['2x', false]
		] as const) {
			controller.addQty = qty;
			expect(controller.addValid, `add ${qty}`).toBe(valid);
		}
	});

	it('counts exactly the whole number typed', () => {
		const { controller } = setup();

		controller.buyQty = '12';
		controller.addQty = ' 7 ';

		expect([controller.buyCount, controller.addCount]).toEqual([12, 7]);
	});
});

describe('BillingController Stripe redirects', () => {
	it('sends the buyer to Checkout for the chosen quantity, staying busy', async () => {
		const { controller, billing, redirect } = setup();
		billing.createDeviceCheckout.mockResolvedValue({ checkoutUrl: 'https://checkout.test/c1' });
		controller.buyQty = '4';

		await controller.buyDevices();

		expect(billing.createDeviceCheckout).toHaveBeenCalledWith({ quantity: 4 });
		expect(redirect).toHaveBeenCalledWith('https://checkout.test/c1');
		// The page is leaving: every action stays disabled.
		expect(controller.busy).toBe(true);
	});

	it('does not start a purchase below the minimum', async () => {
		const { controller, billing } = setup();
		controller.buyQty = '2';

		await controller.buyDevices();

		expect(billing.createDeviceCheckout).not.toHaveBeenCalled();
		expect(controller.busy).toBe(false);
	});

	it('does not buy a fractional quantity rounded down', async () => {
		const { controller, billing } = setup();
		controller.buyQty = '3.9';

		await controller.buyDevices();

		expect(billing.createDeviceCheckout).not.toHaveBeenCalled();
		expect(controller.busy).toBe(false);
	});

	it('opens the billing portal and the reporting checkout', async () => {
		const { controller, billing, redirect } = setup();
		billing.openBillingPortal.mockResolvedValue({ portalUrl: 'https://portal.test/p1' });
		billing.createReportingCheckout.mockResolvedValue({ checkoutUrl: 'https://checkout.test/r1' });

		await controller.openPortal();
		await controller.subscribeReporting();

		expect(billing.openBillingPortal).toHaveBeenCalledWith();
		expect(billing.createReportingCheckout).toHaveBeenCalledWith();
		expect(redirect.mock.calls).toEqual([['https://portal.test/p1'], ['https://checkout.test/r1']]);
	});

	it('reports a failed redirect request and frees the page', async () => {
		const { controller, billing, toast, redirect } = setup();
		billing.openBillingPortal.mockRejectedValue(apiError('No Stripe customer'));
		billing.createDeviceCheckout.mockRejectedValue(new TypeError('Failed to fetch'));
		billing.createReportingCheckout.mockRejectedValue({});

		await controller.openPortal();
		expect(controller.busy).toBe(false);
		await controller.buyDevices();
		expect(controller.busy).toBe(false);
		await controller.subscribeReporting();
		expect(controller.busy).toBe(false);

		expect(redirect).not.toHaveBeenCalled();
		expect(toast.add.mock.calls).toEqual([
			[{ tone: 'danger', message: 'No Stripe customer' }],
			[{ tone: 'danger', message: m.generic_error() }],
			[{ tone: 'danger', message: m.generic_error() }]
		]);
	});
});

describe('BillingController seat changes', () => {
	it('adds licenses on top of the current seats, then reloads', async () => {
		const { controller, billing, toast, invalidateAll } = setup(device({ seats: 5 }));
		const request = deferred<{ seats: number }>();
		billing.changeDeviceSeats.mockReturnValue(request.promise);
		controller.addQty = '2';

		const pending = controller.addLicenses();
		expect(controller.busy).toBe(true);
		request.resolve({ seats: 7 });
		await pending;

		expect(billing.changeDeviceSeats).toHaveBeenCalledWith({ seats: 7 });
		expect(toast.add).toHaveBeenCalledWith({
			tone: 'success',
			message: m.billing_add_licenses_success()
		});
		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(controller.addQty).toBe('1');
		expect(controller.busy).toBe(false);
	});

	it('does not add an invalid number of licenses', async () => {
		const { controller, billing } = setup();

		for (const qty of ['0', '2.5']) {
			controller.addQty = qty;
			await controller.addLicenses();
		}

		expect(billing.changeDeviceSeats).not.toHaveBeenCalled();
		expect(controller.busy).toBe(false);
	});

	it('keeps the quantity and skips the reload when adding fails', async () => {
		const { controller, billing, toast, invalidateAll } = setup();
		billing.changeDeviceSeats.mockRejectedValue(apiError('Card declined', 402));
		controller.addQty = '3';

		await controller.addLicenses();

		expect(toast.add).toHaveBeenCalledWith({ tone: 'danger', message: 'Card declined' });
		expect(invalidateAll).not.toHaveBeenCalled();
		expect(controller.addQty).toBe('3');
		expect(controller.busy).toBe(false);
	});

	it('reports a failed reload like a failed request', async () => {
		const { controller, billing, toast, invalidateAll } = setup();
		billing.changeDeviceSeats.mockResolvedValue({ seats: 6 });
		invalidateAll.mockRejectedValue(new Error('Reload failed'));

		await controller.addLicenses();

		expect(toast.add.mock.calls.at(-1)).toEqual([{ tone: 'danger', message: 'Reload failed' }]);
		expect(controller.addQty).toBe('1');
		expect(controller.busy).toBe(false);
	});
});

describe('BillingController cancellations', () => {
	it('cancels the device subscription at the period end and closes the dialog', async () => {
		const { controller, billing, toast, invalidateAll } = setup();
		billing.cancelDeviceSubscription.mockResolvedValue({ status: 'active' });
		controller.deviceCancelOpen = true;

		await controller.confirmDeviceCancel();

		expect(billing.cancelDeviceSubscription).toHaveBeenCalledWith({ atPeriodEnd: true });
		expect(toast.add).toHaveBeenCalledWith({
			tone: 'success',
			message: m.billing_device_canceled_toast()
		});
		expect(controller.deviceCancelOpen).toBe(false);
		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(controller.busy).toBe(false);
	});

	it('cancels reporting at the period end and closes the dialog', async () => {
		const { controller, billing, toast } = setup();
		billing.cancelReportingSubscription.mockResolvedValue({ status: 'active' });
		controller.reportingCancelOpen = true;

		await controller.confirmReportingCancel();

		expect(billing.cancelReportingSubscription).toHaveBeenCalledWith({ atPeriodEnd: true });
		expect(toast.add).toHaveBeenCalledWith({
			tone: 'success',
			message: m.billing_reporting_canceled_toast()
		});
		expect(controller.reportingCancelOpen).toBe(false);
	});

	it('keeps a cancel dialog open when cancelling fails', async () => {
		const { controller, billing, toast, invalidateAll } = setup();
		billing.cancelDeviceSubscription.mockRejectedValue(apiError('Already canceled'));
		billing.cancelReportingSubscription.mockRejectedValue(apiError('Not subscribed'));
		controller.deviceCancelOpen = true;
		controller.reportingCancelOpen = true;

		await controller.confirmDeviceCancel();
		await controller.confirmReportingCancel();

		expect(controller.deviceCancelOpen).toBe(true);
		expect(controller.reportingCancelOpen).toBe(true);
		expect(toast.add.mock.calls).toEqual([
			[{ tone: 'danger', message: 'Already canceled' }],
			[{ tone: 'danger', message: 'Not subscribed' }]
		]);
		expect(invalidateAll).not.toHaveBeenCalled();
		expect(controller.busy).toBe(false);
	});
});

describe('BillingController licenses', () => {
	it('opens the assign and move dialogs with nothing selected', () => {
		const { controller } = setup();
		controller.selectedDevEui = 'OLD';

		controller.openAssign(7);
		expect(controller).toMatchObject({
			assignMode: 'assign',
			activeLicenseId: 7,
			selectedDevEui: '',
			assignOpen: true
		});

		controller.selectedDevEui = 'OLD';
		controller.openMove(8);
		expect(controller).toMatchObject({
			assignMode: 'move',
			activeLicenseId: 8,
			selectedDevEui: '',
			assignOpen: true
		});
	});

	it('assigns a license to the chosen device', async () => {
		const { controller, billing, toast, invalidateAll } = setup();
		billing.assignLicense.mockResolvedValue({} as never);
		controller.openAssign(7);
		controller.selectedDevEui = 'A1';

		await controller.confirmAssign();

		expect(billing.assignLicense).toHaveBeenCalledWith(7, 'A1');
		expect(billing.moveLicense).not.toHaveBeenCalled();
		expect(toast.add).toHaveBeenCalledWith({
			tone: 'success',
			message: m.billing_license_assigned()
		});
		expect(controller.assignOpen).toBe(false);
		expect(invalidateAll).toHaveBeenCalledTimes(1);
	});

	it('moves a license to the chosen device', async () => {
		const { controller, billing, toast } = setup();
		billing.moveLicense.mockResolvedValue({} as never);
		controller.openMove(8);
		controller.selectedDevEui = 'B2';

		await controller.confirmAssign();

		expect(billing.moveLicense).toHaveBeenCalledWith(8, 'B2');
		expect(billing.assignLicense).not.toHaveBeenCalled();
		expect(toast.add).toHaveBeenCalledWith({ tone: 'success', message: m.billing_license_moved() });
		expect(controller.assignOpen).toBe(false);
	});

	it('needs a license and a device to assign', async () => {
		const { controller, billing } = setup();

		controller.selectedDevEui = 'A1';
		await controller.confirmAssign();
		controller.openAssign(7);
		await controller.confirmAssign();

		expect(billing.assignLicense).not.toHaveBeenCalled();
		expect(controller.busy).toBe(false);
	});

	it('keeps the assign dialog open when assigning fails', async () => {
		const { controller, billing, toast } = setup();
		billing.assignLicense.mockRejectedValue(apiError('Device already licensed', 409));
		controller.openAssign(7);
		controller.selectedDevEui = 'A1';

		await controller.confirmAssign();

		expect(controller.assignOpen).toBe(true);
		expect(toast.add).toHaveBeenCalledWith({ tone: 'danger', message: 'Device already licensed' });
		expect(controller.busy).toBe(false);
	});

	it('unassigns a license, reporting failures', async () => {
		const { controller, billing, toast, invalidateAll } = setup();
		billing.unassignLicense.mockResolvedValueOnce({} as never).mockRejectedValueOnce({});

		await controller.unassign(7);
		expect(billing.unassignLicense).toHaveBeenCalledWith(7);
		expect(toast.add).toHaveBeenLastCalledWith({
			tone: 'success',
			message: m.billing_license_unassigned_toast()
		});
		expect(invalidateAll).toHaveBeenCalledTimes(1);

		await controller.unassign(7);
		expect(toast.add).toHaveBeenLastCalledWith({ tone: 'danger', message: m.generic_error() });
		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(controller.busy).toBe(false);
	});

	it('cancels an unassigned seat after confirming', async () => {
		const { controller, billing, toast, invalidateAll } = setup();
		billing.cancelLicense.mockResolvedValue({ canceled: true });

		controller.openSeatCancel(9);
		expect(controller.seatCancelOpen).toBe(true);
		expect(controller.seatCancelLicenseId).toBe(9);
		await controller.confirmSeatCancel();

		expect(billing.cancelLicense).toHaveBeenCalledWith(9);
		expect(toast.add).toHaveBeenCalledWith({
			tone: 'success',
			message: m.billing_seat_canceled_toast()
		});
		expect(controller.seatCancelOpen).toBe(false);
		expect(invalidateAll).toHaveBeenCalledTimes(1);
	});

	it('needs a seat to cancel, and keeps the dialog open when cancelling fails', async () => {
		const { controller, billing, toast } = setup();
		billing.cancelLicense.mockRejectedValue(apiError('Seat in use', 409));

		await controller.confirmSeatCancel();
		expect(billing.cancelLicense).not.toHaveBeenCalled();

		controller.openSeatCancel(9);
		await controller.confirmSeatCancel();

		expect(controller.seatCancelOpen).toBe(true);
		expect(toast.add).toHaveBeenCalledWith({ tone: 'danger', message: 'Seat in use' });
		expect(controller.busy).toBe(false);
	});
});
