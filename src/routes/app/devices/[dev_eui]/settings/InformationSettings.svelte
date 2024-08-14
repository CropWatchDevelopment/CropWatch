<script lang="ts">
	import { page } from "$app/stores";
	import type { Tables } from "$lib/types/supabaseSchema";
	import { onMount } from "svelte";

	type deviceType = Tables<'cw_devices'>;

    let device: deviceType;

    onMount(async () => {
        const devicePromise = await fetch(`/api/v1/devices/${$page.params.dev_eui}?includeDeviceType=true`);
        device = await devicePromise.json();
    })
</script>


<pre>{JSON.stringify(device, null, 2)}</pre>