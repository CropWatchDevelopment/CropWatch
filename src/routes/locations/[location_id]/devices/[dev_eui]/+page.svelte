<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { resolveDisplayComponent } from '$lib/config/deviceTables';
	import { ApiService } from '$lib/api/api.service';
	import {
		CwButton,
		CwCard,
		CwDateTimeRangePicker,
		CwDuration,
		CwSpinner,
		useCwToast,
		type CwDateValue,
		type CwRangeDateValue
	} from '@cropwatchdevelopment/cwui';
	import { downloadCsv, type CsvRow } from './csvExport';
	import type { PageProps } from './$types';
	import DOWNLOAD_ICON from '$lib/images/icons/download.svg';
	import SETTINGS_ICON from '$lib/images/icons/settings.svg';

	interface TimeRangeOptions {
		label: string;
		value: number | null;
	}

	type TelemetryRow = Record<string, unknown>;
	const HoursSinceStartOfToday = Math.floor(
		(Date.now() - new Date().setHours(0, 0, 0, 0)) / (60 * 60 * 1000)
	);
	export const RANGE_OPTIONS: TimeRangeOptions[] = [
		{ label: 'Today Only', value: HoursSinceStartOfToday },
		{ label: 'Last 24 Hours', value: 24 },
		{ label: 'Last 48 Hours', value: 48 },
		{ label: 'Last 72 Hours', value: 72 }
	];
	type RangeHours = (typeof RANGE_OPTIONS)[number];
	const MAX_RANGE_RECORDS = 432;

	interface RouteState {
		requestedHistoricalData: TelemetryRow[] | null;
		activeRangeHours: RangeHours | null;
		dateRange: CwRangeDateValue | undefined;
		fetching: boolean;
		fetchError: string | null;
	}

	let { data }: PageProps = $props();

	const toast = useCwToast();

	function isTelemetryRow(value: unknown): value is TelemetryRow {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}

	function normalizeTelemetryRows(value: unknown): TelemetryRow[] {
		if (Array.isArray(value)) {
			return value.filter(isTelemetryRow);
		}

		if (isTelemetryRow(value) && Array.isArray(value.data)) {
			return value.data.filter(isTelemetryRow);
		}

		return [];
	}

	function readLocationName(value: unknown): string {
		if (!isTelemetryRow(value)) {
			return 'Unknown';
		}

		const locationRecord = value.cw_locations;
		if (
			isTelemetryRow(locationRecord) &&
			typeof locationRecord.name === 'string' &&
			locationRecord.name.trim()
		) {
			return locationRecord.name;
		}

		if (typeof value.location_name === 'string' && value.location_name.trim()) {
			return value.location_name;
		}

		return 'Unknown';
	}

	function readTimestamp(row: TelemetryRow | null): string | null {
		if (!row) {
			return null;
		}

		const value = row.created_at;
		if (typeof value === 'string' && value.length > 0) {
			return value;
		}

		if (value instanceof Date) {
			return value.toISOString();
		}

		return null;
	}

	function toIsoString(value: Date | string): string {
		return new Date(value).toISOString();
	}

	function createRouteState(): RouteState {
		return {
			requestedHistoricalData: null,
			activeRangeHours: null,
			dateRange: undefined,
			fetching: false,
			fetchError: null
		};
	}

	let routeStateByKey = $state<Record<string, RouteState>>({});

	function getRouteState(key: string): RouteState {
		if (!routeStateByKey[key]) {
			routeStateByKey[key] = createRouteState();
		}

		return routeStateByKey[key];
	}

	let devEui = $derived(data.devEui ?? '');
	let locationId = $derived(data.locationId ?? '');
	let authToken = $derived(data.authToken ?? null);
	let permissionLevel = $derived(Number(data.permissionLevel) || 4);
	let latestData = $derived(isTelemetryRow(data.latestData) ? data.latestData : null);
	let locationName = $derived(readLocationName(data.device));
	let serverHistoricalData = $derived(normalizeTelemetryRows(data.deviceData));
	let DisplayComponent = $derived(resolveDisplayComponent(data.dataTable));
	let lastSeen = $derived(readTimestamp(latestData));
	let controlsDisabled = $derived(!authToken || !devEui);
	let routeKey = $derived(`${locationId}:${devEui}`);

	let requestedHistoricalData = $derived(
		routeStateByKey[routeKey]?.requestedHistoricalData ?? null
	);
	let historicalData = $derived(requestedHistoricalData ?? serverHistoricalData);
	let activeRangeHours = $derived(routeStateByKey[routeKey]?.activeRangeHours ?? null);
	let dateRange = $derived(routeStateByKey[routeKey]?.dateRange ?? undefined);
	let fetching = $derived(routeStateByKey[routeKey]?.fetching ?? false);
	let fetchError = $derived(routeStateByKey[routeKey]?.fetchError ?? null);

	$effect(() => {
		if (fetchError) {
			toast.add({ tone: 'danger', message: fetchError });
		}
	});

	// Auto-load "Today Only" on first visit to this device route
	$effect(() => {
		const key = routeKey;
		const token = authToken;
		if (!token || !key) return;
		if (!routeStateByKey[key]) {
			selectRange(RANGE_OPTIONS[0].value);
		}
	});

	let csvRangeLabel = $derived(activeRangeHours === null ? 'custom' : `${activeRangeHours}h`);
	let childLoading = $derived(fetching && historicalData.length === 0);

	async function loadHistoricalData(
		start: Date | string,
		end: Date | string,
		rangeHours: RangeHours | null
	): Promise<void> {
		if (!authToken || !devEui) {
			return;
		}

		const state = getRouteState(routeKey);
		state.fetching = true;
		state.fetchError = null;

		try {
			const api = new ApiService({ fetchFn: fetch, authToken });
			const result = await api.getDeviceDataWithinRange(devEui, {
				start: toIsoString(start),
				end: toIsoString(end),
				take: MAX_RANGE_RECORDS
			});

			state.requestedHistoricalData = normalizeTelemetryRows(result);
			state.activeRangeHours = rangeHours;
			if (rangeHours !== null) {
				state.dateRange = undefined;
			}
		} catch (error) {
			console.error('Failed to fetch device data:', error);
			state.fetchError = 'Unable to load telemetry for the selected range.';
		} finally {
			state.fetching = false;
		}
	}

	async function selectRange(hours: RangeHours): Promise<void> {
		const end = new Date();
		const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
		await loadHistoricalData(start, end, hours);
	}

	function isRangeDateValue(value: CwDateValue | undefined): value is CwRangeDateValue {
		return !!value && 'start' in value && 'end' in value;
	}

	async function handleDateRangeChange(value: CwDateValue | undefined): Promise<void> {
		const state = getRouteState(routeKey);
		state.dateRange = isRangeDateValue(value) ? value : undefined;

		if (!isRangeDateValue(value) || !value.start || !value.end) {
			return;
		}

		await loadHistoricalData(value.start, value.end, null);
	}

	function handleCsvDownload(): void {
		downloadCsv(historicalData as CsvRow[], {
			locationName,
			devEui,
			rangeLabel: csvRangeLabel
		});
	}
</script>

<svelte:head>
	<title>Device Dashboard - {devEui.toUpperCase()} - CropWatch</title>
</svelte:head>

<div class="device-page">
	<CwCard title={`Device ${devEui.toUpperCase()}`} subtitle={`Location ${locationName}`} elevated>
		<div class="device-page__toolbar">
			<div class="flex flex-col gap-2">
				<CwButton
					variant="secondary"
					size="sm"
					disabled={!locationId}
					onclick={() => goto(resolve('/locations/[location_id]', { location_id: locationId }))}
				>
					← Location
				</CwButton>
				<CwButton
					variant="secondary"
					size="sm"
					disabled={!locationId}
					onclick={() => goto(resolve('/'))}
				>
					← Dashboard
				</CwButton>
			</div>

			<div class="device-page__group device-page__group--ranges">
				{#each RANGE_OPTIONS as ranges (ranges.value)}
					<CwButton
						variant={activeRangeHours === ranges.value ? 'primary' : 'secondary'}
						size="sm"
						disabled={controlsDisabled}
						onclick={() => selectRange(ranges.value)}
					>
						{ranges.label}
					</CwButton>
				{/each}
			</div>

			<div class="device-page__group device-page__group--actions">
				{#if permissionLevel <= 2}
					<CwButton
						variant="secondary"
						size="sm"
						disabled={historicalData.length === 0}
						onclick={handleCsvDownload}
					>
						<img src={DOWNLOAD_ICON} alt="" class="toolbar-icon" />
						CSV
					</CwButton>
				{/if}

				{#if permissionLevel <= 1}
					<CwButton
						variant="secondary"
						size="sm"
						disabled={!locationId || !devEui}
						onclick={() =>
							goto(
								resolve('/locations/[location_id]/devices/[dev_eui]/settings', {
									location_id: locationId,
									dev_eui: devEui
								})
							)}
					>
						<img src={SETTINGS_ICON} alt="" class="toolbar-icon" />
						Settings
					</CwButton>
				{/if}
			</div>
		</div>

		{#if fetching}
			<div class="device-page__status">
				<div class="device-page__status-row">
					<CwSpinner />
					<span>Loading telemetry…</span>
				</div>
			</div>
		{/if}
	</CwCard>

	<div class="device-page__display">
		<DisplayComponent
			{devEui}
			{locationId}
			{locationName}
			{latestData}
			{historicalData}
			loading={childLoading}
			{authToken}
		/>
	</div>
</div>

<style>
	.device-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
		padding: 0 0.25rem 1rem 0;
	}

	.device-page__toolbar {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		gap: 0.75rem;
		align-items: start;
	}

	.device-page__group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		min-width: 0;
	}

	.device-page__group--ranges {
		grid-column: span 3;
	}

	.device-page__group--actions {
		grid-column: span 3;
		flex-direction: column;
		align-items: flex-end;
		justify-content: flex-start;
	}

	.device-page__status {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--cw-border, #e5e7eb);
	}

	.device-page__status-row {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--cw-text-muted);
	}

	.device-page__display {
		min-width: 0;
	}

	.toolbar-icon {
		width: 1rem;
		height: 1rem;
	}

	@media (max-width: 1200px) {
		.device-page__group--ranges,
		.device-page__group--actions {
			grid-column: span 6;
		}
	}

	@media (max-width: 720px) {
		.device-page {
			padding-right: 0;
			padding-bottom: 0.75rem;
		}

		.device-page__toolbar {
			grid-template-columns: 1fr;
		}

		.device-page__group--ranges,
		.device-page__group--actions {
			grid-column: auto;
		}

		.device-page__group--actions {
			flex-direction: row;
			align-items: center;
			justify-content: flex-start;
		}
	}
</style>
