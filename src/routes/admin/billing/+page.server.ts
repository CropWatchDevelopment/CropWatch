import { ApiService, ApiServiceError } from '$lib/api/api.service';
import { readApiErrorMessage } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import { isStaffEmail } from '$lib/utils/is-staff';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Visibility only: the API's StaffGuard is the enforcement point.
export const load: PageServerLoad = async ({ locals, fetch }) => {
	const authToken = locals.jwtString ?? null;
	if (!authToken || !isStaffEmail(locals.jwt?.email)) {
		throw redirect(303, '/');
	}

	const api = new ApiService({ fetchFn: fetch, authToken });
	try {
		return { customers: await api.adminListBillingCustomers(), loadFailed: false };
	} catch (err) {
		console.error('Failed to load billing customers:', err);
		return { customers: [], loadFailed: true };
	}
};

function readUserId(formData: FormData): string {
	const value = formData.get('userId');
	return typeof value === 'string' ? value.trim() : '';
}

async function runAdminAction(
	locals: App.Locals,
	fetchFn: typeof fetch,
	request: Request,
	run: (api: ApiService, userId: string, formData: FormData) => Promise<void>
) {
	const authToken = locals.jwtString ?? null;
	if (!authToken || !isStaffEmail(locals.jwt?.email)) {
		return fail(403, { error: m.auth_not_authenticated() });
	}

	const formData = await request.formData();
	const userId = readUserId(formData);
	if (!userId) {
		return fail(400, { error: m.generic_error() });
	}

	const api = new ApiService({ fetchFn: fetchFn, authToken });
	try {
		await run(api, userId, formData);
	} catch (err) {
		const payload = err instanceof ApiServiceError ? err.payload : err;
		const status = err instanceof ApiServiceError ? err.status : 500;
		return fail(status, { error: readApiErrorMessage(payload, m.generic_error()) });
	}

	return { success: true };
}

export const actions: Actions = {
	setBillingMode: ({ request, locals, fetch }) =>
		runAdminAction(locals, fetch, request, async (api, userId, formData) => {
			const mode = formData.get('billingMode');
			if (mode !== 'stripe' && mode !== 'manual') {
				throw new Error(m.generic_error());
			}
			await api.adminSetBillingMode(userId, mode);
		}),

	setManualSeats: ({ request, locals, fetch }) =>
		runAdminAction(locals, fetch, request, async (api, userId, formData) => {
			const seats = Number.parseInt(String(formData.get('seats') ?? ''), 10);
			if (!Number.isInteger(seats) || seats < 0) {
				throw new Error(m.admin_billing_seats_invalid());
			}
			await api.adminSetManualSeats(userId, seats);
		}),

	setReporting: ({ request, locals, fetch }) =>
		runAdminAction(locals, fetch, request, async (api, userId, formData) => {
			await api.adminSetReportingManual(userId, formData.get('manual') === 'true');
		})
};
