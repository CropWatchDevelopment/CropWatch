<script lang="ts">
	import { ApiService } from '$lib/api/api.service';
	import DOWNLOAD_ICON from '$lib/images/icons/download.svg';
	import {
		CwButton,
		CwDateTimeRangePicker,
		CwDialog,
		type CwRangeDateValue,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import {
		downloadCsv,
		formatCsvRangeLabel,
		resolveCsvRequestRange,
		type CsvRow
	} from './csvExport';

	interface Props {
		authToken: string | null;
		devEui: string;
		locationName: string;
		timeZone: string;
		disabled?: boolean;
	}

	const CSV_PAGE_SIZE = 1000;
	const MAX_EXPORT_PAGES = 100;

	let { authToken, devEui, locationName, timeZone, disabled = false }: Props = $props();

	const toast = useCwToast();

	let open = $state(false);
	let exporting = $state(false);
	let exportError = $state<string | null>(null);
	let csvRange = $state<CwRangeDateValue>(buildInitialRange());

	function buildInitialRange(): CwRangeDateValue {
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		return {
			start,
			end: new Date(now),
			startTime: { hours: 0, minutes: 0 },
			endTime: { hours: now.getHours(), minutes: now.getMinutes() }
		};
	}

	function openDialog(): void {
		exportError = null;
		open = true;
	}

	function closeDialog(): void {
		if (exporting) {
			return;
		}

		exportError = null;
		open = false;
	}

	function isCsvRow(value: unknown): value is CsvRow {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}

	function normalizeTelemetryRows(value: unknown): CsvRow[] {
		if (Array.isArray(value)) {
			return value.filter(isCsvRow);
		}

		if (isCsvRow(value) && Array.isArray(value.data)) {
			return value.data.filter(isCsvRow);
		}

		if (isCsvRow(value) && isCsvRow(value.result) && Array.isArray(value.result.data)) {
			return value.result.data.filter(isCsvRow);
		}

		return [];
	}

	function readTotal(value: unknown): number | null {
		if (!isCsvRow(value)) {
			return null;
		}

		const candidates = [
			value.total,
			value.count,
			isCsvRow(value.result) ? value.result.total : null
		];
		for (const candidate of candidates) {
			if (typeof candidate === 'number' && Number.isFinite(candidate)) {
				return candidate;
			}
		}

		return null;
	}

	async function fetchCsvRows(range: { start: string; end: string }): Promise<CsvRow[]> {
		if (!authToken || !devEui) {
			return [];
		}

		const api = new ApiService({
			fetchFn: fetch,
			authToken
		});
		const rows: CsvRow[] = [];
		let skip = 0;

		for (let page = 0; page < MAX_EXPORT_PAGES; page += 1) {
			const result = await api.getDeviceDataWithinRange(devEui, {
				start: range.start,
				end: range.end,
				skip,
				take: CSV_PAGE_SIZE,
				timezone: timeZone
			});
			const pageRows = normalizeTelemetryRows(result);
			const total = readTotal(result);

			if (pageRows.length === 0) {
				return rows;
			}

			rows.push(...pageRows);
			skip += pageRows.length;

			if (pageRows.length < CSV_PAGE_SIZE || (typeof total === 'number' && skip >= total)) {
				return rows;
			}
		}

		throw new Error('CSV export exceeded the client paging limit.');
	}

	async function handleCsvDownload(): Promise<void> {
		if (!authToken || !devEui || exporting) {
			return;
		}

		exporting = true;
		exportError = null;

		try {
			const requestRange = resolveCsvRequestRange(csvRange, timeZone);
			const rows = await fetchCsvRows(requestRange);

			if (rows.length === 0) {
				exportError = 'No telemetry was found for the selected date range.';
				toast.add({ tone: 'info', message: exportError });
				return;
			}

			downloadCsv(rows, {
				locationName,
				devEui,
				rangeLabel: formatCsvRangeLabel(requestRange, timeZone),
				timeZone
			});

			toast.add({
				tone: 'success',
				message: `Exported ${rows.length} telemetry ${rows.length === 1 ? 'row' : 'rows'}.`
			});
			open = false;
		} catch (error) {
			console.error('Failed to export device telemetry as CSV:', error);
			exportError = 'Unable to export telemetry for the selected range.';
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
	<img src={DOWNLOAD_ICON} alt="" class="toolbar-icon" />
	CSV
</CwButton>

<CwDialog
    style="max-width: 50vw;"
	bind:open
	title="Export Telemetry Data"
	closeOnBackdrop={!exporting}
	closeOnEscape={!exporting}
	onclose={closeDialog}
>
	<div class="csv-export-dialog">
		<CwDateTimeRangePicker
			mode="range"
			granularity="day"
			includeTime
			bind:value={csvRange}
			placeholder="Select export range"
			maxDate={new Date()}
		/>

		<p class="csv-export-dialog__hint">
			Request and export timestamps use <strong>{timeZone}</strong>.
		</p>

		{#if exportError}
			<p class="csv-export-dialog__error">{exportError}</p>
		{/if}
	</div>
	{#snippet actions()}
		<CwButton variant="secondary" disabled={exporting} onclick={closeDialog}>Cancel</CwButton>
		<CwButton variant="primary" loading={exporting} onclick={handleCsvDownload}>
			Download CSV
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

	.toolbar-icon {
		width: 1rem;
		height: 1rem;
	}
</style>
