<script lang="ts">
	import type { RuleTriggerLogDto } from '$lib/api/api.dtos';
	import { readApiErrorMessage } from '$lib/api/api-error';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { CwButton, CwDialog } from '@cropwatchdevelopment/cwui';
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

	$effect(() => {
		if (open && !loading && loadedFor !== templateId) {
			void loadHistory();
		}
	});

	async function loadHistory() {
		loading = true;
		errorMessage = null;
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
</script>

<CwButton variant="secondary" size="md" onclick={() => (open = true)}>
	<Icon src={HISTORY_ICON} alt={m.rules_new_view_history()} />
</CwButton>

<CwDialog bind:open title={m.rules_new_view_history()}>
	<p class="rule-history__subtitle">{m.rules_new_history_subtitle({ name: ruleName })}</p>

	{#if loading}
		<p class="rule-history__status">{m.rules_new_history_loading()}</p>
	{:else if errorMessage}
		<p class="rule-history__status rule-history__status--error">{errorMessage}</p>
	{:else if entries.length === 0}
		<p class="rule-history__status">{m.rules_new_history_empty()}</p>
	{:else}
		<ul class="rule-history__list">
			{#each entries as entry (entry.id)}
				{@const triggeredValue = formatValue(entry.triggeredValue)}
				{@const resetValue = formatValue(entry.resetValue)}
				<li class="rule-history__item">
					<span class="rule-history__device">{entry.deviceName ?? entry.devEui}</span>
					<div class="rule-history__flow">
						<div class="rule-history__point rule-history__point--trigger">
							<span class="rule-history__label">{m.rules_new_history_triggered()}</span>
							<span class="rule-history__time">{formatTimestamp(entry.triggeredAt)}</span>
							{#if triggeredValue !== null}
								<span class="rule-history__value">
									{m.rules_new_history_value({ value: triggeredValue })}
								</span>
							{/if}
						</div>
						<span class="rule-history__arrow" aria-hidden="true">→</span>
						{#if entry.resetAt}
							<div class="rule-history__point rule-history__point--reset">
								<span class="rule-history__label">{m.rules_new_history_reset()}</span>
								<span class="rule-history__time">{formatTimestamp(entry.resetAt)}</span>
								{#if resetValue !== null}
									<span class="rule-history__value">
										{m.rules_new_history_value({ value: resetValue })}
									</span>
								{/if}
							</div>
						{:else}
							<div class="rule-history__point rule-history__point--active">
								<span class="rule-history__active-badge">
									{m.rules_new_history_still_active()}
								</span>
							</div>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	{#snippet actions()}
		<div class="rule-history__actions">
			<CwButton variant="secondary" size="md" onclick={() => (open = false)}>
				{m.action_close()}
			</CwButton>
		</div>
	{/snippet}
</CwDialog>

<style>
	.rule-history__subtitle {
		margin: 0 0 var(--cw-space-3);
		color: var(--cw-color-text-muted, #6b7280);
	}

	.rule-history__status {
		margin: var(--cw-space-4) 0;
		text-align: center;
		color: var(--cw-color-text-muted, #6b7280);
	}

	.rule-history__status--error {
		color: var(--cw-color-danger, #dc2626);
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

	.rule-history__item {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-2);
		padding: var(--cw-space-3);
		border: 1px solid var(--cw-color-border, #e5e7eb);
		border-radius: var(--cw-radius-md, 8px);
	}

	.rule-history__device {
		font-weight: 600;
	}

	.rule-history__flow {
		display: flex;
		align-items: stretch;
		gap: var(--cw-space-3);
	}

	.rule-history__point {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}

	.rule-history__point--trigger {
		border-left: 3px solid var(--cw-color-danger, #dc2626);
		padding-left: var(--cw-space-2);
	}

	.rule-history__point--reset {
		border-left: 3px solid var(--cw-color-success, #16a34a);
		padding-left: var(--cw-space-2);
	}

	.rule-history__point--active {
		display: flex;
		align-items: center;
	}

	.rule-history__label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--cw-color-text-muted, #6b7280);
	}

	.rule-history__time {
		font-weight: 600;
	}

	.rule-history__value {
		font-size: 0.875rem;
		color: var(--cw-color-text-muted, #6b7280);
	}

	.rule-history__arrow {
		align-self: center;
		font-size: 1.25rem;
		color: var(--cw-color-text-muted, #6b7280);
	}

	.rule-history__active-badge {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--cw-color-danger, #dc2626);
	}

	.rule-history__actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--cw-space-2);
	}

	@media (max-width: 639px) {
		.rule-history__flow {
			flex-direction: column;
		}

		.rule-history__arrow {
			transform: rotate(90deg);
		}

		.rule-history__actions {
			flex-direction: column;
		}
	}
</style>
