import { apiErrorMessage } from '$lib/api/api-error';
import type { DeviceSubscriptionState } from '$lib/api/api.dtos';
import type { BillingRepository } from '$lib/api/repositories/billing.repository';
import { m } from '$lib/paraglide/messages.js';
import type { CwToastApi } from '@cropwatchdevelopment/cwui';

export interface BillingControllerDeps {
	billing: BillingRepository;
	toast: Pick<CwToastApi, 'add'>;
	/** Reloads the page data after a change (SvelteKit's `invalidateAll`). */
	invalidateAll: () => Promise<void>;
	/** Sends the browser to a Stripe page (Checkout or the billing portal), leaving the app. */
	redirect: (url: string) => void;
	/** The device subscription in the current page data. */
	device: () => DeviceSubscriptionState;
}

/**
 * The count in a typed quantity: its whole number ("3"), or NaN for anything
 * else — "3.9" is not cut down to 3, and "", "-2" or "3abc" are not counts.
 */
function parseQuantity(value: string): number {
	const digits = value.trim();
	return /^\d+$/.test(digits) ? Number(digits) : Number.NaN;
}

/**
 * The billing page's actions and the dialogs that confirm them: Stripe
 * checkout and portal redirects, license seat changes, assigning, moving and
 * cancelling licenses. One `busy` flag covers every request, and a change
 * reloads the page data. The subscription itself stays in the page data.
 */
export class BillingController {
	readonly #deps: BillingControllerDeps;

	busy = $state(false);
	buyQty = $state('');
	addQty = $state('1');

	deviceCancelOpen = $state(false);
	reportingCancelOpen = $state(false);
	assignOpen = $state(false);
	assignMode = $state<'assign' | 'move'>('assign');
	activeLicenseId = $state<number | null>(null);
	selectedDevEui = $state('');
	seatCancelOpen = $state(false);
	seatCancelLicenseId = $state<number | null>(null);

	readonly addCount = $derived(parseQuantity(this.addQty));
	readonly addValid = $derived(Number.isInteger(this.addCount) && this.addCount >= 1);
	readonly buyCount = $derived(parseQuantity(this.buyQty));
	readonly buyValid = $derived.by(
		() => Number.isInteger(this.buyCount) && this.buyCount >= this.#deps.device().minimumSeats
	);

	constructor(deps: BillingControllerDeps) {
		this.#deps = deps;
		// Seed the purchase quantity once at the minimum (captured, not reactive — see CLAUDE.md).
		this.buyQty = String(deps.device().minimumSeats);
	}

	#showError(err: unknown): void {
		this.#deps.toast.add({ tone: 'danger', message: apiErrorMessage(err, m.generic_error()) });
	}

	async #refresh(): Promise<void> {
		await this.#deps.invalidateAll();
		this.addQty = '1';
	}

	async openPortal(): Promise<void> {
		this.busy = true;
		try {
			const { portalUrl } = await this.#deps.billing.openBillingPortal();
			this.#deps.redirect(portalUrl);
		} catch (err) {
			this.#showError(err);
			this.busy = false;
		}
	}

	async buyDevices(): Promise<void> {
		if (!this.buyValid) return;
		this.busy = true;
		try {
			const { checkoutUrl } = await this.#deps.billing.createDeviceCheckout({
				quantity: this.buyCount
			});
			this.#deps.redirect(checkoutUrl);
		} catch (err) {
			this.#showError(err);
			this.busy = false;
		}
	}

	async addLicenses(): Promise<void> {
		if (!this.addValid) return;
		this.busy = true;
		try {
			await this.#deps.billing.changeDeviceSeats({
				seats: this.#deps.device().seats + this.addCount
			});
			this.#deps.toast.add({ tone: 'success', message: m.billing_add_licenses_success() });
			await this.#refresh();
		} catch (err) {
			this.#showError(err);
		} finally {
			this.busy = false;
		}
	}

	async confirmDeviceCancel(): Promise<void> {
		this.busy = true;
		try {
			await this.#deps.billing.cancelDeviceSubscription({ atPeriodEnd: true });
			this.#deps.toast.add({ tone: 'success', message: m.billing_device_canceled_toast() });
			this.deviceCancelOpen = false;
			await this.#refresh();
		} catch (err) {
			this.#showError(err);
		} finally {
			this.busy = false;
		}
	}

	async subscribeReporting(): Promise<void> {
		this.busy = true;
		try {
			const { checkoutUrl } = await this.#deps.billing.createReportingCheckout();
			this.#deps.redirect(checkoutUrl);
		} catch (err) {
			this.#showError(err);
			this.busy = false;
		}
	}

	async confirmReportingCancel(): Promise<void> {
		this.busy = true;
		try {
			await this.#deps.billing.cancelReportingSubscription({ atPeriodEnd: true });
			this.#deps.toast.add({ tone: 'success', message: m.billing_reporting_canceled_toast() });
			this.reportingCancelOpen = false;
			await this.#refresh();
		} catch (err) {
			this.#showError(err);
		} finally {
			this.busy = false;
		}
	}

	openAssign(licenseId: number): void {
		this.assignMode = 'assign';
		this.activeLicenseId = licenseId;
		this.selectedDevEui = '';
		this.assignOpen = true;
	}

	openMove(licenseId: number): void {
		this.assignMode = 'move';
		this.activeLicenseId = licenseId;
		this.selectedDevEui = '';
		this.assignOpen = true;
	}

	async confirmAssign(): Promise<void> {
		if (this.activeLicenseId == null || !this.selectedDevEui) return;
		this.busy = true;
		try {
			if (this.assignMode === 'assign') {
				await this.#deps.billing.assignLicense(this.activeLicenseId, this.selectedDevEui);
				this.#deps.toast.add({ tone: 'success', message: m.billing_license_assigned() });
			} else {
				await this.#deps.billing.moveLicense(this.activeLicenseId, this.selectedDevEui);
				this.#deps.toast.add({ tone: 'success', message: m.billing_license_moved() });
			}
			this.assignOpen = false;
			await this.#refresh();
		} catch (err) {
			this.#showError(err);
		} finally {
			this.busy = false;
		}
	}

	async unassign(licenseId: number): Promise<void> {
		this.busy = true;
		try {
			await this.#deps.billing.unassignLicense(licenseId);
			this.#deps.toast.add({ tone: 'success', message: m.billing_license_unassigned_toast() });
			await this.#refresh();
		} catch (err) {
			this.#showError(err);
		} finally {
			this.busy = false;
		}
	}

	openSeatCancel(licenseId: number): void {
		this.seatCancelLicenseId = licenseId;
		this.seatCancelOpen = true;
	}

	async confirmSeatCancel(): Promise<void> {
		if (this.seatCancelLicenseId == null) return;
		this.busy = true;
		try {
			await this.#deps.billing.cancelLicense(this.seatCancelLicenseId);
			this.#deps.toast.add({ tone: 'success', message: m.billing_seat_canceled_toast() });
			this.seatCancelOpen = false;
			await this.#refresh();
		} catch (err) {
			this.#showError(err);
		} finally {
			this.busy = false;
		}
	}
}
