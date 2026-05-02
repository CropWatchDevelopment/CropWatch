<script lang="ts">
	import { CwDropdown, CwInput } from '@cropwatchdevelopment/cwui';

	interface DeviceOption {
		label: string;
		value: string;
		disabled?: boolean;
	}

	interface ActionOption {
		label: string;
		value: 'ro1_on_timed' | 'ro2_on_timed' | 'both_on_timed';
	}

	interface DownlinkResult {
		devEui: string;
		action: ActionOption['value'] | '';
		onTimeSeconds: number;
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
		resultBase64?: string;
        resultFPort?: number;
        resultJson?: string;
	}

	let { devices = [], resultBase64 = $bindable<string>(), resultFPort = $bindable<number>(), resultJson = $bindable<string>() }: Props = $props();

	let selectedDeviceDevEui = $state('');
	let selectedAction = $state<ActionOption['value']>('ro1_on_timed');
	let onTimeSeconds = $state(5);

	let actionOptions: ActionOption[] = $derived([
		{ label: `Relay 1 ON for ${onTimeSeconds} seconds`, value: 'ro1_on_timed' },
		{ label: `Relay 2 ON for ${onTimeSeconds} seconds`, value: 'ro2_on_timed' },
		{ label: `Both relays ON for ${onTimeSeconds} seconds`, value: 'both_on_timed' }
	]);

	const safeOnTimeSeconds = $derived(
		Number.isFinite(onTimeSeconds) ? Math.max(1, Math.min(65, Math.trunc(onTimeSeconds))) : 5
	);

	const payloadHex = $derived(buildTimedRelayPayload(selectedAction, safeOnTimeSeconds));
	const frmPayload = $derived(hexToBase64(payloadHex));

	const result = $derived<DownlinkResult>({
		devEui: selectedDeviceDevEui,
		action: selectedAction,
		onTimeSeconds: safeOnTimeSeconds,
		payloadHex,
		frmPayload,
		downlink: {
			f_port: resultFPort || 2,
			frm_payload: frmPayload,
			priority: 'NORMAL'
		}
	});

	$effect(() => {
		resultJson = JSON.stringify(result, null, 2);
	});

	function buildTimedRelayPayload(action: ActionOption['value'], seconds: number): string {
		const command = 0x05;

		// 0x01 = return relay(s) to original state after timeout.
		const inverterMode = 0x01;

		// Dragino timed relay format uses one byte for RO1/RO2 state.
		// 0b10 = Relay 1 ON/NC, Relay 2 OFF/NO
		// 0b01 = Relay 1 OFF/NO, Relay 2 ON/NC
		// 0b11 = Both ON/NC
		const relayState =
			action === 'ro1_on_timed' ? 0x10 :
			action === 'ro2_on_timed' ? 0x01 :
			0x11;

		const milliseconds = seconds * 1000;

		// Use 2-byte latch time for compatibility with older firmware.
		// Max = 65535 ms, so this UI clamps to 65 seconds.
		if (milliseconds > 0xffff) {
			throw new Error('Timed relay payload exceeds 2-byte latch time limit.');
		}

		const timeHigh = (milliseconds >> 8) & 0xff;
		const timeLow = milliseconds & 0xff;

		return bytesToHex([command, inverterMode, relayState, timeHigh, timeLow]);
	}

	function bytesToHex(bytes: number[]): string {
		return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
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

	<CwInput
		label="On time in seconds"
		placeholder="Enter time in seconds"
		type="number"
		min="1"
		max="65"
		value={String(onTimeSeconds)}
		oninput={handleSecondsInput}
	/>

	<CwDropdown
		label="Action"
		placeholder="Select action"
		options={actionOptions}
		bind:value={selectedAction}
	/>
</div>