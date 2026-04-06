import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import RelayDisplay from './RelayDisplay.svelte';
import { MIN_RELAY_PULSE_DURATION_SECONDS } from '$lib/devices/relay-control';
import type { PendingRelayStates } from '$lib/devices/relay-types';

function renderRelayDisplay(
	options: {
		authToken?: string | null;
		historicalData?: Record<string, unknown>[];
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
			historicalData: options.historicalData ?? [],
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
					verifyAt: '2026-04-05T10:00:15.000Z'
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
		expect(document.body.textContent).toContain(m.devices_relay_confirmation_checking_again_in());

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
					verifyAt: '2026-04-05T10:00:15.000Z'
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
