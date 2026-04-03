<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { ApiService } from '$lib/api/api.service';
	import type { TrafficMonthlyReportDto } from '$lib/api/api.dtos';
	import DOWNLOAD_ICON from '$lib/images/icons/download.svg';
	import { CwButton, CwDialog, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { downloadCsv } from './csvExport';
	import { m } from '$lib/paraglide/messages.js';
    import NO_ICON from '$lib/images/icons/no.svg';

	interface Props {
		authToken: string | null;
		devEui: string;
		locationName: string;
		timeZone: string;
		disabled?: boolean;
	}

	let { authToken, devEui, locationName, timeZone, disabled = false }: Props = $props();

	const toast = useCwToast();

	let open = $state(false);
	let exporting = $state(false);
	let exportError = $state<string | null>(null);

	const now = new Date();
	let selectedYear = $state(String(now.getFullYear()));
	let selectedMonth = $state(String(now.getMonth() + 1));

	function openDialog(): void {
		exportError = null;
		open = true;
	}

	function closeDialog(): void {
		if (exporting) return;
		exportError = null;
		open = false;
	}

	function trafficRowsToCsvRows(rows: TrafficMonthlyReportDto[]): Record<string, unknown>[] {
		return rows.map((row) => ({
			traffic_day: row.traffic_day,
			total_people: row.total_people,
			total_bicycles: row.total_bicycles,
			total_vehicles: row.total_vehicles
		}));
	}

	async function handleCsvDownload(): Promise<void> {
		if (!authToken || !devEui || exporting) return;

		exporting = true;
		exportError = null;

		try {
			const year = parseInt(selectedYear, 10);
			const month = parseInt(selectedMonth, 10);

			if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
				exportError = m.devices_export_traffic_invalid_input();
				return;
			}

			const api = new ApiService({ fetchFn: fetch, authToken });
			const result = await api.getTrafficMonthlyReport(devEui, {
				year,
				month,
				timezone: timeZone
			});

			const rows = Array.isArray(result) ? result : [];

			if (rows.length === 0) {
				exportError = m.devices_export_no_data();
				toast.add({ tone: 'info', message: exportError });
				return;
			}

			const rangeLabel = `${year}-${String(month).padStart(2, '0')}`;

			downloadCsv(trafficRowsToCsvRows(rows), {
				locationName,
				devEui,
				rangeLabel,
				timeZone
			});

			toast.add({
				tone: 'success',
				message: m.devices_export_success({ count: String(rows.length) })
			});
			open = false;
		} catch (error) {
			console.error('Failed to export traffic monthly report as CSV:', error);
			exportError = m.devices_export_failed();
			toast.add({ tone: 'danger', message: exportError });
		} finally {
			exporting = false;
		}
	}
</script>

<CwButton
	variant="secondary"
	size="sm"
	disabled={disabled || !authToken || !devEui}
	onclick={openDialog}
>
	<Icon src={DOWNLOAD_ICON} alt="" class="h-4 w-4" />
	{m.devices_export_traffic_button()}
</CwButton>

<CwDialog
	bind:open
	title={m.devices_export_traffic_dialog_title()}
	closeOnBackdrop={!exporting}
	closeOnEscape={!exporting}
	onclose={closeDialog}
>
	<div class="csv-export-dialog">
		<CwInput
			label={m.devices_export_traffic_label_year()}
			type="numeric"
			bind:value={selectedYear}
			min={2020}
			max={now.getFullYear()}
			step={1}
		/>

		<CwInput
			label={m.devices_export_traffic_label_month()}
			type="numeric"
			bind:value={selectedMonth}
			min={1}
			max={selectedYear === String(now.getFullYear()) ? now.getMonth() + 1 : 12}
			step={1}
		/>

		{#if exportError}
			<p class="csv-export-dialog__error">{exportError}</p>
		{/if}
	</div>
	{#snippet actions()}
		<CwButton variant="secondary" disabled={exporting} onclick={closeDialog}>
            <Icon src={NO_ICON} alt="" class="h-4 w-4" />
            {m.action_cancel()}
        </CwButton>
		<CwButton variant="primary" loading={exporting} onclick={handleCsvDownload}>
			<Icon src={DOWNLOAD_ICON} alt="" class="h-4 w-4" />
            {m.action_download()} CSV
		</CwButton>
	{/snippet}
</CwDialog>

<style>
	.csv-export-dialog {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.csv-export-dialog__hint,
	.csv-export-dialog__error {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.csv-export-dialog__hint {
		color: var(--cw-text-muted, #6b7280);
	}

	.csv-export-dialog__error {
		color: var(--cw-danger, #b91c1c);
	}
</style>