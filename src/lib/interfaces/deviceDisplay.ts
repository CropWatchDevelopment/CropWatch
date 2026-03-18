import type { Component, SvelteComponent } from 'svelte';

/**
 * Common props contract that every device display component must accept.
 *
 * Display components own their own layout, chart config, column definitions,
 * and formatting — the dispatcher page passes this uniform shape and each
 * component decides how to render it.
 */
export interface DeviceDisplayProps {
	/** The device EUI identifier. */
	devEui: string;

	/** Location id the device belongs to. */
	locationId: string;

	/** Human-readable location name (for display & CSV filenames). */
	locationName: string;

	/** Most recent telemetry record (may be null before the first fetch resolves). */
	latestData: Record<string, unknown> | null;

	/**
	 * Historical telemetry rows for the selected date range.
	 * Shape varies per table — each display component knows its own columns.
	 */
	historicalData: Record<string, unknown>[];

	/** Whether historical data is currently being fetched. */
	loading: boolean;

	/** JWT auth token forwarded for any client-side API calls. */
	authToken: string | null;
}

/**
 * A Svelte component constructor that accepts {@link DeviceDisplayProps}.
 *
 * Uses a permissive type to avoid friction with Svelte's internal component
 * typing across different versions.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DeviceDisplayComponent = Component<DeviceDisplayProps>;
