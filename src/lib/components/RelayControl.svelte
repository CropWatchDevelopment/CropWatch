<script lang="ts">
	import { DRAGINO_LT22222L_PAYLOADS } from '$lib/lorawan/dragino';
	import { success, error as showError } from '$lib/stores/toast.svelte';
	import { _ } from 'svelte-i18n';
	import Spinner from '$lib/components/Spinner.svelte';
	import { onMount, onDestroy } from 'svelte';
	import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
	import type { Device } from '$lib/models/Device';

	let {
		supabase,
		device,
		latestData
	}: { supabase: SupabaseClient | undefined; device: Device | undefined; latestData: any } =
		$props();

	const devEui = $derived(device.dev_eui);
	const t = $derived(_);

	function translate(key: string, params?: Record<string, unknown>) {
		const fn = t as unknown;
		if (typeof fn === 'function') {
			return (fn as (k: string, o?: Record<string, unknown>) => string)(key, params);
		}
		return params ? key.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`)) : key;
	}
	type RelayKey = 'relay1' | 'relay2';
	const relays: Array<{ key: RelayKey; labelKey: string }> = [
		{ key: 'relay1', labelKey: 'Relay 1' },
		{ key: 'relay2', labelKey: 'Relay 2' }
	];

	const POLL_INTERVAL_MS = 10_000;
	const COOLDOWN_SECONDS = 15;

	let busy: Record<RelayKey, boolean> = $state({ relay1: false, relay2: false });
	let relayState: Record<RelayKey, boolean> = $state({ relay1: false, relay2: false });
	let loadingInitial = $state(false);
	let cooldownRemaining = $state(0);

	let statusInterval: ReturnType<typeof setInterval> | undefined;
	let cooldownTimer: ReturnType<typeof setInterval> | undefined;
	let broadcastChannel: RealtimeChannel | undefined = $state();

	broadcastChannel = supabase.channel('cw_relay_data', {
		config: { private: true }
	});
	broadcastChannel.on('broadcast', { event: '*' }, (payload) => {
		startCooldown();
		payload.payload.record.relay_1;
		payload.payload.record.relay_2;
		if (payload.payload.record.dev_eui !== devEui) return;
		const r1 = coerceBool(payload.payload.record.relay_1 ?? payload.payload.record.relay1);
		const r2 = coerceBool(payload.payload.record.relay_2 ?? payload.payload.record.relay2);
		relayState = {
			relay1: r1 ?? relayState.relay1,
			relay2: r2 ?? relayState.relay2
		};
		latestData = payload.payload.record;
	});
	broadcastChannel.subscribe((status, err) => {
		console.debug('[Dashboard] Broadcast channel status', { status, err });
		if (status === 'SUBSCRIBED') {
			// Successfully subscribed
			console.log('Broadcast channel subscribed');
		}
		if (status === 'CHANNEL_ERROR') {
			console.error('Broadcast channel error', err);
		}
		if (status === 'TIMED_OUT') {
			console.warn('Broadcast channel timed out');
		}
		if (status === 'CLOSED') {
			console.warn('Broadcast channel closed');
			broadcastChannel = undefined;
		}
	});

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
			if (['true', 'false', 't', 'f', 'yes', 'no'].includes(s))
				return ['true', 't', 'yes'].includes(s);
			if (['1', '0'].includes(s)) return s === '1';
		}
		return undefined;
	}

	function clearCooldownTimer() {
		if (cooldownTimer) {
			clearInterval(cooldownTimer);
			cooldownTimer = undefined;
		}
	}

	function startCooldown() {
		clearCooldownTimer();
		cooldownRemaining = COOLDOWN_SECONDS;
		cooldownTimer = setInterval(() => {
			cooldownRemaining = Math.max(0, cooldownRemaining - 1);
			if (cooldownRemaining === 0) {
				clearCooldownTimer();
			}
		}, 1000);
	}

	async function loadInitialState(showLoader = false) {
		if (showLoader) {
			loadingInitial = true;
		}
		try {
			const res = await fetch(`/api/devices/${devEui}/status`);
			if (res.ok) {
				const latest = await res.json();
				const r1 = coerceBool(latest.relay_1 ?? latest.relay1 ?? latest.r1 ?? latest.relayOne);
				const r2 = coerceBool(latest.relay_2 ?? latest.relay2 ?? latest.r2 ?? latest.relayTwo);
				relayState = {
					relay1: r1 ?? relayState.relay1,
					relay2: r2 ?? relayState.relay2
				};
			}
		} catch (e) {
			// ignore and keep defaults
		} finally {
			if (showLoader) {
				loadingInitial = false;
			}
		}
	}

	onMount(() => {
		void loadInitialState(true);
		statusInterval = setInterval(() => {
			void loadInitialState();
		}, POLL_INTERVAL_MS);

		return () => {
			if (statusInterval) {
				clearInterval(statusInterval);
				statusInterval = undefined;
			}
			clearCooldownTimer();
		};
	});

	onDestroy(() => {
		if (statusInterval) {
			clearInterval(statusInterval);
			statusInterval = undefined;
		}
		clearCooldownTimer();
	});

	function buttonDisabled(relay: RelayKey, turnOn: boolean) {
		return loadingInitial || busy[relay] || cooldownRemaining > 0 || relayState[relay] === turnOn;
	}

	function relayStatusText(relay: RelayKey) {
		if (loadingInitial) {
			return translate('Checking status…');
		}
		return relayState[relay] ? translate('Currently ON') : translate('Currently OFF');
	}

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
				showError(translate('Downlink failed: {reason}', { reason: txt }));
			} else {
				relayState = { ...relayState, [relay]: turnOn };
				success(
					translate('Relay {number} {state}', {
						number: relay === 'relay1' ? '1' : '2',
						state: translate(turnOn ? 'ON' : 'OFF')
					})
				);
			}
		} catch (e) {
			showError(translate('Downlink failed'));
		} finally {
			setBusy(relay, false);
		}
	}

	async function handleRelayPress(relay: RelayKey, turnOn: boolean) {
		if (buttonDisabled(relay, turnOn)) return;
		startCooldown();
		await sendCommand(relay, turnOn);
	}
</script>

<div class="relay-control" aria-live="polite">
	<h2 class="heading">{$_('Relay control')}</h2>
	<p class="subheading">
		{$_('Two big buttons for each relay. Tap once and wait for the light to change.')}
	</p>

	{#if cooldownRemaining > 0}
		<div class="cooldown-banner" role="status" aria-live="polite">
			{translate('Next action available in {seconds}s', { seconds: cooldownRemaining })}
		</div>
	{/if}

	{#if loadingInitial}
		<div class="loading-state">
			<Spinner />
			<span>{$_('Checking relay status…')}</span>
		</div>
	{/if}

	<div class="relay-list">
		{#each relays as relay}
			<section class="relay-card" aria-label={$_(relay.labelKey)}>
				<header class="relay-card-header">
					<h3>{$_(relay.labelKey)}</h3>
					<span class="relay-status">{relayStatusText(relay.key)}</span>
				</header>
				<div class="button-row">
					<button
						type="button"
						class="relay-button on"
						disabled={buttonDisabled(relay.key, true)}
						onclick={() => handleRelayPress(relay.key, true)}
						aria-pressed={relayState[relay.key]}
					>
						<span>{$_('ON')}</span>
					</button>
					<button
						type="button"
						class="relay-button off"
						disabled={buttonDisabled(relay.key, false)}
						onclick={() => handleRelayPress(relay.key, false)}
						aria-pressed={!relayState[relay.key]}
					>
						<span>{$_('OFF')}</span>
					</button>
				</div>
				<p class="relay-feedback" role="status">
					{#if busy[relay.key]}
						{$_('Sending command…')}
					{:else}
						{relayStatusText(relay.key)}
					{/if}
				</p>
			</section>
		{/each}
	</div>
</div>

<style lang="postcss">
	@reference "tailwindcss";

	.relay-control {
		@apply w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800;
	}

	.heading {
		@apply text-2xl font-bold text-slate-900 dark:text-slate-50;
	}

	.subheading {
		@apply mt-2 text-base text-slate-600 dark:text-slate-300;
	}

	.cooldown-banner {
		@apply mt-4 rounded-xl border border-amber-400 bg-amber-100 px-4 py-3 text-center text-lg font-semibold text-amber-800 shadow-sm dark:border-amber-500 dark:bg-amber-900/40 dark:text-amber-200;
	}

	.loading-state {
		@apply mt-6 flex items-center gap-3 text-lg text-slate-700 dark:text-slate-200;
	}

	.loading-state :global(svg) {
		height: 48px;
		width: 48px;
	}

	.relay-list {
		@apply mt-8 flex flex-col gap-6;
	}

	.relay-card {
		@apply rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-md transition-all dark:border-slate-600 dark:bg-slate-900/50;
	}

	.relay-card-header {
		@apply flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between;
	}

	.relay-card h3 {
		@apply text-2xl font-semibold text-slate-900 dark:text-slate-50;
	}

	.relay-status {
		@apply text-lg font-medium text-slate-700 dark:text-slate-300;
	}

	.button-row {
		@apply mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2;
	}

	.relay-button {
		@apply flex items-center justify-center rounded-2xl border-4 font-bold tracking-wide transition-all;
		@apply py-6 text-3xl shadow-lg;
		@apply focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2;
		@apply active:scale-95;
		touch-action: manipulation;
	}

	.relay-button span {
		@apply uppercase;
	}

	.relay-button.on {
		@apply border-emerald-500 bg-emerald-600 text-white;
	}

	.relay-button.on:not(:disabled):hover {
		@apply bg-emerald-500;
	}

	.relay-button.off {
		@apply border-rose-500 bg-rose-600 text-white;
	}

	.relay-button.off:not(:disabled):hover {
		@apply bg-rose-500;
	}

	.relay-button:disabled {
		@apply cursor-not-allowed opacity-60;
	}

	.relay-feedback {
		@apply mt-4 text-lg font-medium text-slate-700 dark:text-slate-200;
	}

	@media (max-width: 480px) {
		.relay-button {
			@apply text-2xl;
		}
	}
</style>
