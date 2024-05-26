<script lang="ts">
	import Back from '$lib/components/ui/Back.svelte';
	import SensorPicker from '$lib/components/ui/SensorPicker.svelte';
	import NotificationsBell from '$lib/components/ui/NotificationsBell.svelte';
	export let data;
	const sensorType = data.sensorType.cw_device_type.data_table;
	const sensorName = data.sensorType.name;
	const permissions = data.permissions.permission_level;
</script>

<div class="mt-4 mx-2 flex justify-between">
	<Back />
	<NotificationsBell />
</div>
<SensorPicker data={data.data} {sensorType} {sensorName} {permissions} />
