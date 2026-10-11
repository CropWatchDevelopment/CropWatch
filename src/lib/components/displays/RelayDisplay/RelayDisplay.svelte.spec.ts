import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import RelayDisplay from './RelayDisplay.svelte';
import { MIN_RELAY_PULSE_DURATION_SECONDS } from '$lib/devices/relay-control';
import type { PendingRelayStates } from '$lib/devices/relay-types';
import type { RelayCommandEntryDto, RelayHistoryEntryDto } from '$lib/api/api.dtos';
import { relayHistoryEventLabel } from '$lib/devices/relay-labels';

function renderRelayDisplay(
	options: {
		authToken?: string | null;
		relayHistory?: RelayHistoryEntryDto[];
		latestData?: Record<string, unknown> | null;
		pendingRelayStates?: PendingRelayStates;
		permissionLevel?: number;
		queueRelayCommand?: (
			relay: 1 | 2,
			targetState: 'off' | 'on',
			durationSeconds?: number
		) => Promise<void>;
	} = {}
) {
	const component = mount(RelayDisplay, {
		target: document.body,
		props: {
			authToken: options.authToken ?? 'jwt-token',
			relayHistory: options.relayHistory ?? [],
			latestData: options.latestData ?? null,
			loading: false,
			pendingRelayStates: options.pendingRelayStates ?? {},
			permissionLevel: options.permissionLevel ?? 1,
			queueRelayCommand: options.queueRelayCommand ?? vi.fn(async () => {})
		}
	});

	flushSync();

	return component;
}

function getRelayButtons(): HTMLButtonElement[] {
	return [...document.body.querySelectorAll('button')];
}

function getButtonByLabel(label: string): HTMLButtonElement | null {
	return (
		[...document.body.querySelectorAll('button')].find((button) =>
			button.textContent?.includes(label)
		) ?? null
	);
}

afterEach(async () => {
	document.body.innerHTML = '';
});

function historyCommand(overrides: Partial<RelayCommandEntryDto> = {}): RelayCommandEntryDto {
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

describe('RelayDisplay', () => {
	it('renders unknown relay state messaging when no confirmed telemetry exists', async () => {
		const component = renderRelayDisplay();

		expect(document.body.textContent).toContain(m.devices_relay_state_unknown());

		await unmount(component);
	});

	it('locks all relay actions while any relay verification is pending', async () => {
		const component = renderRelayDisplay({
			pendingRelayStates: {
				1: {
					requestedState: 'on',
					sentAt: '2026-04-05T10:00:00.000Z',
					phase: 'confirming',
					statusRequested: false
				}
			}
		});

		const [relayOneTurnOn, relayOneTurnOff, relayTwoTurnOn, relayTwoTurnOff] = getRelayButtons();
		const pulseRelayOneButton = getButtonByLabel(
			m.devices_relay_pulse_action({ relay: m.display_relay_one() })
		);
		const pulseRelayTwoButton = getButtonByLabel(
			m.devices_relay_pulse_action({ relay: m.display_relay_two() })
		);

		expect(relayOneTurnOn.disabled).toBe(true);
		expect(relayOneTurnOff.disabled).toBe(true);
		expect(relayOneTurnOn.getAttribute('aria-pressed')).toBe('true');
		expect(relayOneTurnOff.getAttribute('aria-pressed')).toBe('false');
		expect(relayTwoTurnOn.disabled).toBe(true);
		expect(relayTwoTurnOff.disabled).toBe(true);
		expect(pulseRelayOneButton?.disabled).toBe(true);
		expect(pulseRelayTwoButton?.disabled).toBe(true);
		expect(document.body.textContent).toContain(m.devices_relay_waiting_for_confirmation());

		await unmount(component);
	});

	it('tells the user when the device was asked to report because no reply came', async () => {
		const component = renderRelayDisplay({
			pendingRelayStates: {
				1: {
					requestedState: 'on',
					sentAt: '2026-04-05T10:00:00.000Z',
					phase: 'confirming',
					statusRequested: true
				}
			}
		});

		expect(document.body.textContent).toContain(m.devices_relay_status_requested());

		await unmount(component);
	});

	it('unlocks the controls and marks the state unconfirmed once the confirmation window passed', async () => {
		const component = renderRelayDisplay({
			latestData: {
				created_at: '2026-04-05T09:59:00.000Z',
				id: 'relay-row-before-command',
				relay_1: false,
				relay_2: false
			},
			pendingRelayStates: {
				1: {
					requestedState: 'on',
					sentAt: '2026-04-05T10:00:00.000Z',
					phase: 'awaiting-report',
					statusRequested: true
				}
			}
		});

		const [relayOneTurnOn, relayOneTurnOff, relayTwoTurnOn] = getRelayButtons();

		// Shows the requested state (not the pre-command OFF), flagged as unconfirmed,
		// and the user can act again without waiting for the next report.
		expect(relayOneTurnOn.getAttribute('aria-pressed')).toBe('true');
		expect(relayOneTurnOn.disabled).toBe(true);
		expect(relayOneTurnOff.disabled).toBe(false);
		expect(relayTwoTurnOn.disabled).toBe(false);
		expect(document.body.textContent).toContain(m.devices_relay_not_confirmed());
		expect(document.body.textContent).toContain(m.devices_relay_awaiting_report());
		expect(document.body.textContent).not.toContain(m.devices_relay_waiting_for_confirmation());

		await unmount(component);
	});

	it('lists commands and state changes with who sent each command and how it went', async () => {
		const relayHistory: RelayHistoryEntryDto[] = [
			historyCommand({
				id: 'command:4',
				at: '2026-10-10T11:30:00.000Z',
				target_state: 'off',
				outcome: 'pending',
				settled_at: null,
				relay_1: null,
				relay_2: null
			}),
			historyCommand({
				id: 'command:3',
				at: '2026-10-10T11:25:00.000Z',
				command: 'pulse',
				relay: 2,
				duration_seconds: 90,
				outcome: 'mismatch',
				requested_by: null
			}),
			historyCommand({
				id: 'command:2',
				at: '2026-10-10T11:23:16.000Z',
				command: 'status',
				relay: null,
				target_state: null,
				outcome: 'answered'
			}),
			{
				id: 'report:9',
				kind: 'state_change',
				at: '2026-10-10T11:21:40.000Z',
				relay_1: true,
				relay_2: false,
				changed_relays: [1]
			},
			historyCommand()
		];
		const component = renderRelayDisplay({ relayHistory });

		await vi.waitFor(() =>
			expect(document.body.textContent).toContain(m.devices_relay_history_event_reported())
		);
		const text = document.body.textContent ?? '';
		for (const entry of relayHistory) {
			expect(text).toContain(relayHistoryEventLabel(entry));
		}
		expect(text).toContain(m.devices_relay_history_requested_by({ name: 'Kevin Cantrell' }));
		expect(text).toContain(m.devices_relay_history_result_confirmed());
		expect(text).toContain(m.devices_relay_history_result_answered());
		expect(text).toContain(m.devices_relay_history_result_mismatch());
		expect(text).toContain(m.devices_relay_history_result_pending());
		expect(text).not.toContain(m.devices_relay_history_empty());

		await unmount(component);
	});

	it('says so when nothing happened in the selected range', async () => {
		const component = renderRelayDisplay({ relayHistory: [] });

		expect(document.body.textContent).toContain(m.display_relay_history());
		expect(document.body.textContent).toContain(m.devices_relay_history_empty());

		await unmount(component);
	});

	it('shows each relay state with its icon next to the ON/OFF word', async () => {
		const component = renderRelayDisplay({
			latestData: {
				created_at: '2026-04-05T10:00:00.000Z',
				id: 'relay-row-icons',
				relay_1: true,
				relay_2: false
			}
		});

		expect(document.body.textContent).toContain(`🟢 ${m.display_on()}`);
		expect(document.body.textContent).toContain(`🔴 ${m.display_off()}`);

		await unmount(component);
	});

	it('shows the optimistic on selection in the manual controls for timed-on confirmations', async () => {
		const component = renderRelayDisplay({
			latestData: {
				created_at: '2026-04-05T10:00:00.000Z',
				id: 'relay-row-initial',
				relay_1: false,
				relay_2: false
			},
			pendingRelayStates: {
				1: {
					requestedState: 'on',
					sentAt: '2026-04-05T10:00:00.000Z',
					phase: 'confirming',
					statusRequested: false
				}
			}
		});

		const [relayOneTurnOn, relayOneTurnOff] = getRelayButtons();

		expect(relayOneTurnOn.getAttribute('aria-pressed')).toBe('true');
		expect(relayOneTurnOff.getAttribute('aria-pressed')).toBe('false');
		expect(relayOneTurnOn.disabled).toBe(true);
		expect(relayOneTurnOff.disabled).toBe(true);

		await unmount(component);
	});

	it('disables relay actions when the current user lacks permission', async () => {
		const component = renderRelayDisplay({
			permissionLevel: 3
		});

		const [relayOneTurnOn, relayOneTurnOff] = getRelayButtons();

		expect(document.body.textContent).toContain(m.devices_relay_controls_requires_permission());
		expect(relayOneTurnOn.disabled).toBe(true);
		expect(relayOneTurnOff.disabled).toBe(true);

		await unmount(component);
	});

	it('delegates relay command clicks through the provided callback', async () => {
		const queueRelayCommand = vi.fn(async () => {});
		const component = renderRelayDisplay({
			queueRelayCommand
		});

		const [relayOneTurnOn] = getRelayButtons();
		relayOneTurnOn.click();
		flushSync();

		expect(queueRelayCommand).toHaveBeenCalledWith(1, 'on');

		await unmount(component);
	});

	it('shows the localized pulse validation message for values below the 15 second minimum', async () => {
		const component = renderRelayDisplay();
		const inputs = [...document.body.querySelectorAll('input')];
		const durationInput = inputs.at(-1) ?? null;

		expect(document.body.textContent).toContain(m.devices_relay_pulse_panel_title());
		expect(document.body.textContent).toContain(m.devices_relay_pulse_description());
		expect(durationInput).not.toBeNull();

		durationInput!.value = String(MIN_RELAY_PULSE_DURATION_SECONDS - 1);
		durationInput!.dispatchEvent(new Event('input', { bubbles: true }));
		durationInput!.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(document.body.textContent).toContain(
			m.devices_relay_pulse_duration_error({
				maxSeconds: '4294967',
				minSeconds: String(MIN_RELAY_PULSE_DURATION_SECONDS)
			})
		);

		await unmount(component);
	});
});
