import { browser } from '$app/environment';
import type { DeviceWithType } from '$lib/models/Device';
import {
	calculateAverage,
	formatDateForDisplay,
	formatDateForInput,
	hasValue
} from '$lib/utilities/helpers';

export interface DeviceDetailProps {
	user: any;
	device: DeviceWithType;
	dataType: string;
	latestData: any;
	historicalData: any[];
}

export function setupDeviceDetail() {
	// Stats for the data
	const stats: Record<string, { min: number; max: number; avg: number }> = $state({});

	// Chart data
	type ChartData = Record<string, number[] | string[]>;
	const chartData: ChartData = $state({ labels: [] });

	// States for the component
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Date range selection
	let startDate = $state('');
	let endDate = $state('');

	// Libraries and elements
	let ApexCharts = $state<any>(undefined);
	let ApexGrid = $state<any>(undefined);

	// ApexGrid instance
	let grid = $state<any>(undefined);

	// Chart instances
	let mainChartInstance: any = null;
	let brushChartInstance: any = null;

	// Function to process historical data and calculate stats
	function processHistoricalData(historicalData: any[]) {
		if (!historicalData || historicalData.length === 0) return;

		// Extract timestamps for chart labels (most recent to oldest)
		chartData.labels = historicalData
			.map((data) => formatDateForDisplay(data.created_at))
			.reverse();

			// Determine numeric keys dynamically (excluding dev_eui, created_at)
		const excludeKeys = ['dev_eui', 'created_at'];
		const numericKeys = Object.keys(historicalData[0] || {})
			.filter(
				(key) =>
					!excludeKeys.includes(key) &&
					typeof historicalData[0][key] === 'number'
			);

		// Reset chartData and stats for all numeric keys
		numericKeys.forEach((key) => {
			chartData[key] = [];
			stats[key] = { min: 0, max: 0, avg: 0 };
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
					(chartData[key] as number[]).unshift(data[key]);
					valueArrays[key].push(data[key]);
				}
			});
		});

		// Calculate stats for each key
		numericKeys.forEach((key) => {
			const values = valueArrays[key];
			if (values.length > 0) {
				stats[key].min = Math.min(...values);
				stats[key].max = Math.max(...values);
				stats[key].avg = calculateAverage(values);
			}
		});
		loading = false;
	}

	// Function to fetch data for a specific date range
	async function fetchDataForDateRange(device: DeviceWithType, start: Date, end: Date) {
		if (!startDate || !endDate) {
			error = 'Please select both start and end dates';
			return;
		}

		if (start > end) {
			error = 'Start date must be before end date';
			return;
		}

		loading = true;
		error = null;

		try {
			const response = await fetch(
				`/api/devices/${device.dev_eui}/data?start=${start}&end=${end}`
			);

			if (!response.ok) {
				throw new Error('Failed to fetch data');
			}

			const newHistoricalData = await response.json();
			processHistoricalData(newHistoricalData);
			return newHistoricalData;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error occurred';
			return [];
		} finally {
			loading = false;
		}
	}

	// Function to setup and render the charts and grid
	async function renderVisualization(historicalData: any[], dataType: string, latestData: any) {
		if (!browser || !historicalData || historicalData.length === 0) return;

		 // Add a small delay to ensure DOM is fully ready
		await new Promise(resolve => setTimeout(resolve, 50));

		// Access the DOM elements through the elements available in the main component
		const chart1Element = document.querySelector('.main-chart');
		const chart1BrushElement = document.querySelector('.brush-chart');
		const dataGridElement = document.querySelector('.data-grid');

		if (!chart1Element || !chart1BrushElement || !dataGridElement) {
			console.error('Chart DOM elements not found');
			return;
		}

		try {
			// Destroy previous chart instances if they exist
			if (mainChartInstance) {
				try { mainChartInstance.destroy(); } catch {}
				mainChartInstance = null;
			}
			if (brushChartInstance) {
				try { brushChartInstance.destroy(); } catch {}
				brushChartInstance = null;
			}

			// Only clear the data grid, not the chart containers
			dataGridElement.innerHTML = '';

			// Import ApexCharts only once if not already loaded
			if (!ApexCharts) {
				ApexCharts = await import('apexcharts').then(module => module.default);
			}

			// Filter out any data points that have null values
			const validData = historicalData.filter((data) =>
				dataType === 'air'
					? data.temperature_c !== null && data.humidity !== null
					: data.temperature_c !== null && data.moisture !== null
			);

			if (validData.length === 0) {
				console.warn('No valid data points with required values');
				return;
			}

			// Format temperature data for the chart
			const temperatureData = validData.map((data) => ({
				x: new Date(data.created_at).getTime(),
				y: data.temperature_c
			}));

			// Format humidity/moisture data depending on device type
			const secondaryData = validData.map((data) => ({
				x: new Date(data.created_at).getTime(),
				y: dataType === 'air' ? data.humidity : data.moisture
			}));

			// Determine chart labels based on data type
			const mainLabel = 'Temperature (°C)';
			const secondaryLabel = dataType === 'air' ? 'Humidity (%)' : 'Moisture (%)';

			// Determine min and max dates for chart selection
			const dateValues = validData.map((d) => new Date(d.created_at).getTime());
			const minDate = Math.min(...dateValues);
			const maxDate = Math.max(...dateValues);

			// Configure the main chart
			const mainChartOptions = {
				series: [
					{
						name: mainLabel,
						data: temperatureData.slice().sort((a, b) => a.x - b.x)
					},
					{
						name: secondaryLabel,
						data: secondaryData.slice().sort((a, b) => a.x - b.x)
					}
				],
				chart: {
					id: 'mainChart',
					type: 'line',
					height: 350,
					toolbar: {
						autoSelected: 'pan',
						show: false
					},
					animations: {
						enabled: false
					},
					zoom: {
						enabled: false
					}
				},
				colors: ['#f97316', '#3b82f6'],
				stroke: {
					curve: 'smooth',
					width: [1, 1]
				},
				dataLabels: {
					enabled: false
				},
				markers: {
					size: 1,
					strokeWidth: 0,
					hover: {
						size: 4
					}
				},
				xaxis: {
					type: 'datetime',
					labels: {
						datetimeUTC: false
					}
				},
				yaxis: [
					{
						seriesName: mainLabel,
						title: {
							text: mainLabel,
							style: { color: '#f97316' } // orange-500
						},
						labels: {
							style: { colors: '#f97316' }
						}
					},
					{
						seriesName: secondaryLabel,
						opposite: true,
						title: {
							text: secondaryLabel,
							style: { color: '#3b82f6' } // blue-500
						},
						labels: {
							style: { colors: '#3b82f6' }
						}
					}
				],
				tooltip: {
					theme: 'dark',
					shared: true,
					x: {
						format: 'MMM dd HH:mm'
					},
					style: {
						fontSize: '13px',
						fontFamily: 'Inter, sans-serif'
					},
					marker: {
						show: true
					},
					y: {
						formatter: (val: number) => val.toFixed(1)
					}
				},
				legend: {
					position: 'top',
					horizontalAlign: 'center'
				},
				grid: {
					borderColor: '#2a2a2a',

					row: {
						colors: ['transparent', 'transparent'],
						opacity: 0.1
					}
				}
			};

			// Configure the brush chart
			const brushChartOptions = {
				series: [
					{
						name: mainLabel,
						data: temperatureData.slice().sort((a, b) => a.x - b.x)
					},
					{
						name: secondaryLabel,
						data: secondaryData.slice().sort((a, b) => a.x - b.x)
					}
				],
				chart: {
					id: 'brushChart',
					height: 150,
					type: 'area',
					brush: {
						target: 'mainChart',
						enabled: true
					},
					selection: {
						enabled: true,
						xaxis: {
							min: minDate,
							max: maxDate
						}
					}
				},
				colors: ['#f97316', '#3b82f6'],
				fill: {
					type: 'gradient',
					gradient: {
						opacityFrom: 0.7,
						opacityTo: 0.3
					}
				},
				stroke: {
					width: [1, 1]
				},
				xaxis: {
					type: 'datetime',
					tooltip: {
						enabled: false
					},
					labels: {
						datetimeUTC: false
					}
				},
				yaxis: {
					show: false,
					tickAmount: 2
				},
				grid: {
					borderColor: '#2a2a2a',
					strokeDashArray: 2,
					yaxis: {
						lines: {
							show: false
						}
					}
				},
				legend: {
					show: false
				}
			};

			// Render the charts
			if (ApexCharts && chart1Element && chart1BrushElement && 
				document.body.contains(chart1Element) && 
				document.body.contains(chart1BrushElement)) {
				// Create new instances with the current options
				mainChartInstance = new ApexCharts(chart1Element, mainChartOptions);
				brushChartInstance = new ApexCharts(chart1BrushElement, brushChartOptions);

				try {
					await mainChartInstance.render();
					await brushChartInstance.render();
				} catch (err) {
					console.error('Error rendering charts:', err);
					
					// Clean up failed instances
					if (mainChartInstance) {
						try { mainChartInstance.destroy(); } catch {}
						mainChartInstance = null;
					}
					if (brushChartInstance) {
						try { brushChartInstance.destroy(); } catch {}
						brushChartInstance = null;
					}
				}
			}

			// Build columns for the data grid based on data type
			const columns = [
				{
					field: 'created_at',
					name: 'Timestamp',
					type: 'datetime',
					width: '180px',
					formatter: (value: string) => formatDateForDisplay(value)
				},
				{
					field: 'temperature_c',
					name: 'Temperature (°C)',
					type: 'number',
					width: '130px',
					formatter: (value: number | null) => (value !== null ? value : 'N/A')
				}
			];

			// Add columns based on data type
			if (dataType === 'air') {
				columns.push({
					field: 'humidity',
					name: 'Humidity (%)',
					type: 'number',
					width: '120px',
					formatter: (value: number | null) => (value !== null ? value : 'N/A')
				});

				if (hasValue(latestData, 'co2')) {
					columns.push({
						field: 'co2',
						name: 'CO2 (ppm)',
						type: 'number',
						width: '120px',
						formatter: (value: number | null) => (value !== null ? value : 'N/A')
					});
				}
			} else {
				columns.push({
					field: 'moisture',
					name: 'Moisture (%)',
					type: 'number',
					width: '120px',
					formatter: (value: number | null) => (value !== null ? value : 'N/A')
				});

				if (hasValue(latestData, 'ph')) {
					columns.push({
						field: 'ph',
						name: 'pH Level',
						type: 'number',
						width: '100px',
						formatter: (value: number | null) => (value !== null ? value : 'N/A')
					});
				}
			}

			// Configure and render the data grid if element and library are available
			if (dataGridElement && ApexGrid) {
				const gridOptions = {
					columns: columns,
					data: historicalData,
					theme: 'light',
					pagination: {
						enabled: true,
						pageSize: 10,
						pageSizes: [10, 25, 50, 100]
					},
					search: {
						enabled: true,
						placeholder: 'Search data...'
					},
					sorting: {
						enabled: true,
						multiColumn: false
					}
				};

				grid = new ApexGrid(dataGridElement, gridOptions);
				grid.render();
			}
		} catch (error) {
			console.error('Error rendering visualization:', error);
		}
	}

	// Initialize dates function
	function initializeDateRange() {
		// Set default date range (last 7 days)
		const end = new Date();
		const start = new Date();
		start.setDate(start.getDate() - 7);

		startDate = formatDateForInput(start);
		endDate = formatDateForInput(end);
	}

	return {
		// State
		stats,
		chartData,
		loading,
		error,
		startDate,
		endDate,

		// Element refs
		// Functions
		formatDateForDisplay,
		hasValue,
		processHistoricalData,
		fetchDataForDateRange,
		renderVisualization,
		initializeDateRange
	};
}

// Derived properties calculations
export function getDeviceDetailDerived(device: DeviceWithType, dataType: string, latestData: any) {
	// Determine device type name
	const deviceTypeName = device?.deviceType?.name || 'Unknown Type';

	// Reactive declarations for the charts
	const temperatureChartVisible = dataType === 'air' || dataType === 'soil';
	const humidityChartVisible = dataType === 'air';
	const moistureChartVisible = dataType === 'soil';
	const co2ChartVisible = dataType === 'air' && hasValue(latestData, 'co2');
	const phChartVisible = dataType === 'soil' && hasValue(latestData, 'ph');

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
