<script lang="ts">
	import SensorPicker from '$lib/components/ui/SensorPicker.svelte';
	export let data;
	const sensorType = data.sensorType.cw_device_type.data_table;
	const sensorName = data.sensorType.name;
	const permissions = data.permissions.permission_level;
</script>

<SensorPicker data={data.data} {sensorType} {sensorName} {permissions} />
