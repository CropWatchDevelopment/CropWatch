<script lang="ts">
	import { CwCalendar, CwCard, CwChip } from '@cropwatchdevelopment/cwui';
	import { ApiService } from '$lib/api/api.service';
	import { formatNumber } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import {
		buildDailyTrafficSummaries,
		formatMeasurement,
		formatTrafficValue,
		getMonthBounds,
		metricLabel,
		normalizeTrafficRows,
		resolveTrafficClassKeys,
		toDayKey,
		type DailyTrafficSummary,
		type TrafficRow
	} from './traffic-data';
	import { fetchWeatherByRange, weatherEmoji, type WeatherDaySummary } from './traffic-weather';

	interface Props {
		devEui: string;
		authToken: string | null;
		latitude: number | null;
		longitude: number | null;
		/** Anchors the initially shown month (e.g. the device's latest data). */
		anchorDate: Date | null;
		locationLabel: string;
	}

	let { devEui, authToken, latitude, longitude, anchorDate, locationLabel }: Props = $props();

	// Capture once for the initial month; later device changes re-anchor in the effect below.
	const initialAnchor = (() => anchorDate)() ?? new Date();
	let calendarYear = $state(initialAnchor.getFullYear());
	let calendarMonth = $state(initialAnchor.getMonth());
	let trackedDevice = $state('');

	let monthRows = $state<TrafficRow[]>([]);
	let weatherByDay = $state<Record<string, WeatherDaySummary>>({});
	let calendarLoading = $state(false);
	let calendarError = $state<string | null>(null);
	let requestId = 0;
	let lastLoadKey = '';

	const calendarMonthLabel = $derived(
		new Date(calendarYear, calendarMonth, 1).toLocaleDateString(undefined, {
			month: 'long',
			year: 'numeric'
		})
	);

	const classKeys = $derived(resolveTrafficClassKeys(monthRows));
	const dailySummaries = $derived(buildDailyTrafficSummaries(monthRows, classKeys));
	const summaryByKey = $derived<Record<string, DailyTrafficSummary>>(
		Object.fromEntries(dailySummaries.map((summary) => [summary.dayKey, summary]))
	);

	async function loadMonth(
		deviceKey: string,
		token: string | null,
		year: number,
		month: number,
		lat: number | null,
		lng: number | null
	): Promise<void> {
		requestId += 1;
		const currentRequest = requestId;

		if (!deviceKey || !token) {
			monthRows = [];
			weatherByDay = {};
			calendarLoading = false;
			calendarError = deviceKey ? m.traffic_calendar_auth_required() : null;
			return;
		}

		const { start, end } = getMonthBounds(year, month);
		monthRows = [];
		weatherByDay = {};
		calendarLoading = true;
		calendarError = null;

		try {
			const api = new ApiService({ authToken: token });
			const trafficPromise = api.getTrafficData(deviceKey, {
				start: start.toISOString(),
				end: end.toISOString()
			});
			const weatherPromise =
				lat !== null && lng !== null
					? fetchWeatherByRange(start, end, lat, lng).catch((error) => {
							console.error('Failed to fetch calendar weather:', error);
							return {};
						})
					: Promise.resolve({});

			const [trafficData, weather] = await Promise.all([trafficPromise, weatherPromise]);
			if (currentRequest !== requestId) return;

			monthRows = normalizeTrafficRows(trafficData, deviceKey);
			weatherByDay = weather;
		} catch (error) {
			if (currentRequest !== requestId) return;
			console.error('Failed to fetch calendar month traffic:', error);
			monthRows = [];
			weatherByDay = {};
			calendarError = m.traffic_load_month_failed();
		} finally {
			if (currentRequest === requestId) {
				calendarLoading = false;
			}
		}
	}

	$effect(() => {
		// Re-anchor the visible month when the device changes.
		if (devEui !== trackedDevice) {
			trackedDevice = devEui;
			const anchor = anchorDate ?? new Date();
			calendarYear = anchor.getFullYear();
			calendarMonth = anchor.getMonth();
		}

		const key = `${devEui.trim()}:${authToken ?? 'no-token'}:${calendarYear}:${calendarMonth}:${latitude ?? 'na'}:${longitude ?? 'na'}`;
		if (key === lastLoadKey) return;
		lastLoadKey = key;

		void loadMonth(devEui.trim(), authToken, calendarYear, calendarMonth, latitude, longitude);
	});

	function handleCalendarMonthChange(year: number, month: number): void {
		calendarYear = year;
		calendarMonth = month;
	}
</script>

<CwCard
	title={m.traffic_daily_traffic_weather()}
	subtitle={m.traffic_calendar_fetch_subtitle({ monthLabel: calendarMonthLabel })}
	elevated
>
	<div class="traffic-calendar__meta">
		<CwChip
			label={m.traffic_month_traffic_days({ count: formatNumber(dailySummaries.length) })}
			tone="info"
			variant="soft"
		/>
		<CwChip
			label={m.traffic_lat_lng_label({ label: locationLabel })}
			tone={latitude !== null && longitude !== null ? 'secondary' : 'warning'}
			variant="soft"
		/>

		{#if calendarLoading}
			<CwChip label={m.traffic_loading_visible_month()} tone="secondary" variant="soft" />
		{/if}

		{#if calendarError}
			<CwChip label={calendarError} tone="danger" variant="soft" />
		{:else if !calendarLoading && dailySummaries.length === 0}
			<CwChip label={m.traffic_no_data_this_month()} tone="secondary" variant="soft" />
		{/if}
	</div>

	<CwCalendar
		bind:year={calendarYear}
		bind:month={calendarMonth}
		maxDate={new Date()}
		onMonthChange={handleCalendarMonthChange}
		loading={calendarLoading}
		class="traffic-calendar__calendar"
	>
		{#snippet dayContent(date)}
			{@const summary = summaryByKey[toDayKey(date)]}
			{@const weather = weatherByDay[toDayKey(date)]}
			{#if summary || weather}
				<div class="traffic-calendar__summary">
					{#if weather}
						<div class="traffic-calendar__weather-panel">
							<div class="traffic-calendar__weather-topline">
								<p class="traffic-calendar__weather-temp">
									{weather.temperatureHighC !== null
										? `${Math.round(weather.temperatureHighC)}°`
										: '--'}
								</p>
								<p class="traffic-calendar__weather-low">
									{m.traffic_low_temperature({
										value:
											weather.temperatureLowC !== null
												? `${Math.round(weather.temperatureLowC)}°`
												: '--'
									})}
								</p>
							</div>

							<p class="traffic-calendar__weather-label">
								{weatherEmoji(weather.weatherCode)}
								{weather.label}
							</p>
							<p class="traffic-calendar__copy">
								💧 {formatMeasurement(weather.precipitationMm, 'mm', 1)}
							</p>
						</div>
					{/if}

					{#if summary}
						<div class="traffic-calendar__traffic-panel">
							<p class="traffic-calendar__section-heading">
								{m.traffic_calendar_total({ count: formatNumber(summary.totalTraffic) })}
							</p>

							{#if classKeys.length > 0}
								<div class="traffic-calendar__class-list">
									{#each classKeys as key (key)}
										<p class="traffic-calendar__copy">
											{metricLabel(key)}: {formatTrafficValue(summary.classTotals[key])}
										</p>
									{/each}
								</div>
							{:else}
								<p class="traffic-calendar__copy">{m.traffic_no_class_data_recorded()}</p>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		{/snippet}
	</CwCalendar>
</CwCard>

<style>
	.traffic-calendar__meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.traffic-calendar__summary {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.35rem;
	}

	.traffic-calendar__weather-panel,
	.traffic-calendar__traffic-panel {
		width: 100%;
		border-radius: 0.95rem;
		padding: 0.75rem;
		border: 1px solid transparent;
		box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 22%, transparent);
	}

	.traffic-calendar__weather-panel {
		background: linear-gradient(180deg, #8cc8ff 0%, #72b5f2 100%);
		color: #0f172a;
	}

	.traffic-calendar__traffic-panel {
		background: linear-gradient(180deg, #1f5ca8 0%, #18498a 100%);
		color: #eff6ff;
	}

	.traffic-calendar__weather-topline {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.traffic-calendar__weather-temp {
		margin: 0;
		font-size: 1.8rem;
		font-weight: 700;
		line-height: 1;
	}

	.traffic-calendar__weather-low {
		margin: 0.15rem 0 0;
		font-size: 0.82rem;
		font-weight: 600;
	}

	.traffic-calendar__weather-label,
	.traffic-calendar__section-heading {
		margin: 0.6rem 0 0.25rem;
		font-size: 0.98rem;
		font-weight: 700;
	}

	.traffic-calendar__class-list {
		display: grid;
		gap: 0.15rem;
	}

	.traffic-calendar__copy {
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
		line-height: 1.3;
		word-break: break-word;
	}

	.traffic-calendar__weather-panel .traffic-calendar__copy,
	.traffic-calendar__weather-panel .traffic-calendar__weather-label,
	.traffic-calendar__traffic-panel .traffic-calendar__copy,
	.traffic-calendar__traffic-panel .traffic-calendar__section-heading {
		color: inherit;
	}

	:global([data-theme='dark']) .traffic-calendar__weather-panel {
		background:
			radial-gradient(
				130% 100% at 0% 0%,
				color-mix(in srgb, var(--cw-info-300) 18%, transparent),
				transparent 55%
			),
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--cw-info-600) 32%, var(--cw-bg-surface-elevated)) 0%,
				color-mix(in srgb, var(--cw-info-900) 42%, var(--cw-bg-surface)) 100%
			);
		color: #eff6ff;
		border-color: color-mix(in srgb, var(--cw-info-300) 30%, transparent);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, #ffffff 12%, transparent),
			0 8px 18px color-mix(in srgb, #050a16 36%, transparent);
	}

	:global([data-theme='dark']) .traffic-calendar__traffic-panel {
		background:
			radial-gradient(
				120% 100% at 100% 0%,
				color-mix(in srgb, var(--cw-primary-300) 16%, transparent),
				transparent 58%
			),
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--cw-primary-800) 34%, var(--cw-bg-surface-elevated)) 0%,
				color-mix(in srgb, var(--cw-primary-900) 48%, var(--cw-bg-surface)) 100%
			);
		color: #f8fbff;
		border-color: color-mix(in srgb, var(--cw-primary-300) 24%, transparent);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, #ffffff 10%, transparent),
			0 8px 18px color-mix(in srgb, #050a16 38%, transparent);
	}

	:global(.traffic-calendar__calendar .cw-calendar__day-body) {
		gap: 0.5rem;
	}

	:global(.traffic-calendar__calendar .cw-calendar__day) {
		min-height: 16rem;
	}
</style>
