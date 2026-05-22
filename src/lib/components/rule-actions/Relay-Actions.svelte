<script lang="ts">
	import { CwDropdown, CwInput } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import {
		MAX_TIMED_RELAY_SECONDS,
		buildRelayPayload,
		hexToBase64,
		type ActionValue
	} from './relay-payload';

	interface DeviceOption {
		label: string;
		value: string;
		disabled?: boolean;
	}

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
		Number.isFinite(onTimeSeconds)
			? Math.max(1, Math.min(MAX_TIMED_RELAY_SECONDS, Math.trunc(onTimeSeconds)))
			: 5
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
			max={String(MAX_TIMED_RELAY_SECONDS)}
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
