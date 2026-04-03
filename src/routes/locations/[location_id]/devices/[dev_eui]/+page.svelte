<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteDate } from 'svelte/reactivity';
	import { resolveDisplayComponent } from '$lib/config/deviceTables';
	import { ApiService } from '$lib/api/api.service';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwCard, CwDuration, CwSpinner, useCwToast } from '@cropwatchdevelopment/cwui';
	import CsvExportDialog from './csvExportDialog.svelte';
	import { resolveExportTimeZone } from './csvExport';
	import type { PageProps } from './$types';
	import SETTINGS_ICON from '$lib/images/icons/settings.svg';
	import CsvTrafficExportDialog from './csvTrafficExportDialog.svelte';

	type RangeSelection = 'today' | 24 | 48 | 72;

	interface TimeRangeOptions {
		label: string;
		value: RangeSelection;
	}

	type TelemetryRow = Record<string, unknown>;
	const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
	const DEFAULT_RANGE_SELECTION: RangeSelection = 'today';
	const MAX_RANGE_RECORDS = 1500;

	interface RouteState {
		requestedHistoricalData: TelemetryRow[] | null;
		activeRange: RangeSelection | null;
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
			return m.devices_unknown_location();
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

		return m.devices_unknown_location();
	}

	function readCreatedAt(value: TelemetryRow | null | undefined): string | null {
		return value && typeof value.created_at === 'string' ? value.created_at : null;
	}

	function getRangeOptions(): TimeRangeOptions[] {
		return [
			{ label: m.devices_range_today_only(), value: DEFAULT_RANGE_SELECTION },
			{ label: m.devices_range_last_hours({ hours: '24' }), value: 24 },
			{ label: m.devices_range_last_hours({ hours: '48' }), value: 48 },
			{ label: m.devices_range_last_hours({ hours: '72' }), value: 72 }
		];
	}

	function toIsoString(value: Date | string): string {
		return new Date(value).toISOString();
	}

	function createRouteState(): RouteState {
		return {
			requestedHistoricalData: null,
			activeRange: null,
			fetching: false,
			fetchError: null
		};
	}

	let routeStateByKey = $state<Record<string, RouteState>>({});
	const initializedRouteKeys: Record<string, true> = {};

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
	let exportTimeZone = $derived(resolveExportTimeZone(data.device));
	let serverHistoricalData = $derived(normalizeTelemetryRows(data.deviceData));
	let DisplayComponent = $derived(resolveDisplayComponent(data.dataTable));
	let controlsDisabled = $derived(!authToken || !devEui);
	let routeKey = $derived(`${locationId}:${devEui}`);
	let upload_interval = $derived(
		data.device?.upload_interval ?? data.device?.cw_device_type?.default_upload_interval
	);

	let requestedHistoricalData = $derived(
		routeStateByKey[routeKey]?.requestedHistoricalData ?? null
	);
	let historicalData = $derived(requestedHistoricalData ?? serverHistoricalData);
	let activeRange = $derived(routeStateByKey[routeKey]?.activeRange ?? null);
	let fetching = $derived(routeStateByKey[routeKey]?.fetching ?? false);
	let fetchError = $derived(routeStateByKey[routeKey]?.fetchError ?? null);

	afterNavigate(() => {
		const key = routeKey;
		if (!authToken || !devEui || !key || initializedRouteKeys[key]) return;

		initializedRouteKeys[key] = true;
		void selectRange(DEFAULT_RANGE_SELECTION);
	});

	let childLoading = $derived(fetching && historicalData.length === 0);

	function getRangeBounds(selection: RangeSelection): { start: string; end: string } {
		const end = new SvelteDate();
		const endTime = end.getTime();
		if (selection === 'today') {
			const start = new SvelteDate(endTime);
			start.setHours(0, 0, 0, 0);
			return {
				start: start.toISOString(),
				end: end.toISOString()
			};
		}

		return {
			start: new SvelteDate(endTime - selection * MILLISECONDS_PER_HOUR).toISOString(),
			end: end.toISOString()
		};
	}

	async function loadHistoricalData(
		start: Date | string,
		end: Date | string,
		rangeSelection: RangeSelection | null
	): Promise<void> {
		if (!authToken || !devEui) {
			return;
		}

		const state = getRouteState(routeKey);
		state.fetching = true;
		state.fetchError = null;

		try {
			const api = new ApiService({ fetchFn: fetch, authToken });
			console.log(start, end);
			const result = await api.getDeviceDataWithinRange(devEui, {
				start: toIsoString(start),
				end: toIsoString(end),
				take: MAX_RANGE_RECORDS
			});

			state.requestedHistoricalData = normalizeTelemetryRows(result);
			state.activeRange = rangeSelection;
		} catch (error) {
			console.error('Failed to fetch device data:', error);
			state.fetchError = m.devices_load_telemetry_failed();
			toast.add({ tone: 'danger', message: state.fetchError });
		} finally {
			state.fetching = false;
		}
	}

	async function selectRange(selection: RangeSelection): Promise<void> {
		const { start, end } = getRangeBounds(selection);
		await loadHistoricalData(start, end, selection);
	}

	async function fetchLatestData() {
		if (!authToken || !devEui) return;

		try {
			const api = new ApiService({ fetchFn: fetch, authToken });
			const result = await api.getDeviceLatestData(devEui);

			if (isTelemetryRow(result)) {
				latestData = result;
				historicalData = [result, ...(historicalData ?? [])];
			} else {
				console.warn('Latest data response is not an object:', result);
			}
		} catch (err) {
			console.error('Failed to fetch latest air data:', err);
		}
	}
</script>

<svelte:head>
	<title>{m.devices_dashboard_page_title({ devEui: devEui.toUpperCase() })}</title>
</svelte:head>

<div class="my-2 flex flex-row gap-2">
	<CwButton
		variant="secondary"
		size="md"
		disabled={!locationId}
		fullWidth={true}
		onclick={() => goto(resolve('/locations/[location_id]', { location_id: locationId }))}
	>
		← {m.devices_back_to_location()}
	</CwButton>
	<CwButton
		variant="secondary"
		size="md"
		disabled={!locationId}
		fullWidth={true}
		onclick={() => goto(resolve('/'))}
	>
		← {m.action_back_to_dashboard()}
	</CwButton>
</div>

<div class="device-page">
	<CwCard
		title={m.devices_dashboard_card_title({ devEui: data?.device?.name || devEui.toUpperCase() })}
		subtitle={m.devices_dashboard_card_subtitle({ locationName })}
		elevated
	>
		{#snippet actions()}
			<p class="text-md text-right" style="color: var(--cw-text-muted)">
				{m.display_last_updated()}:
				{#if readCreatedAt(historicalData[0])}
					<CwDuration
						from={readCreatedAt(historicalData[0]) ?? ''}
						alarmAfterMinutes={(upload_interval || 10) + 0.5}
						alarmCallback={fetchLatestData}
					/>
				{:else}
					<span>Data Not available</span>
				{/if}
			</p>
		{/snippet}
		<div class="flex w-full flex-row">
			<div class="flex-start flex flex-wrap gap-2">
				{#if data.device?.cw_device_type.name !== '[CROPWATCH] Nvidia Jetson'}
					{#each getRangeOptions() as ranges (ranges.value)}
						<CwButton
							variant={activeRange === ranges.value ? 'primary' : 'secondary'}
							size="sm"
							disabled={controlsDisabled}
							onclick={() => selectRange(ranges.value)}
						>
							{ranges.label}
						</CwButton>
					{/each}
				{/if}
			</div>

			<span class="flex-1"></span>
			<div class="flex flex-col gap-2">
				<div class="flex flex-row gap-2">
					{#if permissionLevel <= 2}
						<CsvExportDialog
							{authToken}
							{devEui}
							{locationName}
							timeZone={exportTimeZone}
							disabled={controlsDisabled}
						/>

						{#if data.device?.cw_device_type.name === '[CROPWATCH] Nvidia Jetson'}
							<CsvTrafficExportDialog
								{authToken}
								{devEui}
								{locationName}
								timeZone={exportTimeZone}
								disabled={controlsDisabled}
							/>
						{/if}

					{/if}

					{#if permissionLevel == 1}
						<CwButton
							variant="secondary"
							size="md"
							disabled={!locationId || !devEui}
							onclick={() =>
								goto(
									resolve('/locations/[location_id]/devices/[dev_eui]/settings', {
										location_id: locationId,
										dev_eui: devEui
									})
								)}
						>
							<Icon src={SETTINGS_ICON} alt="" class="h-4 w-4" />
							{m.nav_settings()}
						</CwButton>
					{/if}
				</div>
			</div>

			{#if fetching || fetchError}
				<div class="device-page__status">
					{#if fetching}
						<div class="device-page__status-row">
							<CwSpinner />
							<span>{m.devices_loading_telemetry()}</span>
						</div>
					{/if}

					{#if fetchError}
						<p class="device-page__status-error">{fetchError}</p>
					{/if}
				</div>
			{/if}
		</div></CwCard
	>

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

	.device-page__status-error {
		margin: 0;
		color: var(--cw-danger, #b91c1c);
	}

	.device-page__display {
		min-width: 0;
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
