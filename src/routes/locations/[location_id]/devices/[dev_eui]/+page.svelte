<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteDate } from 'svelte/reactivity';
	import { isRelayTable, resolveDisplayComponent } from '$lib/config/deviceTables';
	import { ApiService, ApiServiceError } from '$lib/api/api.service';
	import {
		type RelayStateSnapshot,
		type RelayVerificationResult,
		RelayStateManager
	} from '$lib/devices/relay-control';
	import { getRelayState, normalizeRelayTelemetryRow } from '$lib/devices/relay-telemetry';
	import { type RelayNumber, type RelayTargetState } from '$lib/devices/relay-types';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwCard, CwDuration, CwSpinner, useCwToast } from '@cropwatchdevelopment/cwui';
	import CsvExportDialog from './csvExportDialog.svelte';
	import { resolveExportTimeZone } from './csvExport';
	import type { PageProps } from './$types';
	import SETTINGS_ICON from '$lib/images/icons/settings.svg';
	import CsvTrafficExportDialog from './csvTrafficExportDialog.svelte';
	import { onDestroy } from 'svelte';

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

	function readRelayTelemetryRow(value: unknown): TelemetryRow | null {
		const normalizedRow = normalizeRelayTelemetryRow(value);
		if (normalizedRow) {
			return normalizedRow;
		}

		if (isTelemetryRow(value)) {
			const nestedRow = normalizeRelayTelemetryRow(value.data);
			if (nestedRow) {
				return nestedRow;
			}
		}

		const [firstRow] = normalizeTelemetryRows(value);
		return firstRow ?? null;
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

	function createEmptyRelaySnapshot(): RelayStateSnapshot {
		return {
			historicalData: [],
			latestData: null,
			pendingRelayStates: {}
		};
	}

	function getRelayTargetStateLabel(targetState: RelayTargetState): string {
		return targetState === 'on' ? m.display_on() : m.display_off();
	}

	function getVerifiedRelayStateLabel(
		relay: RelayNumber,
		row: Record<string, unknown> | null
	): string {
		const value = getRelayState(normalizeRelayTelemetryRow(row), relay);
		if (value === null) {
			return m.display_unknown();
		}

		return value ? m.display_on() : m.display_off();
	}

	function handleRelayConfirmationResolved(result: RelayVerificationResult): void {
		if (result.matched) {
			toast.add({
				tone: 'success',
				message: m.devices_relay_confirmation_changed({
					relay: String(result.relay),
					state: getRelayTargetStateLabel(result.targetState)
				})
			});
			return;
		}

		toast.add({
			tone: 'warning',
			message: m.devices_relay_confirmation_mismatch({
				relay: String(result.relay),
				state: getVerifiedRelayStateLabel(result.relay, result.row)
			})
		});
	}

	function mapRelayApiErrorMessage(error: unknown): string {
		if (!(error instanceof ApiServiceError)) {
			return m.devices_relay_command_failed();
		}

		switch (error.status) {
			case 401:
			case 403:
				return m.devices_relay_downlink_not_authorized();
			case 404:
				return m.devices_relay_downlink_target_not_found();
			case 429:
				return m.devices_relay_downlink_rate_limited();
			default:
				return m.devices_relay_command_failed();
		}
	}

	function readApiError(payload: unknown, fallback: string): string {
		if (payload && typeof payload === 'object') {
			const payloadRecord = payload as Record<string, unknown>;
			const message = payloadRecord.message;
			if (typeof message === 'string' && message.length > 0) return message;
			if (Array.isArray(message)) {
				const text = message
					.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
					.join(', ');
				if (text) return text;
			}

			return readApiError(payloadRecord.payload, fallback);
		}

		return fallback;
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
	let isRelayDevice = $derived(isRelayTable(data.dataTable));
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
	let relayStateManager: RelayStateManager | null = null;
	let relayStateManagerKey = '';
	let unsubscribeRelayState = () => {};
	let relayStateSnapshot = $state<RelayStateSnapshot>(createEmptyRelaySnapshot());
	let displayLatestData = $derived(
		isRelayDevice ? (relayStateSnapshot.latestData ?? latestData) : latestData
	);
	let displayHistoricalData = $derived(
		isRelayDevice && relayStateSnapshot.historicalData.length > 0
			? relayStateSnapshot.historicalData
			: historicalData
	);
	let displayCurrentRecord = $derived(displayLatestData ?? displayHistoricalData[0] ?? null);
	let noDataYet = $derived(
		!isRelayDevice &&
			!fetching &&
			!fetchError &&
			!displayLatestData &&
			displayHistoricalData.length === 0
	);

	afterNavigate(() => {
		const key = routeKey;
		if (isRelayDevice && authToken) {
			ensureRelayStateManager();
		} else {
			destroyRelayStateManager();
		}

		if (!authToken || !devEui || !key || initializedRouteKeys[key]) return;

		initializedRouteKeys[key] = true;
		void selectRange(DEFAULT_RANGE_SELECTION);
	});

	onDestroy(() => {
		destroyRelayStateManager();
	});

	function syncRelayStateBaseData(): void {
		if (!isRelayDevice || !relayStateManager) {
			return;
		}

		relayStateManager.replaceBaseData({
			historicalData,
			latestData
		});
	}

	function destroyRelayStateManager(): void {
		unsubscribeRelayState();
		unsubscribeRelayState = () => {};
		relayStateManager?.destroy();
		relayStateManager = null;
		relayStateManagerKey = '';
		relayStateSnapshot = createEmptyRelaySnapshot();
	}

	function ensureRelayStateManager(): void {
		if (!isRelayDevice || !authToken || !devEui) {
			destroyRelayStateManager();
			return;
		}

		const nextManagerKey = `${routeKey}:${authToken}`;
		if (relayStateManager && relayStateManagerKey === nextManagerKey) {
			syncRelayStateBaseData();
			return;
		}

		destroyRelayStateManager();

		const manager = new RelayStateManager({
			fetchLatestData: async (signal) => await fetchRelayData({ signal }),
			historicalData,
			latestData,
			onVerificationResolved: handleRelayConfirmationResolved
		});
		unsubscribeRelayState = manager.subscribe((snapshot) => {
			relayStateSnapshot = snapshot;
		});
		relayStateManager = manager;
		relayStateManagerKey = nextManagerKey;
	}

	let childLoading = $derived(fetching && displayHistoricalData.length === 0);

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
			const result = await api.getDeviceDataWithinRange(devEui, {
				start: toIsoString(start),
				end: toIsoString(end),
				take: MAX_RANGE_RECORDS
			});

			state.requestedHistoricalData = normalizeTelemetryRows(result);
			state.activeRange = rangeSelection;
			syncRelayStateBaseData();
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

	async function fetchLatestData(options: { apply?: boolean; signal?: AbortSignal } = {}) {
		if (!authToken || !devEui) return null;

		try {
			const api = new ApiService({ fetchFn: fetch, authToken });
			const result = await api.getDeviceLatestData(devEui, { signal: options.signal });

			if (isTelemetryRow(result)) {
				if (options.apply !== false) {
					latestData = result;
					const resultKey = String(result.id ?? result.created_at ?? '');
					historicalData = [
						result,
						...historicalData.filter((row) => String(row.id ?? row.created_at ?? '') !== resultKey)
					];
					syncRelayStateBaseData();
				}

				return result;
			}
		} catch (err) {
			if (err instanceof ApiServiceError && err.status === 404) {
				return null;
			}

			console.error('Failed to fetch latest air data:', err);
		}

		return null;
	}

	async function fetchRelayData(options: { signal?: AbortSignal } = {}) {
		if (!authToken || !devEui) return null;

		try {
			const api = new ApiService({ fetchFn: fetch, authToken });
			const result = await api.getRelayData(devEui, {
				signal: options.signal,
				suppressNotFoundError: true
			});

			return readRelayTelemetryRow(result);
		} catch (err) {
			if (err instanceof ApiServiceError && err.status === 404) {
				return null;
			}

			console.error('Failed to fetch latest relay data:', err);
		}

		return null;
	}

	async function refreshRelayDisplayData(): Promise<TelemetryRow | null> {
		if (!authToken || !devEui) {
			return null;
		}

		ensureRelayStateManager();
		return (await relayStateManager?.refreshLatestData()) ?? null;
	}

	async function refreshDisplayedData(): Promise<TelemetryRow | null> {
		return isRelayDevice ? await refreshRelayDisplayData() : await fetchLatestData();
	}

	async function queueRelayCommand(
		relay: RelayNumber,
		targetState: RelayTargetState,
		durationSeconds?: number
	): Promise<void> {
		const hasPendingRelayVerification =
			Object.keys(relayStateSnapshot.pendingRelayStates).length > 0;

		if (
			!isRelayDevice ||
			!authToken ||
			!devEui ||
			permissionLevel > 2 ||
			hasPendingRelayVerification
		) {
			return;
		}

		try {
			ensureRelayStateManager();
			const api = new ApiService({ fetchFn: fetch, authToken });

			if (typeof durationSeconds === 'number' && Number.isFinite(durationSeconds)) {
				await api.pulseRelay(devEui, {
					durationSeconds,
					relay
				});
			} else {
				await api.updateRelay(devEui, { relay, targetState });
			}

			relayStateManager?.startVerification(relay, targetState);
			toast.add({
				tone: 'info',
				message: m.devices_relay_command_queued({ relay: String(relay) })
			});
		} catch (error) {
			console.error('[relay-control] command failed', {
				devEui,
				durationSeconds,
				error,
				relay,
				targetState
			});

			const fallback = mapRelayApiErrorMessage(error);
			toast.add({
				tone: 'danger',
				message: error instanceof ApiServiceError ? readApiError(error.payload, fallback) : fallback
			});
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
				{#if readCreatedAt(displayCurrentRecord)}
					<CwDuration
						from={readCreatedAt(displayCurrentRecord) ?? ''}
						alarmAfterMinutes={(upload_interval || 10) + 0.5}
						alarmCallback={refreshDisplayedData}
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

	{#if noDataYet}
		<CwCard title={m.display_no_data()} elevated>
			<p class="device-page__empty-message">{m.devices_no_data_yet()}</p>
		</CwCard>
	{:else}
		<div class="device-page__display">
			<DisplayComponent
				{devEui}
				{locationId}
				{locationName}
				latestData={displayLatestData}
				historicalData={displayHistoricalData}
				loading={childLoading}
				{permissionLevel}
				pendingRelayStates={relayStateSnapshot.pendingRelayStates}
				{queueRelayCommand}
				{authToken}
			/>
		</div>
	{/if}
</div>

<style>
	.device-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
		padding: 0 0.25rem 1rem 0;
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

	.device-page__empty-message {
		margin: 0;
		color: var(--cw-text-muted, #475467);
	}

	@media (max-width: 720px) {
		.device-page {
			padding-right: 0;
			padding-bottom: 0.75rem;
		}
	}
</style>
