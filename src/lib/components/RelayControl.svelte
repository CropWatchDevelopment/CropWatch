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

<div
	class="flex w-full flex-col gap-3 rounded-md border border-neutral-300 bg-white p-4 dark:border-neutral-600 dark:bg-zinc-800"
>
	<h3 class="flex items-center gap-2 text-sm font-semibold">
		<MaterialIcon name="power_settings_new" size={18} /> Relay Control
	</h3>
	<div class="grid grid-cols-2 gap-3">
		<!-- Both control buttons -->
		<div class="col-span-2 flex gap-2">
			<button
				class="relay-btn flex-1"
				disabled={bothBusy() || (relayState.relay1 && relayState.relay2)}
				on:click={() => setBoth(true)}
				aria-label="Turn BOTH relays ON"
			>
				<span class="flex items-center gap-1">
					<MaterialIcon name="flash_on" />
					<span>Both ON</span>
				</span>
			</button>
			<button
				class="relay-btn flex-1"
				disabled={bothBusy() || (!relayState.relay1 && !relayState.relay2)}
				on:click={() => setBoth(false)}
				aria-label="Turn BOTH relays OFF"
			>
				<span class="flex items-center gap-1">
					<MaterialIcon name="flash_off" />
					<span>Both OFF</span>
				</span>
			</button>
		</div>
		<!-- Existing individual relay buttons -->
		<button
			class="relay-btn"
			class:on={relayState.relay1}
			disabled={busy.relay1 || loadingInitial}
			on:click={() => toggleRelay('relay1')}
			aria-label={relayState.relay1 ? 'Turn Relay 1 OFF' : 'Turn Relay 1 ON'}
		>
			<span class="flex items-center gap-1">
				{#if loadingInitial}
					<Spinner small />
				{:else}
					<MaterialIcon name={relayState.relay1 ? 'toggle_on' : 'toggle_off'} />
				{/if}
				<span>Relay 1 {relayState.relay1 ? 'ON' : 'OFF'}</span>
			</span>
			{#if busy.relay1 && !loadingInitial}
				<Spinner small />
			{/if}
		</button>
		<button
			class="relay-btn"
			class:on={relayState.relay2}
			disabled={busy.relay2 || loadingInitial}
			on:click={() => toggleRelay('relay2')}
			aria-label={relayState.relay2 ? 'Turn Relay 2 OFF' : 'Turn Relay 2 ON'}
		>
			<span class="flex items-center gap-1">
				{#if loadingInitial}
					<Spinner small />
				{:else}
					<MaterialIcon name={relayState.relay2 ? 'toggle_on' : 'toggle_off'} />
				{/if}
				<span>Relay 2 {relayState.relay2 ? 'ON' : 'OFF'}</span>
			</span>
			{#if busy.relay2 && !loadingInitial}
				<Spinner small />
			{/if}
		</button>
	</div>
	<p class="text-[10px] text-neutral-500">Sends confirmed LoRaWAN downlink (ON/OFF).</p>
</div>

<style lang="postcss">
	@reference "tailwindcss";
	.relay-btn {
		@apply relative flex w-full items-center justify-between gap-2 rounded-md bg-neutral-100 px-3 py-2 text-xs font-medium transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600;
	}
	.relay-btn.on {
		@apply bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500;
	}
	.relay-btn.on :global(svg) {
		@apply text-white;
	}
	.relay-btn.loading {
		@apply cursor-wait opacity-70;
	}
</style>
