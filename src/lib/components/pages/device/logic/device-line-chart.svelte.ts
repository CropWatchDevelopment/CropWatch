import type { StatsSummary } from './device-stats.svelte';

export const buildAirTemperatureChartData = (
	history: { timestamp: string; temperature: number; alert: boolean }[]
) =>
	history.map((entry) => ({
		timestamp: entry.timestamp,
		value: entry.temperature,
		alert: entry.alert
			? { id: entry.timestamp, message: 'Temperature alert', severity: 'warning' as const }
			: undefined
	}));

export const buildAirHumidityChartData = (
	history: { timestamp: string; humidity?: number | null }[]
) =>
	history.map((entry) => ({
		timestamp: entry.timestamp,
		value: entry.humidity ?? 0
	}));

export const buildSoilTemperatureChartData = (
	history: { timestamp: string; temperature: number }[]
) =>
	history.map((entry) => ({
		timestamp: entry.timestamp,
		value: entry.temperature
	}));

export const buildSoilMoistureChartData = (
	history: { timestamp: string; moisture?: number | null }[]
) =>
	history.map((entry) => ({
		timestamp: entry.timestamp,
		value: entry.moisture ?? 0
	}));

export const buildSoilEcChartData = (history: { timestamp: string; ec?: number | null }[]) =>
	history.map((entry) => ({
		timestamp: entry.timestamp,
		value: entry.ec ?? 0
	}));

export const buildLineChartThresholds = (params: {
	temperatureStats: StatsSummary;
	moistureStats: StatsSummary;
	ecStats: StatsSummary;
}) => ({
	airTemperatureThreshold: params.temperatureStats.avg + params.temperatureStats.stdDeviation,
	soilTemperatureThreshold: params.temperatureStats.avg + params.temperatureStats.stdDeviation,
	soilMoistureThreshold: params.moistureStats.avg + params.moistureStats.stdDeviation,
	soilEcThreshold: params.ecStats.avg + params.ecStats.stdDeviation
});
