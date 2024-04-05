<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { mdiChevronLeft, mdiEye, mdiFunction, mdiTrashCan } from '@mdi/js';
	import backgroundImg from '$lib/images/breadcrumb-bg.jpg';
	import { Button, Dialog, Icon, ListItem, Toggle } from 'svelte-ux';
	import { each } from 'highcharts';
	import moment from 'moment';

	// $: page.set({ ...page, title: "All Configured Rules" });
	export let data;

	const deleteRule = async (id: number) => {
		const result = await fetch(`/api/rules?rule_id=${id}`, { method: 'DELETE' });
		if (result.ok) {
			
		} else {
			console.error('Failed to delete rule');
		
		}
	}
</script>

<h1
	class="mb-2 flex items-center text-2xl font-bold border-b w-full text-white relative"
	style="background-image:url({backgroundImg}); width:100%; height: 100px;"
>
	<p class="my-auto ml-2"></p>
	<p class="my-auto"><Icon data={mdiFunction} /> All Configured Rules</p>
</h1>

<ul>
	{#each data.rules as rule}
		<ListItem
			title={rule.name}
			subheading={`Last Triggered: ${rule.last_triggered ? moment(rule.last_triggered) : 'Never'}`}
		>
			<div slot="actions">
				<Button variant="fill-light" icon={mdiEye} on:click={() => goto(``)} color="info" />
					<Toggle let:on={open} let:toggle>
						<Button icon={mdiTrashCan} on:click={toggle} color="danger" />
						<Dialog {open} on:close={toggle}>
						  <div slot="title">Are you sure?</div>
						  <div class="px-6 py-3">
							This will permanently delete the item and can not be undone.
						  </div>
						  <div slot="actions">
							<Button
							  on:click={async () => deleteRule(rule.id)}
							  variant="fill"
							  color="danger"
							>
							  Yes, delete item
							</Button>
							<Button>Cancel</Button>
						  </div>
						</Dialog>
					  </Toggle>
			</div>
		</ListItem>
	{/each}
</ul>

<pre>{JSON.stringify(data.rules, null, 2)}</pre>
