// See https://svelte.dev/docs/kit/types#app.d.ts

import type { IJWT } from "$lib/interfaces/jwt.interface";

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			jwt: IJWT | null;
			jwtString: string | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export { };
