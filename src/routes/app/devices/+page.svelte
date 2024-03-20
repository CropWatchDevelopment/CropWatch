<script>
	import CwTable from '$lib/components/table/CWTable.svelte';
	import { mdiDevices } from '@mdi/js';
	import { Avatar, Card, Header, Icon } from 'svelte-ux';
	export let data;
</script>

<Card class="">
	<Header title="All Devices" subheading="All Devices in your account" slot="header">
		<div slot="avatar">
			<Avatar class="bg-primary text-primary-content font-bold">
                <Icon data={mdiDevices} />
            </Avatar>
		</div>
	</Header>
    
	{#await data.sensors}
		<div>Loading...</div>
	{:then sensorData}
		<CwTable data={sensorData} />
	{:catch error}
		<div>Error: {error.message}</div>
	{/await}
</Card>
