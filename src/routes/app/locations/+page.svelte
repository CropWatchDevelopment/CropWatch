<script lang="ts">
	import {
		mdiCalendar,
		mdiChevronRight,
		mdiDotsVertical,
		mdiMapMarker,
		mdiMapSearch,
		mdiPlus
	} from '@mdi/js';
	import {
		Button,
		ListItem,
		Icon,
		Card,
		Header,
		Avatar,
		Toggle,
		Menu,
		MenuItem,
		ProgressCircle
	} from 'svelte-ux';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;

	let zoom: number | undefined = 20;
</script>

<Card id="list" class="grid-flow-row col-span-2 mr-4 justify-start" title="Location List">
	<Header title="Your Locations" slot="header" class="gap-0">
		<div slot="avatar">
			<Avatar class="bg-accent-500 text-white font-bold mr-4">
				<Icon data={mdiMapSearch} />
			</Avatar>
		</div>
		<div slot="actions">
			<Toggle let:on={open} let:toggle>
				<Button icon={mdiDotsVertical} on:click={toggle}>
					<Menu {open} on:close={toggle}>
						<MenuItem icon={mdiPlus}>Add Location</MenuItem>
					</Menu>
				</Button>
			</Toggle>
		</div>
	</Header>
	<div slot="contents">
		<ol>
			{#await data.locations}
				<ProgressCircle />
			{:then locations}
				{#if locations}
					{#each locations as location}
						{#if location && location.cw_locations}
							<ListItem title={location.cw_locations.name}>
								<div slot="avatar">
									<Icon data={mdiMapMarker} />
								</div>
								<div slot="actions">
									<Button
										icon={mdiChevronRight}
										variant="fill-light"
										color="accent"
										class="p-2 text-black/50"
										on:click={() => goto(`locations/${location.cw_locations.location_id}`)}
									/>
								</div>
							</ListItem>
						{:else}
							<li>You don't have any locations yet</li>
						{/if}
					{/each}
				{/if}
			{/await}
		</ol>
	</div>
</Card>
