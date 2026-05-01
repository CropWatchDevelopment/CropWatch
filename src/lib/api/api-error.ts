/**
 * Extracts a human-readable message from an unknown API error payload.
 *
 * The API can return errors in several shapes:
 *   - `{ message: string }`
 *   - `{ message: string[] }`
 *   - `{ payload: { message: ... } }` (nested)
 *   - A plain string
 *
 * Call this anywhere you need to turn a caught API error or error payload into a display string:
 *
 * ```ts
 * import { readApiErrorMessage } from '$lib/api/api-error';
 *
 * try {
 *   await api.doSomething();
 * } catch (err) {
 *   return fail(500, { error: readApiErrorMessage(err, m.generic_error()) });
 * }
 * ```
 */
export function readApiErrorMessage(payload: unknown, fallback: string): string {
	return readApiErrorMessageValue(payload) ?? fallback;
}

function readApiErrorMessageValue(payload: unknown): string | null {
	if (typeof payload === 'string') {
		const trimmed = payload.trim();
		return trimmed.length > 0 ? trimmed : null;
	}

	if (Array.isArray(payload)) {
		const combined = payload
			.map(readApiErrorMessageValue)
			.filter((entry): entry is string => !!entry)
			.join(', ');
		return combined.length > 0 ? combined : null;
	}

	if (!payload || typeof payload !== 'object') {
		return null;
	}

	const record = payload as Record<string, unknown>;

	return (
		readApiErrorMessageValue(record.payload) ??
		readApiErrorMessageValue(record.message) ??
		readApiErrorMessageValue(record.error) ??
		readApiErrorMessageValue(record.data)
	);
}
