import * as publicEnv from '$app/env/public';

/**
 * The public env (`src/env.ts`) as one object, which `readPublicConfig` reads
 * on every call. It is a module of its own so a spec can replace the object
 * (`vi.mock('#lib/config/public-env.ts', () => ({ publicEnv: runtime.env }))`)
 * and change its values between tests.
 */
export { publicEnv };
