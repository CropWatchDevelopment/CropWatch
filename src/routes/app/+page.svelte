<script>
	import Chart from 'chart.js/auto';
	import { getDarkMode } from '$lib/components/theme/theme.svelte';
	import { DateTime } from 'luxon';

	let { data } = $props();

	async function getSuccsessOrErrorRate() {
		if (data && data.allDevicesWithTypes) {
			let allDevices = await data.allDevicesWithTypes;
			if (allDevices && allDevices.length > 0) {
				let successRate = allDevices.reduce((acc, device) => {
					if (device.cw_device_types.upload_interval) {
						let lastSeen = DateTime.fromJSDate(device.cw_device_types.upload_interval);
						if (
							lastSeen > DateTime.now().minus({ minutes: device.cw_device_types.upload_interval })
						) {
							return acc; // Device is active
						} else {
							return acc; // Device is not active
						}
					} else {
						return acc; // No upload interval defined
					}
				}, 0);

				return Promise.resolve(successRate);
			} else {
				return Promise.resolve({ success: 0, error: 0 });
			}
		}
	}

	// Reactive variables
	let dataReceived = getSuccsessOrErrorRate();
	let successRate = $state(99.7);
	let activeAlerts = $state(3);
	let alertQuota = $state(67);
	let throughputChart = $state();
	let deviceChart = $state();

	// Gateway data
	let gatewaysOnline = $state(5);
	let gatewaysOffline = $state(1);
	let gateways = $state([
		{ id: 'GW-001', status: 'UP', online: true },
		{ id: 'GW-002', status: 'UP', online: true },
		{ id: 'GW-003', status: 'DOWN', online: false },
		{ id: 'GW-004', status: 'UP', online: true },
		{ id: 'GW-005', status: 'UP', online: true },
		{ id: 'GW-006', status: 'UP', online: true }
	]);

	// Battery levels
	let batteryLevels = $state([
		{ name: 'Sensor Group A', level: 85, color: 'bg-green-500' },
		{ name: 'Sensor Group B', level: 45, color: 'bg-yellow-500' },
		{ name: 'Sensor Group C', level: 92, color: 'bg-green-500' },
		{ name: 'Sensor Group D', level: 12, color: 'bg-red-500' }
	]);

	// Alerts data
	let recentAlerts = $state([
		{ message: 'High CPU usage on Device #45', time: '2 minutes ago', severity: 'yellow' },
		{ message: 'Temperature sensor offline', time: '15 minutes ago', severity: 'orange' },
		{ message: 'Network latency increase', time: '1 hour ago', severity: 'blue' }
	]);

	// Scheduled reports
	let scheduledReports = $state([
		{ name: 'Daily Analytics', time: 'Today at 11:30 PM', color: 'blue' },
		{ name: 'Weekly Summary', time: 'Tomorrow at 6:00 AM', color: 'purple' },
		{ name: 'Device Health Report', time: 'Jul 25 at 9:00 AM', color: 'green' },
		{ name: 'Monthly Statistics', time: 'Jul 31 at 11:59 PM', color: 'indigo' }
	]);

	function initializeCharts() {
		const isDark = getDarkMode();
		const textColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
		const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

		// Data Throughput Chart
		const throughputCtx = document.getElementById('throughputChart')?.getContext('2d');
		if (throughputCtx) {
			throughputChart = new Chart(throughputCtx, {
				type: 'line',
				data: {
					labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
					datasets: [
						{
							label: 'Data Received (MB/h)',
							data: [45, 35, 60, 85, 95, 75, 55],
							borderColor: 'rgb(59, 130, 246)',
							backgroundColor: 'rgba(59, 130, 246, 0.1)',
							fill: true,
							tension: 0.4
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							labels: { color: textColor }
						}
					},
					scales: {
						x: {
							ticks: { color: textColor },
							grid: { color: gridColor }
						},
						y: {
							ticks: { color: textColor },
							grid: { color: gridColor }
						}
					}
				}
			});
		}

		// Device Status Chart
		const deviceCtx = document.getElementById('deviceChart')?.getContext('2d');
		if (deviceCtx) {
			deviceChart = new Chart(deviceCtx, {
				type: 'doughnut',
				data: {
					labels: ['Online', 'Idle', 'Error', 'Offline'],
					datasets: [
						{
							data: [214, 25, 5, 3],
							backgroundColor: [
								'rgb(34, 197, 94)',
								'rgb(59, 130, 246)',
								'rgb(239, 68, 68)',
								'rgb(107, 114, 128)'
							],
							borderWidth: 0
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							position: 'bottom',
							labels: {
								color: textColor,
								padding: 20
							}
						}
					}
				}
			});
		}
	}

	function getSeverityClasses(severity) {
		const classes = {
			yellow: 'bg-yellow-100 dark:bg-yellow-500/10 border-yellow-500',
			orange: 'bg-orange-100 dark:bg-orange-500/10 border-orange-500',
			blue: 'bg-blue-100 dark:bg-blue-500/10 border-blue-500'
		};
		return classes[severity] || 'bg-gray-100 dark:bg-gray-500/10 border-gray-500';
	}

	function getSeverityDotColor(severity) {
		const colors = {
			yellow: 'bg-yellow-500',
			orange: 'bg-orange-500',
			blue: 'bg-blue-500'
		};
		return colors[severity] || 'bg-gray-500';
	}

	function getReportColorClasses(color) {
		const classes = {
			blue: 'bg-blue-100 dark:bg-blue-500/10 border-blue-500',
			purple: 'bg-purple-100 dark:bg-purple-500/10 border-purple-500',
			green: 'bg-green-100 dark:bg-green-500/10 border-green-500',
			indigo: 'bg-indigo-100 dark:bg-indigo-500/10 border-indigo-500'
		};
		return classes[color] || 'bg-gray-100 dark:bg-gray-500/10 border-gray-500';
	}

	function getReportDotColor(color) {
		const colors = {
			blue: 'bg-blue-500',
			purple: 'bg-purple-500',
			green: 'bg-green-500',
			indigo: 'bg-indigo-500'
		};
		return colors[color] || 'bg-gray-500';
	}

	$effect(() => {
		// Re-initialize charts when theme changes
		const currentTheme = getDarkMode();

		// Destroy existing charts first
		if (throughputChart) throughputChart.destroy();
		if (deviceChart) deviceChart.destroy();

		// Re-initialize with new theme
		initializeCharts();
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="bg-background text-text min-h-screen transition-colors">
	<div class="w-full px-4 py-4 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Overview</h1>
				<p class="mt-2 text-gray-600 dark:text-gray-400">
					Real-time system monitoring and analytics
				</p>
			</div>
			<div class="flex items-center space-x-4">
				<div class="flex items-center space-x-2">
					<div class="pulse-dot h-3 w-3 rounded-full bg-green-500"></div>
					<span class="text-sm text-gray-600 dark:text-gray-300">System Online</span>
				</div>
				<button
					class="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
				>
					Dashboard →
				</button>
			</div>
		</div>

		<!-- Key Metrics Row -->
		<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-5">
			<!-- Connected Devices -->
			<div
				class="card-hover rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-gray-500 dark:text-gray-400">Connected Devices</p>
						<p class="text-3xl font-bold text-green-600 dark:text-green-400">
							{#await data.allDevicesWithTypes}
								Loading...
							{:then devices}
								{#if devices.length > 0}
									{devices.length}
								{:else}
									0
								{/if}
							{/await}
						</p>
						<!-- <p class="text-xs text-green-500 dark:text-green-300">+12 today</p> -->
					</div>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-500/20"
					>
						<svg
							class="h-6 w-6 text-green-600 dark:text-green-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Data Received -->
			<div
				class="card-hover rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-gray-500 dark:text-gray-400">Data Received Today</p>
						<p class="text-3xl font-bold text-blue-600 dark:text-blue-400">
							{dataReceived}
							{#await dataReceived}
								Loading...
							{:then parsedDataRecieved}
								{JSON.stringify(parsedDataRecieved, null, 2)} MB
							{/await}
						</p>
						<p class="text-xs text-blue-500 dark:text-blue-300">+5.2% vs yesterday</p>
					</div>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/20"
					>
						<svg
							class="h-6 w-6 text-blue-600 dark:text-blue-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Success Rate -->
			<div
				class="card-hover rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
						<p class="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{successRate}%</p>
						<p class="text-xs text-red-500 dark:text-red-300">{100 - successRate}% errors</p>
					</div>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20"
					>
						<svg
							class="h-6 w-6 text-emerald-600 dark:text-emerald-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Active Alerts -->
			<div
				class="card-hover rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-gray-500 dark:text-gray-400">Active Alerts</p>
						<p class="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{activeAlerts}</p>
						<p class="text-xs text-yellow-500 dark:text-yellow-300">2 medium, 1 low</p>
					</div>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-500/20"
					>
						<svg
							class="h-6 w-6 text-yellow-600 dark:text-yellow-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Alert Quota -->
			<div
				class="card-hover rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="flex items-center justify-between">
					<div class="flex-1">
						<p class="text-sm text-gray-500 dark:text-gray-400">Alert Messages</p>
						<p class="text-3xl font-bold text-purple-600 dark:text-purple-400">
							{alertQuota}<span class="text-lg text-gray-400 dark:text-gray-500">/100</span>
						</p>
						<div class="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
							<div
								class="h-2 rounded-full bg-purple-500 dark:bg-purple-400"
								style="width: {alertQuota}%"
							></div>
						</div>
						<p class="mt-1 text-xs text-purple-500 dark:text-purple-300">
							{100 - alertQuota} remaining today
						</p>
					</div>
					<div
						class="ml-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-500/20"
					>
						<svg
							class="h-6 w-6 text-purple-600 dark:text-purple-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
							/>
						</svg>
					</div>
				</div>
			</div>
		</div>

		<!-- Charts Row -->
		<div class="mb-8 grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
			<!-- Data Throughput Chart -->
			<div
				class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				<h3 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
					Data Throughput (1 hour)
				</h3>
				<div class="h-64">
					<canvas id="throughputChart"></canvas>
				</div>
			</div>

			<!-- Device Status Chart -->
			<div
				class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				<h3 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
					Device Status Distribution
				</h3>
				<div class="h-64">
					<canvas id="deviceChart"></canvas>
				</div>
			</div>
		</div>

		<!-- Bottom Row -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
			<!-- Recent Alerts -->
			<div
				class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				<h3 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Recent Alerts</h3>
				<div class="space-y-3">
					{#each recentAlerts as alert}
						<div
							class="flex items-center space-x-3 p-3 {getSeverityClasses(
								alert.severity
							)} rounded-lg border-l-4"
						>
							<div class="h-2 w-2 {getSeverityDotColor(alert.severity)} rounded-full"></div>
							<div class="flex-1">
								<p class="text-sm font-medium text-gray-900 dark:text-white">{alert.message}</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">{alert.time}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Scheduled Reports -->
			<div
				class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				<h3 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Next Reports</h3>
				<div class="space-y-3">
					{#each scheduledReports as report}
						<div
							class="flex items-center space-x-3 p-3 {getReportColorClasses(
								report.color
							)} rounded-lg border-l-4"
						>
							<div class="h-2 w-2 {getReportDotColor(report.color)} rounded-full"></div>
							<div class="flex-1">
								<p class="text-sm font-medium text-gray-900 dark:text-white">{report.name}</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">{report.time}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Battery Levels -->
			<div
				class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				<h3 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Battery Levels</h3>
				<div class="space-y-4">
					{#each batteryLevels as battery}
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600 dark:text-gray-300">{battery.name}</span>
							<div class="flex items-center space-x-2">
								<div class="h-2 w-20 rounded-full bg-gray-200 dark:bg-gray-700">
									<div
										class="{battery.color} h-2 rounded-full"
										style="width: {battery.level}%"
									></div>
								</div>
								<span class="text-xs text-green-600 dark:text-green-400">{battery.level}%</span>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Gateway Status -->
			<div
				class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				<h3 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Gateway Status</h3>

				<!-- Gateway Summary -->
				<div class="mb-4 grid grid-cols-2 gap-4">
					<div class="rounded-lg bg-green-100 p-3 text-center dark:bg-green-500/10">
						<p class="text-2xl font-bold text-green-600 dark:text-green-400">{gatewaysOnline}</p>
						<p class="text-xs text-green-500 dark:text-green-300">Online</p>
					</div>
					<div class="rounded-lg bg-red-100 p-3 text-center dark:bg-red-500/10">
						<p class="text-2xl font-bold text-red-600 dark:text-red-400">{gatewaysOffline}</p>
						<p class="text-xs text-red-500 dark:text-red-300">Offline</p>
					</div>
				</div>

				<!-- Individual Gateways -->
				<div class="space-y-2">
					{#each gateways as gateway}
						<div
							class="flex items-center justify-between p-2 {gateway.online
								? 'bg-green-100 dark:bg-green-500/10'
								: 'bg-red-100 dark:bg-red-500/10'} rounded-lg"
						>
							<div class="flex items-center space-x-2">
								<div
									class="h-2 w-2 {gateway.online ? 'bg-green-500' : 'bg-red-500'} rounded-full"
								></div>
								<span class="text-xs text-gray-900 dark:text-white">{gateway.id}</span>
							</div>
							<span
								class="text-xs {gateway.online
									? 'text-green-600 dark:text-green-400'
									: 'text-red-600 dark:text-red-400'}">{gateway.status}</span
							>
						</div>
					{/each}
				</div>

				<div class="mt-4 text-center">
					<p class="text-xs text-gray-500 dark:text-gray-400">
						Avg Latency: <span class="text-blue-600 dark:text-blue-400">23ms</span>
					</p>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	:global(body) {
		font-family: 'Inter', sans-serif;
	}

	.pulse-dot {
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.card-hover {
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
	}

	.card-hover:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
	}

	:global(.dark) .card-hover:hover {
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
	}
</style>
