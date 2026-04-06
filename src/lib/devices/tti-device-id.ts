export const TTI_DEVICE_ID_MAX_LENGTH = 36;
export const TTI_DEVICE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,34}[a-z0-9])?$/;

export function normalizeTtiDeviceId(value: string | null | undefined): string {
	return (value ?? '').trim().toLowerCase();
}

export function isValidTtiDeviceId(value: string): boolean {
	if (value.length === 0 || value.length > TTI_DEVICE_ID_MAX_LENGTH) {
		return false;
	}

	return TTI_DEVICE_ID_PATTERN.test(value);
}
