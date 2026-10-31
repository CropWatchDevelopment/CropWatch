<script lang="ts">
	import { AppPage } from '$lib/components/layout';
	import { afterNavigate } from '$app/navigation';
	import { getAppContext } from '$lib/appContext.svelte';
	import { isTrafficTable, resolveDisplayComponent } from '$lib/config/deviceTables';
	import { m } from '$lib/paraglide/messages.js';
	import { getIntlLocale } from '$lib/i18n/format';
	import {
		CwButton,
		CwCard,
		CwDialog,
		CwResponsiveLineChart,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import { cwResponsiveLineChartLabels } from '$lib/i18n/cwuiLabels';
	import { appTheme } from '$lib/theme/appTheme.svelte';
	import { getServices } from '$lib/services/context';
	import { resolveExportTimeZone } from './csvExport';
	import type { PageProps } from './$types';
	import { onDestroy } from 'svelte';
	import { onAppForeground } from '$lib/utils/onAppForeground';
	import DeviceDashboardHeader from './DeviceDashboardHeader.svelte';
	import { DeviceDashboard } from './device-dashboard.svelte';
	import {
		DEW_POINT_SERIES_ID,
		buildDewPointChartSeries,
		buildSensorChartSeries,
		getRangeOptions,
		readLocationName
	} from './device-detail';

	let { data }: PageProps = $props();

	const toast = useCwToast();
	const app = getAppContext();
	const { relays, telemetry } = getServices();

	// History ranges, the latest reading, the refresh scheduler and relay commands.
	const dashboard = new DeviceDashboard({ data: () => data, relays, telemetry, toast });

	let locationName = $derived(readLocationName(data.device));
	let exportTimeZone = $derived(resolveExportTimeZone(data.device));
	let DisplayComponent = $derived(resolveDisplayComponent(data.dataTable));
	let controlsDisabled = $derived(!dashboard.authToken || !dashboard.devEui);
	let isAirDevice = $derived(data.dataTable === 'cw_air_data');
	let chartSeries = $derived.by(() => {
		const series = buildSensorChartSeries(dashboard.displayHistoricalData, app.preferences);
		if (isAirDevice) {
			const dewPointSeries = buildDewPointChartSeries(
				dashboard.displayHistoricalData,
				app.preferences
			);
			if (dewPointSeries) series.push(dewPointSeries);
		}
		return series;
	});
	// Dew point is opt-in per page view: it mounts hidden and the user shows it
	// via the chart legend.
	let chartInitialHidden = $derived(isAirDevice ? [DEW_POINT_SERIES_ID] : []);
	let isTrafficDevice = $derived(isTrafficTable(data.dataTable));
	let rangeOptions = $derived(getRangeOptions());
	let noDataYet = $derived(
		!dashboard.isRelayDevice &&
			!dashboard.fetching &&
			!dashboard.fetchError &&
			!dashboard.displayLatestData &&
			dashboard.displayHistoricalData.length === 0
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
		if (deviceErrorStatus && errorDialogRouteKey !== dashboard.routeKey) {
			errorDialogRouteKey = dashboard.routeKey;
			errorDialogOpen = true;
		}
	});

	afterNavigate(() => dashboard.handleNavigation());

	onDestroy(() => {
		dashboard.destroyRelayStateManager();
	});

	// Refetch on the device's own upload window (see DeviceDashboard.scheduleRefresh).
	$effect(() => dashboard.scheduleRefresh());

	let childLoading = $derived(
		dashboard.isRelayDevice
			? dashboard.relayHistory === null && !dashboard.fetchError
			: dashboard.fetching && dashboard.displayHistoricalData.length === 0
	);

	// Full pull whenever the user returns to the tab/app (see refreshOnForeground).
	$effect(() => onAppForeground(() => void dashboard.refreshOnForeground()));
</script>

<svelte:head>
	<title>{m.devices_dashboard_page_title({ devEui: dashboard.devEui.toUpperCase() })}</title>
</svelte:head>

<AppPage>
	{#if deviceErrorStatus}
		<CwDialog bind:open={errorDialogOpen} title={m.devices_error_status_title()}>
			<p class="device-page__error-body">{m.devices_error_status_body()}</p>
			<p class="device-page__error-detail">
				{m.devices_error_status_detail({ status: deviceErrorStatus })}
			</p>
			{#snippet actions()}
				<CwButton
					id="device-error-close-button"
					variant="primary"
					onclick={() => (errorDialogOpen = false)}
				>
					{m.action_close()}
				</CwButton>
			{/snippet}
		</CwDialog>
	{/if}

	<div class="device-page">
		<DeviceDashboardHeader
			activeRange={dashboard.activeRange}
			{controlsDisabled}
			devEui={dashboard.devEui}
			{exportTimeZone}
			fetching={dashboard.fetching}
			{isTrafficDevice}
			lastUpdatedAt={dashboard.lastUpdatedAt}
			locationId={dashboard.locationId}
			{locationName}
			onSelectRange={dashboard.selectRange}
			permissionLevel={dashboard.permissionLevel}
			{rangeOptions}
			titleName={data?.device?.name || dashboard.devEui.toUpperCase()}
		/>

		<!-- Traffic devices render their own purpose-built hourly chart inside
		     TrafficDisplay; the generic per-column time series is unreadable for
		     hourly accumulator counts. Relays have nothing to plot: RelayDisplay
		     shows their ON/OFF state and history. -->
		{#if !isTrafficDevice && !dashboard.isRelayDevice && chartSeries.length > 0}
			<div class="device-page__chart">
				<CwResponsiveLineChart
					locale={getIntlLocale()}
					series={chartSeries}
					title={data?.device?.name || dashboard.devEui.toUpperCase()}
					subtitle={m.display_time_series()}
					ranges={[]}
					initialHidden={chartInitialHidden}
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
					devEui={dashboard.devEui}
					locationId={dashboard.locationId}
					{locationName}
					latestData={dashboard.displayLatestData}
					historicalData={dashboard.displayHistoricalData}
					loading={childLoading}
					permissionLevel={dashboard.permissionLevel}
					canWriteNotes={data.canWriteNotes}
					pendingRelayStates={dashboard.relayStateSnapshot.pendingRelayStates}
					relayHistory={dashboard.relayHistory ?? []}
					queueRelayCommand={dashboard.queueRelayCommand}
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

	/* Back button keeps its natural width in the column. */
	.device-page > :global(.cw-button) {
		align-self: flex-start;
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
