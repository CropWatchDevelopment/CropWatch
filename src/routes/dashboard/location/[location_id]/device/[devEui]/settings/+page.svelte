<script lang="ts">
	import { goto } from '$app/navigation';
	let { data } = $props();
	let devEui = $derived(data.devEui);

	if (!devEui) {
		goto('/dashboard'); // DevEui was not found, run to safety!
	}
</script>

<button class="btn btn-primary" onclick={() => goto('/dashboard')}> Go to Dashboard </button>
<button onclick={() => goto(`settings/rules`)}>📜 Rules</button>
