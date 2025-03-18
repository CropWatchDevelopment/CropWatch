<script lang="ts">
	import type { IDevice } from '$lib/interfaces/IDevice.interface';
	import { Card } from 'svelte-ux';
	import DeviceDataList from '../dashboard/DeviceDataList.svelte';

	let { devices }: { devices: IDevice[] } = $props();
</script>

<div class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
	{#each devices as device}
		<Card>
			<DeviceDataList {device} />
		</Card>
	{/each}
</div>
