import { apiErrorMessage, apiErrorStatus } from '$lib/api/api-error';
import type { BillingAdminRepository } from '$lib/api/repositories/billing-admin.repository';
import { m } from '$lib/paraglide/messages.js';
import { isStaffEmail } from '$lib/utils/is-staff';
import { fail, redirect, type ActionFailure } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Visibility only: the API's StaffGuard is the enforcement point.
export const load: PageServerLoad = async ({ locals }) => {
	const authToken = locals.jwtString ?? null;
	if (!authToken || !isStaffEmail(locals.jwt?.email)) {
		redirect(303, '/');
	}

	try {
		return {
			customers: await locals.services.billingAdmin.adminListBillingCustomers(),
			loadFailed: false
		};
	} catch (err) {
		console.error('Failed to load billing customers:', err);
		return { customers: [], loadFailed: true };
	}
};

function readUserId(formData: FormData): string {
	const value = formData.get('userId');
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * Runs a staff-only mutation. `run` validates its own fields and returns a
 * `fail(400, …)` for invalid input before calling the API.
 */
async function runAdminAction(
	locals: App.Locals,
	request: Request,
	run: (
		billingAdmin: BillingAdminRepository,
		userId: string,
		formData: FormData
	) => Promise<ActionFailure<{ error: string }> | void>
) {
	const authToken = locals.jwtString ?? null;
	if (!authToken) {
		return fail(401, { error: m.auth_not_authenticated() });
	}
	if (!isStaffEmail(locals.jwt?.email)) {
		return fail(403, { error: m.error_forbidden_description() });
	}

	const formData = await request.formData();
	const userId = readUserId(formData);
	if (!userId) {
		return fail(400, { error: m.generic_error() });
	}

	try {
		const invalid = await run(locals.services.billingAdmin, userId, formData);
		if (invalid) return invalid;
	} catch (err) {
		return fail(apiErrorStatus(err), { error: apiErrorMessage(err, m.generic_error()) });
	}

	return { success: true };
}

export const actions: Actions = {
	setBillingMode: ({ request, locals }) =>
		runAdminAction(locals, request, async (billingAdmin, userId, formData) => {
			const mode = formData.get('billingMode');
			if (mode !== 'stripe' && mode !== 'manual') {
				return fail(400, { error: m.generic_error() });
			}
			await billingAdmin.adminSetBillingMode(userId, mode);
		}),

	setManualSeats: ({ request, locals }) =>
		runAdminAction(locals, request, async (billingAdmin, userId, formData) => {
			// Digits only: a whole number of 0 or more ("2.9", "-1" and "" are refused).
			const typed = String(formData.get('seats') ?? '').trim();
			const seats = /^\d+$/.test(typed) ? Number(typed) : Number.NaN;
			if (!Number.isSafeInteger(seats)) {
				return fail(400, { error: m.admin_billing_seats_invalid() });
			}
			await billingAdmin.adminSetManualSeats(userId, seats);
		}),

	setReporting: ({ request, locals }) =>
		runAdminAction(locals, request, async (billingAdmin, userId, formData) => {
			await billingAdmin.adminSetReportingManual(userId, formData.get('manual') === 'true');
		})
};
