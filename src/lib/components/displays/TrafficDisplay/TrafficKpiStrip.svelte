<script lang="ts">
	import { CwSpinner } from '@cropwatchdevelopment/cwui';
	import { formatNumber } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import {
		formatHour,
		formatMeasurement,
		metricEmoji,
		metricLabelText,
		type TrafficKpis
	} from './traffic-data';
	import { weatherEmoji, type WeatherDaySummary } from './traffic-weather';

	interface Props {
		kpis: TrafficKpis;
		loading: boolean;
		weather: WeatherDaySummary | null;
		weatherLoading: boolean;
		weatherError: string | null;
		locationLabel: string;
	}

	let { kpis, loading, weather, weatherLoading, weatherError, locationLabel }: Props = $props();
</script>

<div class="traffic-kpis">
	<!-- Today's total -->
	<div class="traffic-kpis__tile">
		<p class="traffic-kpis__label">{m.traffic_today_total()}</p>
		<p class="traffic-kpis__value">{formatNumber(kpis.todayTotal)}</p>
		<p class="traffic-kpis__hint">
			{m.traffic_tracked_hours_count({ count: formatNumber(kpis.trackedHours) })}
		</p>
	</div>

	<!-- Current (or latest available) hour -->
	<div class="traffic-kpis__tile">
		<p class="traffic-kpis__label">
			{kpis.isCurrentHour
				? m.traffic_current_hour_today()
				: m.traffic_latest_available_hour_today()}
		</p>
		{#if loading && !kpis.currentHourRow}
			<p class="traffic-kpis__value traffic-kpis__value--pending"><CwSpinner /></p>
		{:else if kpis.currentHourRow}
			<p class="traffic-kpis__value">{formatNumber(kpis.currentHourRow.total_traffic)}</p>
			<p class="traffic-kpis__hint">{formatHour(kpis.currentHourRow.traffic_hour)}</p>
		{:else}
			<p class="traffic-kpis__value">0</p>
			<p class="traffic-kpis__hint">{m.traffic_no_traffic_today()}</p>
		{/if}
	</div>

	<!-- Peak hour -->
	<div class="traffic-kpis__tile">
		<p class="traffic-kpis__label">{m.traffic_peak_hour()}</p>
		{#if kpis.peakHourRow}
			<p class="traffic-kpis__value">{formatNumber(kpis.peakHourRow.total_traffic)}</p>
			<p class="traffic-kpis__hint">{formatHour(kpis.peakHourRow.traffic_hour)}</p>
		{:else}
			<p class="traffic-kpis__value">--</p>
			<p class="traffic-kpis__hint">{m.traffic_no_traffic_today()}</p>
		{/if}
	</div>

	<!-- Busiest detection class -->
	<div class="traffic-kpis__tile">
		<p class="traffic-kpis__label">{m.traffic_top_class()}</p>
		{#if kpis.topClassKey}
			<p class="traffic-kpis__value">
				<span class="traffic-kpis__emoji" aria-hidden="true">{metricEmoji(kpis.topClassKey)}</span>
				{formatNumber(kpis.classTotals[kpis.topClassKey] ?? 0)}
			</p>
			<p class="traffic-kpis__hint">{metricLabelText(kpis.topClassKey)}</p>
		{:else}
			<p class="traffic-kpis__value">--</p>
			<p class="traffic-kpis__hint">{m.traffic_no_class_data_recorded()}</p>
		{/if}
	</div>

	<!-- Today's weather -->
	<div class="traffic-kpis__tile traffic-kpis__tile--weather">
		<p class="traffic-kpis__label">{m.traffic_daily_weather()}</p>
		{#if weatherLoading && !weather}
			<p class="traffic-kpis__value traffic-kpis__value--pending"><CwSpinner /></p>
		{:else if weather}
			<p class="traffic-kpis__value">
				<span class="traffic-kpis__emoji" aria-hidden="true"
					>{weatherEmoji(weather.weatherCode)}</span
				>
				{weather.temperatureHighC !== null ? `${Math.round(weather.temperatureHighC)}°` : '--'}
				<span class="traffic-kpis__value-low">
					{m.traffic_low_temperature({
						value:
							weather.temperatureLowC !== null ? `${Math.round(weather.temperatureLowC)}°` : '--'
					})}
				</span>
			</p>
			<p class="traffic-kpis__hint">
				{weather.label}
				· 💧 {formatMeasurement(weather.precipitationMm, 'mm', 1)}
				· 💨 {formatMeasurement(weather.windSpeedKmh, 'km/h')}
			</p>
			<p class="traffic-kpis__hint traffic-kpis__hint--muted">📍 {locationLabel}</p>
		{:else}
			<p class="traffic-kpis__hint">{weatherError ?? m.traffic_weather_unavailable()}</p>
		{/if}
	</div>
</div>

<style>
	.traffic-kpis {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11.5rem, 1fr));
		gap: 0.75rem;
	}

	.traffic-kpis__tile {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.9rem 1rem;
		border-radius: 1rem;
		border: 1px solid color-mix(in srgb, var(--cw-border-default) 46%, transparent);
		background: var(--cw-bg-surface-elevated);
	}

	.traffic-kpis__tile--weather {
		background: linear-gradient(180deg, #8cc8ff 0%, #72b5f2 100%);
		border-color: transparent;
		color: #0f172a;
		box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 22%, transparent);
	}

	.traffic-kpis__tile--weather .traffic-kpis__label,
	.traffic-kpis__tile--weather .traffic-kpis__value,
	.traffic-kpis__tile--weather .traffic-kpis__hint,
	.traffic-kpis__tile--weather .traffic-kpis__hint--muted {
		color: inherit;
	}

	.traffic-kpis__label {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: var(--cw-text-muted);
	}

	.traffic-kpis__value {
		margin: 0;
		font-size: clamp(1.4rem, 2vw, 1.9rem);
		font-weight: 700;
		line-height: 1.1;
		color: var(--cw-text-primary);
		font-variant-numeric: tabular-nums;
	}

	.traffic-kpis__value--pending {
		display: inline-flex;
		align-items: center;
	}

	.traffic-kpis__value-low {
		font-size: 0.8rem;
		font-weight: 600;
	}

	.traffic-kpis__emoji {
		font-size: 1.2rem;
	}

	.traffic-kpis__hint {
		margin: 0;
		font-size: 0.82rem;
		color: var(--cw-text-secondary);
	}

	.traffic-kpis__hint--muted {
		color: var(--cw-text-muted);
	}

	:global([data-theme='dark']) .traffic-kpis__tile--weather {
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
	}
</style>
