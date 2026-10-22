import { untrack } from 'svelte';
import {
	attachCwDeviceRefreshVisibility,
	createCwDeviceRefreshScheduler,
	normalizeCwUploadIntervalMinutes,
	type CwToastApi
} from '@cropwatchdevelopment/cwui';
import { ApiError, readApiErrorMessage } from '$lib/api/api-error';
import type { RelayRepository } from '$lib/api/repositories/relays.repository';
import type { TelemetryRepository } from '$lib/api/repositories/telemetry.repository';
import { isRelayTable } from '$lib/config/deviceTables';
import { canManage, PermissionLevel } from '$lib/constants/permissions';
import {
	hasConfirmingRelay,
	type RelayStateSnapshot,
	type RelayVerificationResult,
	RelayStateManager
} from '$lib/devices/relay-control';
import { type RelayNumber, type RelayTargetState } from '$lib/devices/relay-types';
import { m } from '$lib/paraglide/messages.js';
import type { PageData } from './$types';
import {
	DEFAULT_RANGE_SELECTION,
	MAX_RANGE_RECORDS,
	RELAY_HISTORY_REFRESH_DELAY_MS,
	createEmptyRelaySnapshot,
	createRouteState,
	getRangeBounds,
	getRelayTargetStateLabel,
	getVerifiedRelayStateLabel,
	isTelemetryRow,
	mapRelayApiErrorMessage,
	normalizeTelemetryRows,
	readCreatedAt,
	readRelayTelemetryRow,
	toIsoString,
	type RangeSelection,
	type RouteState,
	type TelemetryRow
} from './device-detail';

/** The page data the dashboard works from (device layout + this page's load). */
export type DeviceDashboardData = Pick<
	PageData,
	| 'authToken'
	| 'dataTable'
	| 'devEui'
	| 'device'
	| 'deviceData'
	| 'latestData'
	| 'locationId'
	| 'permissionLevel'
>;

export interface DeviceDashboardDeps {
	/** Read on every access, so the dashboard follows client-side navigation between devices. */
	data: () => DeviceDashboardData;
	telemetry: TelemetryRepository;
	relays: RelayRepository;
	toast: Pick<CwToastApi, 'add'>;
}

/**
 * The device page's data: the selected history range, the latest reading and,
 * for relays, the relay state manager and its commands. One instance per page
 * component; the page wires `handleNavigation` to `afterNavigate`,
 * `destroyRelayStateManager` to `onDestroy`, and runs `scheduleRefresh` and
 * `refreshOnForeground` from effects.
 *
 * State is kept per route (`locationId:devEui`), so returning to a device
 * already shown in this page instance reuses what was loaded for it.
 */
export class DeviceDashboard {
	readonly #data: () => DeviceDashboardData;
	readonly #telemetry: TelemetryRepository;
	readonly #relays: RelayRepository;
	readonly #toast: Pick<CwToastApi, 'add'>;

	#routeStateByKey = $state<Record<string, RouteState>>({});
	readonly #initializedRouteKeys: Record<string, true> = {};
	/** The latest reading refetched in the browser, and the route it was fetched for. */
	#clientLatest = $state<{ routeKey: string; row: TelemetryRow } | null>(null);
	#relayStateManager: RelayStateManager | null = null;
	#relayStateManagerKey = '';
	#unsubscribeRelayState = () => {};
	#relayHistoryRefreshTimer: ReturnType<typeof setTimeout> | null = null;
	/** The relay state manager's last snapshot, and the route that manager is for. */
	#relaySnapshot = $state<{ routeKey: string; snapshot: RelayStateSnapshot } | null>(null);

	// `$derived.by` wherever `#data` is read: it is only assigned in the
	// constructor, after the field initializers have run.
	readonly devEui = $derived.by(() => this.#data().devEui ?? '');
	readonly locationId = $derived.by(() => this.#data().locationId ?? '');
	readonly authToken = $derived.by(() => this.#data().authToken ?? null);
	readonly isRelayDevice = $derived.by(() => isRelayTable(this.#data().dataTable));
	readonly permissionLevel = $derived.by(
		() => Number(this.#data().permissionLevel) || PermissionLevel.DISABLED
	);
	readonly #serverLatestData = $derived.by(() => {
		const { latestData } = this.#data();
		return isTelemetryRow(latestData) ? latestData : null;
	});
	readonly #serverHistoricalData = $derived.by(() =>
		normalizeTelemetryRows(this.#data().deviceData)
	);
	readonly routeKey = $derived(`${this.locationId}:${this.devEui}`);
	// What was fetched in the browser (a refetched latest reading, the relay
	// manager's state) counts only on its own route: after a navigation the page
	// shows, and arms its refresh from, the next device's own reading at once,
	// before `handleNavigation` runs.
	readonly #latestData = $derived(
		(this.#clientLatest?.routeKey === this.routeKey ? this.#clientLatest.row : null) ??
			this.#serverLatestData
	);
	readonly relayStateSnapshot = $derived(
		this.#relaySnapshot?.routeKey === this.routeKey
			? this.#relaySnapshot.snapshot
			: createEmptyRelaySnapshot()
	);
	// `upload_interval` is a Postgres `numeric` column, so Supabase returns it as
	// a STRING ("15", "-1", …). normalizeCwUploadIntervalMinutes rejects
	// non-positive / non-finite values so the refresh scheduler falls back to its
	// own default instead of scheduling a tight loop.
	readonly #uploadIntervalMinutes = $derived.by(() => {
		const { device } = this.#data();
		return normalizeCwUploadIntervalMinutes(
			device?.upload_interval ?? device?.cw_device_type?.default_upload_interval
		);
	});

	readonly #requestedHistoricalData = $derived(
		this.#routeStateByKey[this.routeKey]?.requestedHistoricalData ?? null
	);
	readonly #historicalData = $derived(this.#requestedHistoricalData ?? this.#serverHistoricalData);
	readonly activeRange = $derived(this.#routeStateByKey[this.routeKey]?.activeRange ?? null);
	readonly fetching = $derived(this.#routeStateByKey[this.routeKey]?.fetching ?? false);
	readonly fetchError = $derived(this.#routeStateByKey[this.routeKey]?.fetchError ?? null);
	readonly relayHistory = $derived(this.#routeStateByKey[this.routeKey]?.relayHistory ?? null);
	readonly displayLatestData = $derived(
		this.isRelayDevice ? (this.relayStateSnapshot.latestData ?? this.#latestData) : this.#latestData
	);
	readonly displayHistoricalData = $derived(
		this.isRelayDevice && this.relayStateSnapshot.historicalData.length > 0
			? this.relayStateSnapshot.historicalData
			: this.#historicalData
	);
	readonly #displayCurrentRecord = $derived(
		this.displayLatestData ?? this.displayHistoricalData[0] ?? null
	);
	readonly lastUpdatedAt = $derived(readCreatedAt(this.#displayCurrentRecord));

	constructor(deps: DeviceDashboardDeps) {
		this.#data = deps.data;
		this.#telemetry = deps.telemetry;
		this.#relays = deps.relays;
		this.#toast = deps.toast;
	}

	#handleRelayConfirmationResolved = (result: RelayVerificationResult): void => {
		this.#scheduleRelayHistoryRefresh();
		const relay = String(result.relay);

		switch (result.outcome) {
			case 'confirmed':
				this.#toast.add({
					tone: 'success',
					message: m.devices_relay_confirmation_changed({
						relay,
						state: getRelayTargetStateLabel(result.targetState)
					})
				});
				return;
			case 'mismatch':
				this.#toast.add({
					tone: 'warning',
					message: m.devices_relay_confirmation_mismatch({
						relay,
						state: getVerifiedRelayStateLabel(result.relay, result.row)
					})
				});
				return;
			case 'unconfirmed':
				this.#toast.add({
					tone: 'warning',
					message: m.devices_relay_confirmation_unconfirmed({ relay })
				});
		}
	};

	#getRouteState(key: string): RouteState {
		if (!this.#routeStateByKey[key]) {
			this.#routeStateByKey[key] = createRouteState();
		}

		return this.#routeStateByKey[key];
	}

	/** Runs on mount and after every navigation (the page's `afterNavigate`). */
	handleNavigation(): void {
		const key = this.routeKey;
		// A reading refetched for the previous device goes with it: returning to
		// that device later shows the reading its page loads then.
		if (this.#clientLatest && this.#clientLatest.routeKey !== key) {
			this.#clientLatest = null;
		}

		if (this.isRelayDevice && this.authToken) {
			this.#ensureRelayStateManager();
		} else {
			this.destroyRelayStateManager();
		}

		if (!this.authToken || !this.devEui || !key || this.#initializedRouteKeys[key]) return;

		this.#initializedRouteKeys[key] = true;
		void this.selectRange(DEFAULT_RANGE_SELECTION);
	}

	/**
	 * Refetch the device when its own upload window (last seen +
	 * upload_interval + grace) expires, instead of polling on a fixed interval.
	 * While the device stays stale the scheduler retries with capped exponential
	 * backoff; fresh data re-arms it from the new reading. Pauses while the tab
	 * is hidden and reconciles on return.
	 *
	 * Call it inside an `$effect` (it re-arms when the device, token or upload
	 * interval changes); returns the effect's cleanup.
	 */
	scheduleRefresh(): (() => void) | undefined {
		if (!this.authToken || !this.devEui) return;
		const intervalMinutes = this.#uploadIntervalMinutes;

		const scheduler = createCwDeviceRefreshScheduler({
			fetcher: async () => {
				const row = await this.#refreshDisplayedData();
				return { lastSeenAt: row ? readCreatedAt(row) : null, data: row };
			}
		});

		untrack(() => {
			scheduler.track({
				id: this.devEui,
				lastSeenAt: this.lastUpdatedAt ?? null,
				uploadIntervalMinutes: intervalMinutes
			});
		});

		const detachVisibility = attachCwDeviceRefreshVisibility(scheduler);
		return () => {
			detachVisibility();
			scheduler.destroy();
		};
	}

	#syncRelayStateBaseData(): void {
		if (!this.isRelayDevice || !this.#relayStateManager) {
			return;
		}

		this.#relayStateManager.replaceBaseData({
			historicalData: this.#historicalData,
			latestData: this.#latestData
		});
	}

	destroyRelayStateManager(): void {
		if (this.#relayHistoryRefreshTimer) {
			clearTimeout(this.#relayHistoryRefreshTimer);
			this.#relayHistoryRefreshTimer = null;
		}
		this.#unsubscribeRelayState();
		this.#unsubscribeRelayState = () => {};
		this.#relayStateManager?.destroy();
		this.#relayStateManager = null;
		this.#relayStateManagerKey = '';
		this.#relaySnapshot = null;
	}

	#ensureRelayStateManager(): void {
		if (!this.isRelayDevice || !this.authToken || !this.devEui) {
			this.destroyRelayStateManager();
			return;
		}

		const nextManagerKey = `${this.routeKey}:${this.authToken}`;
		if (this.#relayStateManager && this.#relayStateManagerKey === nextManagerKey) {
			this.#syncRelayStateBaseData();
			return;
		}

		this.destroyRelayStateManager();

		// The manager works for this device: its requests name this DevEUI, and
		// what it reports counts only while this route is shown (a navigation
		// changes the route before `handleNavigation` replaces the manager).
		const { devEui, routeKey } = this;
		const manager = new RelayStateManager({
			fetchLatestData: async (signal) => await this.#fetchRelayData(devEui, { signal }),
			requestStatus: async () => {
				await this.#relays.requestRelayStatus(devEui);
			},
			historicalData: this.#historicalData,
			latestData: this.#latestData,
			onVerificationResolved: (result) => {
				if (this.routeKey === routeKey) this.#handleRelayConfirmationResolved(result);
			}
		});
		let lastReportAt: string | null = null;
		this.#unsubscribeRelayState = manager.subscribe((snapshot) => {
			if (this.routeKey !== routeKey) return;
			this.#relaySnapshot = { routeKey, snapshot };
			// A new device report can be a state change for the history.
			const reportAt = snapshot.latestData?.created_at ?? null;
			if (lastReportAt !== null && reportAt !== null && reportAt !== lastReportAt) {
				this.#scheduleRelayHistoryRefresh();
			}
			lastReportAt = reportAt ?? lastReportAt;
		});
		this.#relayStateManager = manager;
		this.#relayStateManagerKey = nextManagerKey;
	}

	async #loadHistoricalData(
		start: Date | string,
		end: Date | string,
		rangeSelection: RangeSelection | null
	): Promise<void> {
		if (!this.authToken || !this.devEui) {
			return;
		}

		// Read at request time: the answer, or its failure, belongs to this route.
		const { devEui, isRelayDevice } = this;
		const state = this.#getRouteState(this.routeKey);
		state.fetching = true;
		state.fetchError = null;

		try {
			if (isRelayDevice) {
				// Relays keep one state row, so their range is the history log instead.
				state.relayHistory = await this.#relays.getRelayHistory(devEui, {
					start: toIsoString(start),
					end: toIsoString(end)
				});
			} else {
				// The API answers 404 when the range has no rows (e.g. a new device).
				const result = await this.#telemetry
					.getDeviceDataWithinRange(
						devEui,
						{
							start: toIsoString(start),
							end: toIsoString(end),
							take: MAX_RANGE_RECORDS
						},
						{ suppressNotFoundError: true }
					)
					.catch((error) => {
						if (error instanceof ApiError && error.status === 404) return [];
						throw error;
					});
				state.requestedHistoricalData = normalizeTelemetryRows(result);
			}
			state.activeRange = rangeSelection;
		} catch (error) {
			console.error('Failed to fetch device data:', error);
			state.fetchError = isRelayDevice
				? m.devices_relay_history_load_failed()
				: m.devices_load_telemetry_failed();
			this.#toast.add({ tone: 'danger', message: state.fetchError });
		} finally {
			state.fetching = false;
		}
	}

	/** Re-reads the relay history soon; bursts of triggers collapse into one read. */
	#scheduleRelayHistoryRefresh(): void {
		if (!this.isRelayDevice) return;
		if (this.#relayHistoryRefreshTimer) clearTimeout(this.#relayHistoryRefreshTimer);
		this.#relayHistoryRefreshTimer = setTimeout(() => {
			this.#relayHistoryRefreshTimer = null;
			void this.#refreshRelayHistory();
		}, RELAY_HISTORY_REFRESH_DELAY_MS);
	}

	/**
	 * Re-reads the active range's history quietly: no loading state, and the
	 * result is dropped if the user switched range (or a full load started).
	 */
	async #refreshRelayHistory(): Promise<void> {
		const key = this.routeKey;
		const state = this.#getRouteState(key);
		const range = state.activeRange;
		if (!this.authToken || !this.devEui || state.fetching || range === null) return;

		try {
			const history = await this.#relays.getRelayHistory(this.devEui, getRangeBounds(range));
			if (this.routeKey === key && state.activeRange === range && !state.fetching) {
				state.relayHistory = history;
			}
		} catch (error) {
			console.error('Failed to refresh relay history:', error);
		}
	}

	selectRange = async (selection: RangeSelection): Promise<void> => {
		const { start, end } = getRangeBounds(selection);
		await this.#loadHistoricalData(start, end, selection);
	};

	async #fetchLatestData() {
		if (!this.authToken || !this.devEui) return null;
		// The reading is for the device it was asked for: dropped when the page
		// has moved on to another device by the time it arrives.
		const { devEui, routeKey } = this;

		try {
			const result = await this.#telemetry.getDeviceLatestData(devEui);

			if (isTelemetryRow(result) && this.routeKey === routeKey) {
				this.#clientLatest = { routeKey, row: result };
				const resultKey = String(result.id ?? result.created_at ?? '');
				const state = this.#getRouteState(routeKey);
				const currentHistory = state.requestedHistoricalData ?? this.#serverHistoricalData;
				state.requestedHistoricalData = [
					result,
					...currentHistory.filter((row) => String(row.id ?? row.created_at ?? '') !== resultKey)
				];
				this.#syncRelayStateBaseData();

				return result;
			}
		} catch (err) {
			if (err instanceof ApiError && err.status === 404) {
				return null;
			}

			console.error('Failed to fetch latest air data:', err);
		}

		return null;
	}

	async #fetchRelayData(devEui: string, options: { signal?: AbortSignal } = {}) {
		if (!this.authToken) return null;

		try {
			const result = await this.#relays.getRelayData(devEui, {
				signal: options.signal,
				suppressNotFoundError: true
			});

			return readRelayTelemetryRow(result);
		} catch (err) {
			if (err instanceof ApiError && err.status === 404) {
				return null;
			}

			console.error('Failed to fetch latest relay data:', err);
		}

		return null;
	}

	async #refreshRelayDisplayData(): Promise<TelemetryRow | null> {
		if (!this.authToken || !this.devEui) {
			return null;
		}

		this.#ensureRelayStateManager();
		return (await this.#relayStateManager?.refreshLatestData()) ?? null;
	}

	async #refreshDisplayedData(): Promise<TelemetryRow | null> {
		return this.isRelayDevice
			? await this.#refreshRelayDisplayData()
			: await this.#fetchLatestData();
	}

	/**
	 * Full pull whenever the user returns to the tab/app. A detail page left in
	 * the background goes stale — the device can look offline purely because the
	 * page sat idle past its upload interval. Refresh the active history range
	 * first, then the latest reading so it prepends onto fresh history.
	 */
	async refreshOnForeground(): Promise<void> {
		if (!this.authToken || !this.devEui) return;
		await this.selectRange(this.activeRange ?? DEFAULT_RANGE_SELECTION);
		await this.#refreshDisplayedData();
	}

	queueRelayCommand = async (
		relay: RelayNumber,
		targetState: RelayTargetState,
		durationSeconds?: number
	): Promise<void> => {
		if (
			!this.isRelayDevice ||
			!this.authToken ||
			!this.devEui ||
			!canManage(this.permissionLevel) ||
			hasConfirmingRelay(this.relayStateSnapshot.pendingRelayStates)
		) {
			return;
		}

		const { routeKey } = this;
		try {
			this.#ensureRelayStateManager();
			const isPulse = typeof durationSeconds === 'number' && Number.isFinite(durationSeconds);
			const result = isPulse
				? await this.#relays.pulseRelay(this.devEui, { durationSeconds, relay })
				: await this.#relays.updateRelay(this.devEui, { relay, targetState });
			// The page moved on to another device meanwhile: its manager must not
			// wait for this device's command.
			if (this.routeKey !== routeKey) return;

			// The API's send time: only device reports received after it count.
			this.#scheduleRelayHistoryRefresh();
			this.#relayStateManager?.startVerification(relay, targetState, {
				sentAt: typeof result?.requestedAt === 'string' ? result.requestedAt : undefined,
				durationSeconds: isPulse ? durationSeconds : undefined
			});
			this.#toast.add({
				tone: 'info',
				message: m.devices_relay_command_queued({ relay: String(relay) })
			});
		} catch (error) {
			console.error('[relay-control] command failed', {
				devEui: this.devEui,
				durationSeconds,
				error,
				relay,
				targetState
			});

			const fallback = mapRelayApiErrorMessage(error);
			this.#toast.add({
				tone: 'danger',
				message: error instanceof ApiError ? readApiErrorMessage(error.payload, fallback) : fallback
			});
		}
	};
}
