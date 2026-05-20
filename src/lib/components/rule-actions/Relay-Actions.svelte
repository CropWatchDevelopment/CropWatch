<script lang="ts">
	import { CwDropdown, CwInput } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';

	interface DeviceOption {
		label: string;
		value: string;
		disabled?: boolean;
	}

	type ActionValue =
		| 'ro1_on_timed'
		| 'ro2_on_timed'
		| 'both_on_timed'
		| 'ro1_on_permanent'
		| 'ro1_off_permanent'
		| 'ro2_on_permanent'
		| 'ro2_off_permanent';

	interface ActionOption {
		label: string;
		value: ActionValue;
		isReversable: boolean;
	}

	interface DownlinkResult {
		devEui: string;
		action: ActionValue | '';
		onTimeSeconds: number;
		revertOnReset: boolean;
		payloadHex: string;
		frmPayload: string;
		downlink: {
			f_port: number;
			frm_payload: string;
			priority: 'NORMAL';
		};
	}

	interface Props {
		devices?: DeviceOption[];
		revertOnReset?: boolean;
		resultBase64?: string;
		resultFPort?: number;
		resultJson?: string;
	}

	let {
		devices = [],
		revertOnReset = $bindable<boolean>(true),
		resultBase64 = $bindable<string>(),
		resultFPort = $bindable<number>(),
		resultJson = $bindable<string>()
	}: Props = $props();

	const initialResult = parseInitialResult(resultJson);

	let selectedDeviceDevEui = $state(initialResult?.devEui ?? '');
	let selectedAction = $state<ActionValue>(
		isActionValue(initialResult?.action) ? initialResult.action : 'ro1_on_timed'
	);
	let onTimeSeconds = $state(
		typeof initialResult?.onTimeSeconds === 'number' ? initialResult.onTimeSeconds : 5
	);
	let resultRevertOnReset = $state(initialResult?.revertOnReset ?? true);

	function parseInitialResult(json: string | undefined): Partial<DownlinkResult> | null {
		if (!json) return null;
		try {
			const parsed = JSON.parse(json);
			return parsed && typeof parsed === 'object' ? (parsed as Partial<DownlinkResult>) : null;
		} catch {
			return null;
		}
	}

	function isActionValue(value: unknown): value is ActionValue {
		return (
			value === 'ro1_on_timed' ||
			value === 'ro2_on_timed' ||
			value === 'both_on_timed' ||
			value === 'ro1_on_permanent' ||
			value === 'ro1_off_permanent' ||
			value === 'ro2_on_permanent' ||
			value === 'ro2_off_permanent'
		);
	}

	let actionOptions: ActionOption[] = $derived([
		{ label: `Relay 1 ON for ${onTimeSeconds} seconds`, value: 'ro1_on_timed', isReversable: false },
		{ label: `Relay 2 ON for ${onTimeSeconds} seconds`, value: 'ro2_on_timed', isReversable: false },
		{
			label: `Both relays ON for ${onTimeSeconds} seconds`,
			value: 'both_on_timed',
			isReversable: false
		},
		{ label: 'Relay 1 permanently ON', value: 'ro1_on_permanent', isReversable: true },
		{ label: 'Relay 1 permanently OFF', value: 'ro1_off_permanent', isReversable: true },
		{ label: 'Relay 2 permanently ON', value: 'ro2_on_permanent', isReversable: true },
		{ label: 'Relay 2 permanently OFF', value: 'ro2_off_permanent', isReversable: true }
	]);

	const selectedActionOption = $derived(actionOptions.find((o) => o.value === selectedAction));
	const isReversable = $derived(selectedActionOption?.isReversable ?? false);
	const isTimedAction = $derived(selectedAction.endsWith('_timed'));

	const safeOnTimeSeconds = $derived(
		Number.isFinite(onTimeSeconds) ? Math.max(1, Math.min(65, Math.trunc(onTimeSeconds))) : 5
	);

	const payloadHex = $derived(buildRelayPayload(selectedAction, safeOnTimeSeconds));
	const frmPayload = $derived(hexToBase64(payloadHex));

	const effectiveRevertOnReset = $derived(isReversable && resultRevertOnReset);

	const result = $derived<DownlinkResult>({
		devEui: selectedDeviceDevEui,
		action: selectedAction,
		onTimeSeconds: safeOnTimeSeconds,
		payloadHex,
		revertOnReset: effectiveRevertOnReset,
		frmPayload,
		downlink: {
			f_port: resultFPort || 2,
			frm_payload: frmPayload,
			priority: 'NORMAL'
		}
	});
	const serializedResult = $derived(JSON.stringify(result, null, 2));

	$effect(() => {
		resultJson = serializedResult;
	});

	$effect(() => {
		if (!isReversable && resultRevertOnReset) {
			resultRevertOnReset = false;
		}
	});

	function buildRelayPayload(action: ActionValue, seconds: number): string {
		if (action.endsWith('_timed')) {
			return buildTimedRelayPayload(action, seconds);
		}
		return buildPermanentRelayPayload(action);
	}

	function buildTimedRelayPayload(action: ActionValue, seconds: number): string {
		const command = 0x05;

		// Timeout behavior byte:
		//   0x00 = after timeout, relay(s) switch to the inverted/opposite state
		//   0x01 = after timeout, relay(s) return to their original pre-command state
		// Use 0x00 so a timed "ON for N seconds" action always returns the relay to OFF,
		// even if it was already ON when the rule fired.
		const timeoutBehavior = 0x00;

		// Dragino timed relay format uses one byte for RO1/RO2 state.
		// 0b10 = Relay 1 ON/NC, Relay 2 OFF/NO
		// 0b01 = Relay 1 OFF/NO, Relay 2 ON/NC
		// 0b11 = Both ON/NC
		const relayState = action === 'ro1_on_timed' ? 0b10 : action === 'ro2_on_timed' ? 0b01 : 0b11;

		const milliseconds = seconds * 1000;

		// Use 2-byte latch time for compatibility with older firmware.
		// Max = 65535 ms, so this UI clamps to 65 seconds.
		if (milliseconds > 0xffff) {
			throw new Error('Timed relay payload exceeds 2-byte latch time limit.');
		}

		const timeHigh = (milliseconds >> 8) & 0xff;
		const timeLow = milliseconds & 0xff;

		return bytesToHex([command, timeoutBehavior, relayState, timeHigh, timeLow]);
	}

	function buildPermanentRelayPayload(action: ActionValue): string {
		// Dragino fixed relay command: [0x03, relay1Byte, relay2Byte]
		// 0x00 = OFF, 0x01 = ON, 0x11 = no action on that relay.
		const command = 0x03;
		const NO_ACTION = 0x11;

		let relay1: number;
		let relay2: number;
		switch (action) {
			case 'ro1_on_permanent':
				relay1 = 0x01;
				relay2 = NO_ACTION;
				break;
			case 'ro1_off_permanent':
				relay1 = 0x00;
				relay2 = NO_ACTION;
				break;
			case 'ro2_on_permanent':
				relay1 = NO_ACTION;
				relay2 = 0x01;
				break;
			case 'ro2_off_permanent':
				relay1 = NO_ACTION;
				relay2 = 0x00;
				break;
			default:
				return '';
		}

		return bytesToHex([command, relay1, relay2]);
	}

	function bytesToHex(bytes: number[]): string {
		return bytes
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('')
			.toUpperCase();
	}

	function hexToBase64(hex: string): string {
		const bytes = hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? [];
		return btoa(String.fromCharCode(...bytes));
	}

	function handleSecondsInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const value = Number(input.value);

		onTimeSeconds = Number.isFinite(value) ? value : 5;
	}
</script>

<div class="space-y-4">
	<CwDropdown
		label="Device"
		placeholder="Select device"
		options={devices}
		bind:value={selectedDeviceDevEui}
	/>

	<CwDropdown
		label="Action"
		placeholder="Select action"
		options={actionOptions}
		bind:value={selectedAction}
	/>

	{#if isTimedAction}
		<CwInput
			label="On time in seconds"
			placeholder="Enter time in seconds"
			type="numeric"
			min="1"
			max="65"
			value={String(onTimeSeconds)}
			oninput={handleSecondsInput}
		/>
	{/if}

	<input
		type="checkbox"
		id="revertOnReset"
		class="w-5 h-5 disabled:cursor-not-allowed disabled:opacity-50"
		bind:checked={resultRevertOnReset}
		disabled={!isReversable}
	/>
	<label for="revertOnReset" class:opacity-50={!isReversable}>
		{m.rule_action_revert_on_reset()}
	</label>
</div>
