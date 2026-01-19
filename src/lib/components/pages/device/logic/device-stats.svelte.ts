export type StatsSummary = {
	high: number;
	low: number;
	avg: number;
	stdDeviation: number;
};

export type MetricPalette = {
	accent: string;
	bar: string;
	knob: string;
	badge: string;
};

export type MetricCard = {
	key: string;
	label: string;
	unit: string;
	current: number;
	delta: number;
	min: number;
	max: number;
	avg: number;
	median: number;
	stdDeviation: number;
	range: number;
	count: number;
	palette: MetricPalette;
};

export type MetricCardScaled = MetricCard & {
	scaleMin: number;
	scaleMax: number;
	positions: {
		min: number;
		avg: number;
		max: number;
		current: number;
	};
};

export const summarize = (values: number[]): StatsSummary => {
	if (!values.length) return { high: 0, low: 0, avg: 0, stdDeviation: 0 };
	const high = Math.max(...values);
	const low = Math.min(...values);
	const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
	const variance =
		values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length;
	const stdDeviation = Math.sqrt(variance);

	return { high, low, avg, stdDeviation };
};

export const median = (values: number[]) => {
	if (!values.length) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

export const toPercent = (value: number, min: number, max: number) => {
	if (max - min === 0) return 50;
	return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
};

export const buildMetricCards = (cards: MetricCard[]): MetricCardScaled[] =>
	cards.map((card) => {
		const padding = Math.max(0.5, card.range * 0.15 || 0.5);
		const scaleMin = card.min - padding;
		const scaleMax = card.max + padding;

		return {
			...card,
			scaleMin,
			scaleMax,
			positions: {
				min: toPercent(card.min, scaleMin, scaleMax),
				avg: toPercent(card.avg, scaleMin, scaleMax),
				max: toPercent(card.max, scaleMin, scaleMax),
				current: toPercent(card.current, scaleMin, scaleMax)
			}
		};
	});

export const buildAirBaseMetricCards = (params: {
	currentTemperature: number;
	currentHumidity: number;
	currentCo2: number;
	temperatureDelta: number;
	humidityDelta: number;
	co2Delta: number;
	temperatureStats: StatsSummary;
	humidityStats: StatsSummary;
	co2Stats: StatsSummary;
	temperatureMedian: number;
	humidityMedian: number;
	co2Median: number;
	readingCount: number;
}): MetricCard[] => [
	{
		key: 'temperature',
		label: 'Temperature',
		unit: '°C',
		current: params.currentTemperature,
		delta: params.temperatureDelta,
		min: params.temperatureStats.low,
		max: params.temperatureStats.high,
		avg: params.temperatureStats.avg,
		median: params.temperatureMedian,
		stdDeviation: params.temperatureStats.stdDeviation,
		range: params.temperatureStats.high - params.temperatureStats.low,
		count: params.readingCount,
		palette: {
			accent: 'text-amber-400',
			bar: 'bg-amber-400/70',
			knob: 'bg-amber-400',
			badge: 'text-amber-300'
		}
	},
	{
		key: 'humidity',
		label: 'Humidity',
		unit: '%',
		current: params.currentHumidity,
		delta: params.humidityDelta,
		min: params.humidityStats.low,
		max: params.humidityStats.high,
		avg: params.humidityStats.avg,
		median: params.humidityMedian,
		stdDeviation: params.humidityStats.stdDeviation,
		range: params.humidityStats.high - params.humidityStats.low,
		count: params.readingCount,
		palette: {
			accent: 'text-sky-400',
			bar: 'bg-sky-400/70',
			knob: 'bg-sky-400',
			badge: 'text-sky-300'
		}
	},
	{
		key: 'co2',
		label: 'CO₂',
		unit: 'ppm',
		current: params.currentCo2,
		delta: params.co2Delta,
		min: params.co2Stats.low,
		max: params.co2Stats.high,
		avg: params.co2Stats.avg,
		median: params.co2Median,
		stdDeviation: params.co2Stats.stdDeviation,
		range: params.co2Stats.high - params.co2Stats.low,
		count: params.readingCount,
		palette: {
			accent: 'text-emerald-300',
			bar: 'bg-emerald-400/70',
			knob: 'bg-emerald-400',
			badge: 'text-emerald-200'
		}
	}
];

export const buildSoilBaseMetricCards = (params: {
	currentTemperature: number;
	currentMoisture: number;
	currentEc: number;
	temperatureDelta: number;
	moistureDelta: number;
	ecDelta: number;
	temperatureStats: StatsSummary;
	moistureStats: StatsSummary;
	ecStats: StatsSummary;
	temperatureMedian: number;
	moistureMedian: number;
	ecMedian: number;
	readingCount: number;
}): MetricCard[] => [
	{
		key: 'soil-temperature',
		label: 'Soil Temperature',
		unit: '°C',
		current: params.currentTemperature,
		delta: params.temperatureDelta,
		min: params.temperatureStats.low,
		max: params.temperatureStats.high,
		avg: params.temperatureStats.avg,
		median: params.temperatureMedian,
		stdDeviation: params.temperatureStats.stdDeviation,
		range: params.temperatureStats.high - params.temperatureStats.low,
		count: params.readingCount,
		palette: {
			accent: 'text-amber-300',
			bar: 'bg-amber-400/70',
			knob: 'bg-amber-400',
			badge: 'text-amber-200'
		}
	},
	{
		key: 'soil-moisture',
		label: 'Soil Moisture',
		unit: '%',
		current: params.currentMoisture,
		delta: params.moistureDelta,
		min: params.moistureStats.low,
		max: params.moistureStats.high,
		avg: params.moistureStats.avg,
		median: params.moistureMedian,
		stdDeviation: params.moistureStats.stdDeviation,
		range: params.moistureStats.high - params.moistureStats.low,
		count: params.readingCount,
		palette: {
			accent: 'text-teal-300',
			bar: 'bg-teal-400/70',
			knob: 'bg-teal-400',
			badge: 'text-teal-200'
		}
	},
	{
		key: 'soil-ec',
		label: 'Soil EC',
		unit: 'mS/cm',
		current: params.currentEc,
		delta: params.ecDelta,
		min: params.ecStats.low,
		max: params.ecStats.high,
		avg: params.ecStats.avg,
		median: params.ecMedian,
		stdDeviation: params.ecStats.stdDeviation,
		range: params.ecStats.high - params.ecStats.low,
		count: params.readingCount,
		palette: {
			accent: 'text-lime-300',
			bar: 'bg-lime-400/70',
			knob: 'bg-lime-400',
			badge: 'text-lime-200'
		}
	}
];

export const getAlertCount = (history: { alert: boolean }[]) =>
	history.filter((entry) => entry.alert).length;
