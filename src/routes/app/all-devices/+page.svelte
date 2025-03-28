<script lang="ts">
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import { mdiEye, mdiRouterWireless } from '@mdi/js';
	import { Avatar, Button, Card, Header, Icon, ListItem } from 'svelte-ux';

	const { data } = $props();
	const devices = $derived(data.devices);
</script>

<h1>{nameToJapaneseName('All Devices')}</h1>

<Card class="m-4 p-2">
	<Header title="All Devices" subheading="All Devices will display here even if they are not assigned to a location" slot="header">
		<div slot="avatar">
			<Avatar class="bg-primary font-bold text-primary-content p-1" size="lg">
				<Icon data={mdiRouterWireless} size="2x" />
			</Avatar>
		</div>
	</Header>
	<ol>
		{#each devices as device}
			<ListItem title={device.name}>
				<div slot="actions">
					<Button icon={mdiEye} variant="fill-light" rounded="full" href={`/app/location/${device.location_id}/devices/${device.dev_eui}/detail`} />
				</div>
			</ListItem>
		{/each}
	</ol>
</Card>
