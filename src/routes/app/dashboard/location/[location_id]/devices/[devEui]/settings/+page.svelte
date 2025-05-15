<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let devEui = $page.params.devEui;
	if (!devEui) {
		goto('/dashboard'); // DevEui was not found, run to safety!
	}
</script>

<button class="btn btn-primary" onclick={() => goto('/app/dashboard')}> Go to Dashboard </button>
<button onclick={() => goto(`settings/rules`)}>📜 Rules</button>
