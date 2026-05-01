<script lang="ts">
	import { AppPage } from '$lib/components/layout';
	import { afterNavigate } from '$app/navigation';
	import { isRelayTable, resolveDisplayComponent } from '$lib/config/deviceTables';
	import { ApiService, ApiServiceError } from '$lib/api/api.service';
	import { readApiErrorMessage } from '$lib/api/api-error';
	import {
		type RelayStateSnapshot,
		type RelayVerificationResult,
		RelayStateManager
	} from '$lib/devices/relay-control';
	import { type RelayNumber, type RelayTargetState } from '$lib/devices/relay-types';
	import { m } from '$lib/paraglide/messages.js';
	import { CwCard, useCwToast } from '@cropwatchdevelopment/cwui';
	import { resolveExportTimeZone } from './csvExport';
	import type { PageProps } from './$types';
	import { onDestroy } from 'svelte';
	import DeviceDashboardHeader from './DeviceDashboardHeader.svelte';
	import {
		DEFAULT_RANGE_SELECTION,
		MAX_RANGE_RECORDS,
		createEmptyRelaySnapshot,
		createRouteState,
		getRangeBounds,
		getRangeOptions,
		getRelayTargetStateLabel,
		getVerifiedRelayStateLabel,
		isTelemetryRow,
		mapRelayApiErrorMessage,
		normalizeTelemetryRows,
		readCreatedAt,
		readLocationName,
		readRelayTelemetryRow,
		toIsoString,
		type RangeSelection,
		type RouteState,
		type TelemetryRow
	} from './device-detail';

	let { data }: PageProps = $props();

	const toast = useCwToast();

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
	const serverLatestData = $derived(isTelemetryRow(data.latestData) ? data.latestData : null);
	let clientLatestData = $state<TelemetryRow | null>(null);
	let latestData = $derived(clientLatestData ?? serverLatestData);
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
	let isTrafficDevice = $derived(data.device?.cw_device_type.name === '[CROPWATCH] Nvidia Jetson');
	let rangeOptions = $derived(getRangeOptions());
	let lastUpdatedAt = $derived(readCreatedAt(displayCurrentRecord));
	let alarmAfterMinutes = $derived((upload_interval || 10) + 0.5);
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
					clientLatestData = result;
					const resultKey = String(result.id ?? result.created_at ?? '');
					const state = getRouteState(routeKey);
					const currentHistory = state.requestedHistoricalData ?? serverHistoricalData;
					state.requestedHistoricalData = [
						result,
						...currentHistory.filter((row) => String(row.id ?? row.created_at ?? '') !== resultKey)
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
				message:
					error instanceof ApiServiceError ? readApiErrorMessage(error.payload, fallback) : fallback
			});
		}
	}
</script>

<svelte:head>
	<title>{m.devices_dashboard_page_title({ devEui: devEui.toUpperCase() })}</title>
</svelte:head>

<AppPage>
	<div class="device-page">
		<DeviceDashboardHeader
			{activeRange}
			{alarmAfterMinutes}
			{authToken}
			{controlsDisabled}
			{devEui}
			{exportTimeZone}
			{fetching}
			{isTrafficDevice}
			{lastUpdatedAt}
			{locationId}
			{locationName}
			onRefresh={refreshDisplayedData}
			onSelectRange={selectRange}
			{permissionLevel}
			{rangeOptions}
			titleName={data?.device?.name || devEui.toUpperCase()}
		/>

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
</AppPage>

<style>
	.device-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
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
