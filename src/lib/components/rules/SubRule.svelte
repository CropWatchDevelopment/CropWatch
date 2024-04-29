<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { uuidv4 } from '$lib/utilities/uuidv4';
	import type { Tables } from '../../../database.types';

	// export const latestData;
	export let root: Tables<'cw_rule_criteria'>;
	export let dataItem: any;

	// const onDelete = (i: number) => {
	// 	root.children.splice(i, 1);
	// 	root = root;
	// };
</script>

<div class="grid grid-flow-col mt-2 gap-1 grid-cols-7">
	<div class="flex flex-row">
		IF
		<select bind:value={root.subject}>
			{#each Object.keys(dataItem ?? {}) as key}
				<option value={key}>{key}</option>
			{/each}
		</select>

		<select bind:value={root.operator}>
			<option value="=">=</option>
			<option value="!=">!=</option>
			<option value=">">{'>'}</option>
			<option value=">=">{'>='}</option>
			<option value="<">{'<'}</option>
			<option value="<=">{'<='}</option>
		</select>

		<input type="number" bind:value={root.trigger_value} />
	</div>
</div>

Reset when {root.subject} goes back to: <input type="number" bind:value={root.reset_value} />


<!-- <div class="flex flex-col">
	{#each root.children as singleRule, i}
		<span class="ml-5">
			<svelte:self bind:root={singleRule} {latestData}>
				<button slot="post" on:click={() => onDelete(i)} color="success">Delete</button>
			</svelte:self>
		</span>
	{/each}
</div> -->
