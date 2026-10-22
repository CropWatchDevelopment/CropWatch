import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDateTime } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import RelayDisplay from './RelayDisplay.svelte';
import { MIN_RELAY_PULSE_DURATION_SECONDS } from '$lib/devices/relay-control';
import type { PendingRelayStates } from '$lib/devices/relay-types';
import type { RelayCommandEntryDto, RelayHistoryEntryDto } from '$lib/api/api.dtos';
import { relayHistoryEventLabel } from '$lib/devices/relay-labels';

function renderRelayDisplay(
	options: {
		/** The session token in the app context; `null` renders signed out. */
		accessToken?: string | null;
		loading?: boolean;
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
	const component = renderWithServices(RelayDisplay, {
		props: {
			relayHistory: options.relayHistory ?? [],
			latestData: options.latestData ?? null,
			loading: options.loading ?? false,
			pendingRelayStates: options.pendingRelayStates ?? {},
			permissionLevel: options.permissionLevel ?? 1,
			queueRelayCommand: options.queueRelayCommand ?? vi.fn(async () => {})
		},
		app: {
			accessToken: options.accessToken === null ? undefined : (options.accessToken ?? 'jwt-token')
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

		component.unmount();
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

		component.unmount();
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

		component.unmount();
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

		component.unmount();
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

		component.unmount();
	});

	it('says so when nothing happened in the selected range', async () => {
		const component = renderRelayDisplay({ relayHistory: [] });

		expect(document.body.textContent).toContain(m.display_relay_history());
		expect(document.body.textContent).toContain(m.devices_relay_history_empty());

		component.unmount();
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

		component.unmount();
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

		component.unmount();
	});

	it('disables relay actions when the current user lacks permission', async () => {
		const component = renderRelayDisplay({
			permissionLevel: 3
		});

		const [relayOneTurnOn, relayOneTurnOff] = getRelayButtons();

		expect(document.body.textContent).toContain(m.devices_relay_controls_requires_permission());
		expect(relayOneTurnOn.disabled).toBe(true);
		expect(relayOneTurnOff.disabled).toBe(true);

		component.unmount();
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

		component.unmount();
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

		component.unmount();
	});
});

describe('RelayDisplay controls', () => {
	const pulseError = m.devices_relay_pulse_duration_error({
		maxSeconds: '4294967',
		minSeconds: String(MIN_RELAY_PULSE_DURATION_SECONDS)
	});
	const durationInput = () => [...document.body.querySelectorAll('input')].at(-1)!;
	const pulseButton = (relay: 1 | 2) =>
		getButtonByLabel(
			m.devices_relay_pulse_action({
				relay: relay === 1 ? m.display_relay_one() : m.display_relay_two()
			})
		)!;

	function typeDuration(value: string) {
		durationInput().value = value;
		durationInput().dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	/** A `queueRelayCommand` that stays in flight until `finish()` is called. */
	function deferredCommands() {
		let finish = () => {};
		const queueRelayCommand = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				})
		);
		return { queueRelayCommand, finish: () => finish() };
	}

	it('keeps every control locked without a session, and unlocks them once signed in', () => {
		const queueRelayCommand = vi.fn(async () => {});
		const component = renderRelayDisplay({
			accessToken: null,
			latestData: {
				created_at: '2026-04-05T10:00:00.000Z',
				id: 'r1',
				relay_1: false,
				relay_2: false
			},
			queueRelayCommand
		});

		const [relayOneTurnOn, relayOneTurnOff, relayTwoTurnOn, relayTwoTurnOff] = getRelayButtons();
		expect(
			[relayOneTurnOn, relayOneTurnOff, relayTwoTurnOn, relayTwoTurnOff].map((b) => b.disabled)
		).toEqual([true, true, true, true]);
		expect(pulseButton(1).disabled).toBe(true);
		expect(pulseButton(2).disabled).toBe(true);
		expect(durationInput().disabled).toBe(true);
		relayOneTurnOn.click();
		pulseButton(1).click();
		flushSync();
		expect(queueRelayCommand).not.toHaveBeenCalled();

		component.app.accessToken = 'jwt-token';
		flushSync();

		// Both relays report OFF, so only "turn on" (and the pulse) can be sent.
		expect(
			[relayOneTurnOn, relayOneTurnOff, relayTwoTurnOn, relayTwoTurnOff].map((b) => b.disabled)
		).toEqual([false, true, false, true]);
		expect(pulseButton(1).disabled).toBe(false);
		expect(durationInput().disabled).toBe(false);

		component.unmount();
	});

	it('switches each relay through the callback, one command at a time', async () => {
		const { queueRelayCommand, finish } = deferredCommands();
		// Relay 2 has never reported a state, so both of its commands are allowed.
		const component = renderRelayDisplay({
			latestData: { created_at: '2026-04-05T10:00:00.000Z', id: 'r2', relay_1: true },
			queueRelayCommand
		});
		const [relayOneTurnOn, relayOneTurnOff, relayTwoTurnOn, relayTwoTurnOff] = getRelayButtons();

		expect(document.body.textContent).toContain(m.devices_relay_state_unknown());
		expect(relayOneTurnOn.disabled).toBe(true);
		expect(relayOneTurnOff.disabled).toBe(false);
		expect(relayTwoTurnOn.disabled).toBe(false);
		expect(relayTwoTurnOff.disabled).toBe(false);

		relayOneTurnOff.click();
		flushSync();
		expect(queueRelayCommand).toHaveBeenLastCalledWith(1, 'off');
		// The requested state shows at once, and nothing else can be sent meanwhile.
		expect(relayOneTurnOff.getAttribute('aria-pressed')).toBe('true');
		expect(relayOneTurnOff.getAttribute('aria-busy')).toBe('true');
		expect(relayTwoTurnOn.disabled).toBe(true);
		expect(pulseButton(2).disabled).toBe(true);

		finish();
		await vi.waitFor(() => expect(relayTwoTurnOn.disabled).toBe(false));
		relayTwoTurnOn.click();
		flushSync();
		expect(queueRelayCommand).toHaveBeenLastCalledWith(2, 'on');
		expect(relayTwoTurnOn.getAttribute('aria-pressed')).toBe('true');

		finish();
		await vi.waitFor(() => expect(relayTwoTurnOff.disabled).toBe(false));
		relayTwoTurnOff.click();
		flushSync();
		expect(queueRelayCommand).toHaveBeenLastCalledWith(2, 'off');

		finish();
		await vi.waitFor(() => expect(relayOneTurnOff.disabled).toBe(false));
		expect(queueRelayCommand).toHaveBeenCalledTimes(3);

		component.unmount();
	});

	it('pulses a relay on for the typed duration, showing it on while the command is sent', async () => {
		const { queueRelayCommand, finish } = deferredCommands();
		const component = renderRelayDisplay({
			latestData: {
				created_at: '2026-04-05T10:00:00.000Z',
				id: 'r3',
				relay_1: false,
				relay_2: false
			},
			queueRelayCommand
		});
		const [relayOneTurnOn, , relayTwoTurnOn] = getRelayButtons();

		typeDuration('90');
		pulseButton(1).click();
		flushSync();

		expect(queueRelayCommand).toHaveBeenCalledWith(1, 'on', 90);
		expect(relayOneTurnOn.getAttribute('aria-pressed')).toBe('true');
		expect(pulseButton(1).getAttribute('aria-busy')).toBe('true');
		expect(relayTwoTurnOn.disabled).toBe(true);
		expect(pulseButton(2).disabled).toBe(true);

		finish();
		// Back to the reported state until the device page reports the outcome.
		await vi.waitFor(() => expect(relayOneTurnOn.getAttribute('aria-pressed')).toBe('false'));
		expect(pulseButton(2).disabled).toBe(false);

		pulseButton(2).click();
		flushSync();
		expect(queueRelayCommand).toHaveBeenLastCalledWith(2, 'on', 90);
		finish();
		await vi.waitFor(() => expect(pulseButton(2).disabled).toBe(false));

		component.unmount();
	});

	it('does not offer a pulse for a relay that is already on', () => {
		const component = renderRelayDisplay({
			latestData: {
				created_at: '2026-04-05T10:00:00.000Z',
				id: 'r4',
				relay_1: true,
				relay_2: false
			}
		});

		expect(pulseButton(1).disabled).toBe(true);
		expect(pulseButton(2).disabled).toBe(false);

		component.unmount();
	});

	it('rejects an empty or fractional pulse duration', () => {
		const queueRelayCommand = vi.fn(async () => {});
		const component = renderRelayDisplay({ queueRelayCommand });

		expect(document.body.textContent).not.toContain(pulseError);
		for (const value of ['', '1.5']) {
			typeDuration(value);
			expect(document.body.textContent).toContain(pulseError);
			expect(pulseButton(1).disabled).toBe(true);
			expect(pulseButton(2).disabled).toBe(true);
		}
		typeDuration(String(MIN_RELAY_PULSE_DURATION_SECONDS));
		expect(document.body.textContent).not.toContain(pulseError);
		expect(pulseButton(1).disabled).toBe(false);

		component.unmount();
	});

	it("shows relay 2's pending confirmation under relay 2", () => {
		const component = renderRelayDisplay({
			latestData: {
				created_at: '2026-04-05T10:00:00.000Z',
				id: 'r5',
				relay_1: false,
				relay_2: true
			},
			pendingRelayStates: {
				2: {
					requestedState: 'off',
					sentAt: '2026-04-05T10:00:00.000Z',
					phase: 'confirming',
					statusRequested: false
				}
			}
		});
		const [, , relayTwoTurnOn, relayTwoTurnOff] = getRelayButtons();

		expect(document.body.textContent).toContain(m.devices_relay_confirmation_pending());
		expect(document.body.textContent).toContain(m.devices_relay_waiting_for_confirmation());
		// The requested OFF is shown in place of the reported ON.
		expect(relayTwoTurnOff.getAttribute('aria-pressed')).toBe('true');
		expect(relayTwoTurnOn.getAttribute('aria-pressed')).toBe('false');

		component.unmount();
	});

	it('renders without relay history or pending states, and hides the history while loading', () => {
		const view = renderWithServices(RelayDisplay, {
			props: { latestData: null, loading: false, permissionLevel: 1 },
			app: { accessToken: 'jwt-token' }
		});

		expect(document.body.textContent).toContain(m.devices_relay_history_empty());
		// No callback to send commands with: the controls stay locked.
		expect(getRelayButtons()[0].disabled).toBe(true);
		view.unmount();

		const loading = renderRelayDisplay({ loading: true });
		expect(document.body.textContent).not.toContain(m.display_relay_history());
		loading.unmount();
	});

	it('shows the last update time and the relay values of each history entry', async () => {
		const component = renderRelayDisplay({
			latestData: {
				created_at: '2026-04-05T10:00:00.000Z',
				id: 'r6',
				relay_1: true,
				relay_2: false
			},
			relayHistory: [
				historyCommand({ id: 'command:7', relay: 2, relay_1: true, relay_2: true }),
				{
					id: 'report:8',
					kind: 'state_change',
					at: '2026-10-10T11:21:40.000Z',
					relay_1: true,
					relay_2: false,
					changed_relays: [1]
				}
			]
		});

		expect(document.body.textContent).toContain(
			`${m.display_last_updated()}: ${formatDateTime('2026-04-05T10:00:00.000Z')}`
		);
		await vi.waitFor(() => expect(document.querySelectorAll('tbody tr')).toHaveLength(2));
		const [commandRow, reportRow] = [...document.querySelectorAll('tbody tr')];
		// A command only shows the relay it targeted.
		expect(commandRow.textContent).toContain('—');
		expect(reportRow.textContent).not.toContain('—');
		// The relay that changed is highlighted.
		expect(reportRow.querySelectorAll('.cw-chip--soft')).toHaveLength(1);

		component.unmount();
	});
});
