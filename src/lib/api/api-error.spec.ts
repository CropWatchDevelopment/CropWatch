import { describe, expect, it } from 'vitest';
import { ApiError, apiErrorMessage, apiErrorStatus, readApiErrorMessage } from './api-error';

describe('readApiErrorMessage', () => {
	it('prefers nested API payload messages from ApiError objects', () => {
		const error = new ApiError(400, 'Bad Request', {
			url: 'https://api.cropwatch.test/rules',
			payload: { message: ['name must not be empty', 'criteria is required'] }
		});

		expect(readApiErrorMessage(error, 'fallback')).toBe(
			'name must not be empty, criteria is required'
		);
	});

	it('reads message, then error, then data, from any depth', () => {
		expect(readApiErrorMessage({ error: 'Conflict' }, 'fallback')).toBe('Conflict');
		expect(readApiErrorMessage({ data: { message: 'Deep' } }, 'fallback')).toBe('Deep');
		expect(readApiErrorMessage('  plain  ', 'fallback')).toBe('plain');
	});

	it('falls back for blank, empty or non-object payloads', () => {
		expect(readApiErrorMessage('   ', 'fallback')).toBe('fallback');
		expect(readApiErrorMessage([], 'fallback')).toBe('fallback');
		expect(readApiErrorMessage([' ', null], 'fallback')).toBe('fallback');
		expect(readApiErrorMessage(null, 'fallback')).toBe('fallback');
		expect(readApiErrorMessage(42, 'fallback')).toBe('fallback');
		expect(readApiErrorMessage({ message: { nested: true } }, 'fallback')).toBe('fallback');
	});
});

describe('apiErrorStatus / apiErrorMessage', () => {
	const apiError = new ApiError(409, 'Conflict', {
		url: 'https://api.cropwatch.test/locations/8',
		payload: { message: 'Location still has devices' }
	});

	it("uses an ApiError's status and its response message", () => {
		expect(apiErrorStatus(apiError)).toBe(409);
		expect(apiErrorMessage(apiError, 'fallback')).toBe('Location still has devices');
	});

	it('falls back for anything else that was thrown', () => {
		expect(apiErrorStatus(new Error('boom'))).toBe(500);
		expect(apiErrorStatus('boom', 502)).toBe(502);
		expect(apiErrorMessage(undefined, 'fallback')).toBe('fallback');
	});

	it('falls back for an ApiError whose response carries no message', () => {
		const bare = new ApiError(500, 'Internal Server Error', {
			url: 'https://api.cropwatch.test/rules',
			payload: null
		});

		expect(apiErrorMessage(bare, 'fallback')).toBe('fallback');
	});

	it('never shows the developer text of a built-in error', () => {
		expect(apiErrorMessage(new TypeError('Failed to fetch'), 'fallback')).toBe('fallback');
		expect(apiErrorMessage(new SyntaxError('Unexpected end of JSON input'), 'fallback')).toBe(
			'fallback'
		);
		expect(apiErrorMessage(new DOMException('aborted', 'AbortError'), 'fallback')).toBe('fallback');
	});

	it('keeps the message of a plain Error our own code threw, and of plain payloads', () => {
		expect(apiErrorMessage(new Error('Seats must be a whole number'), 'fallback')).toBe(
			'Seats must be a whole number'
		);
		expect(apiErrorMessage({ message: 'Gateway service unavailable' }, 'fallback')).toBe(
			'Gateway service unavailable'
		);
	});
});
