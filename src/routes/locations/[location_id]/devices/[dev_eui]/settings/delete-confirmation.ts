/**
 * Type-to-confirm guard for deleting a device. The danger-zone dialog uses it
 * to unlock its delete button; the deleteDevice action re-checks the submitted
 * form with the same rules, so a crafted request cannot skip the confirmation.
 */

/** Form field carrying the DevEUI the user typed. */
export const CONFIRM_DEV_EUI_FIELD = 'confirmDevEui';
/** Form field carrying the "I understand" acknowledgement. */
export const ACKNOWLEDGE_FIELD = 'acknowledged';
export const ACKNOWLEDGE_VALUE = 'yes';

export type DeleteConfirmationIssue = 'devEuiMismatch' | 'notAcknowledged';

/** DevEUIs are hex: compare without case or surrounding whitespace. */
export function normalizeDevEui(value: string): string {
	return value.trim().toUpperCase();
}

/** True only when `typed` is exactly the device's DevEUI (never for an empty one). */
export function devEuiConfirmed(devEui: string, typed: string): boolean {
	const expected = normalizeDevEui(devEui);
	return expected !== '' && normalizeDevEui(typed) === expected;
}

export function checkDeleteConfirmation(
	devEui: string,
	formData: FormData
): DeleteConfirmationIssue | null {
	const typed = formData.get(CONFIRM_DEV_EUI_FIELD);
	if (typeof typed !== 'string' || !devEuiConfirmed(devEui, typed)) {
		return 'devEuiMismatch';
	}
	if (formData.get(ACKNOWLEDGE_FIELD) !== ACKNOWLEDGE_VALUE) {
		return 'notAcknowledged';
	}
	return null;
}
