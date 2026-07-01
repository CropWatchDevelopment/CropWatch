<script lang="ts">
	import type { ReportTemplateHistoryItemDto } from '$lib/api/api.dtos';
	import { readApiErrorMessage } from '$lib/api/api-error';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { CwButton, CwDialog, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import HISTORY_ICON from '$lib/images/icons/history.svg';

	interface Props {
		templateId: number;
		reportName: string;
	}

	let { templateId, reportName }: Props = $props();

	const app = getAppContext();
	const toast = useCwToast();

	let open = $state(false);
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);
	let entries = $state<ReportTemplateHistoryItemDto[]>([]);
	let loadedFor = $state<number | null>(null);
	let downloadingKey = $state<string | null>(null);

	$effect(() => {
		if (open && !loading && loadedFor !== templateId) {
			void loadHistory();
		}
	});

	type HistoryGroup = {
		devEui: string;
		deviceName: string | null;
		items: ReportTemplateHistoryItemDto[];
	};

	let groups = $derived.by<HistoryGroup[]>(() => {
		const byDevice = new Map<string, HistoryGroup>();
		for (const entry of entries) {
			let group = byDevice.get(entry.devEui);
			if (!group) {
				group = { devEui: entry.devEui, deviceName: entry.deviceName, items: [] };
				byDevice.set(entry.devEui, group);
			}
			group.items.push(entry);
		}
		return [...byDevice.values()].sort((a, b) =>
			(a.deviceName ?? a.devEui).localeCompare(b.deviceName ?? b.devEui)
		);
	});

	async function loadHistory() {
		loading = true;
		errorMessage = null;
		try {
			const api = new ApiService({ authToken: app.accessToken });
			entries = await api.getReportTemplateHistory(templateId);
			loadedFor = templateId;
		} catch (error) {
			errorMessage = readApiErrorMessage(error, m.reports_new_history_load_failed());
		} finally {
			loading = false;
		}
	}

	async function handleDownload(devEui: string, name: string) {
		const key = `${devEui}:${name}`;
		if (downloadingKey) return;
		downloadingKey = key;
		try {
			const api = new ApiService({ authToken: app.accessToken });
			const response = await api.getReportTemplateDownloadUrl(devEui, name);
			const signedUrl = typeof response.url === 'string' ? response.url : null;
			if (!signedUrl) {
				toast.add({ tone: 'danger', message: m.reports_new_download_missing_url() });
				return;
			}
			window.open(signedUrl, '_blank', 'noopener');
		} catch (error) {
			toast.add({
				tone: 'danger',
				message: readApiErrorMessage(error, m.reports_new_download_failed())
			});
		} finally {
			downloadingKey = null;
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
</script>

<CwButton id={`report-history-${templateId}-open-button`} variant="secondary" size="md" onclick={() => (open = true)}>
	<Icon src={HISTORY_ICON} alt={m.reports_new_view_history()} />
</CwButton>

<CwDialog bind:open title={m.reports_new_view_history()}>
	<p class="report-history__subtitle">{m.reports_new_history_subtitle({ name: reportName })}</p>

	{#if loading}
		<p class="report-history__status">{m.reports_new_history_loading()}</p>
	{:else if errorMessage}
		<p class="report-history__status report-history__status--error">{errorMessage}</p>
	{:else if entries.length === 0}
		<p class="report-history__status">{m.reports_new_history_empty()}</p>
	{:else}
		<ul class="report-history__list">
			{#each groups as group (group.devEui)}
				<li class="report-history__group">
					<span class="report-history__device">{group.deviceName ?? group.devEui}</span>
					<ul class="report-history__items">
						{#each group.items as item, itemIndex (item.id ?? item.name)}
							<li class="report-history__item">
								<div class="report-history__meta">
									<span class="report-history__name">{item.name}</span>
									<span class="report-history__time">{formatTimestamp(item.createdAt)}</span>
								</div>
								<CwButton
									id={`report-history-${templateId}-${group.devEui}-${itemIndex}-download-button`}
									variant="secondary"
									size="sm"
									loading={downloadingKey === `${group.devEui}:${item.name}`}
									disabled={downloadingKey !== null}
									onclick={() => handleDownload(group.devEui, item.name)}
								>
									{m.action_download()}
								</CwButton>
							</li>
						{/each}
					</ul>
				</li>
			{/each}
		</ul>
	{/if}

	{#snippet actions()}
		<div class="report-history__actions">
			<CwButton id={`report-history-${templateId}-close-button`} variant="secondary" size="md" onclick={() => (open = false)}>
				{m.action_close()}
			</CwButton>
		</div>
	{/snippet}
</CwDialog>

<style>
	.report-history__subtitle {
		margin: 0 0 var(--cw-space-3);
		color: var(--cw-color-text-muted, #6b7280);
	}

	.report-history__status {
		margin: var(--cw-space-4) 0;
		text-align: center;
		color: var(--cw-color-text-muted, #6b7280);
	}

	.report-history__status--error {
		color: var(--cw-color-danger, #dc2626);
	}

	.report-history__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
		max-height: 60vh;
		overflow-y: auto;
	}

	.report-history__group {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-2);
		padding: var(--cw-space-3);
		border: 1px solid var(--cw-color-border, #e5e7eb);
		border-radius: var(--cw-radius-md, 8px);
	}

	.report-history__device {
		font-weight: 600;
	}

	.report-history__items {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-2);
	}

	.report-history__item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-3);
	}

	.report-history__meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.report-history__name {
		font-weight: 500;
		word-break: break-all;
	}

	.report-history__time {
		font-size: 0.875rem;
		color: var(--cw-color-text-muted, #6b7280);
	}

	.report-history__actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--cw-space-2);
	}

	@media (max-width: 639px) {
		.report-history__item {
			flex-direction: column;
			align-items: stretch;
		}

		.report-history__actions {
			flex-direction: column;
		}
	}
</style>
