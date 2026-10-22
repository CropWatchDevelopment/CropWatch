import type { AdminBillingCustomer, BillingMode } from '../api.dtos';
import type { HttpClient } from '../http/http-client';

const ADMIN_CUSTOMERS_ENDPOINT = '/payments/admin/customers';

function customerPath(
	userId: string,
	setting: 'billing-mode' | 'manual-seats' | 'reporting'
): string {
	return `${ADMIN_CUSTOMERS_ENDPOINT}/${encodeURIComponent(userId)}/${setting}`;
}

/** Billing administration (staff only; enforced by the API). */
export interface BillingAdminRepository {
	adminListBillingCustomers(): Promise<AdminBillingCustomer[]>;
	adminSetBillingMode(userId: string, billingMode: BillingMode): Promise<unknown>;
	adminSetManualSeats(userId: string, seats: number): Promise<unknown>;
	adminSetReportingManual(userId: string, manual: boolean): Promise<unknown>;
}

export class HttpBillingAdminRepository implements BillingAdminRepository {
	readonly #http: HttpClient;

	public constructor(http: HttpClient) {
		this.#http = http;
	}

	public adminListBillingCustomers(): Promise<AdminBillingCustomer[]> {
		return this.#http.request<AdminBillingCustomer[]>(ADMIN_CUSTOMERS_ENDPOINT, { method: 'GET' });
	}

	public adminSetBillingMode(userId: string, billingMode: BillingMode): Promise<unknown> {
		return this.#http.request<unknown>(customerPath(userId, 'billing-mode'), {
			method: 'PATCH',
			body: { billingMode }
		});
	}

	public adminSetManualSeats(userId: string, seats: number): Promise<unknown> {
		return this.#http.request<unknown>(customerPath(userId, 'manual-seats'), {
			method: 'PUT',
			body: { seats }
		});
	}

	public adminSetReportingManual(userId: string, manual: boolean): Promise<unknown> {
		return this.#http.request<unknown>(customerPath(userId, 'reporting'), {
			method: 'PATCH',
			body: { manual }
		});
	}
}
