<script lang="ts">
	import { DRAGINO_LT22222L_PAYLOADS } from '$lib/lorawan/dragino';
	import { success, error as showError } from '$lib/stores/toast.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import MaterialIcon from '$lib/components/UI/icons/MaterialIcon.svelte';
	import type { DeviceWithType } from '$lib/models/Device';
	import { onMount } from 'svelte';

	export let device: DeviceWithType;
	const devEui = device.dev_eui;
	// Track relay busy state per relay (not per payload) and optimistic on/off state
	type RelayKey = 'relay1' | 'relay2';
	let busy: Record<RelayKey, boolean> = { relay1: false, relay2: false };
	let relayState: Record<RelayKey, boolean> = { relay1: false, relay2: false }; // false = OFF
	let initialLoaded = false;
	let loadingInitial = false;

	function setBusy(relay: RelayKey, val: boolean) {
		busy = { ...busy, [relay]: val };
	}

	function coerceBool(v: any): boolean | undefined {
		if (v === undefined || v === null) return undefined;
		if (typeof v === 'boolean') return v;
		if (typeof v === 'number') return v !== 0;
		if (typeof v === 'string') {
			const s = v.toLowerCase();
			if (['on', 'off'].includes(s)) return s === 'on';
			if (['1', '0'].includes(s)) return s === '1';
		}
		return undefined;
	}

	async function loadInitialState() {
		loadingInitial = true;
		try {
			const res = await fetch(`/api/devices/${devEui}/status`);
			if (res.ok) {
				const latest = await res.json();
				// Try several possible field names
				const r1 = coerceBool(latest.relay_1 ?? latest.relay1 ?? latest.r1 ?? latest.relayOne);
				const r2 = coerceBool(latest.relay_2 ?? latest.relay2 ?? latest.r2 ?? latest.relayTwo);
				relayState = {
					relay1: r1 ?? relayState.relay1,
					relay2: r2 ?? relayState.relay2
				};
				initialLoaded = true;
			} else {
				// Non-fatal if status not available
				initialLoaded = true;
			}
		} catch (e) {
			initialLoaded = true; // proceed with defaults
		} finally {
			loadingInitial = false;
		}
	}

	onMount(() => {
		void loadInitialState();
	});

	async function sendCommand(relay: RelayKey, turnOn: boolean) {
		if (busy[relay]) return;
		setBusy(relay, true);
		const payloadName = (relay + (turnOn ? 'On' : 'Off')) as keyof typeof DRAGINO_LT22222L_PAYLOADS;
		try {
			const res = await fetch(`/api/devices/${devEui}/downlink`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ payloadName })
			});
			if (!res.ok) {
				const txt = await res.text();
				showError('Downlink failed: ' + txt);
			} else {
				relayState = { ...relayState, [relay]: turnOn };
				success(`Relay ${relay === 'relay1' ? '1' : '2'} ${turnOn ? 'ON' : 'OFF'}`);
			}
		} catch (e) {
			showError('Downlink failed');
		} finally {
			setBusy(relay, false);
		}
	}

	function toggleRelay(relay: RelayKey) {
		sendCommand(relay, !relayState[relay]);
	}

	function bothBusy() {
		return busy.relay1 || busy.relay2 || loadingInitial;
	}

	async function setBoth(turnOn: boolean) {
		if (bothBusy()) return;
		// Run in parallel
		await Promise.all([sendCommand('relay1', turnOn), sendCommand('relay2', turnOn)]);
		// Success toasts handled individually; optionally consolidate here.
	}
</script>

<div class="relay-control-panel">
	<!-- Header -->
	<div class="panel-header">
		<div class="header-indicator">
			<MaterialIcon name="electrical_services" size={20} />
		</div>
		<div class="header-content">
			<h3 class="header-title">RELAY CONTROL SYSTEM</h3>
			<div class="header-status">
				<div class="status-dot {bothBusy() ? 'busy' : 'ready'}"></div>
				<span class="status-text">
					{bothBusy() ? 'PROCESSING' : 'READY'}
				</span>
			</div>
		</div>
	</div>

	<!-- System Controls -->
	<div class="system-controls">
		<div class="control-group">
			<div class="control-label">SYSTEM OVERRIDE</div>
			<div class="control-buttons">
				<button
					class="system-btn power-on"
					disabled={bothBusy() || (relayState.relay1 && relayState.relay2)}
					on:click={() => setBoth(true)}
					aria-label="Turn BOTH relays ON"
				>
					<div class="btn-indicator on"></div>
					<MaterialIcon name="power" size={18} />
					<span>ALL ON</span>
				</button>
				<button
					class="system-btn power-off"
					disabled={bothBusy() || (!relayState.relay1 && !relayState.relay2)}
					on:click={() => setBoth(false)}
					aria-label="Turn BOTH relays OFF"
				>
					<div class="btn-indicator off"></div>
					<MaterialIcon name="power_off" size={18} />
					<span>ALL OFF</span>
				</button>
			</div>
		</div>
	</div>

	<!-- Individual Relay Controls -->
	<div class="relay-grid">
		{#each [{ key: 'relay1', label: 'RELAY 01', channel: 'A' }, { key: 'relay2', label: 'RELAY 02', channel: 'B' }] as relay}
			<div class="relay-unit {relayState[relay.key] ? 'active' : 'inactive'}">
				<div class="relay-header">
					<div class="channel-badge">CH.{relay.channel}</div>
					<div class="relay-status">
						<div class="status-indicator {relayState[relay.key] ? 'on' : 'off'}">
							{#if loadingInitial}
								<div class="loading-pulse"></div>
							{:else}
								<div class="power-dot"></div>
							{/if}
						</div>
						<span class="status-label">
							{relayState[relay.key] ? 'ACTIVE' : 'STANDBY'}
						</span>
					</div>
				</div>

				<div class="relay-label">{relay.label}</div>

				<button
					class="relay-toggle {relayState[relay.key] ? 'on' : 'off'}"
					disabled={busy[relay.key] || loadingInitial}
					on:click={() => toggleRelay(relay.key)}
					aria-label={relayState[relay.key] ? `Turn ${relay.label} OFF` : `Turn ${relay.label} ON`}
				>
					<div class="toggle-track">
						<div class="toggle-handle">
							{#if busy[relay.key] && !loadingInitial}
								<div class="spinner-mini"></div>
							{:else}
								<MaterialIcon name={relayState[relay.key] ? 'power' : 'power_off'} size={14} />
							{/if}
						</div>
					</div>
					<div class="toggle-labels">
						<span class="label-off">OFF</span>
						<span class="label-on">ON</span>
					</div>
				</button>

				<div class="relay-metrics">
					<div class="metric">
						<span class="metric-label">LOAD</span>
						<span class="metric-value">{relayState[relay.key] ? '100%' : '0%'}</span>
					</div>
					<div class="metric">
						<span class="metric-label">V</span>
						<span class="metric-value">{relayState[relay.key] ? '24.0' : '0.0'}</span>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Footer Info -->
	<div class="panel-footer">
		<div class="footer-item">
			<MaterialIcon name="wifi" size={14} />
			<span>LoRaWAN Downlink</span>
		</div>
		<div class="footer-item">
			<MaterialIcon name="verified" size={14} />
			<span>Confirmed</span>
		</div>
		<div class="footer-divider"></div>
		<div class="footer-item device-id">
			<span>DEV: {devEui.slice(-8).toUpperCase()}</span>
		</div>
	</div>
</div>

<style lang="postcss">
	@reference "tailwindcss";

	.relay-control-panel {
		@apply w-full;
		@apply rounded-xl shadow-xl;
		@apply p-6;
		background: linear-gradient(135deg, var(--color-surface), var(--color-surface-raised));
		border: 2px solid var(--color-border);
		position: relative;
		overflow: hidden;
	}

	.relay-control-panel::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		@apply bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500;
	}

	/* Header */
	.panel-header {
		@apply mb-6 flex items-center gap-4 border-b pb-4;
		border-color: var(--color-border);
	}

	.header-indicator {
		@apply flex h-12 w-12 items-center justify-center;
		@apply rounded-lg shadow-lg;
		background-color: var(--color-text);
		color: var(--color-surface-raised);
	}

	.header-content {
		@apply flex-1;
	}

	.header-title {
		@apply text-lg font-bold;
		@apply tracking-wider;
		color: var(--color-text);
		font-family: 'Courier New', monospace;
	}

	.header-status {
		@apply mt-1 flex items-center gap-2;
	}

	.status-dot {
		@apply h-2 w-2 rounded-full;
	}
	.status-dot.ready {
		@apply bg-green-500 shadow-lg shadow-green-500/50;
		animation: pulse-green 2s infinite;
	}
	.status-dot.busy {
		@apply bg-orange-500 shadow-lg shadow-orange-500/50;
		animation: pulse-orange 1s infinite;
	}

	.status-text {
		@apply text-xs font-semibold text-slate-600 dark:text-slate-400;
		@apply tracking-widest;
		font-family: 'Courier New', monospace;
	}

	/* System Controls */
	.system-controls {
		@apply mb-6;
	}

	.control-group {
		@apply rounded-lg bg-slate-200 p-4 dark:bg-slate-700;
	}

	.control-label {
		@apply mb-3 text-xs font-bold text-slate-700 dark:text-slate-300;
		@apply tracking-widest;
		font-family: 'Courier New', monospace;
	}

	.control-buttons {
		@apply flex gap-3;
	}

	.system-btn {
		@apply flex flex-1 items-center justify-center gap-2;
		@apply rounded-lg px-4 py-3 text-sm font-semibold;
		@apply transition-all duration-200;
		@apply border-2;
		position: relative;
		overflow: hidden;
	}

	.power-on {
		border-color: #10b981;
		background-color: #059669;
		color: white;
	}
	.power-on:hover {
		background-color: #047857;
		box-shadow: 0 10px 15px -3px rgb(16 185 129 / 0.25);
	}
	.power-on:disabled {
		border-color: #94a3b8;
		background-color: #94a3b8;
		color: #64748b;
	}

	.power-off {
		border-color: #ef4444;
		background-color: #dc2626;
		color: white;
	}
	.power-off:hover {
		background-color: #b91c1c;
		box-shadow: 0 10px 15px -3px rgb(239 68 68 / 0.25);
	}
	.power-off:disabled {
		border-color: #94a3b8;
		background-color: #94a3b8;
		color: #64748b;
	}

	.btn-indicator {
		@apply absolute top-2 right-2 h-2 w-2 rounded-full;
	}
	.btn-indicator.on {
		@apply bg-green-300;
	}
	.btn-indicator.off {
		@apply bg-red-300;
	}

	/* Relay Grid */
	.relay-grid {
		@apply mb-6 grid grid-cols-1 gap-4 md:grid-cols-2;
	}

	.relay-unit {
		@apply rounded-lg bg-white p-4 dark:bg-slate-800;
		@apply border-2 transition-all duration-300;
		@apply shadow-lg;
	}

	.relay-unit.active {
		@apply border-green-500 bg-green-50 dark:bg-green-900/20;
		@apply shadow-green-500/20;
	}

	.relay-unit.inactive {
		@apply border-slate-300 dark:border-slate-600;
	}

	.relay-header {
		@apply mb-3 flex items-center justify-between;
	}

	.channel-badge {
		@apply bg-slate-900 text-slate-100 dark:bg-slate-100 dark:text-slate-900;
		@apply rounded px-2 py-1 text-xs font-bold;
		font-family: 'Courier New', monospace;
	}

	.relay-status {
		@apply flex items-center gap-2;
	}

	.status-indicator {
		@apply flex h-6 w-6 items-center justify-center rounded-full;
		@apply border-2;
	}

	.status-indicator.on {
		@apply border-green-400 bg-green-500;
		@apply shadow-lg shadow-green-500/50;
	}

	.status-indicator.off {
		@apply border-slate-300 bg-slate-400 dark:border-slate-500 dark:bg-slate-600;
	}

	.power-dot {
		@apply h-2 w-2 rounded-full bg-white;
	}

	.loading-pulse {
		@apply h-2 w-2 rounded-full bg-white;
		animation: pulse 1s infinite;
	}

	.status-label {
		@apply text-xs font-semibold text-slate-600 dark:text-slate-400;
		font-family: 'Courier New', monospace;
	}

	.relay-label {
		@apply mb-4 text-lg font-bold text-slate-900 dark:text-slate-100;
		@apply tracking-wider;
		font-family: 'Courier New', monospace;
	}

	/* Toggle Switch */
	.relay-toggle {
		@apply mb-4 w-full border-none bg-transparent p-0;
		@apply disabled:cursor-not-allowed disabled:opacity-50;
	}

	.toggle-track {
		@apply relative h-12 w-full rounded-full bg-slate-300 dark:bg-slate-600;
		@apply border-2 border-slate-400 dark:border-slate-500;
		@apply transition-all duration-300;
		@apply mb-2;
	}

	.relay-toggle.on .toggle-track {
		@apply border-green-400 bg-green-500;
		@apply shadow-inner shadow-green-600/50;
	}

	.toggle-handle {
		@apply absolute top-1 h-10 w-10 bg-white dark:bg-slate-100;
		@apply rounded-full shadow-lg;
		@apply flex items-center justify-center;
		@apply transition-all duration-300;
		@apply border-2 border-slate-300 dark:border-slate-400;
		left: 2px;
	}

	.relay-toggle.on .toggle-handle {
		@apply translate-x-full bg-white;
		@apply border-green-300;
		@apply shadow-green-500/25;
	}

	.spinner-mini {
		@apply h-3 w-3 border-2 border-slate-400 border-t-slate-600;
		@apply animate-spin rounded-full;
	}

	.toggle-labels {
		@apply flex justify-between px-2 text-xs font-bold;
		@apply text-slate-500 dark:text-slate-400;
		font-family: 'Courier New', monospace;
	}

	.relay-toggle.on .label-on,
	.relay-toggle.off .label-off {
		@apply text-slate-900 dark:text-slate-100;
	}

	/* Metrics */
	.relay-metrics {
		@apply flex gap-4;
	}

	.metric {
		@apply flex flex-col items-center;
	}

	.metric-label {
		@apply text-xs font-bold text-slate-500 dark:text-slate-400;
		font-family: 'Courier New', monospace;
	}

	.metric-value {
		@apply text-sm font-bold text-slate-900 dark:text-slate-100;
		font-family: 'Courier New', monospace;
	}

	/* Footer */
	.panel-footer {
		@apply flex items-center gap-4 border-t border-slate-300 pt-4 dark:border-slate-600;
		@apply text-xs text-slate-600 dark:text-slate-400;
	}

	.footer-item {
		@apply flex items-center gap-1;
	}

	.footer-divider {
		@apply flex-1;
	}

	.device-id {
		@apply font-mono font-semibold;
	}

	/* Animations */
	@keyframes pulse-green {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	@keyframes pulse-orange {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.relay-control-panel {
			@apply p-4;
		}

		.system-btn {
			@apply px-3 py-2 text-xs;
		}

		.relay-grid {
			@apply grid-cols-1;
		}
	}
</style>
