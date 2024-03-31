<script lang="ts">
	import { mdiDotsVertical, mdiWater } from '@mdi/js';
	import { subSeconds } from 'date-fns';
	import {
		Avatar,
		Button,
		Card,
		Collapse,
		Duration,
		ExpansionPanel,
		Header,
		Icon,
		Menu,
		MenuItem,
		Toggle
	} from 'svelte-ux';

	export let title: string = 'New Card';
	export let counterStartTime: Date | null = new Date();
	export let value: number = 0.0;
	export let optimal: number | null = value;
	export let notation: string = '°c';
	export let icon: any = null;
</script>

<Card>
	<Header slot="header" class="gap-0">
		<h1 slot="title" class="text-lg">{title}</h1>
		<div slot="avatar">
			<Avatar class="bg-accent-500 text-white font-bold mr-4">
				{#if icon}
					<Icon data={icon} />
				{/if}
			</Avatar>
		</div>
	</Header>
	<div slot="contents" class="mb-2">
		{#if optimal}
			<Collapse>
				<div slot="trigger" class="flex-1 px-3 py-3 border-t">
					<h1 class="text-2xl font-medium md:text-2xl lg:pb-3 lg:text-2xl text-gray-700">{value}{notation}</h1>
				</div>
				<div class="grid grid-cols-2 text-center md:text-md">
					<div class="border-t border-r">
						<h3 class="font-medium">Optimal</h3>
						<p class="text-gray-700">{optimal}{notation}</p>
					</div>
					<div class="border-t">
						<h3 class="font-medium">Difference</h3>
						<p class="text-gray-700">
							{value - optimal > 0 ? '+' : ''}{(value - optimal).toFixed(2)}{notation}
						</p>
					</div>
				</div>
			</Collapse>
		{:else}
			<h1 class="text-4xl text-gray-700">{value}{notation}</h1>
		{/if}
	</div>
</Card>
