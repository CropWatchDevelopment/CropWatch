import type { ColumnConfig } from '$lib/components/cw-table/types';
import type { TelemetryEntry } from '$lib/components/pages/device/logic/device-core.svelte';
import {
	buildAirBaseMetricCards,
	buildMetricCards,
	buildSoilBaseMetricCards,
	getAlertCount,
	median,
	summarize,
	type MetricCardScaled
} from '$lib/components/pages/device/logic/device-stats.svelte';
import {
	buildAirHumidityChartData,
	buildAirTemperatureChartData,
	buildLineChartThresholds,
	buildSoilEcChartData,
	buildSoilMoistureChartData,
	buildSoilTemperatureChartData
} from '$lib/components/pages/device/logic/device-line-chart.svelte';
import {
	buildAirHeatmapSeries,
	buildHeatmapRange,
	buildSoilHeatmapSeries,
	selectHeatmapSeries
} from '$lib/components/pages/device/logic/device-heatmap.svelte';

export type DeviceTelemetryViewModel = {
	latestTimestamp: string;
	metricCards: MetricCardScaled[];
	alertCount: number;
	airTemperatureChartData: ReturnType<typeof buildAirTemperatureChartData>;
	airHumidityChartData: ReturnType<typeof buildAirHumidityChartData>;
	soilTemperatureChartData: ReturnType<typeof buildSoilTemperatureChartData>;
	soilMoistureChartData: ReturnType<typeof buildSoilMoistureChartData>;
	soilEcChartData: ReturnType<typeof buildSoilEcChartData>;
	airTemperatureThreshold: number;
	soilTemperatureThreshold: number;
	soilMoistureThreshold: number;
	soilEcThreshold: number;
	heatmapRange: string;
	activeHeatmapSeries:
		| ReturnType<typeof buildAirHeatmapSeries>
		| ReturnType<typeof buildSoilHeatmapSeries>;
	historyTableColumns: ColumnConfig[];
	historyTableItems: Array<Record<string, unknown>>;
};

const airHistoryTableColumns: ColumnConfig[] = [
	{
		key: 'timestamp',
		label: 'Timestamp (UTC)',
		type: 'datetime',
		sortable: true
	},
	{
		key: 'temperature',
		label: 'Temperature',
		type: 'number',
		suffix: '°C',
		sortable: true
	},
	{
		key: 'co2',
		label: 'CO₂',
		type: 'text',
		sortable: true
	},
	{
		key: 'humidity',
		label: 'Humidity',
		type: 'number',
		suffix: '%',
		sortable: true
	},
	{
		key: 'alert',
		label: 'Status',
		type: 'badge',
		sortable: true,
		badges: {
			true: {
				label: 'Alert',
				dotClass: 'bg-amber-400',
				badgeClass: 'bg-amber-400/20 text-amber-100'
			},
			false: {
				label: 'Normal',
				dotClass: 'bg-emerald-400',
				badgeClass: 'bg-emerald-500/10 text-emerald-200'
			}
		}
	}
];

const soilHistoryTableColumns: ColumnConfig[] = [
	{
		key: 'timestamp',
		label: 'Timestamp (UTC)',
		type: 'datetime',
		sortable: true
	},
	{
		key: 'temperature',
		label: 'Soil Temperature',
		type: 'number',
		suffix: '°C',
		sortable: true
	},
	{
		key: 'moisture',
		label: 'Soil Moisture',
		type: 'number',
		suffix: '%',
		sortable: true
	},
	{
		key: 'ec',
		label: 'Soil EC',
		type: 'number',
		suffix: 'mS/cm',
		sortable: true
	}
];

const sortByNewest = (entries: TelemetryEntry[]) =>
	[...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

export const buildDeviceTelemetryViewModel = (
	history: TelemetryEntry[],
	isSoilDevice: boolean
): DeviceTelemetryViewModel => {
	const latest = history[0];
	const latestAir = {
		temperature: latest?.temperature ?? 0,
		humidity: latest?.humidity ?? 0,
		co2: latest?.co2 ?? null,
		timestamp: latest?.timestamp ?? new Date().toISOString()
	};
	const latestSoil = {
		temperature: latest?.temperature ?? 0,
		moisture: latest?.moisture ?? 0,
		ec: latest?.ec ?? 0,
		timestamp: latest?.timestamp ?? new Date().toISOString()
	};

	const latestTimestamp = isSoilDevice ? latestSoil.timestamp : latestAir.timestamp;
	const chronologicalHistory = [...history].reverse();
	const sortedHistory = sortByNewest(history);
	const previous = history[1];

	const temperatureValues = history.map((entry) => entry.temperature);
	const humidityValues = history.map((entry) => entry.humidity ?? 0);
	const co2Values = history.map((entry) => entry.co2 ?? 0);
	const moistureValues = history.map((entry) => entry.moisture ?? 0);
	const ecValues = history.map((entry) => entry.ec ?? 0);

	const temperatureStats = summarize(temperatureValues);
	const humidityStats = summarize(humidityValues);
	const co2Stats = summarize(co2Values);
	const moistureStats = summarize(moistureValues);
	const ecStats = summarize(ecValues);

	const readingCount = history.length;

	const airBaseMetricCards = buildAirBaseMetricCards({
		currentTemperature: latestAir.temperature,
		currentHumidity: latestAir.humidity,
		currentCo2: latestAir.co2 ?? 0,
		temperatureDelta: previous ? latestAir.temperature - previous.temperature : 0,
		humidityDelta: previous ? latestAir.humidity - (previous.humidity ?? 0) : 0,
		co2Delta: previous ? (history[0]?.co2 ?? 0) - (history[1]?.co2 ?? 0) : 0,
		temperatureStats,
		humidityStats,
		co2Stats,
		temperatureMedian: median(temperatureValues),
		humidityMedian: median(humidityValues),
		co2Median: median(co2Values),
		readingCount
	});

	const hasCo2Sensor = !(co2Values.length > 0 && co2Values.every((value) => value === 0));

	const soilBaseMetricCards = buildSoilBaseMetricCards({
		currentTemperature: latestSoil.temperature,
		currentMoisture: latestSoil.moisture,
		currentEc: latestSoil.ec,
		temperatureDelta: previous ? latestSoil.temperature - previous.temperature : 0,
		moistureDelta: previous ? latestSoil.moisture - (previous.moisture ?? 0) : 0,
		ecDelta: previous ? latestSoil.ec - (previous.ec ?? 0) : 0,
		temperatureStats,
		moistureStats,
		ecStats,
		temperatureMedian: median(temperatureValues),
		moistureMedian: median(moistureValues),
		ecMedian: median(ecValues),
		readingCount
	});

	const metricCards = buildMetricCards(
		isSoilDevice
			? soilBaseMetricCards
			: hasCo2Sensor
				? airBaseMetricCards
				: airBaseMetricCards.filter((card) => card.key !== 'co2')
	);
	const alertCount = getAlertCount(history);

	const airTemperatureChartData = buildAirTemperatureChartData(chronologicalHistory);
	const airHumidityChartData = buildAirHumidityChartData(chronologicalHistory);
	const soilTemperatureChartData = buildSoilTemperatureChartData(chronologicalHistory);
	const soilMoistureChartData = buildSoilMoistureChartData(chronologicalHistory);
	const soilEcChartData = buildSoilEcChartData(chronologicalHistory);

	const thresholds = buildLineChartThresholds({
		temperatureStats,
		moistureStats,
		ecStats
	});

	const airHeatmapSeries = buildAirHeatmapSeries(chronologicalHistory);
	const soilHeatmapSeries = buildSoilHeatmapSeries(chronologicalHistory);
	const activeHeatmapSeries = selectHeatmapSeries({
		isSoilDevice,
		airHeatmapSeries,
		soilHeatmapSeries
	});

	const historyTableColumns = isSoilDevice ? soilHistoryTableColumns : airHistoryTableColumns;
	const historyTableItems = isSoilDevice
		? sortedHistory.map((entry) => ({
				timestamp: entry.timestamp,
				temperature: entry.temperature,
				moisture: entry.moisture ?? 0,
				ec: entry.ec ?? 0
			}))
		: sortedHistory.map((entry) => ({
				...entry,
				co2: entry.co2 != null ? entry.co2 : '—',
				alert: String(entry.alert)
			}));

	return {
		latestTimestamp,
		metricCards,
		alertCount,
		airTemperatureChartData,
		airHumidityChartData,
		soilTemperatureChartData,
		soilMoistureChartData,
		soilEcChartData,
		airTemperatureThreshold: thresholds.airTemperatureThreshold,
		soilTemperatureThreshold: thresholds.soilTemperatureThreshold,
		soilMoistureThreshold: thresholds.soilMoistureThreshold,
		soilEcThreshold: thresholds.soilEcThreshold,
		heatmapRange: buildHeatmapRange(history),
		activeHeatmapSeries,
		historyTableColumns,
		historyTableItems
	};
};
