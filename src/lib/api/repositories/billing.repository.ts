import type {
	BillingEntitlements,
	BillingLicense,
	BillingProductsResponse,
	SubscriptionStateResponse
} from '../api.dtos';
import type { HttpClient } from '../http/http-client';

const PAYMENTS_ENDPOINT = '/payments';

function licensePath(licenseId: number, action: 'assign' | 'move' | 'unassign' | 'cancel'): string {
	return `${PAYMENTS_ENDPOINT}/licenses/${encodeURIComponent(licenseId)}/${action}`;
}

/** The signed-in user's Stripe subscriptions, device licenses and billing portal. */
export interface BillingRepository {
	getBillingProducts(): Promise<BillingProductsResponse>;
	getSubscriptionState(): Promise<SubscriptionStateResponse>;
	getLicenses(): Promise<BillingLicense[]>;
	getBillingEntitlements(): Promise<BillingEntitlements>;
	createDeviceCheckout(payload: { quantity: number }): Promise<{ checkoutUrl: string }>;
	changeDeviceSeats(payload: { seats: number }): Promise<{ seats: number }>;
	assignLicense(licenseId: number, devEui: string): Promise<BillingLicense>;
	moveLicense(licenseId: number, devEui: string): Promise<BillingLicense>;
	unassignLicense(licenseId: number): Promise<BillingLicense>;
	cancelLicense(licenseId: number): Promise<{ canceled: boolean }>;
	openBillingPortal(): Promise<{ portalUrl: string }>;
	cancelDeviceSubscription(payload?: { atPeriodEnd?: boolean }): Promise<{ status: string }>;
	createReportingCheckout(): Promise<{ checkoutUrl: string }>;
	cancelReportingSubscription(payload?: { atPeriodEnd?: boolean }): Promise<{ status: string }>;
}

export class HttpBillingRepository implements BillingRepository {
	readonly #http: HttpClient;

	public constructor(http: HttpClient) {
		this.#http = http;
	}

	public getBillingProducts(): Promise<BillingProductsResponse> {
		return this.#http.request<BillingProductsResponse>(`${PAYMENTS_ENDPOINT}/products`, {
			method: 'GET'
		});
	}

	public getSubscriptionState(): Promise<SubscriptionStateResponse> {
		return this.#http.request<SubscriptionStateResponse>(
			`${PAYMENTS_ENDPOINT}/subscriptions/state`,
			{ method: 'GET' }
		);
	}

	public getLicenses(): Promise<BillingLicense[]> {
		return this.#http.request<BillingLicense[]>(`${PAYMENTS_ENDPOINT}/licenses`, {
			method: 'GET'
		});
	}

	public getBillingEntitlements(): Promise<BillingEntitlements> {
		return this.#http.request<BillingEntitlements>(`${PAYMENTS_ENDPOINT}/entitlements`, {
			method: 'GET'
		});
	}

	public createDeviceCheckout(payload: { quantity: number }): Promise<{ checkoutUrl: string }> {
		return this.#http.request<{ checkoutUrl: string }>(
			`${PAYMENTS_ENDPOINT}/subscriptions/device/checkout`,
			{ method: 'POST', body: payload }
		);
	}

	public changeDeviceSeats(payload: { seats: number }): Promise<{ seats: number }> {
		return this.#http.request<{ seats: number }>(
			`${PAYMENTS_ENDPOINT}/subscriptions/device/seats`,
			{
				method: 'PATCH',
				body: payload
			}
		);
	}

	public assignLicense(licenseId: number, devEui: string): Promise<BillingLicense> {
		return this.#http.request<BillingLicense>(licensePath(licenseId, 'assign'), {
			method: 'POST',
			body: { devEui }
		});
	}

	public moveLicense(licenseId: number, devEui: string): Promise<BillingLicense> {
		return this.#http.request<BillingLicense>(licensePath(licenseId, 'move'), {
			method: 'PATCH',
			body: { devEui }
		});
	}

	public unassignLicense(licenseId: number): Promise<BillingLicense> {
		return this.#http.request<BillingLicense>(licensePath(licenseId, 'unassign'), {
			method: 'POST'
		});
	}

	public cancelLicense(licenseId: number): Promise<{ canceled: boolean }> {
		return this.#http.request<{ canceled: boolean }>(licensePath(licenseId, 'cancel'), {
			method: 'POST'
		});
	}

	public openBillingPortal(): Promise<{ portalUrl: string }> {
		return this.#http.request<{ portalUrl: string }>(`${PAYMENTS_ENDPOINT}/portal`, {
			method: 'POST'
		});
	}

	public cancelDeviceSubscription(
		payload: { atPeriodEnd?: boolean } = {}
	): Promise<{ status: string }> {
		return this.#http.request<{ status: string }>(`${PAYMENTS_ENDPOINT}/subscriptions/device`, {
			method: 'DELETE',
			body: payload
		});
	}

	public createReportingCheckout(): Promise<{ checkoutUrl: string }> {
		return this.#http.request<{ checkoutUrl: string }>(
			`${PAYMENTS_ENDPOINT}/subscriptions/reporting/checkout`,
			{ method: 'POST' }
		);
	}

	public cancelReportingSubscription(
		payload: { atPeriodEnd?: boolean } = {}
	): Promise<{ status: string }> {
		return this.#http.request<{ status: string }>(`${PAYMENTS_ENDPOINT}/subscriptions/reporting`, {
			method: 'DELETE',
			body: payload
		});
	}
}
