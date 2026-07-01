<script lang="ts">
	import type { RuleTriggerLogDto } from '$lib/api/api.dtos';
	import { readApiErrorMessage } from '$lib/api/api-error';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import { AppNotice } from '$lib/components/layout';
	import Icon from '$lib/components/Icon.svelte';
	import { CwButton, CwChip, CwDialog, CwDropdown, CwDuration } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import HISTORY_ICON from '$lib/images/icons/history.svg';

	interface Props {
		templateId: number;
		ruleName: string;
	}

	let { templateId, ruleName }: Props = $props();

	const app = getAppContext();

	let open = $state(false);
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);
	let entries = $state<RuleTriggerLogDto[]>([]);
	let loadedFor = $state<number | null>(null);
	let selectedDevice = $state('');

	function openHistory() {
		open = true;
		if (!loading && loadedFor !== templateId) void loadHistory();
	}

	async function loadHistory() {
		loading = true;
		errorMessage = null;
		selectedDevice = '';
		try {
			const api = new ApiService({ authToken: app.accessToken });
			entries = await api.getRuleTemplateHistory(templateId);
			loadedFor = templateId;
		} catch (error) {
			errorMessage = readApiErrorMessage(error, m.rules_new_history_load_failed());
		} finally {
			loading = false;
		}
	}

	// Distinct devices in the log, so a multi-device rule can be filtered to one sensor.
	let devices = $derived.by(() => {
		const list: { devEui: string; name: string }[] = [];
		for (const entry of entries) {
			if (list.some((device) => device.devEui === entry.devEui)) continue;
			list.push({ devEui: entry.devEui, name: entry.deviceName ?? entry.devEui });
		}
		return list.sort((left, right) => left.name.localeCompare(right.name));
	});

	let deviceOptions = $derived([
		{ label: m.rules_new_history_filter_all(), value: '' },
		...devices.map((device) => ({ label: device.name, value: device.devEui }))
	]);

	let activeCount = $derived(entries.filter((entry) => !entry.resetAt).length);
	let filteredEntries = $derived(
		selectedDevice ? entries.filter((entry) => entry.devEui === selectedDevice) : entries
	);

	const timestampFormatter = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	function formatTimestamp(value: string | null): string {
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '—' : timestampFormatter.format(date);
	}

	function formatValue(value: number | null): string | null {
		return value === null || value === undefined ? null : String(value);
	}

	// Mirrors CwDuration's compact format so resolved (static) spans match the live
	// CwDuration shown for ongoing alarms.
	function formatDuration(ms: number): string {
		const totalSec = Math.floor(ms / 1000);
		const totalMin = Math.floor(totalSec / 60);
		const totalHr = Math.floor(totalMin / 60);
		const days = Math.floor(totalHr / 24);
		const pad = (n: number) => n.toString().padStart(2, '0');
		if (totalSec < 60) return `${totalSec}s`;
		if (totalMin < 60) return `${totalMin}m ${pad(totalSec % 60)}s`;
		if (totalHr < 24) return `${totalHr}h ${pad(totalMin % 60)}m`;
		return `${days}d ${pad(totalHr % 24)}h`;
	}
</script>

<CwButton id={`rule-history-${templateId}-open-button`} variant="secondary" size="md" onclick={openHistory}>
	<Icon src={HISTORY_ICON} alt={m.rules_new_view_history()} />
</CwButton>

<CwDialog bind:open title={m.rules_new_view_history()}>
	<div class="rule-history">
		<p class="rule-history__subtitle">{m.rules_new_history_subtitle({ name: ruleName })}</p>

		{#if loading}
			<p class="rule-history__loading">{m.rules_new_history_loading()}</p>
		{:else if errorMessage}
			<AppNotice tone="danger">
				<p>{errorMessage}</p>
			</AppNotice>
		{:else if entries.length === 0}
			<AppNotice tone="neutral">
				<p>{m.rules_new_history_empty()}</p>
			</AppNotice>
		{:else}
			<div class="rule-history__toolbar">
				<div class="rule-history__summary">
					{#if activeCount > 0}
						<CwChip
							tone="danger"
							variant="soft"
							size="sm"
							label={m.rules_new_history_active_summary({ count: String(activeCount) })}
						/>
					{/if}
					<CwChip
						tone="secondary"
						variant="soft"
						size="sm"
						label={m.rules_new_history_total_events({ count: String(entries.length) })}
					/>
				</div>

				{#if devices.length > 1}
					<div class="rule-history__filter">
						<CwDropdown id={`rule-history-${templateId}-device-select`} options={deviceOptions} bind:value={selectedDevice} />
					</div>
				{/if}
			</div>

			<ul class="rule-history__list">
				{#each filteredEntries as entry (entry.id)}
					{@const isActive = !entry.resetAt}
					{@const triggeredValue = formatValue(entry.triggeredValue)}
					{@const resetValue = formatValue(entry.resetValue)}
					{@const durationMs =
						entry.triggeredAt && entry.resetAt
							? new Date(entry.resetAt).getTime() - new Date(entry.triggeredAt).getTime()
							: null}
					<li class="rh-card" class:rh-card--active={isActive} class:rh-card--resolved={!isActive}>
						<div class="rh-card__head">
							<span class="rh-card__device">{entry.deviceName ?? entry.devEui}</span>
							<CwChip
								tone={isActive ? 'danger' : 'success'}
								variant="soft"
								size="sm"
								label={isActive
									? m.rules_new_history_status_active()
									: m.rules_new_history_status_resolved()}
							/>
						</div>

						<div class="rh-event">
							<span class="rh-dot rh-dot--trigger" aria-hidden="true"></span>
							<span class="rh-event__label">{m.rules_new_history_triggered()}</span>
							<span class="rh-event__time">{formatTimestamp(entry.triggeredAt)}</span>
							<span class="rh-event__value">
								{#if triggeredValue !== null}{m.rules_new_history_value({
										value: triggeredValue
									})}{/if}
							</span>
						</div>

						<p class="rh-duration" class:rh-duration--active={isActive}>
							{#if isActive}
								<span>{m.rules_new_history_duration_active()}</span>
								{#if entry.triggeredAt}
									<CwDuration from={entry.triggeredAt} />
								{/if}
							{:else if durationMs !== null}
								{m.rules_new_history_duration_lasted({ duration: formatDuration(durationMs) })}
							{/if}
						</p>

						<div class="rh-event">
							<span
								class="rh-dot"
								class:rh-dot--reset={!isActive}
								class:rh-dot--active={isActive}
								aria-hidden="true"
							></span>
							{#if isActive}
								<span class="rh-event__still">{m.rules_new_history_still_active()}</span>
							{:else}
								<span class="rh-event__label">{m.rules_new_history_reset()}</span>
								<span class="rh-event__time">{formatTimestamp(entry.resetAt)}</span>
								<span class="rh-event__value">
									{#if resetValue !== null}{m.rules_new_history_value({ value: resetValue })}{/if}
								</span>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#snippet actions()}
		<div class="rule-history__actions">
			<CwButton id={`rule-history-${templateId}-close-button`} variant="secondary" size="md" onclick={() => (open = false)}>
				{m.action_close()}
			</CwButton>
		</div>
	{/snippet}
</CwDialog>

<style>
	/* The dialog inherits text-align from the table action cell it is mounted in; pin it. */
	.rule-history {
		text-align: left;
	}

	.rule-history__subtitle {
		margin: 0 0 var(--cw-space-3);
		color: var(--cw-text-muted);
		font-size: var(--cw-text-sm);
	}

	.rule-history__loading {
		margin: var(--cw-space-4) 0;
		text-align: center;
		color: var(--cw-text-muted);
	}

	.rule-history__toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-2);
		margin-bottom: var(--cw-space-3);
	}

	.rule-history__summary {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--cw-space-2);
	}

	.rule-history__filter {
		min-width: 14rem;
	}

	.rule-history__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-2);
		max-height: 60vh;
		overflow-y: auto;
	}

	.rh-card {
		border: 1px solid var(--cw-border-muted);
		border-left-width: 3px;
		border-radius: var(--cw-radius-md);
		background: var(--cw-bg-surface);
		padding: var(--cw-space-3) var(--cw-space-4);
	}

	.rh-card--active {
		border-left-color: var(--cw-danger-500);
	}

	.rh-card--resolved {
		border-left-color: var(--cw-success-500);
	}

	.rh-card__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-2);
		margin-bottom: var(--cw-space-2);
	}

	.rh-card__device {
		font-weight: var(--cw-font-semibold);
		font-size: var(--cw-text-sm);
		color: var(--cw-text-primary);
	}

	/* Each event is one aligned row: dot | label | timestamp | value. */
	.rh-event {
		display: grid;
		grid-template-columns: 0.625rem 5rem auto 1fr;
		align-items: center;
		column-gap: var(--cw-space-3);
	}

	.rh-dot {
		justify-self: center;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: var(--cw-radius-full);
	}

	.rh-dot--trigger {
		background: var(--cw-danger-500);
	}

	.rh-dot--reset {
		background: var(--cw-success-500);
	}

	.rh-dot--active {
		background: transparent;
		border: 2px solid var(--cw-danger-500);
	}

	.rh-event__label {
		font-size: var(--cw-text-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--cw-text-muted);
	}

	.rh-event__time {
		font-weight: var(--cw-font-semibold);
		font-size: var(--cw-text-sm);
		color: var(--cw-text-primary);
	}

	.rh-event__value {
		justify-self: start;
		font-size: var(--cw-text-xs);
		color: var(--cw-text-secondary);
	}

	.rh-event__still {
		grid-column: 2 / -1;
		font-weight: var(--cw-font-semibold);
		font-size: var(--cw-text-sm);
		color: var(--cw-danger-500);
	}

	/* Duration sits on the connector between the two events, indented past the dot. */
	.rh-duration {
		display: flex;
		align-items: center;
		gap: var(--cw-space-1);
		margin: 0;
		padding: var(--cw-space-1) 0;
		padding-left: calc(0.625rem + var(--cw-space-2));
		border-left: 2px solid var(--cw-border-strong);
		margin-left: calc(0.3125rem - 1px);
		font-size: var(--cw-text-xs);
		color: var(--cw-text-muted);
	}

	.rh-duration--active {
		border-left-color: var(--cw-danger-300);
		color: var(--cw-danger-600);
	}

	.rule-history__actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--cw-space-2);
	}

	@media (max-width: 639px) {
		.rh-event {
			grid-template-columns: 0.625rem 4rem auto 1fr;
		}

		.rule-history__filter {
			min-width: 100%;
		}

		.rule-history__actions {
			flex-direction: column;
		}
	}
</style>
