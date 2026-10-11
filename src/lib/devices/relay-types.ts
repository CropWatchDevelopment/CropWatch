export type RelayNumber = 1 | 2;
export type RelayTargetState = 'off' | 'on';

/**
 * `confirming`: the app is actively checking for the device's report and the
 * relay controls stay locked. `awaiting-report`: that window passed without a
 * report; the controls unlock and the device's next report settles it.
 */
export type PendingRelayPhase = 'confirming' | 'awaiting-report';

export interface PendingRelayState {
	requestedState: RelayTargetState;
	/** Server time the command was sent. Only a report received after it counts. */
	sentAt: string;
	phase: PendingRelayPhase;
	/** The device has been asked to report its state because no report arrived. */
	statusRequested: boolean;
	/** Pulses only: when the relay reverts on its own and the expectation lapses. */
	expiresAt?: string;
}

export type PendingRelayStates = Partial<Record<RelayNumber, PendingRelayState>>;

export interface RelayTelemetryRow extends Record<string, unknown> {
	created_at: string;
	id: string;
	relay_1: boolean | null;
	relay_2: boolean | null;
}

export function isRelayNumber(value: unknown): value is RelayNumber {
	return value === 1 || value === 2;
}

export function isRelayTargetState(value: unknown): value is RelayTargetState {
	return value === 'off' || value === 'on';
}
