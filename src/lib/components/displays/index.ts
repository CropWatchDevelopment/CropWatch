/**
 * Barrel export for device display components.
 *
 * These are typically NOT imported directly — the registry in
 * `$lib/config/deviceTables.ts` uses dynamic `import()` to lazy-load them.
 * This index exists for convenience in tests or stories.
 */
export { default as AirDisplay } from './AirDisplay.svelte';
export { default as SoilDisplay } from './SoilDisplay.svelte';
export { default as TrafficDisplay } from './TrafficDisplay.svelte';
export { default as WaterDisplay } from './WaterDisplay.svelte';
export { default as RelayDisplay } from './RelayDisplay.svelte';
export { default as PowerDisplay } from './PowerDisplay.svelte';
export { default as DefaultDisplay } from './DefaultDisplay.svelte';
