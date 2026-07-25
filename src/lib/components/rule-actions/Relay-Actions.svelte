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
		{
			label: m.rule_action_relay1_on_timed({ seconds: String(onTimeSeconds) }),
			value: 'ro1_on_timed',
			isReversable: false
		},
		{
			label: m.rule_action_relay2_on_timed({ seconds: String(onTimeSeconds) }),
			value: 'ro2_on_timed',
			isReversable: false
		},
		{
			label: m.rule_action_both_on_timed({ seconds: String(onTimeSeconds) }),
			value: 'both_on_timed',
			isReversable: false
		},
		{ label: m.rule_action_relay1_on_permanent(), value: 'ro1_on_permanent', isReversable: true },
		{ label: m.rule_action_relay1_off_permanent(), value: 'ro1_off_permanent', isReversable: true },
		{ label: m.rule_action_relay2_on_permanent(), value: 'ro2_on_permanent', isReversable: true },
		{ label: m.rule_action_relay2_off_permanent(), value: 'ro2_off_permanent', isReversable: true }
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

	// `resultJson` is a two-way `$bindable` prop (RuleTemplateForm does
	// `bind:resultJson={action.config.recipient}`): the parent seeds it with the
	// saved JSON on edit and receives every recomputation. A bindable prop cannot
	// itself be declared `$derived`, so pushing the derived serialisation up
	// through the binding requires this effect.
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
		label={m.devices_device()}
		placeholder={m.rules_select_device_placeholder()}
		options={devices}
		bind:value={selectedDeviceDevEui}
	/>

	<CwDropdown
		label={m.rule_action_action_label()}
		placeholder={m.rule_action_action_placeholder()}
		options={actionOptions}
		bind:value={selectedAction}
	/>

	{#if isTimedAction}
		<CwInput
			label={m.rule_action_on_time_label()}
			placeholder={m.rule_action_on_time_placeholder()}
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
		class="h-5 w-5 disabled:cursor-not-allowed disabled:opacity-50"
		bind:checked={resultRevertOnReset}
		disabled={!isReversable}
	/>
	<label for="revertOnReset" class:opacity-50={!isReversable}>
		{m.rule_action_revert_on_reset()}
	</label>
</div>
