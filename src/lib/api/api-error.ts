/**
 * Thrown by the HTTP client for every non-2xx API response. `payload` is
 * `{ url, payload }` — the request URL and the parsed response body.
 */
export class ApiError extends Error {
	public readonly status: number;
	public readonly payload: unknown;

	public constructor(status: number, statusText: string, payload: unknown) {
		super(`CropWatch API request failed (${status} ${statusText})`);
		this.name = 'ApiError';
		this.status = status;
		this.payload = payload;
	}
}

/**
 * Extracts a human-readable message from an unknown API error payload.
 *
 * The API can return errors in several shapes:
 *   - `{ message: string }`
 *   - `{ message: string[] }`
 *   - `{ payload: { message: ... } }` (nested)
 *   - A plain string
 *
 * For a caught error, prefer {@link apiErrorMessage}, which unwraps an
 * {@link ApiError} first:
 *
 * ```ts
 * import { apiErrorMessage, apiErrorStatus } from '$lib/api/api-error';
 *
 * try {
 *   await locals.services.devices.updateDevice(devEui, fields);
 * } catch (err) {
 *   return fail(apiErrorStatus(err), { error: apiErrorMessage(err, m.generic_error()) });
 * }
 * ```
 */
export function readApiErrorMessage(payload: unknown, fallback: string): string {
	return readApiErrorMessageValue(payload) ?? fallback;
}

/** The HTTP status of an {@link ApiError}, or `fallback` for any other thrown value. */
export function apiErrorStatus(error: unknown, fallback = 500): number {
	return error instanceof ApiError ? error.status : fallback;
}

/**
 * The message to show a user for a caught error:
 * - an {@link ApiError}: the API's own message, else `fallback`;
 * - a plain `Error` (our own code throws these with a localized message): its message;
 * - anything a built-in throws — `TypeError: Failed to fetch` for a network
 *   failure, a `SyntaxError` from a malformed body, an aborted request, a
 *   programming error — carries developer text, never a message for users: `fallback`.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof ApiError) return readApiErrorMessage(error.payload, fallback);
	if (error instanceof Error && error.constructor !== Error) return fallback;
	return readApiErrorMessage(error, fallback);
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
