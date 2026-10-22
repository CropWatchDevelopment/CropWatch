// See https://svelte.dev/docs/kit/types#app.d.ts

import type { IJWT } from '$lib/interfaces/jwt.interface';
import type { PublicConfig } from '$lib/config/public';
import type { ServerConfig } from '$lib/server/config';
import type { ServerServices } from '$lib/server/services';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			jwt: IJWT | null;
			jwtString: string | null;
			/** This request's configuration, read once by `hooks.server.ts`. */
			config: { public: PublicConfig; server: ServerConfig };
			/** Request-scoped data access, built by `hooks.server.ts` (see `$lib/server/services`). */
			services: ServerServices;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
