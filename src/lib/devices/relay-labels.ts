import type { CwTone } from '@cropwatchdevelopment/cwui';
import type { RelayCommandOutcome, RelayHistoryEntryDto } from '$lib/api/api.dtos';
import { formatNumber } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import type { RelayTargetState } from './relay-types';

/**
 * The icon shown with every displayed relay state: relay page chips and
 * history, dashboard cards and table, and command toasts. The ON/OFF word is
 * always kept next to it — red/green alone is unreadable for colour-blind users.
 */
export const RELAY_STATE_ICONS: Readonly<Record<RelayTargetState, string>> = {
	on: '🟢',
	off: '🔴'
};

/** "🟢 ON" / "🔴 OFF" */
export function relayStateLabel(on: boolean): string {
	return on
		? `${RELAY_STATE_ICONS.on} ${m.display_on()}`
		: `${RELAY_STATE_ICONS.off} ${m.display_off()}`;
}

/** What a history row records: "Relay 1 → 🟢 ON", a pulse, a status request or a report. */
export function relayHistoryEventLabel(entry: RelayHistoryEntryDto): string {
	if (entry.kind === 'state_change') {
		return m.devices_relay_history_event_reported();
	}
	if (entry.command === 'status' || entry.relay === null) {
		return m.devices_relay_history_event_status();
	}

	const relay = entry.relay === 1 ? m.display_relay_one() : m.display_relay_two();
	const state = relayStateLabel(entry.target_state === 'on');
	if (entry.command === 'pulse' && entry.duration_seconds !== null) {
		return m.devices_relay_history_event_pulse({
			relay,
			state,
			seconds: formatNumber(entry.duration_seconds)
		});
	}

	return m.devices_relay_history_event_fixed({ relay, state });
}

/** How the device answered a command, as a result chip. */
export function relayHistoryResult(outcome: RelayCommandOutcome): { label: string; tone: CwTone } {
	switch (outcome) {
		case 'confirmed':
			return { label: m.devices_relay_history_result_confirmed(), tone: 'success' };
		case 'answered':
			return { label: m.devices_relay_history_result_answered(), tone: 'success' };
		case 'mismatch':
			return { label: m.devices_relay_history_result_mismatch(), tone: 'danger' };
		case 'unconfirmed':
			return { label: m.devices_relay_history_result_unconfirmed(), tone: 'warning' };
		case 'pending':
			return { label: m.devices_relay_history_result_pending(), tone: 'secondary' };
	}
}
