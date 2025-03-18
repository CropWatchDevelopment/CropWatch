<script lang="ts">
	import DeviceListView from "$lib/components/UI/device/DeviceListView.svelte";
	import { getUserState } from "$lib/state/user-state.svelte";

	let userContext = getUserState();
    let devices = $derived(userContext.allDevices);

</script>

<DeviceListView {devices}/>