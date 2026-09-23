const STAFF_EMAIL_SUFFIX = '@cropwatch.io';

/**
 * Whether an email belongs to a CropWatch staff member. Mirrors the API's
 * rule; the API remains the enforcement point — the app only uses this to
 * decide what to show.
 */
export function isStaffEmail(email: string | null | undefined): boolean {
	return typeof email === 'string' && email.trim().toLowerCase().endsWith(STAFF_EMAIL_SUFFIX);
}
