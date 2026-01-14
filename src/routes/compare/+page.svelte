<script lang="ts">
	import { page } from '$app/stores';
	import CWBackButton from '$lib/components/CWBackButton.svelte';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWDateRangePicker from '$lib/components/CWDateRangePicker.svelte';
	import CWDeviceSelector from '$lib/components/CWDeviceSelector.svelte';
	import CWMultiLineChart from '$lib/components/CWMultiLineChart.svelte';
	import CWSelect from '$lib/components/CWSelect.svelte';
	import CWTable from '$lib/components/CWTable.svelte';
	import type { DateRangeValue } from '$lib/components/CWDateRangePicker.svelte';
	import { SvelteMap } from 'svelte/reactivity';

	interface CompareDevice {
		id: string;
		name: string;
		type: string;
		temperatureC: number;
		humidity: number;
		co2: number;
		battery: number;
		lastSeen: Date;
		status: 'online' | 'warning' | 'offline';
		gatewayCount: number;
		strongestSignal: number | null;
		gateways: Array<{
			id: string;
			rssi: number;
			snr: number;
			lastUpdate: Date | null;
		}>;
	}

	interface HistoryPoint {
		timestamp: Date;
		value: number;
	}

	let { data } = $props();
	
	// Get devices from page data
	const allDevices: CompareDevice[] = $derived(
		(data.devices || []).map((d: any) => ({
			...d,
			lastSeen: d.lastSeen instanceof Date ? d.lastSeen : new Date(d.lastSeen)
		}))
	);
	const deviceTypes: string[] = $derived(data.deviceTypes || []);

	// State
	let selectedType = $state<string>('all');
	let selectedDevices = $state<CompareDevice[]>([]);
	let dateRange = $state<DateRangeValue>({
		start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
		end: new Date()
	});
	let selectedMetric = $state<string>('temperature');
	let isLoading = $state(false);
	let historyData = $state<SvelteMap<string, HistoryPoint[]>>(new SvelteMap());
	let viewMode = $state<'chart' | 'table'>('chart');

	// Filter devices by type
	const filteredDevices = $derived(
		selectedType === 'all'
			? allDevices
			: allDevices.filter((d) => d.type === selectedType)
	);

	// Type options for the filter
	const typeOptions = $derived([
		{ value: 'all', label: 'All Types' },
		...deviceTypes.map((t) => ({ value: t, label: t }))
	]);

	// Metric options
	const metricOptions = [
		{ value: 'temperature', label: 'Temperature (°C)' },
		{ value: 'humidity', label: 'Humidity (%)' },
		{ value: 'co2', label: 'CO₂ (ppm)' }
	];

	// Get unit for current metric
	const metricUnit = $derived(
		selectedMetric === 'temperature' ? '°C' : selectedMetric === 'humidity' ? '%' : 'ppm'
	);

	// Colors for charts - distinct, high contrast colors
	const COLORS = [
		'#ef4444', // Red
		'#22c55e', // Green
		'#3b82f6', // Blue
		'#eab308', // Yellow
		'#6b7280', // Gray
		'#ec4899', // Pink
		'#a16207', // Brown
		'#c084fc'  // Light Purple
	];

	// Prepare chart series from history data
	const chartSeries = $derived(
		selectedDevices.map((device, i) => ({
			id: device.id,
			name: device.name,
			color: COLORS[i % COLORS.length],
			data: historyData.get(device.id) || []
		}))
	);

	// Prepare table data
	const tableItems = $derived(
		selectedDevices.map((device, i) => ({
			id: device.id,
			name: device.name,
			color: COLORS[i % COLORS.length],
			temperature: device.temperatureC,
			humidity: device.humidity,
			co2: device.co2,
			battery: device.battery,
			lastSeen: device.lastSeen,
			status: device.status,
			gatewayCount: device.gatewayCount,
			rssi: device.strongestSignal,
			dataPoints: historyData.get(device.id)?.length || 0
		}))
	);

	const tableColumns = [
		{
			key: 'name',
			label: 'Device',
			render: (item: any) => `
				<div class="flex items-center gap-2">
					<span class="h-3 w-3 rounded-full" style="background-color: ${item.color}"></span>
					<span class="font-medium">${item.name}</span>
				</div>
			`
		},
		{
			key: 'temperature',
			label: 'Temp',
			sortable: true,
			render: (item: any) => `${item.temperature.toFixed(1)}°C`
		},
		{
			key: 'humidity',
			label: 'Humidity',
			sortable: true,
			render: (item: any) => `${item.humidity.toFixed(0)}%`
		},
		{
			key: 'co2',
			label: 'CO₂',
			sortable: true,
			render: (item: any) => `${item.co2} ppm`
		},
		{
			key: 'rssi',
			label: 'Signal',
			sortable: true,
			render: (item: any) => item.rssi ? `${item.rssi} dBm` : '-'
		},
		{
			key: 'gatewayCount',
			label: 'Gateways',
			sortable: true
		},
		{
			key: 'status',
			label: 'Status',
			render: (item: any) => {
				const colors: Record<string, string> = {
					online: 'bg-emerald-400/20 text-emerald-400',
					warning: 'bg-amber-400/20 text-amber-400',
					offline: 'bg-rose-400/20 text-rose-400'
				};
				return `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[item.status]}">${item.status}</span>`;
			}
		},
		{
			key: 'dataPoints',
			label: 'Data Points',
			sortable: true
		}
	];

	// Fetch history data for selected devices
	async function fetchHistoryData() {
		if (selectedDevices.length === 0 || !dateRange.start || !dateRange.end) {
			historyData = new SvelteMap();
			return;
		}

		isLoading = true;
		const newHistoryData = new SvelteMap<string, HistoryPoint[]>();
		const startDate = dateRange.start;
		const endDate = dateRange.end;

		try {
			// Fetch data for each device in parallel
			const promises = selectedDevices.map(async (device) => {
				const response = await fetch(
					`/api/private/devices/${device.id}/history?` +
					new URLSearchParams({
						start: startDate.toISOString(),
						end: endDate.toISOString(),
						metric: selectedMetric
					})
				);

				if (!response.ok) {
					console.error(`Failed to fetch history for ${device.id}`);
					return { id: device.id, data: [] };
				}

				const result = await response.json();
				return {
					id: device.id,
					data: (result.points || []).map((p: any) => ({
						timestamp: new Date(p.timestamp),
						value: p.value
					}))
				};
			});

			const results = await Promise.all(promises);
			results.forEach((r) => newHistoryData.set(r.id, r.data));
		} catch (error) {
			console.error('Error fetching history data:', error);
		} finally {
			historyData = newHistoryData;
			isLoading = false;
		}
	}

	// Reset selected devices when type filter changes to ensure we only compare like sensors
	let previousType = $state<string>('all');
	$effect(() => {
		const currentType = selectedType;
		if (currentType !== previousType) {
			previousType = currentType;
			if (currentType !== 'all') {
				// Filter out devices that don't match the new type
				const filtered = selectedDevices.filter((d) => d.type === currentType);
				if (filtered.length !== selectedDevices.length) {
					selectedDevices = filtered;
				}
			}
		}
	});

	// Fetch data when selections change
	$effect(() => {
		if (selectedDevices.length >= 2) {
			fetchHistoryData();
		} else {
			historyData = new SvelteMap();
		}
	});

	function getStatusColor(status: string) {
		switch (status) {
			case 'online': return 'bg-emerald-400';
			case 'warning': return 'bg-amber-400';
			case 'offline': return 'bg-rose-400';
			default: return 'bg-slate-400';
		}
	}

	function formatRelativeTime(date: Date) {
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		return `${days}d ago`;
	}

	// Helper function to get all unique timestamps across all series
	function getAllTimestamps(series: Array<{ data: Array<{ timestamp: Date }> }>): Date[] {
		const timestamps = new Set<number>();
		series.forEach((s) => s.data.forEach((p) => timestamps.add(p.timestamp.getTime())));
		return [...timestamps].sort((a, b) => b - a).slice(0, 50).map((t) => new Date(t));
	}

	// Helper function to get value at a specific timestamp
	function getValueAtTimestamp(
		data: Array<{ timestamp: Date; value: number }>,
		timestamp: Date,
		unit: string
	): string {
		const point = data.find(
			(p) => Math.abs(p.timestamp.getTime() - timestamp.getTime()) < 60000
		);
		return point ? `${point.value.toFixed(1)}${unit}` : '-';
	}

	// ============ STATISTICS CALCULATIONS ============

	interface DeviceStats {
		id: string;
		name: string;
		color: string;
		count: number;
		average: number;
		stdDev: number;
		min: number;
		max: number;
		range: number;
		median: number;
		variance: number;
	}

	interface PairwiseComparison {
		device1: { id: string; name: string; color: string };
		device2: { id: string; name: string; color: string };
		matchedPoints: number;
		avgDifference: number;
		avgPercentDiff: number;
		maxDifference: number;
		minDifference: number;
		correlation: number;
	}

	// Calculate mean of an array
	function mean(values: number[]): number {
		if (values.length === 0) return 0;
		return values.reduce((sum, v) => sum + v, 0) / values.length;
	}

	// Calculate standard deviation
	function standardDeviation(values: number[]): number {
		if (values.length < 2) return 0;
		const avg = mean(values);
		const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
		return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1));
	}

	// Calculate median
	function median(values: number[]): number {
		if (values.length === 0) return 0;
		const sorted = [...values].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
	}

	// Calculate Pearson correlation coefficient
	function correlation(x: number[], y: number[]): number {
		if (x.length !== y.length || x.length < 2) return 0;
		const n = x.length;
		const meanX = mean(x);
		const meanY = mean(y);
		
		let numerator = 0;
		let denomX = 0;
		let denomY = 0;
		
		for (let i = 0; i < n; i++) {
			const dx = x[i] - meanX;
			const dy = y[i] - meanY;
			numerator += dx * dy;
			denomX += dx * dx;
			denomY += dy * dy;
		}
		
		const denom = Math.sqrt(denomX * denomY);
		return denom === 0 ? 0 : numerator / denom;
	}

	// Calculate statistics for each device
	const deviceStats = $derived.by((): DeviceStats[] => {
		return selectedDevices.map((device, i) => {
			const data = historyData.get(device.id) || [];
			const values = data.map((p) => p.value);
			
			if (values.length === 0) {
				return {
					id: device.id,
					name: device.name,
					color: COLORS[i % COLORS.length],
					count: 0,
					average: 0,
					stdDev: 0,
					min: 0,
					max: 0,
					range: 0,
					median: 0,
					variance: 0
				};
			}

			const avg = mean(values);
			const std = standardDeviation(values);
			const minVal = Math.min(...values);
			const maxVal = Math.max(...values);

			return {
				id: device.id,
				name: device.name,
				color: COLORS[i % COLORS.length],
				count: values.length,
				average: avg,
				stdDev: std,
				min: minVal,
				max: maxVal,
				range: maxVal - minVal,
				median: median(values),
				variance: std * std
			};
		});
	});

	// Find matching data points between two devices (within 5 minutes)
	function findMatchingPoints(
		data1: HistoryPoint[],
		data2: HistoryPoint[]
	): Array<{ value1: number; value2: number; timestamp: Date }> {
		const matches: Array<{ value1: number; value2: number; timestamp: Date }> = [];
		const tolerance = 5 * 60 * 1000; // 5 minutes

		for (const p1 of data1) {
			const match = data2.find(
				(p2) => Math.abs(p1.timestamp.getTime() - p2.timestamp.getTime()) <= tolerance
			);
			if (match) {
				matches.push({
					value1: p1.value,
					value2: match.value,
					timestamp: p1.timestamp
				});
			}
		}

		return matches;
	}

	// Calculate pairwise comparisons between all selected devices
	const pairwiseComparisons = $derived.by((): PairwiseComparison[] => {
		const comparisons: PairwiseComparison[] = [];

		for (let i = 0; i < selectedDevices.length; i++) {
			for (let j = i + 1; j < selectedDevices.length; j++) {
				const device1 = selectedDevices[i];
				const device2 = selectedDevices[j];
				const data1 = historyData.get(device1.id) || [];
				const data2 = historyData.get(device2.id) || [];

				const matches = findMatchingPoints(data1, data2);

				if (matches.length === 0) {
					comparisons.push({
						device1: { id: device1.id, name: device1.name, color: COLORS[i % COLORS.length] },
						device2: { id: device2.id, name: device2.name, color: COLORS[j % COLORS.length] },
						matchedPoints: 0,
						avgDifference: 0,
						avgPercentDiff: 0,
						maxDifference: 0,
						minDifference: 0,
						correlation: 0
					});
					continue;
				}

				const differences = matches.map((m) => m.value1 - m.value2);
				const absDifferences = differences.map((d) => Math.abs(d));
				const percentDiffs = matches.map((m) => {
					const avg = (m.value1 + m.value2) / 2;
					return avg !== 0 ? (Math.abs(m.value1 - m.value2) / avg) * 100 : 0;
				});

				const values1 = matches.map((m) => m.value1);
				const values2 = matches.map((m) => m.value2);

				comparisons.push({
					device1: { id: device1.id, name: device1.name, color: COLORS[i % COLORS.length] },
					device2: { id: device2.id, name: device2.name, color: COLORS[j % COLORS.length] },
					matchedPoints: matches.length,
					avgDifference: mean(differences),
					avgPercentDiff: mean(percentDiffs),
					maxDifference: Math.max(...absDifferences),
					minDifference: Math.min(...absDifferences),
					correlation: correlation(values1, values2)
				});
			}
		}

		return comparisons;
	});

	// Time-aligned difference data for the table
	interface TimeDifferenceRow {
		timestamp: Date;
		values: Map<string, number | null>;
		differences: Map<string, number | null>;
		percentDiffs: Map<string, number | null>;
	}

	const timeDifferenceData = $derived.by((): TimeDifferenceRow[] => {
		if (selectedDevices.length < 2) return [];

		const tolerance = 30 * 60 * 1000; // 30 minutes tolerance for matching readings
		
		// Collect ALL timestamps from ALL devices
		const allTimestampsSet = new Set<number>();
		for (const device of selectedDevices) {
			const data = historyData.get(device.id) || [];
			for (const point of data) {
				allTimestampsSet.add(point.timestamp.getTime());
			}
		}
		
		if (allTimestampsSet.size === 0) return [];

		// Sort timestamps descending (most recent first) and limit to 100 for performance
		const allTimestamps = [...allTimestampsSet]
			.sort((a, b) => b - a)
			.slice(0, 100)
			.map(t => new Date(t));

		const rows: TimeDifferenceRow[] = [];
		const baseDevice = selectedDevices[0];

		for (const timestamp of allTimestamps) {
			const values = new Map<string, number | null>();
			const differences = new Map<string, number | null>();
			const percentDiffs = new Map<string, number | null>();

			// Find value for each device at or near this timestamp
			let baseValue: number | null = null;
			let hasMatch = false; // Track if we have at least one comparison match
			
			for (let i = 0; i < selectedDevices.length; i++) {
				const device = selectedDevices[i];
				const data = historyData.get(device.id) || [];
				
				// Find exact match first, then closest within tolerance
				let matchedPoint: HistoryPoint | null = null;
				let closestDiff = tolerance + 1;
				
				for (const p of data) {
					const diff = Math.abs(p.timestamp.getTime() - timestamp.getTime());
					if (diff === 0) {
						// Exact match
						matchedPoint = p;
						break;
					} else if (diff <= tolerance && diff < closestDiff) {
						matchedPoint = p;
						closestDiff = diff;
					}
				}
				
				const value = matchedPoint?.value ?? null;
				values.set(device.id, value);
				
				if (i === 0) {
					baseValue = value;
				} else {
					// Calculate difference from base device
					if (baseValue !== null && value !== null) {
						const diff = value - baseValue;
						differences.set(device.id, diff);
						const avg = (baseValue + value) / 2;
						percentDiffs.set(device.id, avg !== 0 ? (diff / avg) * 100 : 0);
						hasMatch = true; // We have at least one valid comparison
					} else {
						differences.set(device.id, null);
						percentDiffs.set(device.id, null);
					}
				}
			}

			// Only include rows where we have at least one valid comparison (base + another device)
			if (hasMatch) {
				rows.push({ timestamp, values, differences, percentDiffs });
			}
		}

		return rows;
	});

	// Format a number with appropriate precision
	function formatValue(value: number | null | undefined, unit: string, precision: number = 1): string {
		if (value === null || value === undefined) return '-';
		return `${value.toFixed(precision)}${unit}`;
	}

	// Format difference with color indicator
	function getDiffClass(diff: number | null): string {
		if (diff === null) return 'text-slate-400';
		if (Math.abs(diff) < 0.5) return 'text-slate-300';
		if (diff > 0) return 'text-rose-400';
		return 'text-sky-400';
	}

	// Format correlation with descriptor
	function getCorrelationLabel(r: number): { label: string; color: string } {
		const absR = Math.abs(r);
		if (absR >= 0.9) return { label: 'Very Strong', color: 'text-emerald-400' };
		if (absR >= 0.7) return { label: 'Strong', color: 'text-green-400' };
		if (absR >= 0.5) return { label: 'Moderate', color: 'text-amber-400' };
		if (absR >= 0.3) return { label: 'Weak', color: 'text-orange-400' };
		return { label: 'Very Weak', color: 'text-rose-400' };
	}
</script>

<svelte:head>
	<title>Compare Sensors | CropWatch</title>
</svelte:head>

<div class="min-h-screen bg-slate-950">
	<!-- Hero Header with Controls -->
	<div class="relative border-b border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950">
		<!-- Background decoration -->
		<div class="pointer-events-none absolute inset-0 overflow-hidden">
			<div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-500/5 blur-3xl"></div>
			<div class="absolute -left-20 top-10 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl"></div>
			<div class="absolute bottom-0 right-1/3 h-32 w-32 rounded-full bg-violet-500/5 blur-2xl"></div>
		</div>
		
		<div class="relative px-4 py-6 md:px-8">
			<!-- Top row: Back button, title, date range, metric -->
			<div class="mb-6 flex flex-wrap items-center gap-4">
				<CWBackButton fallback="/locations" />
				<div class="flex-1">
					<h1 class="text-2xl font-bold text-slate-100">Compare Sensor Values</h1>
					<p class="text-sm text-slate-400">Analyze and compare data from multiple sensors</p>
				</div>
				
				<!-- Desktop: Date range and metric inline -->
				<div class="hidden items-center gap-3 lg:flex">
					<CWDateRangePicker bind:value={dateRange} class="min-w-64" />
					<div class="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/50 px-1 py-1 backdrop-blur">
						{#each metricOptions as option (option.value)}
							<button
								class="rounded-lg px-3 py-1.5 text-sm font-medium transition-all {selectedMetric === option.value ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-lg shadow-sky-500/25' : 'text-slate-400 hover:text-slate-200'}"
								onclick={() => (selectedMetric = option.value)}
							>
								{option.value === 'temperature' ? '🌡️ Temp' : option.value === 'humidity' ? '💧 Humidity' : '🌬️ CO₂'}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Mobile: Date range and metric -->
			<div class="mb-6 flex flex-wrap gap-3 lg:hidden">
				<div class="flex-1">
					<CWDateRangePicker bind:value={dateRange} />
				</div>
				<CWSelect
					options={metricOptions}
					bind:value={selectedMetric}
					placeholder="Metric"
					class="w-32"
				/>
			</div>

			<!-- Device Selection Row -->
			<div class="flex flex-col gap-4 lg:flex-row lg:items-end">
				<!-- Type filter -->
				<div class="lg:w-48">
					<span class="mb-1.5 block text-xs font-medium text-slate-400">Sensor Type</span>
					<CWSelect
						options={typeOptions}
						bind:value={selectedType}
						placeholder="All types"
					/>
				</div>
				
				<!-- Device selector - grows to fill -->
				<div class="flex-1">
					<span class="mb-1.5 block text-xs font-medium text-slate-400">
						Select Sensors 
						<span class="text-slate-500">({selectedDevices.length} selected)</span>
					</span>
					<CWDeviceSelector
						devices={filteredDevices}
						bind:selectedDevices={selectedDevices}
						maxSelection={10}
						placeholder="Search and select sensors to compare..."
					/>
				</div>
			</div>
			
			<!-- Selected devices chips -->
			{#if selectedDevices.length > 0}
				<div class="mt-4 flex flex-wrap gap-2">
					{#each selectedDevices as device, i (device.id)}
						<div class="group flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/80 py-1 pl-3 pr-1 backdrop-blur transition-all hover:border-slate-600">
							<span class="h-2 w-2 rounded-full" style="background-color: {COLORS[i % COLORS.length]}"></span>
							<span class="text-xs font-medium text-slate-300">{device.name}</span>
							<span class="flex h-4 w-4 items-center justify-center rounded-full text-slate-500 {getStatusColor(device.status)}"></span>
							<button
								class="flex h-5 w-5 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-700 hover:text-slate-300"
								onclick={() => (selectedDevices = selectedDevices.filter((d) => d.id !== device.id))}
								aria-label="Remove {device.name}"
							>
								<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Main Content -->
	<div class="relative z-0 px-4 py-6 md:px-8">
		{#if selectedDevices.length < 2}
			<!-- Empty State -->
			<div class="flex h-[60vh] items-center justify-center">
				<div class="text-center">
					<div class="relative mx-auto mb-6">
						<div class="absolute inset-0 animate-pulse rounded-full bg-sky-500/20 blur-xl"></div>
						<div class="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/50">
							<svg class="h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
						</div>
					</div>
					<h3 class="mb-2 text-xl font-semibold text-slate-200">Select Sensors to Compare</h3>
					<p class="mx-auto max-w-md text-sm text-slate-400">
						Choose 2 or more sensors from the same type above to analyze their data, view statistics, and identify differences
					</p>
					<div class="mt-6 flex justify-center gap-4 text-sm">
						<div class="flex items-center gap-2 text-slate-500">
							<span class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs">1</span>
							<span>Filter by type</span>
						</div>
						<div class="text-slate-600">→</div>
						<div class="flex items-center gap-2 text-slate-500">
							<span class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs">2</span>
							<span>Select sensors</span>
						</div>
						<div class="text-slate-600">→</div>
						<div class="flex items-center gap-2 text-slate-500">
							<span class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs">3</span>
							<span>Analyze data</span>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="space-y-6">
				<!-- Quick Stats Cards - Horizontal scrollable on mobile -->
				<div class="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-2 xl:grid-cols-4 lg:overflow-visible">
					{#each selectedDevices as device, i (device.id)}
						<div class="min-w-[220px] flex-shrink-0 rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 lg:min-w-0">
							<div class="mb-3 flex items-center gap-2">
								<div class="flex h-8 w-8 items-center justify-center rounded-lg" style="background-color: {COLORS[i % COLORS.length]}20;">
									<span class="h-3 w-3 rounded-full" style="background-color: {COLORS[i % COLORS.length]}"></span>
								</div>
								<h3 class="flex-1 truncate text-sm font-medium text-slate-200">{device.name}</h3>
								<span class={`h-2 w-2 rounded-full ${getStatusColor(device.status)}`}></span>
							</div>
							<div class="grid grid-cols-2 gap-2 text-xs">
								<div class="rounded-lg bg-slate-900/50 p-2">
									<p class="text-slate-500">Temp</p>
									<p class="font-semibold text-slate-100">{device.temperatureC.toFixed(1)}°C</p>
								</div>
								<div class="rounded-lg bg-slate-900/50 p-2">
									<p class="text-slate-500">Humidity</p>
									<p class="font-semibold text-slate-100">{device.humidity.toFixed(0)}%</p>
								</div>
								<div class="rounded-lg bg-slate-900/50 p-2">
									<p class="text-slate-500">Signal</p>
									<p class="font-semibold text-slate-100">{device.strongestSignal ? `${device.strongestSignal}` : '-'}</p>
								</div>
								<div class="rounded-lg bg-slate-900/50 p-2">
									<p class="text-slate-500">Last seen</p>
									<p class="font-semibold text-slate-100">{formatRelativeTime(device.lastSeen)}</p>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Chart Section -->
				<div class="rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6">
					<div class="mb-4 flex flex-wrap items-center justify-between gap-4">
						<h2 class="flex items-center gap-2 text-lg font-semibold text-slate-200">
							<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/20 to-emerald-500/20">
								{selectedMetric === 'temperature' ? '🌡️' : selectedMetric === 'humidity' ? '💧' : '🌬️'}
							</span>
							{selectedMetric === 'temperature' ? 'Temperature' : selectedMetric === 'humidity' ? 'Humidity' : 'CO₂'} Comparison
						</h2>
						<div class="flex items-center gap-2">
							<div class="flex rounded-xl border border-slate-700/50 bg-slate-800/50 p-1">
								<button
									class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all {viewMode === 'chart' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}"
									onclick={() => (viewMode = 'chart')}
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
									</svg>
									Chart
								</button>
								<button
									class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all {viewMode === 'table' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}"
									onclick={() => (viewMode = 'table')}
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
									</svg>
									Table
								</button>
							</div>
						</div>
					</div>
					
					{#if viewMode === 'chart'}
						{#if isLoading}
							<div class="flex h-80 items-center justify-center">
								<div class="flex flex-col items-center gap-3">
									<div class="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-sky-500"></div>
									<p class="text-sm text-slate-400">Loading sensor data...</p>
								</div>
							</div>
						{:else}
							<CWMultiLineChart
								series={chartSeries}
								height={400}
								unit={metricUnit}
								showLegend={true}
							/>
						{/if}
					{:else}
						<div class="overflow-hidden rounded-xl border border-slate-700/50">
							<CWTable
								items={tableItems}
								columns={tableColumns}
								pageSize={10}
								storageKey="compare-table"
							/>
						</div>
					{/if}
				</div>

				<!-- Statistics Section -->
				{#if chartSeries.some((s) => s.data.length > 0) && !isLoading}
					<!-- Desktop: Two-column layout for stats, Mobile: Stack -->
					<div class="grid gap-6 2xl:grid-cols-2">
						<!-- Individual Device Statistics - Visual Cards on Desktop -->
						<div class="rounded-3xl border border-slate-700 bg-slate-900/50 p-6 2xl:col-span-2">
							<h3 class="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-200">
								<svg class="h-5 w-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
								</svg>
								Individual Sensor Statistics
							</h3>
							
							<!-- Desktop: Horizontal stat cards -->
							<div class="hidden gap-4 xl:grid" style="grid-template-columns: repeat({Math.min(deviceStats.length, 4)}, minmax(0, 1fr));">
								{#each deviceStats as stat (stat.id)}
									<div class="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5">
										<div class="mb-4 flex items-center gap-3">
											<div class="flex h-10 w-10 items-center justify-center rounded-xl" style="background-color: {stat.color}20;">
												<span class="h-4 w-4 rounded-full" style="background-color: {stat.color}"></span>
											</div>
											<div class="min-w-0 flex-1">
												<h4 class="truncate text-sm font-semibold text-slate-100">{stat.name}</h4>
												<p class="text-xs text-slate-400">{stat.count} data points</p>
											</div>
										</div>
										
										<!-- Main stat highlight -->
										<div class="mb-4 text-center">
											<p class="text-xs uppercase tracking-wider text-slate-400">Average</p>
											<p class="text-3xl font-bold text-slate-100">{stat.average.toFixed(1)}<span class="text-lg text-slate-400">{metricUnit}</span></p>
											<p class="text-xs text-slate-500">±{stat.stdDev.toFixed(2)} std dev</p>
										</div>
										
										<!-- Mini stats grid -->
										<div class="grid grid-cols-3 gap-2 rounded-xl bg-slate-900/50 p-3">
											<div class="text-center">
												<p class="text-lg font-semibold text-sky-400">{stat.min.toFixed(1)}</p>
												<p class="text-[10px] uppercase tracking-wider text-slate-500">Min</p>
											</div>
											<div class="text-center">
												<p class="text-lg font-semibold text-slate-300">{stat.median.toFixed(1)}</p>
												<p class="text-[10px] uppercase tracking-wider text-slate-500">Median</p>
											</div>
											<div class="text-center">
												<p class="text-lg font-semibold text-rose-400">{stat.max.toFixed(1)}</p>
												<p class="text-[10px] uppercase tracking-wider text-slate-500">Max</p>
											</div>
										</div>
										
										<!-- Range bar visualization -->
										<div class="mt-4">
											<div class="mb-1 flex justify-between text-[10px] text-slate-500">
												<span>Range</span>
												<span class="text-amber-400">{stat.range.toFixed(2)}{metricUnit}</span>
											</div>
											<div class="h-2 overflow-hidden rounded-full bg-slate-700">
												<div 
													class="h-full rounded-full bg-gradient-to-r from-sky-500 via-emerald-500 to-rose-500"
													style="width: 100%"
												></div>
											</div>
										</div>
									</div>
								{/each}
							</div>
							
							<!-- Mobile/Tablet: Traditional table -->
							<div class="overflow-x-auto xl:hidden">
								<table class="w-full text-sm">
									<thead>
										<tr class="border-b border-slate-700">
											<th class="px-4 py-3 text-left text-xs font-medium text-slate-400">Sensor</th>
											<th class="px-4 py-3 text-right text-xs font-medium text-slate-400">Points</th>
											<th class="px-4 py-3 text-right text-xs font-medium text-slate-400">Avg</th>
											<th class="px-4 py-3 text-right text-xs font-medium text-slate-400">±Std</th>
											<th class="px-4 py-3 text-right text-xs font-medium text-slate-400">Min</th>
											<th class="px-4 py-3 text-right text-xs font-medium text-slate-400">Max</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-800">
										{#each deviceStats as stat (stat.id)}
											<tr class="hover:bg-slate-800/50">
												<td class="px-4 py-3">
													<span class="flex items-center gap-2">
														<span class="h-3 w-3 rounded-full" style="background-color: {stat.color}"></span>
														<span class="font-medium text-slate-200">{stat.name}</span>
													</span>
												</td>
												<td class="px-4 py-3 text-right text-slate-300">{stat.count}</td>
												<td class="px-4 py-3 text-right font-medium text-slate-100">{formatValue(stat.average, metricUnit)}</td>
												<td class="px-4 py-3 text-right text-slate-300">±{stat.stdDev.toFixed(2)}</td>
												<td class="px-4 py-3 text-right text-sky-400">{formatValue(stat.min, metricUnit)}</td>
												<td class="px-4 py-3 text-right text-rose-400">{formatValue(stat.max, metricUnit)}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>

						<!-- Pairwise Comparison Statistics -->
						{#if pairwiseComparisons.length > 0}
							<div class="rounded-3xl border border-slate-700 bg-slate-900/50 p-6 {pairwiseComparisons.length <= 3 ? '2xl:col-span-1' : '2xl:col-span-2'}">
								<h3 class="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-200">
									<svg class="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
									</svg>
									Sensor Comparison Analysis
								</h3>
								<div class="grid gap-4 sm:grid-cols-2 {pairwiseComparisons.length <= 3 ? 'xl:grid-cols-1 2xl:grid-cols-1' : 'xl:grid-cols-3 2xl:grid-cols-3'}">
									{#each pairwiseComparisons as comp (comp.device1.id + '-' + comp.device2.id)}
										<div class="group rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 transition-all hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50">
											<!-- Header with sensor names -->
											<div class="mb-4 flex items-center gap-3">
												<div class="flex items-center gap-2 rounded-lg bg-slate-900/50 px-2 py-1">
													<span class="h-3 w-3 rounded-full" style="background-color: {comp.device1.color}"></span>
													<span class="max-w-[80px] truncate text-xs font-medium text-slate-300">{comp.device1.name}</span>
												</div>
												<div class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700/50">
													<svg class="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
													</svg>
												</div>
												<div class="flex items-center gap-2 rounded-lg bg-slate-900/50 px-2 py-1">
													<span class="max-w-[80px] truncate text-xs font-medium text-slate-300">{comp.device2.name}</span>
													<span class="h-3 w-3 rounded-full" style="background-color: {comp.device2.color}"></span>
												</div>
											</div>
											
											{#if comp.matchedPoints === 0}
												<div class="flex h-24 items-center justify-center rounded-xl bg-slate-900/30">
													<p class="text-xs text-slate-500">No matching time points</p>
												</div>
											{:else}
												<!-- Correlation highlight -->
												<div class="mb-4 rounded-xl bg-slate-900/50 p-3 text-center">
													<p class="text-[10px] uppercase tracking-wider text-slate-500">Correlation</p>
													<p class="text-2xl font-bold {getCorrelationLabel(comp.correlation).color}">{comp.correlation.toFixed(3)}</p>
													<p class="text-xs {getCorrelationLabel(comp.correlation).color}">{getCorrelationLabel(comp.correlation).label}</p>
												</div>
												
												<!-- Stats grid -->
												<div class="grid grid-cols-2 gap-2">
													<div class="rounded-lg bg-slate-900/30 p-2 text-center">
														<p class="text-sm font-semibold text-slate-100">{comp.matchedPoints}</p>
														<p class="text-[10px] text-slate-500">Matched Pts</p>
													</div>
													<div class="rounded-lg bg-slate-900/30 p-2 text-center">
														<p class="text-sm font-semibold text-amber-400">{comp.avgPercentDiff.toFixed(1)}%</p>
														<p class="text-[10px] text-slate-500">Avg % Diff</p>
													</div>
													<div class="rounded-lg bg-slate-900/30 p-2 text-center">
														<p class="text-sm font-semibold {getDiffClass(comp.avgDifference)}">
															{comp.avgDifference >= 0 ? '+' : ''}{comp.avgDifference.toFixed(2)}
														</p>
														<p class="text-[10px] text-slate-500">Avg Diff</p>
													</div>
													<div class="rounded-lg bg-slate-900/30 p-2 text-center">
														<p class="text-sm font-semibold text-rose-400">{comp.maxDifference.toFixed(2)}</p>
														<p class="text-[10px] text-slate-500">Max Diff</p>
													</div>
												</div>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Time-Aligned Difference Table -->
						{#if timeDifferenceData.length > 0 && selectedDevices.length >= 2}
							<div class="rounded-3xl border border-slate-700 bg-slate-900/50 p-6 {pairwiseComparisons.length <= 3 ? '2xl:col-span-1' : '2xl:col-span-2'}">
								<div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
									<h3 class="flex items-center gap-2 text-sm font-semibold text-slate-200">
										<svg class="h-5 w-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										Time-Aligned Differences
									</h3>
									<div class="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-1.5">
										<span class="h-2 w-2 rounded-full" style="background-color: {COLORS[0]}"></span>
										<span class="text-xs text-slate-400">Base: <span class="font-medium text-slate-300">{selectedDevices[0]?.name}</span></span>
									</div>
								</div>
								
								<div class="max-h-[400px] overflow-auto rounded-xl border border-slate-700/50">
									<table class="w-full text-sm">
										<thead class="sticky top-0 bg-slate-800/95 backdrop-blur">
											<tr class="border-b border-slate-700">
												<th class="px-4 py-3 text-left text-xs font-medium text-slate-400">Timestamp</th>
												<th class="px-4 py-3 text-right text-xs font-medium text-slate-400">
													<span class="inline-flex items-center gap-1.5">
														<span class="h-2 w-2 rounded-full" style="background-color: {COLORS[0]}"></span>
														Base
													</span>
												</th>
												{#each selectedDevices.slice(1) as device, i (device.id)}
													<th class="px-4 py-3 text-right text-xs font-medium text-slate-400">
														<span class="inline-flex items-center gap-1.5">
															<span class="h-2 w-2 rounded-full" style="background-color: {COLORS[(i + 1) % COLORS.length]}"></span>
															Value
														</span>
													</th>
													<th class="px-4 py-3 text-right text-xs font-medium text-slate-400">Δ</th>
													<th class="px-4 py-3 text-right text-xs font-medium text-slate-400">%</th>
												{/each}
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-800/50">
											{#each timeDifferenceData as row, i (i)}
												<tr class="transition-colors hover:bg-slate-800/30">
													<td class="whitespace-nowrap px-4 py-2.5 text-slate-300">
														{row.timestamp.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
													</td>
													<td class="px-4 py-2.5 text-right font-medium text-slate-100">
														{formatValue(row.values.get(selectedDevices[0]?.id), metricUnit)}
													</td>
													{#each selectedDevices.slice(1) as device (device.id)}
														<td class="px-4 py-2.5 text-right text-slate-100">
															{formatValue(row.values.get(device.id), metricUnit)}
														</td>
														<td class="px-4 py-2.5 text-right">
															{#if row.differences.get(device.id) !== null}
																<span class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium {row.differences.get(device.id)! > 0.5 ? 'bg-rose-500/20 text-rose-400' : row.differences.get(device.id)! < -0.5 ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-700/50 text-slate-400'}">
																	{row.differences.get(device.id)! >= 0 ? '+' : ''}{row.differences.get(device.id)!.toFixed(1)}
																</span>
															{:else}
																<span class="text-slate-600">-</span>
															{/if}
														</td>
														<td class="px-4 py-2.5 text-right">
															{#if row.percentDiffs.get(device.id) !== null}
																<span class="text-xs text-amber-400/80">
																	{row.percentDiffs.get(device.id)! >= 0 ? '+' : ''}{row.percentDiffs.get(device.id)!.toFixed(1)}%
																</span>
															{:else}
																<span class="text-slate-600">-</span>
															{/if}
														</td>
													{/each}
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
