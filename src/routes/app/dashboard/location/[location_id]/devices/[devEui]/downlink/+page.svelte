<script lang="ts">
  import { onMount } from 'svelte';
  import { success, error as showError } from '$lib/stores/toast.svelte';
  import { DRAGINO_LT22222L_PAYLOADS } from '$lib/lorawan/dragino';

  let { data } = $props();
  const devEui = data.device.dev_eui;
  let status: any = {};
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

<h1 class="text-xl font-bold mb-4">Device Downlink Control: {devEui}</h1>
<div class="flex gap-4 mb-6">
  <button class="btn" on:click={() => send('relay1On')}>Relay 1 ON</button>
  <button class="btn" on:click={() => send('relay1Off')}>Relay 1 OFF</button>
  <button class="btn" on:click={() => send('relay2On')}>Relay 2 ON</button>
  <button class="btn" on:click={() => send('relay2Off')}>Relay 2 OFF</button>
</div>

<pre class="bg-gray-100 p-2 rounded">{JSON.stringify(status, null, 2)}</pre>

<style>
  .btn {
    @apply px-3 py-2 bg-blue-600 text-white rounded shadow;
  }
</style>
