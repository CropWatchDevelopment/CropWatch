<script lang="ts">
	import { DRAGINO_LT22222L_PAYLOADS } from '$lib/lorawan/dragino';
	import { success, error as showError } from '$lib/stores/toast.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import MaterialIcon from '$lib/components/UI/icons/MaterialIcon.svelte';
	import type { DeviceWithType } from '$lib/models/Device';

	export let device: DeviceWithType;
	const devEui = device.dev_eui;
	// Use regular object + assignments (Svelte will track top-level mutations when reassigned)
	let busy: Record<string, boolean> = {};

	function setBusy(key: string, val: boolean) {
		busy = { ...busy, [key]: val };
	}

	async function send(payloadName: keyof typeof DRAGINO_LT22222L_PAYLOADS) {
		if (busy[payloadName]) return;
		setBusy(payloadName, true);
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
				success('Command sent');
			}
		} catch (e) {
			showError('Downlink failed');
		} finally {
			setBusy(payloadName, false);
		}
	}
</script>

<div
	class="flex w-full flex-col gap-3 rounded-md border border-neutral-300 bg-white p-4 dark:border-neutral-600 dark:bg-zinc-800"
>
	<h3 class="flex items-center gap-2 text-sm font-semibold">
		<MaterialIcon name="Power" size={18} /> Relay Control
	</h3>
	<div class="grid grid-cols-2 gap-3">
		<button
			class="relay-btn"
			class:loading={busy.relay1On || busy.relay1Off}
			on:click={() => send(busy.relay1On ? 'relay1Off' : 'relay1On')}
			aria-label="Toggle Relay 1"
		>
			<span class="flex items-center gap-1">
				<MaterialIcon name="toggle_on" />
				<span>Relay 1</span>
			</span>
		</button>
		<button
			class="relay-btn"
			class:loading={busy.relay2On || busy.relay2Off}
			on:click={() => send(busy.relay2On ? 'relay2Off' : 'relay2On')}
			aria-label="Toggle Relay 2"
		>
			<span class="flex items-center gap-1">
				<MaterialIcon name="toggle_on" />
				<span>Relay 2</span>
			</span>
		</button>
	</div>
	<p class="text-[10px] text-neutral-500">Sends confirmed LoRaWAN downlink via TTI.</p>
</div>

<style lang="postcss">
	@reference "tailwindcss";
	.relay-btn {
		@apply relative flex w-full items-center justify-between gap-2 rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600;
	}
	.relay-btn.loading {
		@apply cursor-wait opacity-70;
	}
</style>
