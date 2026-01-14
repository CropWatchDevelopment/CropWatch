<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import * as d3 from 'd3';
	import CWDialog from './CWDialog.svelte';
	import CWButton from './CWButton.svelte';

	type GatewayConnection = {
		gateway_id: string;
		gateway_name: string;
		rssi: number | null;
		snr: number | null;
		last_update: string;
	};

	type DeviceInfo = {
		dev_eui: string;
		name: string | null;
		location_id: number | null;
		location_name?: string | null;
		gateways: GatewayConnection[];
	};

	type Gateway = {
		gateway_id: string;
		gateway_name: string;
		is_online: boolean;
		devices: DeviceInfo[];
		updated_at: string | null;
	};

	type GatewayInfo = {
		gateway_id: string;
		gateway_name: string;
		is_online: boolean;
		device_count: number;
		updated_at: string | null;
	};

	type GraphNode = {
		id: string;
		label: string;
		type: 'gateway' | 'device';
		isOnline?: boolean;
		deviceInfo?: DeviceInfo;
		gatewayInfo?: GatewayInfo;
		x?: number;
		y?: number;
		fx?: number | null;
		fy?: number | null;
	};

	type GraphLink = {
		source: string | GraphNode;
		target: string | GraphNode;
		rssi?: number | null;
		snr?: number | null;
	};

	interface Props {
		gateways: Gateway[];
		height?: number;
		locationId?: number;
	}

	let { gateways, height = 500, locationId }: Props = $props();

	// Dialog state
	let dialogOpen = $state(false);
	let selectedDevice = $state<DeviceInfo | null>(null);

	// Search state
	let searchQuery = $state('');
	let searchResults = $state<GraphNode[]>([]);
	let showSearchResults = $state(false);

	// Store references for zoom control
	let currentZoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
	let currentSvg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
	let currentG: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
	let currentSimulation: d3.Simulation<GraphNode, GraphLink> | null = null;

	let containerEl: HTMLDivElement | undefined = $state();
	let width = $state(800);

	// Build graph data from gateways
	const graphData = $derived.by(() => {
		const nodes: GraphNode[] = [];
		const links: GraphLink[] = [];
		const deviceMap = new SvelteMap<string, DeviceInfo>();

		gateways.forEach((gateway) => {
			// Add gateway node
			nodes.push({
				id: `gw-${gateway.gateway_id}`,
				label: gateway.gateway_name || gateway.gateway_id,
				type: 'gateway',
				isOnline: gateway.is_online,
				gatewayInfo: {
					gateway_id: gateway.gateway_id,
					gateway_name: gateway.gateway_name,
					is_online: gateway.is_online,
					device_count: gateway.devices?.length ?? 0,
					updated_at: gateway.updated_at
				}
			});

			// Add device nodes and links
			(gateway.devices ?? []).forEach((device) => {
				const deviceId = `dev-${device.dev_eui}`;

				// Merge gateway connection info for devices connected to multiple gateways
				if (!deviceMap.has(device.dev_eui)) {
					deviceMap.set(device.dev_eui, {
						...device,
						gateways: []
					});
				}

				const existingDevice = deviceMap.get(device.dev_eui)!;
				// Add this gateway to the device's gateway list
				const gatewayConn = device.gateways?.find((g) => g.gateway_id === gateway.gateway_id);
				if (gatewayConn) {
					existingDevice.gateways.push(gatewayConn);
				} else {
					existingDevice.gateways.push({
						gateway_id: gateway.gateway_id,
						gateway_name: gateway.gateway_name,
						rssi: null,
						snr: null,
						last_update: ''
					});
				}

				// Add link from gateway to device with signal info
				const connectionInfo = device.gateways?.find((g) => g.gateway_id === gateway.gateway_id);
				links.push({
					source: `gw-${gateway.gateway_id}`,
					target: deviceId,
					rssi: connectionInfo?.rssi ?? null,
					snr: connectionInfo?.snr ?? null
				});
			});
		});

		// Add device nodes after collecting all gateway connections
		deviceMap.forEach((device, dev_eui) => {
			nodes.push({
				id: `dev-${dev_eui}`,
				label: device.name || dev_eui,
				type: 'device',
				deviceInfo: device
			});
		});

		return { nodes, links };
	});

	function handleDeviceClick(deviceInfo: DeviceInfo) {
		selectedDevice = deviceInfo;
		dialogOpen = true;
	}

	function navigateToDevice() {
		if (selectedDevice) {
			const locId = locationId ?? selectedDevice.location_id;
			if (locId) {
				goto(`/locations/location/${locId}/devices/device/${selectedDevice.dev_eui}`);
			}
		}
		dialogOpen = false;
	}

	function getSignalStrengthLabel(rssi: number | null): { label: string; color: string } {
		if (rssi === null) return { label: 'Unknown', color: 'text-slate-400' };
		if (rssi >= -70) return { label: 'Excellent', color: 'text-emerald-400' };
		if (rssi >= -85) return { label: 'Good', color: 'text-sky-400' };
		if (rssi >= -100) return { label: 'Fair', color: 'text-amber-400' };
		return { label: 'Poor', color: 'text-rose-400' };
	}

	function getSignalBars(rssi: number | null): number {
		if (rssi === null) return 0;
		if (rssi >= -70) return 4;
		if (rssi >= -85) return 3;
		if (rssi >= -100) return 2;
		return 1;
	}

	function getTimeAgo(dateString: string | null): string {
		if (!dateString) return 'Never';
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffSecs = Math.floor(diffMs / 1000);
		const diffMins = Math.floor(diffSecs / 60);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffSecs < 60) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return `${Math.floor(diffDays / 7)}w ago`;
	}

	// Search functionality
	$effect(() => {
		if (searchQuery.trim().length > 0) {
			const query = searchQuery.toLowerCase();
			searchResults = graphData.nodes.filter((node) => {
				if (node.type === 'gateway') {
					return (
						node.label.toLowerCase().includes(query) ||
						node.gatewayInfo?.gateway_id.toLowerCase().includes(query)
					);
				} else {
					return (
						node.label.toLowerCase().includes(query) ||
						node.deviceInfo?.dev_eui.toLowerCase().includes(query)
					);
				}
			});
			showSearchResults = true;
		} else {
			searchResults = [];
			showSearchResults = false;
		}
	});

	function focusOnNode(node: GraphNode) {
		if (!currentSvg || !currentZoom || node.x === undefined || node.y === undefined) return;

		const scale = 1.5;
		const x = width / 2 - node.x * scale;
		const y = height / 2 - node.y * scale;

		currentSvg
			.transition()
			.duration(500)
			.call(currentZoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));

		searchQuery = '';
		showSearchResults = false;
	}

	function zoomIn() {
		if (!currentSvg || !currentZoom) return;
		currentSvg.transition().duration(300).call(currentZoom.scaleBy, 1.5);
	}

	function zoomOut() {
		if (!currentSvg || !currentZoom) return;
		currentSvg.transition().duration(300).call(currentZoom.scaleBy, 0.67);
	}

	function resetZoom() {
		if (!currentSvg || !currentZoom || !currentG) return;
		const bounds = currentG.node()?.getBBox();
		if (bounds && bounds.width > 0 && bounds.height > 0) {
			const fullWidth = width;
			const fullHeight = height;
			const padding = 40;
			const scale = Math.min(
				(fullWidth - padding * 2) / bounds.width,
				(fullHeight - padding * 2) / bounds.height,
				1
			);
			const translate = [
				fullWidth / 2 - scale * (bounds.x + bounds.width / 2),
				fullHeight / 2 - scale * (bounds.y + bounds.height / 2)
			];
			currentSvg
				.transition()
				.duration(500)
				.call(currentZoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
		}
	}

	function renderGraph() {
		if (!containerEl || graphData.nodes.length === 0) return;

		// Clear previous content
		d3.select(containerEl).select('svg').remove();

		const svg = d3
			.select(containerEl)
			.append('svg')
			.attr('width', '100%')
			.attr('height', height)
			.attr('viewBox', `0 0 ${width} ${height}`);

		// Store reference
		currentSvg = svg;

		// Add zoom behavior
		const g = svg.append('g');
		currentG = g;
		
		const zoom = d3.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 4])
			.on('zoom', (event) => {
				g.attr('transform', event.transform);
			});

		// Store reference
		currentZoom = zoom;

		svg.call(zoom)
			.on('dblclick.zoom', null); // Disable double-click zoom

		// Define arrow marker for links
		svg
			.append('defs')
			.append('marker')
			.attr('id', 'arrowhead')
			.attr('viewBox', '-0 -5 10 10')
			.attr('refX', 25)
			.attr('refY', 0)
			.attr('orient', 'auto')
			.attr('markerWidth', 6)
			.attr('markerHeight', 6)
			.append('path')
			.attr('d', 'M 0,-5 L 10,0 L 0,5')
			.attr('fill', '#475569');

		// Create force simulation
		const simulation = d3
			.forceSimulation<GraphNode>(graphData.nodes as GraphNode[])
			.force(
				'link',
				d3
					.forceLink<GraphNode, GraphLink>(graphData.links)
					.id((d) => d.id)
					.distance(150)
			)
			.force('charge', d3.forceManyBody().strength(-500))
			.force('center', d3.forceCenter(width / 2, height / 2))
			.force('collision', d3.forceCollide().radius((d) => (d as GraphNode).type === 'gateway' ? 90 : 40));

		// Store reference
		currentSimulation = simulation;

		// Create links
		const link = g
			.append('g')
			.attr('class', 'links')
			.selectAll('line')
			.data(graphData.links)
			.join('line')
			.attr('stroke', '#475569')
			.attr('stroke-width', 2)
			.attr('stroke-opacity', 0.6)
			.attr('marker-end', 'url(#arrowhead)');

		// Create node groups
		const node = g
			.append('g')
			.attr('class', 'nodes')
			.selectAll<SVGGElement, GraphNode>('g')
			.data(graphData.nodes as GraphNode[])
			.join('g')
			.attr('cursor', 'grab')
			.call(
				d3
					.drag<SVGGElement, GraphNode>()
					.on('start', (event, d) => {
						if (!event.active) simulation.alphaTarget(0.3).restart();
						d.fx = d.x;
						d.fy = d.y;
					})
					.on('drag', (event, d) => {
						d.fx = event.x;
						d.fy = event.y;
					})
					.on('end', (event, d) => {
						if (!event.active) simulation.alphaTarget(0);
						d.fx = null;
						d.fy = null;
					})
			);

		// Gateway nodes (rectangles) - calculate width based on name length
		const gatewayNodes = node.filter((d) => d.type === 'gateway');

		gatewayNodes.each(function (d) {
			const group = d3.select(this);
			const name = d.gatewayInfo?.gateway_name || d.label;
			const deviceCount = d.gatewayInfo?.device_count ?? 0;
			const lastSeen = getTimeAgo(d.gatewayInfo?.updated_at ?? null);

			// Calculate width based on name length (min 160, max 280)
			const charWidth = 7;
			const calculatedWidth = Math.max(160, Math.min(280, name.length * charWidth + 40));
			const rectHeight = 70;

			// Background rectangle
			group
				.append('rect')
				.attr('width', calculatedWidth)
				.attr('height', rectHeight)
				.attr('x', -calculatedWidth / 2)
				.attr('y', -rectHeight / 2)
				.attr('rx', 8)
				.attr('ry', 8)
				.attr('fill', d.isOnline ? '#065f46' : '#881337')
				.attr('stroke', d.isOnline ? '#10b981' : '#f43f5e')
				.attr('stroke-width', 2);

			// Gateway icon + name (first row)
			group
				.append('text')
				.attr('x', 0)
				.attr('y', -18)
				.attr('text-anchor', 'middle')
				.attr('fill', '#e2e8f0')
				.attr('font-size', '12px')
				.attr('font-weight', '600')
				.text(`📡 ${name}`);

			// Device count (second row)
			group
				.append('text')
				.attr('x', 0)
				.attr('y', 2)
				.attr('text-anchor', 'middle')
				.attr('fill', '#94a3b8')
				.attr('font-size', '11px')
				.text(`${deviceCount} device${deviceCount !== 1 ? 's' : ''} connected`);

			// Last seen (third row)
			group
				.append('text')
				.attr('x', 0)
				.attr('y', 20)
				.attr('text-anchor', 'middle')
				.attr('fill', d.isOnline ? '#6ee7b7' : '#fda4af')
				.attr('font-size', '10px')
				.text(`Last seen: ${lastSeen}`);
		});

		// Device nodes (circles)
		const deviceNodes = node.filter((d) => d.type === 'device');

		deviceNodes
			.append('circle')
			.attr('r', 28)
			.attr('fill', '#1e293b')
			.attr('stroke', '#0ea5e9')
			.attr('stroke-width', 2)
			.attr('cursor', 'pointer')
			.on('click', (event, d) => {
				event.stopPropagation();
				if (d.deviceInfo) {
					handleDeviceClick(d.deviceInfo);
				}
			});

		// Device icon
		deviceNodes
			.append('text')
			.attr('text-anchor', 'middle')
			.attr('y', -5)
			.attr('fill', '#0ea5e9')
			.attr('font-size', '14px')
			.attr('pointer-events', 'none')
			.text('📦');

		// Device label
		deviceNodes
			.append('text')
			.attr('text-anchor', 'middle')
			.attr('y', 12)
			.attr('fill', '#94a3b8')
			.attr('font-size', '9px')
			.attr('pointer-events', 'none')
			.text((d) => truncateLabel(d.label, 10));

		// Add tooltips
		node.append('title').text((d) => d.label);

		// Update positions on tick
		simulation.on('tick', () => {
			link
				.attr('x1', (d) => (d.source as GraphNode).x ?? 0)
				.attr('y1', (d) => (d.source as GraphNode).y ?? 0)
				.attr('x2', (d) => (d.target as GraphNode).x ?? 0)
				.attr('y2', (d) => (d.target as GraphNode).y ?? 0);

			node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
		});

		// Initial zoom to fit
		setTimeout(() => {
			const bounds = g.node()?.getBBox();
			if (bounds && bounds.width > 0 && bounds.height > 0) {
				const fullWidth = width;
				const fullHeight = height;
				const padding = 40;
				const scale = Math.min(
					(fullWidth - padding * 2) / bounds.width,
					(fullHeight - padding * 2) / bounds.height,
					1
				);
				const translate = [
					fullWidth / 2 - scale * (bounds.x + bounds.width / 2),
					fullHeight / 2 - scale * (bounds.y + bounds.height / 2)
				];
				svg.transition().duration(500).call(
					zoom.transform,
					d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
				);
			}
		}, 600);
	}

	function truncateLabel(label: string, maxLength: number): string {
		if (label.length <= maxLength) return label;
		return label.substring(0, maxLength - 1) + '…';
	}

	// Handle resize
	function handleResize() {
		if (containerEl) {
			width = containerEl.clientWidth;
			renderGraph();
		}
	}

	onMount(() => {
		handleResize();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});

	// Re-render when gateways data changes
	$effect(() => {
		// Track gateways to trigger re-render when data changes
		const _ = gateways;
		if (containerEl) {
			untrack(() => renderGraph());
		}
	});
</script>

<!-- Search and controls -->
<div class="mb-3 flex flex-wrap items-center gap-3">
	<!-- Search box -->
	<div class="relative flex-1 min-w-[200px] max-w-md">
		<div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
			<svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
		</div>
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search gateway or device (name, dev_eui)..."
			class="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
			onfocus={() => (showSearchResults = searchQuery.length > 0)}
			onblur={() => setTimeout(() => (showSearchResults = false), 200)}
		/>
		
		<!-- Search results dropdown -->
		{#if showSearchResults && searchResults.length > 0}
			<div class="absolute z-20 mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 shadow-xl max-h-64 overflow-y-auto">
				{#each searchResults as result (result.id)}
					<button
						type="button"
						class="w-full px-4 py-2 text-left hover:bg-slate-700 flex items-center gap-3 border-b border-slate-700/50 last:border-b-0"
						onclick={() => focusOnNode(result)}
					>
						<span class="text-lg">{result.type === 'gateway' ? '📡' : '📦'}</span>
						<div class="min-w-0 flex-1">
							<p class="text-sm text-slate-100 truncate">{result.label}</p>
							<p class="text-xs text-slate-400 font-mono truncate">
								{result.type === 'gateway' ? result.gatewayInfo?.gateway_id : result.deviceInfo?.dev_eui}
							</p>
						</div>
						{#if result.type === 'gateway'}
							<span class="text-xs px-2 py-0.5 rounded {result.isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
								{result.isOnline ? 'Online' : 'Offline'}
							</span>
						{/if}
					</button>
				{/each}
			</div>
		{:else if showSearchResults && searchQuery.length > 0}
			<div class="absolute z-20 mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 shadow-xl p-4 text-center text-sm text-slate-400">
				No results found
			</div>
		{/if}
	</div>

	<!-- Zoom controls -->
	<div class="flex items-center gap-1">
		<button
			type="button"
			onclick={zoomIn}
			class="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors"
			title="Zoom in"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
			</svg>
		</button>
		<button
			type="button"
			onclick={zoomOut}
			class="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors"
			title="Zoom out"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
			</svg>
		</button>
		<button
			type="button"
			onclick={resetZoom}
			class="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors"
			title="Fit to view"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
			</svg>
		</button>
	</div>
</div>

<div
	bind:this={containerEl}
	class="network-topology w-full rounded-xl bg-slate-950 border border-slate-700"
	style="height: {height}px;"
>
	{#if graphData.nodes.length === 0}
		<div class="h-full flex items-center justify-center">
			<div class="text-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-16 w-16 mx-auto text-slate-600 mb-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
					/>
				</svg>
				<p class="text-slate-400">No gateways to display</p>
				<p class="mt-1 text-sm text-slate-400">Add a gateway to see the network topology.</p>
			</div>
		</div>
	{/if}
</div>

<!-- Device Info Dialog -->
<CWDialog bind:open={dialogOpen} title="Device Information">
	{#if selectedDevice}
		<div class="space-y-4">
			<!-- Device Name & ID -->
			<div class="rounded-lg bg-slate-800/50 p-4">
				<div class="flex items-center gap-3">
					<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-500/20">
						<span class="text-2xl">📦</span>
					</div>
					<div class="min-w-0 flex-1">
						<h3 class="font-medium text-slate-100 truncate">
							{selectedDevice.name || 'Unnamed Device'}
						</h3>
						<p class="text-sm text-slate-400 font-mono truncate">{selectedDevice.dev_eui}</p>
					</div>
				</div>
			</div>

			<!-- Location -->
			{#if selectedDevice.location_name}
				<div class="flex items-center gap-3 text-sm">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5 text-slate-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
						/>
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					<span class="text-slate-300">{selectedDevice.location_name}</span>
				</div>
			{/if}

			<!-- Gateway Connections -->
			<div class="space-y-2">
				<h4 class="text-sm font-medium text-slate-300">Gateway Connections</h4>
				<div class="space-y-2">
					{#each selectedDevice.gateways as gateway (gateway.gateway_id)}
						{@const signalInfo = getSignalStrengthLabel(gateway.rssi)}
						{@const bars = getSignalBars(gateway.rssi)}
						<div class="rounded-lg bg-slate-800/50 p-3">
							<div class="flex items-center justify-between gap-3">
								<div class="flex items-center gap-2 min-w-0">
									<span class="text-lg">📡</span>
									<span class="text-sm text-slate-200 truncate">{gateway.gateway_name || gateway.gateway_id}</span>
								</div>
								<div class="flex items-center gap-2 shrink-0">
									<!-- Signal bars -->
									<div class="flex items-end gap-0.5 h-4">
										{#each [1, 2, 3, 4] as barIndex (barIndex)}
											<div
												class="w-1 rounded-sm transition-colors {barIndex <= bars
													? signalInfo.color.replace('text-', 'bg-')
													: 'bg-slate-600'}"
												style="height: {barIndex * 25}%"
											></div>
										{/each}
									</div>
									<span class="text-xs {signalInfo.color}">{signalInfo.label}</span>
								</div>
							</div>
							{#if gateway.rssi !== null || gateway.snr !== null}
								<div class="mt-2 flex items-center gap-4 text-xs text-slate-400">
									{#if gateway.rssi !== null}
										<span>RSSI: <span class="text-slate-300">{gateway.rssi} dBm</span></span>
									{/if}
									{#if gateway.snr !== null}
										<span>SNR: <span class="text-slate-300">{gateway.snr} dB</span></span>
									{/if}
								</div>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-slate-400 italic">No gateway connection data available</p>
					{/each}
				</div>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-700">
				<CWButton variant="ghost" onclick={() => (dialogOpen = false)}>
					Close
				</CWButton>
				{#if locationId || selectedDevice.location_id}
					<CWButton onclick={navigateToDevice}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4 mr-1.5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
						Go to Device
					</CWButton>
				{/if}
			</div>
		</div>
	{/if}
</CWDialog>

<style>
	.network-topology :global(svg) {
		display: block;
	}
</style>
