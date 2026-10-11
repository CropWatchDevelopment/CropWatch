import {
	compareRelayCreatedAt,
	getRelayState,
	mergeRelayTelemetryRows,
	normalizeRelayTelemetryRow,
	normalizeRelayTelemetryRows
} from './relay-telemetry';
import type {
	PendingRelayState,
	PendingRelayStates,
	RelayNumber,
	RelayTargetState,
	RelayTelemetryRow
} from './relay-types';

/** First look for the device's report: a Class C relay usually answers within ~5 s. */
export const RELAY_FIRST_CHECK_MS = 5_000;
/** How often to look again while waiting for that report. */
export const RELAY_CHECK_INTERVAL_MS = 4_000;
/** Still no report: it was probably lost, so ask the device to report its state. */
export const RELAY_STATUS_REQUEST_AFTER_MS = 20_000;
/** Stop actively waiting and unlock the controls; the next report still settles it. */
export const RELAY_CONFIRMATION_WINDOW_MS = 60_000;
export const RELAY_REFRESH_INTERVAL_MS = 30_000;
export const MIN_RELAY_PULSE_DURATION_SECONDS = 15;
export const MAX_RELAY_PULSE_DURATION_SECONDS = 4_294_967;

/** Asks per command, so a missing API endpoint can't turn into a request loop. */
const MAX_STATUS_REQUESTS = 2;
/** A report requested this close to a pulse's end would only show it reverting. */
const STATUS_REPLY_MARGIN_MS = 15_000;

export interface RelayStateSnapshot {
	historicalData: RelayTelemetryRow[];
	latestData: RelayTelemetryRow | null;
	pendingRelayStates: PendingRelayStates;
}

/**
 * `confirmed`: a report sent after the command shows the requested state.
 * `mismatch`: the device reported after the command and still shows the old state.
 * `unconfirmed`: no report within the confirmation window. Not final: the
 * device's next report settles it as `confirmed` or `mismatch`.
 */
export type RelayVerificationOutcome = 'confirmed' | 'mismatch' | 'unconfirmed';

export interface RelayVerificationResult {
	outcome: RelayVerificationOutcome;
	relay: RelayNumber;
	/** The report that settled it; null while the device hasn't reported since the command. */
	row: RelayTelemetryRow | null;
	targetState: RelayTargetState;
}

export interface RelayVerificationOptions {
	/** Server time the command was sent (the API's `requestedAt`). Defaults to now. */
	sentAt?: string;
	/** Pulse length: the relay reverts on its own after it. */
	durationSeconds?: number;
}

interface RelayStateBaseData {
	historicalData: Record<string, unknown>[];
	latestData: Record<string, unknown> | null;
}

export interface RelayStateManagerOptions extends RelayStateBaseData {
	fetchLatestData: (signal?: AbortSignal) => Promise<Record<string, unknown> | null>;
	/** Asks the device to report its state now; used when a confirmation report is overdue. */
	requestStatus?: () => Promise<void>;
	onVerificationResolved?: (result: RelayVerificationResult) => void;
	fetchOnInit?: boolean;
	refreshIntervalMs?: number;
}

export type RelayStateListener = (snapshot: RelayStateSnapshot) => void;

interface RelayVerification {
	pending: PendingRelayState;
	/** Local clock; only schedules checks. Server times decide which reports count. */
	startedAtMs: number;
	/** Pulses: when the relay reverts (local clock). */
	lapsesAtMs: number | null;
	timer: ReturnType<typeof setTimeout> | null;
	/** Newest report after the command that still showed the old state. */
	mismatchRow: RelayTelemetryRow | null;
	statusRequests: number;
}

/** True while a command is being actively confirmed (relay controls stay locked). */
export function hasConfirmingRelay(pendingRelayStates: PendingRelayStates): boolean {
	return Object.values(pendingRelayStates).some((pending) => pending?.phase === 'confirming');
}

export class RelayStateManager {
	private readonly fetchLatestData: RelayStateManagerOptions['fetchLatestData'];
	private readonly listeners = new Set<RelayStateListener>();
	private readonly onVerificationResolved?: RelayStateManagerOptions['onVerificationResolved'];
	private readonly refreshIntervalMs: number;
	private readonly requestStatus?: RelayStateManagerOptions['requestStatus'];
	private currentFetch: Promise<RelayTelemetryRow | null> | null = null;
	private currentFetchAbortController: AbortController | null = null;
	private refreshTimer: ReturnType<typeof setInterval> | null = null;
	private snapshot: RelayStateSnapshot;
	private verifications = new Map<RelayNumber, RelayVerification>();

	public constructor(options: RelayStateManagerOptions) {
		this.fetchLatestData = options.fetchLatestData;
		this.onVerificationResolved = options.onVerificationResolved;
		this.refreshIntervalMs = options.refreshIntervalMs ?? RELAY_REFRESH_INTERVAL_MS;
		this.requestStatus = options.requestStatus;
		this.snapshot = this.buildSnapshot(options);
		this.startBackgroundRefresh();

		if (options.fetchOnInit !== false) {
			void this.refreshLatestData();
		}
	}

	public destroy(): void {
		for (const relay of [1, 2] as const) {
			this.stopVerification(relay);
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

	/**
	 * Waits for the device to confirm a command. Only a report received after
	 * `sentAt` counts: the stored row before it predates the command and says
	 * nothing about whether it worked.
	 */
	public startVerification(
		relay: RelayNumber,
		targetState: RelayTargetState,
		options: RelayVerificationOptions = {}
	): void {
		this.stopVerification(relay);

		const now = Date.now();
		const sentAt = options.sentAt ?? new Date(now).toISOString();
		const durationMs = options.durationSeconds ? options.durationSeconds * 1000 : null;
		const verification: RelayVerification = {
			pending: {
				requestedState: targetState,
				sentAt,
				phase: 'confirming',
				statusRequested: false,
				...(durationMs !== null && {
					expiresAt: new Date(Date.parse(sentAt) + durationMs).toISOString()
				})
			},
			startedAtMs: now,
			lapsesAtMs: durationMs === null ? null : now + durationMs,
			timer: null,
			mismatchRow: null,
			statusRequests: 0
		};

		this.verifications.set(relay, verification);
		this.emitPending();
		this.scheduleCheck(relay, verification, RELAY_FIRST_CHECK_MS);
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

	private emit(patch: Partial<RelayStateSnapshot>): void {
		this.snapshot = { ...this.snapshot, ...patch };
		for (const listener of this.listeners) listener(this.snapshot);
	}

	private emitPending(): void {
		const pendingRelayStates: PendingRelayStates = {};
		for (const [relay, verification] of this.verifications) {
			pendingRelayStates[relay] = verification.pending;
		}
		this.emit({ pendingRelayStates });
	}

	private updatePending(verification: RelayVerification, patch: Partial<PendingRelayState>): void {
		verification.pending = { ...verification.pending, ...patch };
		this.emitPending();
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
					this.settleVerifications(normalized);
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

	/** Checks each waiting command against a report the device just sent. */
	private settleVerifications(row: RelayTelemetryRow): void {
		for (const [relay, verification] of [...this.verifications]) {
			const { pending } = verification;
			const reported = getRelayState(row, relay);
			if (
				reported === null ||
				compareRelayCreatedAt(row.created_at, pending.sentAt) <= 0 ||
				// After a pulse ends the relay reverts, so later reports can't judge it.
				(pending.expiresAt && compareRelayCreatedAt(row.created_at, pending.expiresAt) > 0)
			) {
				continue;
			}

			if (reported === (pending.requestedState === 'on')) {
				this.settle(relay, 'confirmed', row);
			} else if (pending.phase === 'awaiting-report') {
				this.settle(relay, 'mismatch', row);
			} else {
				// May have been sent just before the command ran: keep waiting for the
				// report after it, and call it a mismatch only if none comes.
				verification.mismatchRow = row;
			}
		}
	}

	private settle(
		relay: RelayNumber,
		outcome: Exclude<RelayVerificationOutcome, 'unconfirmed'>,
		row: RelayTelemetryRow
	): void {
		const verification = this.verifications.get(relay);
		if (!verification) {
			return;
		}

		this.stopVerification(relay);
		this.emitPending();
		this.onVerificationResolved?.({
			outcome,
			relay,
			row,
			targetState: verification.pending.requestedState
		});
	}

	private scheduleCheck(
		relay: RelayNumber,
		verification: RelayVerification,
		delayMs: number
	): void {
		verification.timer = setTimeout(() => {
			void this.runCheck(relay, verification);
		}, delayMs);
	}

	private async runCheck(relay: RelayNumber, verification: RelayVerification): Promise<void> {
		verification.timer = null;
		await this.fetchAndApplyLatestData();

		// Settled by that report, superseded by a newer command, or destroyed.
		if (this.verifications.get(relay) !== verification) {
			return;
		}

		const elapsedMs = Date.now() - verification.startedAtMs;
		if (elapsedMs >= RELAY_STATUS_REQUEST_AFTER_MS && !verification.pending.statusRequested) {
			this.askDeviceForStatus(relay, verification);
		}

		const windowMs =
			verification.lapsesAtMs === null
				? RELAY_CONFIRMATION_WINDOW_MS
				: Math.min(
						RELAY_CONFIRMATION_WINDOW_MS,
						verification.lapsesAtMs - verification.startedAtMs
					);
		if (elapsedMs >= windowMs) {
			this.endConfirmingWindow(relay, verification);
			return;
		}

		this.scheduleCheck(relay, verification, RELAY_CHECK_INTERVAL_MS);
	}

	/** The confirmation report is overdue (probably lost): ask the device for a fresh one. */
	private askDeviceForStatus(relay: RelayNumber, verification: RelayVerification): void {
		const { lapsesAtMs } = verification;
		if (
			!this.requestStatus ||
			verification.statusRequests >= MAX_STATUS_REQUESTS ||
			(lapsesAtMs !== null && lapsesAtMs - Date.now() < STATUS_REPLY_MARGIN_MS)
		) {
			return;
		}

		verification.statusRequests += 1;
		this.updatePending(verification, { statusRequested: true });
		this.requestStatus().catch((error: unknown) => {
			console.error('[relay-state] status request failed', { error });
			// Stop claiming we asked; a later check may try once more.
			if (this.verifications.get(relay) === verification) {
				this.updatePending(verification, { statusRequested: false });
			}
		});
	}

	private endConfirmingWindow(relay: RelayNumber, verification: RelayVerification): void {
		if (verification.mismatchRow) {
			this.settle(relay, 'mismatch', verification.mismatchRow);
			return;
		}

		const { lapsesAtMs } = verification;
		if (lapsesAtMs !== null && Date.now() >= lapsesAtMs) {
			// The pulse is over and the relay has reverted: nothing left to confirm.
			this.stopVerification(relay);
			this.emitPending();
			return;
		}

		this.updatePending(verification, { phase: 'awaiting-report' });
		this.onVerificationResolved?.({
			outcome: 'unconfirmed',
			relay,
			row: null,
			targetState: verification.pending.requestedState
		});

		if (lapsesAtMs !== null) {
			verification.timer = setTimeout(() => {
				if (this.verifications.get(relay) === verification) {
					this.stopVerification(relay);
					this.emitPending();
				}
			}, lapsesAtMs - Date.now());
		}
	}

	private stopVerification(relay: RelayNumber): void {
		const verification = this.verifications.get(relay);
		if (verification?.timer) {
			clearTimeout(verification.timer);
		}
		this.verifications.delete(relay);
	}

	private startBackgroundRefresh(): void {
		this.refreshTimer = setInterval(() => {
			void this.refreshLatestData();
		}, this.refreshIntervalMs);
	}
}
