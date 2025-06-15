<script lang="ts">
	import { onMount } from 'svelte';
	import { success, error as showError } from '$lib/stores/toast.svelte';
	import { DRAGINO_LT22222L_PAYLOADS } from '$lib/lorawan/dragino';

	let { data } = $props();
	const devEui = data.device.dev_eui;
	let status: any = $state({});
	let interval: number;

	async function fetchStatus() {
		try {
			const res = await fetch(`/api/devices/${devEui}/status`);
			if (res.ok) {
				status = await res.json();
			}
		} catch (err) {
			console.error('Status fetch failed', err);
		}
	}

	async function send(payloadName: keyof typeof DRAGINO_LT22222L_PAYLOADS) {
		try {
			const res = await fetch(`/api/devices/${devEui}/downlink`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ payloadName })
			});
			if (res.ok) {
				success('Downlink sent');
				await fetchStatus();
			} else {
				const txt = await res.text();
				showError('Downlink failed: ' + txt);
			}
		} catch (err) {
			showError('Downlink failed');
		}
	}

	onMount(() => {
		fetchStatus();
		interval = setInterval(fetchStatus, 5000);
		return () => clearInterval(interval);
	});
</script>

<h1 class="mb-4 text-xl font-bold">Device Downlink Control: {devEui}</h1>
<div class="mb-6 flex gap-4">
	<button class="btn" onclick={() => send('relay1On')}>Relay 1 ON</button>
	<button class="btn" onclick={() => send('relay1Off')}>Relay 1 OFF</button>
	<button class="btn" onclick={() => send('relay2On')}>Relay 2 ON</button>
	<button class="btn" onclick={() => send('relay2Off')}>Relay 2 OFF</button>
</div>

<pre class="rounded bg-gray-100 p-2">{JSON.stringify(status, null, 2)}</pre>

<style>
	.btn {
		padding: 0.5rem 1rem;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.btn:hover {
		background-color: #357abd;
	}

	pre {
		overflow-x: auto;
		white-space: pre-wrap;
	}
</style>
