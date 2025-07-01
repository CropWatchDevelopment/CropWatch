<script>
	import Button from '$lib/components/UI/buttons/Button.svelte';

	let { devEui } = $props();
</script>

<Button class="btn btn-primary" href="/api/devices/{devEui}/data-csv" download="device_data.csv">
	Download CSV
</Button>
