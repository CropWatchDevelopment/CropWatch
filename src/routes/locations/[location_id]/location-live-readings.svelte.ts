import {
	attachCwDeviceRefreshVisibility,
	createCwDeviceRefreshScheduler,
	type CwDeviceFreshness,
	type CwDeviceRefreshScheduler
} from '@cropwatchdevelopment/cwui';
import type { DevicePrimaryDataDto } from '$lib/api/api.dtos';
import type { DashboardRepository } from '$lib/api/repositories/dashboard.repository';
import { readingTime, toFiniteNumber } from './location-overview';

export interface LocationLiveReadingsOptions {
	dashboard: Pick<DashboardRepository, 'getDashboardDeviceLatest'>;
	/** The "signed in?" gate: nothing is fetched without a session. */
	isSignedIn: () => boolean;
	/** Injectable for tests; default: cwui's refresh scheduler. */
	createScheduler?: typeof createCwDeviceRefreshScheduler;
	/** Injectable for tests; default: cwui's tab-visibility hook. */
	attachVisibility?: typeof attachCwDeviceRefreshVisibility;
}

/**
 * Live freshness and latest reading per device, driven by the refresh
 * scheduler: each device is refetched when its upload window expires.
 */
export class LocationLiveReadings {
	refreshing = $state(false);
	freshnessByDevEui = $state<Record<string, CwDeviceFreshness>>({});
	lastSeenByDevEui = $state<Record<string, string>>({});
	latestByDevEui = $state<Record<string, Record<string, unknown>>>({});

	#scheduler: CwDeviceRefreshScheduler | null = null;
	readonly #dashboard: LocationLiveReadingsOptions['dashboard'];
	readonly #isSignedIn: () => boolean;
	readonly #createScheduler: typeof createCwDeviceRefreshScheduler;
	readonly #attachVisibility: typeof attachCwDeviceRefreshVisibility;

	constructor(options: LocationLiveReadingsOptions) {
		this.#dashboard = options.dashboard;
		this.#isSignedIn = options.isSignedIn;
		this.#createScheduler = options.createScheduler ?? createCwDeviceRefreshScheduler;
		this.#attachVisibility = options.attachVisibility ?? attachCwDeviceRefreshVisibility;
	}

	/**
	 * Tracks `devices` until the returned teardown runs — call it from an
	 * `$effect`. Does nothing without a session or without devices.
	 */
	start(devices: DevicePrimaryDataDto[]): (() => void) | undefined {
		if (!this.#isSignedIn() || devices.length === 0) return;

		const instance = this.#createScheduler({
			defaultIntervalMinutes: 10,
			fetcher: async (devEui) => {
				const latest = await this.#dashboard.getDashboardDeviceLatest(devEui);
				if (!latest) return null;
				return { lastSeenAt: readingTime(latest), data: latest };
			},
			onData: (devEui, result) => {
				if (typeof result.lastSeenAt === 'string') {
					this.lastSeenByDevEui[devEui] = result.lastSeenAt;
				}
				if (result.data && typeof result.data === 'object') {
					this.latestByDevEui[devEui] = result.data as Record<string, unknown>;
				}
			},
			onStateChange: (devEui, state) => {
				this.freshnessByDevEui[devEui] = state;
			}
		});

		instance.trackAll(
			devices.map((device) => ({
				id: String(device.dev_eui ?? ''),
				lastSeenAt:
					typeof device.last_data_updated_at === 'string' ? device.last_data_updated_at : null,
				uploadIntervalMinutes: toFiniteNumber(device.upload_interval)
			}))
		);
		// The scheduler only fetches devices whose upload window has passed, so
		// load every device's latest row once for the readings columns.
		for (const device of devices) void this.#loadLatest(instance, String(device.dev_eui ?? ''));

		this.#scheduler = instance;
		const detachVisibility = this.#attachVisibility(instance);
		return () => {
			detachVisibility();
			instance.destroy();
			this.#scheduler = null;
		};
	}

	async refreshAll(devices: DevicePrimaryDataDto[]): Promise<void> {
		const instance = this.#scheduler;
		if (!instance || !this.#isSignedIn() || this.refreshing) return;
		this.refreshing = true;
		try {
			await Promise.all(
				devices.map((device) => this.#loadLatest(instance, String(device.dev_eui ?? '')))
			);
		} finally {
			this.refreshing = false;
		}
	}

	// Reports through reportData rather than refreshNow: the scheduler treats a
	// refetch that returns the same reading as "no new data" and marks it stale.
	async #loadLatest(instance: CwDeviceRefreshScheduler, devEui: string): Promise<void> {
		const latest = await this.#dashboard.getDashboardDeviceLatest(devEui).catch(() => null);
		if (!latest) return;
		this.latestByDevEui[devEui] = latest;
		const seenAt = readingTime(latest);
		if (seenAt) {
			this.lastSeenByDevEui[devEui] = seenAt;
			instance.reportData(devEui, seenAt);
		}
	}
}
