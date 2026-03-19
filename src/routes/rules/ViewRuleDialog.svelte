<script lang="ts">
	import { CwButton, CwChip, CwDialog, CwSeparator } from '@cropwatchdevelopment/cwui';
	import {
		getRuleNotifierTypeOptions,
		getRuleSendMethodOptions,
		getRuleSubjectOptions
	} from '$lib/i18n/options';
	import type { RulesDto } from '$lib/interfaces/rule.interface';
	import { m } from '$lib/paraglide/messages.js';
	import EYE_ICON from '$lib/images/icons/eye.svg';

	type RuleRow = RulesDto & {
		location_name?: string;
		cw_devices?: Record<string, unknown> | null;
	};

	let { row }: { row: RuleRow } = $props();
	let open = $state(false);

	const NOTIFIER_TYPES = getRuleNotifierTypeOptions();
	const SEND_METHODS = getRuleSendMethodOptions();
	const SUBJECT_OPTIONS = getRuleSubjectOptions();

	let criteriaPreview = $derived(
		(row.cw_rule_criteria ?? []).map(
			(criterion) =>
				`${getCriterionSubjectLabel(criterion.subject)} ${criterion.operator} ${criterion.trigger_value}`
		)
	);

	function isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}

	function getCriterionSubjectLabel(subject: string) {
		return SUBJECT_OPTIONS.find((option) => option.value === subject)?.label ?? subject;
	}

	function getNotifierLabel(notifierType: number) {
		return (
			NOTIFIER_TYPES.find((option) => option.value === String(notifierType))?.label ??
			String(notifierType)
		);
	}

	function getSendMethodLabel(sendUsing: string | null | undefined) {
		if (!sendUsing) return '';
		return SEND_METHODS.find((option) => option.value === sendUsing)?.label ?? sendUsing;
	}

	function getNotificationSummary(rule: RuleRow) {
		const notifier = getNotifierLabel(rule.notifier_type);
		const sendMethod = getSendMethodLabel(rule.send_using);
		return sendMethod
			? `${notifier} (${sendMethod}) → ${rule.action_recipient}`
			: `${notifier} → ${rule.action_recipient}`;
	}

	function getDeviceLabel(rule: RuleRow) {
		const deviceRecord = isRecord(rule.cw_devices) ? rule.cw_devices : null;
		const deviceName =
			typeof deviceRecord?.name === 'string' && deviceRecord.name.trim().length > 0
				? deviceRecord.name
				: '';
		const devEui = rule.dev_eui?.trim() ?? '';

		if (deviceName && devEui) return `${deviceName} (${devEui})`;
		return deviceName || devEui || '-';
	}

	function getResetValueLabel(resetValue: number | null | undefined) {
		return resetValue === null || resetValue === undefined ? '-' : String(resetValue);
	}
</script>

<CwButton variant="secondary" icon={EYE_ICON} size="md" onclick={() => (open = true)} />

<CwDialog bind:open title={m.rules_rule_summary()} class="w-full max-w-2xl">
	<div class="flex flex-col gap-4">
		<div
			class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950"
		>
			<p class="mb-2 text-sm font-medium">{m.rules_rule_summary()}</p>
			<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
				<dt class="font-medium opacity-70">{m.common_name()}:</dt>
				<dd>{row.name}</dd>

				<dt class="font-medium opacity-70">{m.devices_device()}:</dt>
				<dd>{getDeviceLabel(row)}</dd>

				<dt class="font-medium opacity-70">{m.rules_notify_via()}:</dt>
				<dd>{getNotificationSummary(row)}</dd>

				<dt class="font-medium opacity-70">{m.rules_conditions()}:</dt>
				<dd>
					{#if criteriaPreview.length > 0}
						<div class="flex flex-wrap gap-1">
							{#each criteriaPreview as preview, i (i)}
								<CwChip label={preview} tone="warning" variant="soft" size="sm" />
							{/each}
						</div>
					{:else}
						<span class="opacity-60">-</span>
					{/if}
				</dd>
			</dl>
		</div>

		{#if row.cw_rule_criteria?.length}
			<CwSeparator />

			<div class="flex flex-col gap-3">
				{#each row.cw_rule_criteria as criterion, idx (criterion.id)}
					<div
						class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
					>
						<div class="mb-3 flex items-center justify-between">
							<span class="text-sm font-medium">
								{m.rules_condition_number({ count: String(idx + 1) })}
							</span>
						</div>

						<dl class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
							<div>
								<dt class="mb-1 font-medium opacity-70">{m.rules_data_field()}:</dt>
								<dd>{getCriterionSubjectLabel(criterion.subject)}</dd>
							</div>

							<div>
								<dt class="mb-1 font-medium opacity-70">{m.rules_operator()}:</dt>
								<dd>{criterion.operator}</dd>
							</div>

							<div>
								<dt class="mb-1 font-medium opacity-70">{m.rules_trigger_value()}:</dt>
								<dd>{criterion.trigger_value}</dd>
							</div>

							<div class="sm:col-span-3">
								<dt class="mb-1 font-medium opacity-70">{m.rules_reset_value()}:</dt>
								<dd>{getResetValueLabel(criterion.reset_value)}</dd>
							</div>
						</dl>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#snippet actions()}
		<CwButton onclick={() => (open = false)}>{m.action_close()}</CwButton>
	{/snippet}
</CwDialog>
