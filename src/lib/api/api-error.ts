/**
 * Extracts a human-readable message from an unknown API error payload.
 *
 * The API can return errors in several shapes:
 *   - `{ message: string }`
 *   - `{ message: string[] }`
 *   - `{ payload: { message: ... } }` (nested)
 *   - A plain string
 *
 * Call this anywhere you need to turn a caught API error into a display string:
 *
 * ```ts
 * import { readApiErrorMessage } from '$lib/api/api-error';
 * import { ApiServiceError } from '$lib/api/api.service';
 *
 * try {
 *   await api.doSomething();
 * } catch (err) {
 *   const payload = err instanceof ApiServiceError ? err.payload : err;
 *   return fail(500, { error: readApiErrorMessage(payload, m.generic_error()) });
 * }
 * ```
 */
export function readApiErrorMessage(payload: unknown, fallback: string): string {
	if (payload && typeof payload === 'object') {
		const record = payload as Record<string, unknown>;
		const message = record.message;

		if (typeof message === 'string' && message.trim().length > 0) {
			return message.trim();
		}

		if (Array.isArray(message)) {
			const combined = message
				.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
				.join(', ');
			if (combined.length > 0) return combined;
		}

		// Recurse into a nested payload envelope.
		if (record.payload !== undefined) {
			return readApiErrorMessage(record.payload, fallback);
		}
	}

	if (typeof payload === 'string' && payload.trim().length > 0) {
		return payload.trim();
	}

	return fallback;
}
