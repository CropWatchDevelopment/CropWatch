import * as Sentry from '@sentry/sveltekit';
import type { HandleClientError } from '@sveltejs/kit';

Sentry.init({
	//dsn: "https://ba36cb18f97a466e35b23ed5ab9c916e@o4509301976530944.ingest.us.sentry.io/4509513210789888",
	dsn: 'https://ba36cb18f97a466e35b23ed5ab9c916e@o4509301976530944.ingest.us.sentry.io/4509513210789888',
	tunnel: '/tunnel',
	// Adds request headers and IP for users, for more info visit:
	// https://docs.sentry.io/platforms/javascript/guides/sveltekit/configuration/options/#sendDefaultPii
	sendDefaultPii: true,
	integrations: []
});

const handleClientError: HandleClientError = async ({ error, event, status, message }) => {
	const errorId = crypto.randomUUID();

	// example integration with https://sentry.io/
	Sentry.captureException(error, {
		extra: { event, errorId, status }
	});

	return {
		message: 'Whoops!',
		errorId
	};
};

export const handleError = Sentry.handleErrorWithSentry(handleClientError);
