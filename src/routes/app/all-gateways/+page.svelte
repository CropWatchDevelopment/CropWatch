<script lang="ts">
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import { mdiCheck, mdiClose, mdiEye, mdiFunction, mdiRouterWireless } from '@mdi/js';
	import moment from 'moment';
	import { Avatar, Button, Card, ExpansionPanel, Header, Icon, ListItem } from 'svelte-ux';

	const { data } = $props();
	const gateways = $derived([...data.privateGateways, ...data.publicGateways]);
</script>

<h1>All Device Rules</h1>

<Card class="m-4 p-2">
	<Header
		title="All Device configured rules"
		subheading="All configured device rules will be displayed here"
		slot="header"
	>
		<div slot="avatar">
			<Avatar class="bg-primary text-primary-content p-1 font-bold" size="lg">
				<Icon data={mdiRouterWireless} size="2x" />
			</Avatar>
		</div>
	</Header>
	<ol>
		{#each gateways as gateway}
				<ListItem
					slot="trigger"
					title={`${gateway.is_online ? '✅' : '❌'} ${gateway.gateway_name}`}
					subheading={`is Online: ${gateway.is_online}`}
					class="flex-1"
					noShadow
				>
			</ListItem>
		{/each}
	</ol>
</Card>
