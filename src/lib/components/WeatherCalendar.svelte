<script lang="ts">
	import { fetchHistoricalWeather } from '$lib/utilities/monthWeatherHistory';
	import { DateTime } from 'luxon';
	import { onMount } from 'svelte';

	interface CalendarEvent {
		id?: string | number;
		start?: string | Date;
		title?: string | { html?: string };
		[key: string]: unknown;
	}

	interface WeatherCalendarProps {
		events?: CalendarEvent[];
		latitude?: number | null;
		longitude?: number | null;
	}

	const { events = [], latitude = null, longitude = null }: WeatherCalendarProps = $props();

	type WeatherEntry = Awaited<ReturnType<typeof fetchHistoricalWeather>>[number]['weather'];

	const now = DateTime.now();
	const monthStart = now.startOf('month');
	const monthEnd = monthStart.endOf('month');
	const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	let weatherData = $state<Record<string, WeatherEntry>>({});
	let loading = $state(false);

	let lastWeatherSignature = $state<string | null>(null);
	let pendingWeatherSignature = $state<string | null>(null);

	const getResolvedLatitude = () =>
		typeof latitude === 'number' && Number.isFinite(latitude) ? latitude : undefined;
	const getResolvedLongitude = () =>
		typeof longitude === 'number' && Number.isFinite(longitude) ? longitude : undefined;

	const toMonthKey = (date: DateTime) => date.toFormat('yyyy-MM');

	async function loadWeatherForMonth(date: DateTime) {
		const monthKey = toMonthKey(date);
		const lat = getResolvedLatitude();
		const lon = getResolvedLongitude();
		const signature = `${monthKey}:${lat ?? 'default'}:${lon ?? 'default'}`;

		if (pendingWeatherSignature === signature) {
			return;
		}
		if (lastWeatherSignature === signature && Object.keys(weatherData).length) {
			return;
		}

		pendingWeatherSignature = signature;
		loading = true;
		try {
			const startDate = date.startOf('month');
			const endDate = DateTime.min(date.endOf('month'), now.endOf('day'));
			const data = await fetchHistoricalWeather(startDate.toJSDate(), endDate.toJSDate(), lat, lon);
			const mapped: Record<string, WeatherEntry> = {};
			for (const entry of data) {
				mapped[entry.date] = entry.weather;
			}
			weatherData = mapped;
			lastWeatherSignature = signature;
		} catch (error) {
			console.error('[WeatherCalendar] Failed to load weather data', error);
			weatherData = {};
			lastWeatherSignature = null;
		} finally {
			if (pendingWeatherSignature === signature) {
				pendingWeatherSignature = null;
			}
			loading = false;
		}
	}

	onMount(() => {
		void loadWeatherForMonth(monthStart);
	});

	$effect(() => {
		const lat = getResolvedLatitude();
		const lon = getResolvedLongitude();
		const signature = `${toMonthKey(monthStart)}:${lat ?? 'default'}:${lon ?? 'default'}`;
		if (signature === lastWeatherSignature || signature === pendingWeatherSignature) {
			return;
		}
		void loadWeatherForMonth(monthStart);
	});

	const eventsByDate = $derived.by(() => {
		const record: Record<string, CalendarEvent[]> = {};

		const toISODate = (value: string | Date | undefined) => {
			if (!value) return null;
			if (value instanceof Date) {
				return DateTime.fromJSDate(value).toISODate();
			}
			const asISO = DateTime.fromISO(value);
			if (asISO.isValid) {
				return asISO.toISODate();
			}
			const parsed = DateTime.fromJSDate(new Date(value));
			return parsed.isValid ? parsed.toISODate() : null;
		};

		for (const event of events) {
			const iso = toISODate(event.start);
			if (!iso) continue;
			(record[iso] ??= []).push(event);
		}

		return record;
	});

	interface CalendarCellDay {
		type: 'day';
		key: string;
		date: DateTime;
		isToday: boolean;
		weather?: WeatherEntry;
		events: CalendarEvent[];
	}

	interface CalendarCellBlank {
		type: 'blank';
		key: string;
	}

	type CalendarCell = CalendarCellDay | CalendarCellBlank;

	const calendarCells = $derived.by(() => {
		const cells: CalendarCell[] = [];
		const startWeekday = monthStart.toJSDate().getDay();

		for (let i = 0; i < startWeekday; i += 1) {
			cells.push({ type: 'blank', key: `leading-${i}` });
		}

		let cursor = monthStart;
		while (cursor <= monthEnd) {
			const iso = cursor.toISODate()!;
			cells.push({
				type: 'day',
				key: iso,
				date: cursor,
				isToday: iso === now.toISODate(),
				weather: weatherData[iso],
				events: eventsByDate[iso] ?? []
			});
			cursor = cursor.plus({ days: 1 });
		}

		while (cells.length % 7 !== 0) {
			cells.push({ type: 'blank', key: `trailing-${cells.length}` });
		}

		return cells;
	});

	const formatTemp = (value: number | null | undefined) =>
		value === null || value === undefined ? '--' : Math.round(value);
	const formatPrecip = (value: number | null | undefined) =>
		value === null || value === undefined ? '0.0' : value.toFixed(1);
	const getAriaLabel = (cell: CalendarCellDay) =>
		`${cell.date.toFormat('MMMM dd')}. Weather: ${cell.weather?.condition.text ?? 'No data available'}`;
	const getEventTitle = (event: CalendarEvent) => {
		const raw =
			typeof event.title === 'string'
				? event.title
				: typeof event.title?.html === 'string'
					? event.title.html
					: 'Event';
		return raw.replace(/<br\s*\/?>/gi, '\n');
	};
	const getDayCellClasses = (cell: CalendarCellDay) =>
		[
			'flex min-h-[140px] flex-col gap-3 rounded-lg border bg-neutral-50 p-2 text-xs shadow-sm transition dark:bg-neutral-800',
			cell.isToday
				? 'border-accent-500 ring-1 ring-accent-500/60 dark:border-accent-300'
				: 'border-neutral-200 dark:border-neutral-700'
		].join(' ');
</script>

<section
	class="w-full space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
>
	<header class="flex items-center justify-between">
		<h2 class="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
			{monthStart.toFormat('MMMM yyyy')}
		</h2>
	</header>

	<div
		class="grid grid-cols-7 gap-2 text-center text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400"
	>
		{#each weekdays as label (label)}
			<div class="py-1" aria-hidden="true">{label}</div>
		{/each}
	</div>

	<div class="grid grid-cols-7 gap-2" aria-live="polite">
		{#if loading}
			<div
				class="col-span-7 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-3 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-400"
			>
				Loading weather data...
			</div>
		{/if}

		{#each calendarCells as cell (cell.key)}
			{#if cell.type === 'blank'}
				<div class="min-h-[140px] rounded-lg bg-transparent" aria-hidden="true"></div>
			{:else}
				{@const day = cell as CalendarCellDay}
				<article class={getDayCellClasses(day)} aria-label={getAriaLabel(day)}>
					<div class="flex items-center justify-between text-neutral-500 dark:text-neutral-300">
						<span class="text-xs font-medium">{weekdays[day.date.weekday % 7]}</span>
						<span class="text-sm font-semibold text-neutral-700 dark:text-neutral-100"
							>{day.date.day}</span
						>
					</div>

					{#if day.weather}
						<div
							class="flex flex-1 flex-col gap-2 rounded-md bg-white p-2 text-neutral-600 shadow-sm dark:bg-neutral-900 dark:text-neutral-200"
						>
							<div
								class="flex items-center justify-between text-sm font-semibold text-neutral-700 dark:text-neutral-100"
							>
								<span>{formatTemp(day.weather.maxtemp_c)}°C</span>
								<span class="text-xs font-normal text-neutral-500 dark:text-neutral-400">
									Low {formatTemp(day.weather.mintemp_c)}°C
								</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-2xl leading-none">{day.weather.condition.icon}</span>
								<div class="flex flex-col text-xs">
									<span>{day.weather.condition.text}</span>
									<span class="text-neutral-500 dark:text-neutral-400">
										{formatPrecip(day.weather.totalprecip_mm)} mm
									</span>
								</div>
							</div>
						</div>
					{:else}
						<div class="flex-1"></div>
					{/if}

					{#if day.events.length}
						<div class="flex flex-col gap-1">
							{#each day.events as event, idx (event.id ?? idx)}
								<div
									class="rounded-md bg-white p-1 text-[11px] font-medium text-neutral-700 shadow-sm dark:bg-neutral-900 dark:text-neutral-200"
								>
									<span class="whitespace-pre-line">{getEventTitle(event)}</span>
								</div>
							{/each}
						</div>
					{/if}
				</article>
			{/if}
		{/each}
	</div>

	<p class="text-center text-xs text-neutral-500 dark:text-neutral-400">
		Weather data by
		<a
			class="text-accent-500 hover:underline"
			href="https://open-meteo.com/"
			target="_blank"
			rel="noopener noreferrer"
		>
			Open-Meteo
		</a>
	</p>
</section>
