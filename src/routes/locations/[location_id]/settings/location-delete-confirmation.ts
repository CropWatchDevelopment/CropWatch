/**
 * Type-to-confirm guard for deleting a location. The danger-zone dialog uses
 * it to unlock its delete button; the deleteLocation action re-checks the
 * submitted form against the location's real name, so a crafted request
 * cannot skip the confirmation.
 */

/** Form field carrying the location name the user typed. */
export const CONFIRM_LOCATION_NAME_FIELD = 'confirmLocationName';
/** Form field carrying the "I understand" acknowledgement. */
export const ACKNOWLEDGE_FIELD = 'acknowledged';
export const ACKNOWLEDGE_VALUE = 'yes';

export type LocationDeleteConfirmationIssue = 'nameMismatch' | 'notAcknowledged';

/**
 * Compare names the way people type them: full-/half-width forms are folded
 * (NFKC, so an IME's ＡＢＣ matches ABC), and case and extra spaces are ignored.
 */
export function normalizeLocationName(value: string): string {
	return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** True only when `typed` is the location's name (never for an empty one). */
export function locationNameConfirmed(name: string, typed: string): boolean {
	const expected = normalizeLocationName(name);
	return expected !== '' && normalizeLocationName(typed) === expected;
}

export function checkLocationDeleteConfirmation(
	name: string,
	formData: FormData
): LocationDeleteConfirmationIssue | null {
	const typed = formData.get(CONFIRM_LOCATION_NAME_FIELD);
	if (typeof typed !== 'string' || !locationNameConfirmed(name, typed)) {
		return 'nameMismatch';
	}
	if (formData.get(ACKNOWLEDGE_FIELD) !== ACKNOWLEDGE_VALUE) {
		return 'notAcknowledged';
	}
	return null;
}
