import {
	mergeRelayTelemetryRows,
	normalizeRelayTelemetryRow,
	normalizeRelayTelemetryRows,
	relayStateMatchesTarget
} from './relay-telemetry';
import type {
	PendingRelayState,
	PendingRelayStates,
	RelayNumber,
	RelayTargetState,
	RelayTelemetryRow
} from './relay-types';

export const RELAY_VERIFICATION_DELAY_MS = 15_000;
export const RELAY_REFRESH_INTERVAL_MS = 30_000;
export const MIN_RELAY_PULSE_DURATION_SECONDS = 15;
export const MAX_RELAY_PULSE_DURATION_SECONDS = 4_294_967;

export interface RelayStateSnapshot {
	historicalData: RelayTelemetryRow[];
	latestData: RelayTelemetryRow | null;
	pendingRelayStates: PendingRelayStates;
}

export interface RelayVerificationResult {
	matched: boolean;
	relay: RelayNumber;
	row: RelayTelemetryRow | null;
	targetState: RelayTargetState;
}

interface RelayStateBaseData {
	historicalData: Record<string, unknown>[];
	latestData: Record<string, unknown> | null;
}

export interface RelayStateManagerOptions extends RelayStateBaseData {
	fetchLatestData: (signal?: AbortSignal) => Promise<Record<string, unknown> | null>;
	onVerificationResolved?: (result: RelayVerificationResult) => void;
	fetchOnInit?: boolean;
	refreshIntervalMs?: number;
	verifyDelayMs?: number;
}

export type RelayStateListener = (snapshot: RelayStateSnapshot) => void;

export class RelayStateManager {
	private readonly fetchLatestData: RelayStateManagerOptions['fetchLatestData'];
	private readonly listeners = new Set<RelayStateListener>();
	private readonly onVerificationResolved?: RelayStateManagerOptions['onVerificationResolved'];
	private readonly refreshIntervalMs: number;
	private readonly verifyDelayMs: number;
	private currentFetch: Promise<RelayTelemetryRow | null> | null = null;
	private currentFetchAbortController: AbortController | null = null;
	private refreshTimer: ReturnType<typeof setInterval> | null = null;
	private snapshot: RelayStateSnapshot;
	private verificationTimers = new Map<RelayNumber, ReturnType<typeof setTimeout>>();

	public constructor(options: RelayStateManagerOptions) {
		this.fetchLatestData = options.fetchLatestData;
		this.onVerificationResolved = options.onVerificationResolved;
		this.refreshIntervalMs = options.refreshIntervalMs ?? RELAY_REFRESH_INTERVAL_MS;
		this.verifyDelayMs = options.verifyDelayMs ?? RELAY_VERIFICATION_DELAY_MS;
		this.snapshot = this.buildSnapshot(options);
		this.startBackgroundRefresh();

		if (options.fetchOnInit !== false) {
			void this.refreshLatestData();
		}
	}

	public destroy(): void {
		for (const relay of [1, 2] as const) {
			this.clearVerificationTimer(relay);
		}

		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
			this.refreshTimer = null;
		}

		this.currentFetchAbortController?.abort();
		this.currentFetchAbortController = null;
		this.currentFetch = null;
		this.listeners.clear();
	}

	public getSnapshot(): RelayStateSnapshot {
		return this.snapshot;
	}

	public replaceBaseData(baseData: RelayStateBaseData): void {
		const latest = normalizeRelayTelemetryRow(baseData.latestData);
		const history = mergeRelayTelemetryRows(
			this.snapshot.historicalData,
			latest ? [latest] : [],
			normalizeRelayTelemetryRows(baseData.historicalData),
			this.snapshot.latestData ? [this.snapshot.latestData] : []
		);
		const currentLatestData = this.snapshot.latestData ?? latest ?? history[0] ?? null;

		this.emit({
			historicalData: history,
			latestData: currentLatestData
		});
	}

	public async refreshLatestData(): Promise<RelayTelemetryRow | null> {
		return await this.fetchAndApplyLatestData();
	}

	public startVerification(relay: RelayNumber, targetState: RelayTargetState): void {
		this.clearVerificationTimer(relay);

		const pendingState: PendingRelayState = {
			requestedState: targetState,
			verifyAt: new Date(Date.now() + this.verifyDelayMs).toISOString()
		};

		this.emit({
			pendingRelayStates: {
				...this.snapshot.pendingRelayStates,
				[relay]: pendingState
			}
		});

		const timer = setTimeout(() => {
			void this.runVerification(relay, pendingState);
		}, this.verifyDelayMs);

		this.verificationTimers.set(relay, timer);
	}

	public subscribe(listener: RelayStateListener): () => void {
		this.listeners.add(listener);
		listener(this.snapshot);

		return () => {
			this.listeners.delete(listener);
		};
	}

	private applyIncomingRow(row: RelayTelemetryRow): RelayTelemetryRow[] {
		const history = mergeRelayTelemetryRows([row], this.snapshot.historicalData);
		this.emit({
			historicalData: history,
			latestData: row
		});
		return history;
	}

	private buildSnapshot(baseData: RelayStateBaseData): RelayStateSnapshot {
		const latest = normalizeRelayTelemetryRow(baseData.latestData);
		const history = mergeRelayTelemetryRows(
			latest ? [latest] : [],
			normalizeRelayTelemetryRows(baseData.historicalData)
		);

		return {
			historicalData: history,
			latestData: history[0] ?? latest,
			pendingRelayStates: {}
		};
	}

	private clearVerificationTimer(relay: RelayNumber): void {
		const timer = this.verificationTimers.get(relay);
		if (timer) {
			clearTimeout(timer);
			this.verificationTimers.delete(relay);
		}
	}

	private emit(patch: Partial<RelayStateSnapshot>): void {
		this.snapshot = { ...this.snapshot, ...patch };
		for (const listener of this.listeners) listener(this.snapshot);
	}

	private async fetchAndApplyLatestData(): Promise<RelayTelemetryRow | null> {
		if (this.currentFetch) {
			return await this.currentFetch;
		}

		const abortController = new AbortController();
		this.currentFetchAbortController = abortController;
		this.currentFetch = (async () => {
			try {
				const row = await this.fetchLatestData(abortController.signal);
				const normalized = normalizeRelayTelemetryRow(row);
				if (normalized) {
					this.applyIncomingRow(normalized);
				}
				return normalized;
			} catch (error) {
				if (!(error instanceof Error && error.name === 'AbortError')) {
					console.error('[relay-state] fetch failed', { error });
				}
				return null;
			} finally {
				if (this.currentFetchAbortController === abortController) {
					this.currentFetchAbortController = null;
				}
				this.currentFetch = null;
			}
		})();

		return await this.currentFetch;
	}

	private async runVerification(
		relay: RelayNumber,
		pendingState: PendingRelayState
	): Promise<void> {
		const latestPendingState = this.snapshot.pendingRelayStates[relay];
		if (
			!latestPendingState ||
			latestPendingState.requestedState !== pendingState.requestedState ||
			latestPendingState.verifyAt !== pendingState.verifyAt
		) {
			return;
		}

		const row = await this.fetchAndApplyLatestData();
		const nextPendingRelayStates = { ...this.snapshot.pendingRelayStates };
		delete nextPendingRelayStates[relay];
		this.emit({ pendingRelayStates: nextPendingRelayStates });
		this.clearVerificationTimer(relay);

		this.onVerificationResolved?.({
			matched: relayStateMatchesTarget(row, relay, pendingState.requestedState),
			relay,
			row,
			targetState: pendingState.requestedState
		});
	}

	private startBackgroundRefresh(): void {
		this.refreshTimer = setInterval(() => {
			void this.refreshLatestData();
		}, this.refreshIntervalMs);
	}
}
