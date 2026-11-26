import { defineEnvVars } from '@sveltejs/kit/env';

// Every environment variable the app reads, for `$app/env/public` and
// `$app/env/private`. Read them through `readPublicConfig()`,
// `readServerConfig()` and `readFirebaseConfig()` (`#lib/config`,
// `#lib/server/config`), not from these modules directly.

/** May be unset: the config reader supplies the default. */
const optional = (value: string | undefined) => value;

export const variables = defineEnvVars({
	// Build-time values (`static`), inlined into the bundle, so each
	// environment's build bakes in its own. The build fails when one is unset.
	// Only the server talks to Supabase, so these two stay out of the browser
	// bundle despite their names.
	PUBLIC_SUPABASE_URL: { static: true },
	PUBLIC_SUPABASE_ANON_KEY: { static: true },
	PUBLIC_FIREBASE_API_KEY: { public: true, static: true },
	PUBLIC_FIREBASE_APP_ID: { public: true, static: true },
	PUBLIC_FIREBASE_AUTH_DOMAIN: { public: true, static: true },
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID: { public: true, static: true },
	PUBLIC_FIREBASE_PROJECT_ID: { public: true, static: true },
	PUBLIC_FIREBASE_VAPID_KEY: { public: true, static: true },
	PRIVATE_RECAPTCHA_PROJECT_ID: { static: true },
	PRIVATE_RECAPTCHA_API_KEY: { static: true },
	PRIVATE_RECAPTCHA_SITE_KEY: { static: true },

	// Read when the server starts.
	PUBLIC_APP_ENV: { public: true, schema: optional },
	PUBLIC_API_BASE_URL: { public: true, schema: optional },
	PUBLIC_LOGIN_ENDPOINT: { public: true, schema: optional },
	PUBLIC_DEVICE_STATUS_ENDPOINT: { public: true, schema: optional },
	PUBLIC_RULE_TEMPLATES_ENDPOINT: { public: true, schema: optional },
	PUBLIC_REPORT_TEMPLATES_ENDPOINT: { public: true, schema: optional },
	PUBLIC_AIR_NOTES_ENDPOINT: { public: true, schema: optional },
	PUBLIC_GET_AIR_NOTES_ENDPOINT: { public: true, schema: optional },
	PUBLIC_GA_MEASUREMENT_ID: { public: true, schema: optional },
	PUBLIC_RECAPTCHA_SITE_KEY: { public: true, schema: optional },
	PRIVATE_RECAPTCHA_API_BASE_URL: { schema: optional },
	PRIVATE_LIBELLUS_BASE_URL: { schema: optional },
	PRIVATE_LIBELLUS_API_TOKEN: { schema: optional },
	ORGS_ENABLED: { schema: optional }
});
