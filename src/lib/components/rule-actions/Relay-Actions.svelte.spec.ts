import { flushSync } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import RelayActions from './Relay-Actions.svelte';
import { buildRelayPayload, hexToBase64, MAX_TIMED_RELAY_SECONDS } from './relay-payload';

const DEVICES = [
	{ label: 'Pump relay (DEV-R1)', value: 'DEV-R1' },
	{ label: 'Fan relay (DEV-R2)', value: 'DEV-R2' }
];

interface DownlinkResult {
	devEui: string;
	action: string;
	onTimeSeconds: number;
	revertOnReset: boolean;
	payloadHex: string;
	frmPayload: string;
	downlink: { f_port: number; frm_payload: string; priority: string };
}

let view: ReturnType<typeof renderWithServices> | null = null;

/**
 * Renders the editor with `resultJson` bound (as RuleTemplateForm does) and
 * returns the last value the editor wrote to it.
 */
function render(initialJson?: string, extra: Record<string, unknown> = {}) {
	const bound = { resultJson: initialJson };
	view = renderWithServices(RelayActions, {
		props: {
			devices: DEVICES,
			...extra,
			get resultJson() {
				return bound.resultJson;
			},
			set resultJson(value: string | undefined) {
				bound.resultJson = value;
			}
		}
	});
	return {
		result: () => JSON.parse(bound.resultJson ?? 'null') as DownlinkResult,
		raw: () => bound.resultJson
	};
}

/** The control (dropdown trigger, input or checkbox) labelled `label`. */
function control<T extends HTMLElement>(label: string, within: HTMLElement = view!.target): T {
	const element = [...within.querySelectorAll('label')].find(
		(candidate) => candidate.textContent?.trim() === label
	);
	return document.getElementById(element!.htmlFor) as T;
}

function choose(label: string, option: string) {
	const trigger = control<HTMLButtonElement>(label);
	trigger.click();
	flushSync();
	const item = [...trigger.closest('.cw-dropdown')!.querySelectorAll('li[role="option"]')].find(
		(candidate) => candidate.textContent?.trim() === option
	);
	(item as HTMLElement).click();
	flushSync();
}

function typeSeconds(value: string) {
	const input = control<HTMLInputElement>(m.rule_action_on_time_label());
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

const checkbox = () => control<HTMLInputElement>(m.rule_action_revert_on_reset());

function expected(
	action: Parameters<typeof buildRelayPayload>[0],
	seconds: number,
	rest: Partial<DownlinkResult> = {}
): DownlinkResult {
	const payloadHex = buildRelayPayload(action, seconds);
	const frmPayload = hexToBase64(payloadHex);
	return {
		devEui: '',
		action,
		onTimeSeconds: seconds,
		payloadHex,
		revertOnReset: false,
		frmPayload,
		downlink: { f_port: 2, frm_payload: frmPayload, priority: 'NORMAL' },
		...rest
	};
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('Relay-Actions', () => {
	it('starts with relay 1 on for 5 seconds and writes the downlink to the binding', () => {
		const { result, raw } = render();

		expect(result()).toEqual(expected('ro1_on_timed', 5));
		// Pretty-printed, as stored in the action config.
		expect(raw()).toBe(JSON.stringify(expected('ro1_on_timed', 5), null, 2));
		expect(control(m.rule_action_action_label()).textContent?.trim()).toBe(
			m.rule_action_relay1_on_timed({ seconds: '5' })
		);
		expect(control(m.devices_device()).textContent?.trim()).toBe(
			m.rules_select_device_placeholder()
		);
		expect(control<HTMLInputElement>(m.rule_action_on_time_label()).value).toBe('5');
		// A timed command reverts by itself: nothing to undo on reset.
		expect(checkbox().type).toBe('checkbox');
		expect(checkbox().disabled).toBe(true);
		expect(checkbox().checked).toBe(false);
	});

	it('gives each editor its own checkbox, so a label toggles its own one', () => {
		// Permanent commands, so both checkboxes can be ticked.
		const props = () => ({
			devices: DEVICES,
			resultJson: JSON.stringify(expected('ro1_on_permanent', 5))
		});
		const first = renderWithServices(RelayActions, { props: props() });
		const second = renderWithServices(RelayActions, { props: props() });
		const label = (target: HTMLElement) =>
			[...target.querySelectorAll('label')].find(
				(candidate) => candidate.textContent?.trim() === m.rule_action_revert_on_reset()
			)!;
		try {
			const firstBox = control<HTMLInputElement>(m.rule_action_revert_on_reset(), first.target);
			const secondBox = control<HTMLInputElement>(m.rule_action_revert_on_reset(), second.target);
			expect(firstBox.id).not.toBe(secondBox.id);
			expect(first.target.contains(firstBox)).toBe(true);
			expect(second.target.contains(secondBox)).toBe(true);

			label(second.target).click();
			flushSync();

			expect(secondBox.checked).toBe(true);
			expect(firstBox.checked).toBe(false);
		} finally {
			first.unmount();
			second.unmount();
		}
	});

	it('restores a saved downlink', () => {
		const saved = expected('ro2_off_permanent', 30, { devEui: 'DEV-R2', revertOnReset: true });
		const { result } = render(JSON.stringify(saved));

		expect(result()).toEqual(saved);
		expect(control(m.devices_device()).textContent?.trim()).toBe('Fan relay (DEV-R2)');
		expect(control(m.rule_action_action_label()).textContent?.trim()).toBe(
			m.rule_action_relay2_off_permanent()
		);
		// Permanent commands have no on-time, and can be undone on reset.
		expect(view!.target.textContent).not.toContain(m.rule_action_on_time_label());
		expect(checkbox().disabled).toBe(false);
		expect(checkbox().checked).toBe(true);
	});

	it.each([
		['text that is not JSON', 'linked-users'],
		['JSON that is not an object', '"text"'],
		['JSON null', 'null'],
		['an empty string', '']
	])('starts from the defaults for %s', (_label, json) => {
		const { result } = render(json);

		expect(result()).toEqual(expected('ro1_on_timed', 5));
	});

	it('replaces an unknown saved action and a non-numeric on-time with the defaults', () => {
		const { result } = render(
			JSON.stringify({
				devEui: 'DEV-R1',
				action: 'explode',
				onTimeSeconds: '9',
				revertOnReset: true
			})
		);

		expect(result()).toEqual(expected('ro1_on_timed', 5, { devEui: 'DEV-R1' }));
	});

	it('falls back to 5 seconds for a saved on-time that is not finite', () => {
		const { result } = render('{"action":"ro2_on_timed","onTimeSeconds":1e400}');

		expect(result()).toMatchObject({ action: 'ro2_on_timed', onTimeSeconds: 5 });
		expect(result().payloadHex).toBe(buildRelayPayload('ro2_on_timed', 5));
	});

	it('targets the chosen device', () => {
		const { result } = render();

		choose(m.devices_device(), 'Pump relay (DEV-R1)');

		expect(result().devEui).toBe('DEV-R1');
	});

	it('builds the payload of the chosen command', () => {
		const { result } = render();

		choose(m.rule_action_action_label(), m.rule_action_both_on_timed({ seconds: '5' }));
		expect(result()).toEqual(expected('both_on_timed', 5));

		choose(m.rule_action_action_label(), m.rule_action_relay1_on_permanent());
		expect(result()).toEqual(expected('ro1_on_permanent', 5));
		expect(view!.target.textContent).not.toContain(m.rule_action_on_time_label());
	});

	it('lets a permanent command be undone on reset', () => {
		const { result } = render();
		choose(m.rule_action_action_label(), m.rule_action_relay2_on_permanent());
		expect(checkbox().disabled).toBe(false);
		expect(result().revertOnReset).toBe(false);

		checkbox().click();
		flushSync();
		expect(result().revertOnReset).toBe(true);

		// Back to a timed command: the option is switched off again.
		choose(m.rule_action_action_label(), m.rule_action_relay2_on_timed({ seconds: '5' }));
		expect(checkbox().checked).toBe(false);
		expect(result().revertOnReset).toBe(false);
	});

	it('uses the typed on-time, kept between 1 second and the maximum', () => {
		const { result } = render();

		typeSeconds('15');
		expect(result()).toEqual(expected('ro1_on_timed', 15));
		expect(control(m.rule_action_action_label()).textContent?.trim()).toBe(
			m.rule_action_relay1_on_timed({ seconds: '15' })
		);

		typeSeconds('0');
		expect(result()).toEqual(expected('ro1_on_timed', 1));

		typeSeconds('2.7');
		expect(result()).toEqual(expected('ro1_on_timed', 2));

		typeSeconds(String(MAX_TIMED_RELAY_SECONDS + 1));
		expect(result()).toEqual(expected('ro1_on_timed', MAX_TIMED_RELAY_SECONDS));
	});

	it('sends the downlink on the given port', () => {
		const { result } = render(undefined, { resultFPort: 10 });

		expect(result().downlink.f_port).toBe(10);
	});

	it('offers no devices when none are given', () => {
		view = renderWithServices(RelayActions, { props: {} });

		control<HTMLButtonElement>(m.devices_device()).click();
		flushSync();

		expect(
			control<HTMLButtonElement>(m.devices_device())
				.closest('.cw-dropdown')
				?.querySelectorAll('li[role="option"]')
		).toHaveLength(0);
	});
});
