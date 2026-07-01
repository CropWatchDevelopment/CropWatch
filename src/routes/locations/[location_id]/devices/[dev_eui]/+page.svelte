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
	import {
		attachCwDeviceRefreshVisibility,
		createCwDeviceRefreshScheduler,
		normalizeCwUploadIntervalMinutes,
		CwButton,
		CwCard,
		CwDialog,
		CwResponsiveLineChart,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import { cwResponsiveLineChartLabels } from '$lib/i18n/cwuiLabels';
	import { appTheme } from '$lib/theme/appTheme.svelte';
	import { resolveExportTimeZone } from './csvExport';
	import { canManage, PermissionLevel } from '$lib/constants/permissions';
	import type { PageProps } from './$types';
	import { onDestroy, untrack } from 'svelte';
	import { onAppForeground } from '$lib/utils/onAppForeground';
	import DeviceDashboardHeader from './DeviceDashboardHeader.svelte';
	import {
		DEFAULT_RANGE_SELECTION,
		MAX_RANGE_RECORDS,
		buildSensorChartSeries,
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
	let permissionLevel = $derived(Number(data.permissionLevel) || PermissionLevel.DISABLED);
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
	// `upload_interval` is a Postgres `numeric` column, so Supabase returns it as
	// a STRING ("15", "-1", …). normalizeCwUploadIntervalMinutes rejects
	// non-positive / non-finite values so the refresh scheduler falls back to its
	// own default instead of scheduling a tight loop.
	let uploadIntervalMinutes = $derived(normalizeCwUploadIntervalMinutes(upload_interval));

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
	let chartSeries = $derived(buildSensorChartSeries(displayHistoricalData));
	let isTrafficDevice = $derived(data.device?.cw_device_type.name === '[CROPWATCH] Nvidia Jetson');
	let rangeOptions = $derived(getRangeOptions());
	let lastUpdatedAt = $derived(readCreatedAt(displayCurrentRecord));
	let noDataYet = $derived(
		!isRelayDevice &&
			!fetching &&
			!fetchError &&
			!displayLatestData &&
			displayHistoricalData.length === 0
	);

	// A non-empty `error_status` on the device row means the sensor has reported a
	// fault and likely needs replacing. Surface it in an auto-opening dialog.
	let deviceErrorStatus = $derived(
		typeof data.device?.error_status === 'string' ? data.device.error_status.trim() : ''
	);
	let errorDialogOpen = $state(false);
	let errorDialogRouteKey = '';

	// Auto-open the error dialog whenever we land on a device that has an error
	// status set. Keyed on `routeKey` so it re-opens when navigating between
	// devices, but stays closed once the user dismisses it for the current one.
	$effect(() => {
		if (deviceErrorStatus && errorDialogRouteKey !== routeKey) {
			errorDialogRouteKey = routeKey;
			errorDialogOpen = true;
		}
	});

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

	// Refetch the device when its own upload window (last seen +
	// upload_interval + grace) expires, instead of polling on a fixed interval.
	// While the device stays stale the scheduler retries with capped exponential
	// backoff; fresh data re-arms it from the new reading. Pauses while the tab
	// is hidden and reconciles on return.
	$effect(() => {
		if (!authToken || !devEui) return;
		const intervalMinutes = uploadIntervalMinutes;

		const scheduler = createCwDeviceRefreshScheduler({
			fetcher: async () => {
				const row = await refreshDisplayedData();
				return { lastSeenAt: row ? readCreatedAt(row) : null, data: row };
			}
		});

		untrack(() => {
			scheduler.track({
				id: devEui,
				lastSeenAt: lastUpdatedAt ?? null,
				uploadIntervalMinutes: intervalMinutes
			});
		});

		const detachVisibility = attachCwDeviceRefreshVisibility(scheduler);
		return () => {
			detachVisibility();
			scheduler.destroy();
		};
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

	// Full pull whenever the user returns to the tab/app. A detail page left in
	// the background goes stale — the device can look offline purely because the
	// page sat idle past its upload interval. Refresh the active history range
	// first, then the latest reading so it prepends onto fresh history.
	async function refreshOnForeground(): Promise<void> {
		if (!authToken || !devEui) return;
		await selectRange(activeRange ?? DEFAULT_RANGE_SELECTION);
		await refreshDisplayedData();
	}

	$effect(() => onAppForeground(() => void refreshOnForeground()));

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
			!canManage(permissionLevel) ||
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
	{#if deviceErrorStatus}
		<CwDialog bind:open={errorDialogOpen} title={m.devices_error_status_title()}>
			<p class="device-page__error-body">{m.devices_error_status_body()}</p>
			<p class="device-page__error-detail">
				{m.devices_error_status_detail({ status: deviceErrorStatus })}
			</p>
			{#snippet actions()}
				<CwButton id="device-error-close-button" variant="primary" onclick={() => (errorDialogOpen = false)}>
					{m.action_close()}
				</CwButton>
			{/snippet}
		</CwDialog>
	{/if}

	<div class="device-page">
		<DeviceDashboardHeader
			{activeRange}
			{authToken}
			{controlsDisabled}
			{devEui}
			{exportTimeZone}
			{fetching}
			{isTrafficDevice}
			{lastUpdatedAt}
			{locationId}
			{locationName}
			onSelectRange={selectRange}
			{permissionLevel}
			{rangeOptions}
			titleName={data?.device?.name || devEui.toUpperCase()}
		/>

		{#if chartSeries.length > 0}
			<div class="device-page__chart">
				<CwResponsiveLineChart
					series={chartSeries}
					title={data?.device?.name || devEui.toUpperCase()}
					subtitle={m.display_time_series()}
					ranges={[]}
					theme={appTheme.current}
					height={480}
					labels={cwResponsiveLineChartLabels()}
				/>
			</div>
		{/if}

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

	.device-page__chart {
		width: 100%;
		min-width: 0;
	}

	.device-page__empty-message {
		margin: 0;
		color: var(--cw-text-muted, #475467);
	}

	.device-page__error-body {
		margin: 0;
		color: var(--cw-text-primary, #101828);
	}

	.device-page__error-detail {
		margin: 0.75rem 0 0;
		font-size: var(--cw-text-sm, 0.875rem);
		color: var(--cw-text-muted, #475467);
	}

	@media (max-width: 720px) {
		.device-page {
			padding-right: 0;
			padding-bottom: 0.75rem;
		}
	}
</style>
