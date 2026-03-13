/**
 * Barrel export for device display components.
 *
 * These are typically NOT imported directly — the registry in
 * `$lib/config/deviceTables.ts` uses dynamic `import()` to lazy-load them.
 * This index exists for convenience in tests or stories.
 */
export { default as AirDisplay } from './AirDisplay/AirDisplay.svelte';
export { default as SoilDisplay } from './SoilDisplay/SoilDisplay.svelte';
export { default as TrafficDisplay } from './TrafficDisplay/TrafficDisplay.svelte';
export { default as WaterDisplay } from './WaterDisplay/WaterDisplay.svelte';
export { default as RelayDisplay } from './RelayDisplay/RelayDisplay.svelte';
export { default as PowerDisplay } from './PowerDisplay/PowerDisplay.svelte';
export { default as DefaultDisplay } from './DefaultDisplay.svelte';
    