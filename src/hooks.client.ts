import { handleErrorWithSentry, replayIntegration } from "@sentry/sveltekit";
import * as Sentry from '@sentry/sveltekit';
import type { HandleClientError } from '@sveltejs/kit';

Sentry.init({
  dsn: 'https://ba36cb18f97a466e35b23ed5ab9c916e@o4509301976530944.ingest.us.sentry.io/4509513210789888',

  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Environment and release tracking
  environment: import.meta.env.MODE || 'development',
  release: '0.0.1',

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // If you don't want to use Session Replay, just remove the line below:
  integrations: [replayIntegration()],

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/sveltekit/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Before sending errors, add additional context
  beforeSend(event, hint) {
    // Add custom fingerprinting for common errors
    const error = hint.originalException;
    if (error instanceof Error) {
      // Group similar network errors together
      if (error.message.includes('fetch') || error.message.includes('network')) {
        event.fingerprint = ['network-error', error.message];
      }
      // Group authentication errors
      if (error.message.includes('auth') || error.message.includes('session')) {
        event.fingerprint = ['auth-error', error.message];
      }
    }
    return event;
  }
});

// Custom error handler with enhanced context
export const handleError: HandleClientError = handleErrorWithSentry(async ({ error, event, status, message }) => {
  const errorId = crypto.randomUUID();

  // Log client-side errors for debugging
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
});
