import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = async ({ error, event, status, message }) => {
	const errorId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

	console.error(`[${errorId}] Client Error:`, {
		status,
		message,
		url: event.url?.href,
		route: event.route?.id,
		error: error instanceof Error ? error.message : String(error)
	});

	return {
		message: status === 500 ? 'Something went wrong. Please try again.' : message,
		errorId
	};
};
