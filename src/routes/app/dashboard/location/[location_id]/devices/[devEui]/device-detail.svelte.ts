import { browser } from '$app/environment';
import type { DeviceWithType } from '$lib/models/Device';
import type { DeviceDataRecord, DeviceStats } from '$lib/models/DeviceDataRecord';
import { calculateAverage, formatDateForDisplay, hasValue } from '$lib/utilities/helpers';
import { getNumericKeys, getTextColorByKey } from '$lib/utilities/stats';
import { _ } from 'svelte-i18n';
import { get } from 'svelte/store';

export interface DeviceDetailProps {
	user: any;
	device: DeviceWithType;
	dataType: string;
	latestData: any;
	historicalData: DeviceDataRecord[];
}

export function setupDeviceDetail() {
	// Stats for the data
	const stats: DeviceStats = $state({});

	// Chart data
	type ChartData = Record<string, number[] | string[]>;
	let chartData: ChartData = $state({ labels: [] });

	// States for the component
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Date range selection
	let startDate = $state(new Date()); // Should be Date object
	let endDate = $state(new Date()); // Should be Date object

	// Libraries and elements
	let ApexCharts = $state<any>(undefined);

	// Chart instances
	const mainChartInstances: Record<string, any> = {};
	const brushChartInstances: Record<string, any> = {};

	// Function to process historical data and calculate stats
	function processHistoricalData(historicalData: any[]) {
		if (!historicalData || historicalData.length === 0) return;

		// Placeholder for the chart data: Don’t update the `chartData` state directly in the loops below
		// because the UI will be unresponsive due to repeated reactivity updates by Svelte.
		const _chartData: ChartData = { labels: [] };

		// Extract timestamps for chart labels (most recent to oldest)
		_chartData.labels = historicalData
			.map((data) => formatDateForDisplay(data.created_at))
			.reverse();

		// Determine numeric keys dynamically (excluding dev_eui, created_at)
		const numericKeys = getNumericKeys(historicalData);

		// Reset chartData and stats for all numeric keys
		numericKeys.forEach((key) => {
			_chartData[key] = [];
			stats[key] = {
				min: 0,
				max: 0,
				avg: 0,
				median: 0,
				stdDev: 0,
				count: 0,
				lastReading: 0,
				trend: null
			};
		});

		// Prepare value arrays for stats
		const valueArrays: Record<string, number[]> = {};
		numericKeys.forEach((key) => {
			valueArrays[key] = [];
		});

		// Fill chartData and value arrays
		historicalData.forEach((data) => {
			numericKeys.forEach((key) => {
				if (typeof data[key] === 'number' && data[key] !== null) {
					(_chartData[key] as number[]).unshift(data[key]);
					valueArrays[key].push(data[key]);
				}
			});
		});

		// Calculate stats for each key
		numericKeys.forEach((key) => {
			const values = valueArrays[key];
			if (values.length > 0) {
				// Basic stats
				stats[key].min = Math.min(...values);
				stats[key].max = Math.max(...values);
				stats[key].avg = calculateAverage(values);
				stats[key].count = values.length;

				// Last reading
				stats[key].lastReading = values[values.length - 1];

				// Median calculation
				const sortedValues = [...values].sort((a, b) => a - b);
				const mid = Math.floor(sortedValues.length / 2);
				stats[key].median =
					sortedValues.length % 2 === 0
						? (sortedValues[mid - 1] + sortedValues[mid]) / 2
						: sortedValues[mid];

				// Standard deviation
				const mean = stats[key].avg;
				const squaredDiffs = values.map((value) => Math.pow(value - mean, 2));
				const avgSquaredDiff = calculateAverage(squaredDiffs);
				stats[key].stdDev = Math.sqrt(avgSquaredDiff);

				// Trend (last 5 values if available)
				if (values.length >= 3) {
					const recentValues = values.slice(-5);
					const firstVal = recentValues[0];
					const lastVal = recentValues[recentValues.length - 1];
					const difference = lastVal - firstVal;
					const threshold = stats[key].stdDev * 0.1; // 10% of standard deviation as threshold

					if (Math.abs(difference) < threshold) {
						stats[key].trend = 'stable';
					} else if (difference > 0) {
						stats[key].trend = 'up';
					} else {
						stats[key].trend = 'down';
					}
				} else {
					stats[key].trend = null;
				}
			}
		});

		chartData = _chartData;
		loading = false;
	}

	// Function to fetch data for a specific date range
	async function fetchDataForDateRange(device: DeviceWithType, start: Date, end: Date) {
		// Parameters 'start' and 'end' are Date objects.
		// The component's state variables 'startDate' and 'endDate' (if you were accessing them via this context, which you are not directly here) are also Date objects.
		// This function uses the 'start' and 'end' parameters passed to it.

		if (!start || !end) {
			// Validation using parameters
			error = 'Please select both start and end dates'; // Set component's error state
			return [];
		}

		if (start > end) {
			// Validation using parameters
			error = 'Start date must be before end date'; // Set component's error state
			return [];
		}

		loading = true;
		error = null; // Clear previous errors

		try {
			// Format Date objects to ISO strings for robust API querying
			const startQueryParam = start.toISOString(); // Use parameter
			const endQueryParam = end.toISOString(); // Use parameter

			const response = await fetch(
				`/api/devices/${device.dev_eui}/data?start=${startQueryParam}&end=${endQueryParam}`
			);

			if (!response.ok) {
				const errorText = await response.text();
				console.error('Failed to fetch data:', response.status, errorText);
				throw new Error(`Failed to fetch data. Server responded with ${response.status}.`);
			}

			const newHistoricalData = await response.json();
			if (!Array.isArray(newHistoricalData)) {
				console.error('API did not return an array for historical data:', newHistoricalData);
				throw new Error('Invalid data format received from server.');
			}
			processHistoricalData(newHistoricalData); // Process the newly fetched data
			return newHistoricalData;
		} catch (err) {
			console.error('Error in fetchDataForDateRange:', err);
			error = err instanceof Error ? err.message : 'Unknown error occurred while fetching data.';
			return []; // Return empty array on error
		} finally {
			loading = false;
		}
	}

	/**
	 * Renders a generic ApexCharts line chart with a brush (range selector) below. This function is
	 * fully generic: it will plot all numeric keys in the data (except for ignored keys).
	 * @param params
	 * @param params.historicalData Array of objects (rows) with at least a 'created_at' timestamp and
	 * numeric fields
	 * @param params.chart1Element HTMLElement to render the main chart into
	 * @param params.chart1BrushElement HTMLElement to render the brush chart into
	 * @param params.key Optional key to render a specific chart (if not provided, all numeric keys
	 * will be rendered)
	 * @param params.ignoredDataKeys Array of keys to ignore (default: ['id', 'dev_eui',
	 * 'created_at'])
	 */
	async function renderVisualization({
		historicalData,
		chart1Element,
		chart1BrushElement,
		key = '_all',
		ignoredDataKeys = ['id', 'dev_eui', 'created_at']
	}: {
		historicalData: DeviceDataRecord[];
		chart1Element?: HTMLElement;
		chart1BrushElement?: HTMLElement;
		key?: string;
		ignoredDataKeys?: string[];
	}) {
		if (!browser || !historicalData || historicalData.length === 0) return;
		await new Promise((resolve) => setTimeout(resolve, 50));
		if (!chart1Element || !chart1BrushElement) return;

		// Destroy previous chart instances if they exist
		if (mainChartInstances[key]) {
			try {
				mainChartInstances[key].destroy();
			} catch {}
			mainChartInstances[key] = null;
		}
		if (brushChartInstances[key]) {
			try {
				brushChartInstances[key].destroy();
			} catch {}
			brushChartInstances[key] = null;
		}

		if (!ApexCharts) {
			ApexCharts = await import('apexcharts').then((m) => m.default);
		}

		// Find all numeric keys in the data (excluding ignored keys)
		const numericKeys = getNumericKeys(historicalData, ignoredDataKeys);
		if (numericKeys.length === 0) return;

		let keys = [...numericKeys];

		if (key !== '_all') {
			// Filter numeric keys based on the provided key
			if (numericKeys.includes(key)) {
				keys = [key];
			} else {
				return;
			}
		}

		// Build series for each numeric key
		const series = keys.map((key) => ({
			name: get(_)(key),
			data: historicalData
				.filter((row) => typeof row[key] === 'number' && row[key] !== null && row['created_at'])
				.map((row) => ({ x: new Date(row['created_at']).getTime(), y: row[key] }))
		}));
		series.forEach((s) => s.data.sort((a, b) => a.x - b.x));

		const colorMap = Object.fromEntries(keys.map((key) => [key, getTextColorByKey(key)]));
		const colors = Object.values(colorMap);

		// Y-axis config for each series
		const yaxis = keys.map((key, idx) => ({
			seriesName: key,
			opposite: idx % 2 === 1,
			title:
				key === '_all'
					? { text: get(_)(key), style: { fontSize: '16px', color: colorMap[key] } }
					: {},
			labels: { style: { colors: colorMap[key] } }
		}));

		// X-axis range
		const allDates = historicalData
			.map((row) => new Date(row['created_at']).getTime())
			.filter(Boolean);
		const minDate = Math.min(...allDates);
		const maxDate = Math.max(...allDates);

		// Main chart options
		const mainChartOptions = {
			series,
			chart: {
				id: `chart-${key}-main`,
				type: 'line',
				height: 200,
				toolbar: { autoSelected: 'pan', show: false },
				animations: { enabled: false },
				zoom: { enabled: false }
			},
			colors,
			stroke: { curve: 'smooth', width: keys.map(() => 1) },
			dataLabels: { enabled: false },
			markers: { size: 1, strokeWidth: 0, hover: { size: 4 } },
			xaxis: { type: 'datetime', labels: { datetimeUTC: false } },
			yaxis,
			tooltip: {
				theme: 'dark',
				shared: true,
				x: { format: 'MMM dd HH:mm' },
				style: { fontSize: '13px', 'font-family': 'Inter, sans-serif' },
				marker: { show: true },
				y: { formatter: (val: number) => (val?.toFixed ? val.toFixed(1) : val) }
			},
			legend: { position: 'top', horizontalAlign: 'center' },
			grid: {
				borderColor: '#2a2a2a',
				row: { colors: ['transparent', 'transparent'], opacity: 0.1 }
			}
		};

		// Brush chart options
		const brushChartOptions = {
			series,
			chart: {
				id: `chart-${key}-brush`,
				height: 100,
				type: 'area',
				brush: { target: `chart-${key}-main`, enabled: true },
				selection: { enabled: true, xaxis: { min: minDate, max: maxDate } }
			},
			colors,
			fill: { type: 'gradient', gradient: { opacityFrom: 0.7, opacityTo: 0.3 } },
			stroke: { width: keys.map(() => 1) },
			xaxis: { type: 'datetime', tooltip: { enabled: false }, labels: { datetimeUTC: false } },
			yaxis: { show: false, tickAmount: 2 },
			grid: { borderColor: '#2a2a2a', strokeDashArray: 2, yaxis: { lines: { show: false } } },
			legend: { show: false }
		};

		// Render charts
		mainChartInstances[key] = new ApexCharts(chart1Element, mainChartOptions);
		brushChartInstances[key] = new ApexCharts(chart1BrushElement, brushChartOptions);
		try {
			await mainChartInstances[key].render();
			await brushChartInstances[key].render();
		} catch (err) {
			if (mainChartInstances[key]) {
				try {
					mainChartInstances[key].destroy();
				} catch {}
				mainChartInstances[key] = null;
			}
			if (brushChartInstances[key]) {
				try {
					brushChartInstances[key].destroy();
				} catch {}
				brushChartInstances[key] = null;
			}
		}
	}

	// Initialize dates function
	function initializeDateRange() {
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(today.getDate() - 1);

		startDate = yesterday; // Assign Date object directly
		endDate = today; // Assign Date object directly
	}

	return {
		// State
		stats,
		get chartData() {
			return chartData;
		},
		get loading() {
			return loading;
		},
		set loading(v: boolean) {
			loading = v;
		},
		get error() {
			return error;
		},
		set error(v: string | null) {
			error = v;
		},
		get startDate() {
			return startDate;
		},
		set startDate(v: Date) {
			startDate = v;
		},
		get endDate() {
			return endDate;
		},
		set endDate(v: Date) {
			endDate = v;
		},

		// Element refs
		// Functions
		formatDateForDisplay,
		hasValue,
		processHistoricalData,
		fetchDataForDateRange,
		renderVisualization,
		initializeDateRange // Exporting the function
	};
}

// Derived properties calculations
export function getDeviceDetailDerived(device: DeviceWithType, dataType: string, latestData: any) {
	// Determine device type name
	const deviceTypeName = device?.cw_device_type?.name || 'Unknown Type';

	// Reactive declarations for the charts
	const temperatureChartVisible = dataType === 'cw_air_data' || dataType === 'cw_soil_data';
	const humidityChartVisible = dataType === 'cw_air_data';
	const moistureChartVisible = dataType === 'cw_soil_data';
	const co2ChartVisible = dataType === 'cw_air_data' && hasValue(latestData, 'co2');
	const phChartVisible = dataType === 'cw_soil_data' && hasValue(latestData, 'ph');

	// Helper function to determine if a property exists and has a value
	function hasValue(obj: any, prop: string): boolean {
		return obj && prop in obj && obj[prop] !== null;
	}

	return {
		deviceTypeName,
		temperatureChartVisible,
		humidityChartVisible,
		moistureChartVisible,
		co2ChartVisible,
		phChartVisible
	};
}
