export const buildHeatmapRange = (history: { timestamp: string }[]) => {
	if (!history.length) return 'No history';
	const newest = history[0]?.timestamp;
	const oldest = history[history.length - 1]?.timestamp;
	if (!newest || !oldest) return 'History range';
	const fmt = new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: 'short'
	});
	const oldestDate = new Date(oldest);
	const newestDate = new Date(newest);
	if (Number.isNaN(oldestDate.getTime()) || Number.isNaN(newestDate.getTime())) {
		return 'History range';
	}
	return `${fmt.format(oldestDate)} → ${fmt.format(newestDate)}`;
};

const airHeatmapPalette = {
	temperature: ['bg-sky-900', 'bg-sky-800', 'bg-sky-700', 'bg-sky-600', 'bg-rose-500'],
	humidity: ['bg-slate-800', 'bg-teal-700', 'bg-teal-500', 'bg-teal-400', 'bg-cyan-300'],
	co2: ['bg-slate-800', 'bg-lime-800', 'bg-lime-600', 'bg-amber-500', 'bg-red-500']
};

const soilHeatmapPalette = {
	temperature: ['bg-slate-900', 'bg-amber-900', 'bg-amber-700', 'bg-amber-500', 'bg-rose-500'],
	moisture: ['bg-slate-900', 'bg-emerald-900', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-300'],
	ec: ['bg-slate-900', 'bg-lime-900', 'bg-lime-700', 'bg-lime-500', 'bg-lime-300']
};

const formatter = new Intl.DateTimeFormat('en', {
	hour: 'numeric',
	minute: '2-digit',
	timeZone: 'UTC'
});

const formatHour = (timestamp: string) => {
	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) return '—';
	return formatter.format(date);
};

export const buildAirHeatmapSeries = (
	history: { timestamp: string; temperature: number; humidity?: number; co2?: number | null; alert: boolean }[]
) => ({
	temperature: {
		key: 'temperature',
		label: 'Temp',
		unit: '°C',
		palette: airHeatmapPalette.temperature,
		points: history.map((entry) => ({
			label: formatHour(entry.timestamp),
			value: entry.temperature,
			alert: entry.alert
		}))
	},
	humidity: {
		key: 'humidity',
		label: 'Humidity',
		unit: '%',
		palette: airHeatmapPalette.humidity,
		points: history.map((entry) => ({
			label: formatHour(entry.timestamp),
			value: entry.humidity ?? 0,
			alert: entry.alert
		}))
	},
	co2: {
		key: 'co2',
		label: 'CO₂',
		unit: 'ppm',
		palette: airHeatmapPalette.co2,
		points: history.map((entry) => ({
			label: formatHour(entry.timestamp),
			value: entry.co2 ?? 0,
			alert: entry.alert
		}))
	}
});

export const buildSoilHeatmapSeries = (
	history: { timestamp: string; temperature: number; moisture?: number; ec?: number | null; alert: boolean }[]
) => ({
	temperature: {
		key: 'temperature',
		label: 'Soil Temp',
		unit: '°C',
		palette: soilHeatmapPalette.temperature,
		points: history.map((entry) => ({
			label: formatHour(entry.timestamp),
			value: entry.temperature,
			alert: entry.alert
		}))
	},
	moisture: {
		key: 'moisture',
		label: 'Moisture',
		unit: '%',
		palette: soilHeatmapPalette.moisture,
		points: history.map((entry) => ({
			label: formatHour(entry.timestamp),
			value: entry.moisture ?? 0,
			alert: entry.alert
		}))
	},
	ec: {
		key: 'ec',
		label: 'EC',
		unit: 'mS/cm',
		palette: soilHeatmapPalette.ec,
		points: history.map((entry) => ({
			label: formatHour(entry.timestamp),
			value: entry.ec ?? 0,
			alert: entry.alert
		}))
	}
});

export const selectHeatmapSeries = (params: {
	isSoilDevice: boolean;
	airHeatmapSeries: ReturnType<typeof buildAirHeatmapSeries>;
	soilHeatmapSeries: ReturnType<typeof buildSoilHeatmapSeries>;
}) => (params.isSoilDevice ? params.soilHeatmapSeries : params.airHeatmapSeries);
