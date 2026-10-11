import { describe, expect, it } from 'vitest';
import type { RelayCommandEntryDto, RelayStateChangeEntryDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { relayHistoryEventLabel, relayHistoryResult, relayStateLabel } from './relay-labels';

function command(overrides: Partial<RelayCommandEntryDto> = {}): RelayCommandEntryDto {
	return {
		id: 'command:1',
		kind: 'command',
		at: '2026-10-10T11:21:36.000Z',
		command: 'fixed',
		relay: 1,
		target_state: 'on',
		duration_seconds: null,
		requested_by: 'Kevin Cantrell',
		outcome: 'confirmed',
		settled_at: '2026-10-10T11:21:40.000Z',
		relay_1: true,
		relay_2: false,
		...overrides
	};
}

describe('relayStateLabel', () => {
	it('pairs the green dot with ON and the red dot with OFF', () => {
		expect(relayStateLabel(true)).toBe(`🟢 ${m.display_on()}`);
		expect(relayStateLabel(false)).toBe(`🔴 ${m.display_off()}`);
	});
});

describe('relayHistoryEventLabel', () => {
	it('names the relay and the requested state of a command', () => {
		expect(relayHistoryEventLabel(command())).toBe(
			m.devices_relay_history_event_fixed({
				relay: m.display_relay_one(),
				state: relayStateLabel(true)
			})
		);
		expect(relayHistoryEventLabel(command({ relay: 2, target_state: 'off' }))).toBe(
			m.devices_relay_history_event_fixed({
				relay: m.display_relay_two(),
				state: relayStateLabel(false)
			})
		);
	});

	it('includes how long a pulse keeps the relay on', () => {
		expect(
			relayHistoryEventLabel(command({ command: 'pulse', relay: 2, duration_seconds: 90 }))
		).toBe(
			m.devices_relay_history_event_pulse({
				relay: m.display_relay_two(),
				state: relayStateLabel(true),
				seconds: '90'
			})
		);
	});

	it('labels status requests and device reports', () => {
		expect(
			relayHistoryEventLabel(
				command({ command: 'status', relay: null, target_state: null, outcome: 'answered' })
			)
		).toBe(m.devices_relay_history_event_status());

		const change: RelayStateChangeEntryDto = {
			id: 'report:9',
			kind: 'state_change',
			at: '2026-10-10T11:21:40.000Z',
			relay_1: true,
			relay_2: false,
			changed_relays: [1]
		};
		expect(relayHistoryEventLabel(change)).toBe(m.devices_relay_history_event_reported());
	});
});

describe('relayHistoryResult', () => {
	it('maps every outcome to a label and tone', () => {
		expect(relayHistoryResult('confirmed')).toEqual({
			label: m.devices_relay_history_result_confirmed(),
			tone: 'success'
		});
		expect(relayHistoryResult('answered')).toEqual({
			label: m.devices_relay_history_result_answered(),
			tone: 'success'
		});
		expect(relayHistoryResult('mismatch')).toEqual({
			label: m.devices_relay_history_result_mismatch(),
			tone: 'danger'
		});
		expect(relayHistoryResult('unconfirmed')).toEqual({
			label: m.devices_relay_history_result_unconfirmed(),
			tone: 'warning'
		});
		expect(relayHistoryResult('pending')).toEqual({
			label: m.devices_relay_history_result_pending(),
			tone: 'secondary'
		});
	});
});
