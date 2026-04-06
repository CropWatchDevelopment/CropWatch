export type RelayNumber = 1 | 2;
export type RelayTargetState = 'off' | 'on';

export interface PendingRelayState {
	requestedState: RelayTargetState;
	verifyAt: string;
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
