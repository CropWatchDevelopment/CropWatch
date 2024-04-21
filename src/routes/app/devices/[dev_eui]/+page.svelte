<script lang="ts">
	import { browser } from "$app/environment";
	import { deviceStore } from "$lib/stores/device.store";
    import { PUBLIC_SITE_BASE } from "$env/static/public";

    if(browser)
    fetch(`${PUBLIC_SITE_BASE}/api/v1/devices`).then(res => res.json()).then(data => {
        console.log(data)
        deviceStore.add(data);
    }).catch(err => {
        console.log(err)
    })


</script>


<svelte:head>
    <title>Home</title>
    <meta name="description" content="CropWatch" />
</svelte:head>

<h1>Devices</h1>

<ul>
{#each $deviceStore as device}
    <li>{JSON.stringify(device, null, 2)}</li>
{/each}
</ul>
