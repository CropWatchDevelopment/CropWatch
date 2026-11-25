// See https://svelte.dev/docs/kit/types#app.d.ts

import type { IJWT } from '#lib/interfaces/jwt.interface.ts';
import type { PublicConfig } from '#lib/config/public.ts';
import type { ServerConfig } from '#lib/server/config.ts';
import type { ServerServices } from '#lib/server/services.ts';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			jwt: IJWT | null;
			jwtString: string | null;
			/** This request's configuration, read once by `hooks.server.ts`. */
			config: { public: PublicConfig; server: ServerConfig };
			/** Request-scoped data access, built by `hooks.server.ts` (see `#lib/server/services`). */
			services: ServerServices;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
