import { createContext } from 'svelte';
import type { AppServices } from './app-services';

/**
 * `setServices` is called once, by the root layout. Components call
 * `getServices()` during initialisation — never `new …Repository()` — so a
 * test can render any component against mock services.
 */
const [getServices, setServices] = createContext<AppServices>();

export { getServices, setServices };
