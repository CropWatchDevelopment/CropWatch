<script lang="ts">
	import { uuidv4 } from "$lib/utilities/uuidv4";

	export let latestData;
	export let root: any;
    // let dataKeys = Object.keys(latestData);

	const onAdd = () => {
		root.children.push({
			rule_id: uuidv4(),
			parent_id: root.rule_id,
			ruleGroupId: root.ruleGroupId,
			subject: '',
			operator: '=',
			threshold_value: 0,
			children: []
		});
		root = root;
	};

	const onDelete = (i: number) => {
		root.children.splice(i, 1);
		root = root;
	};
</script>

<div class="grid grid-flow-col mt-2 gap-1 grid-cols-7">
	<div class="flex flex-row">
		<slot name="pre" class="col-span-1" />
		<select>
            {#each root.subject as key}
                <option value={key}>{key}</option>
            {/each}
        </select>
	</div>

    <select bind:value={root.operator}>
        <option value="=">=</option>
        <option value="!=">!=</option>
        <option value=">">{'>'}</option>
        <option value=">=">{'>='}</option>
        <option value="<">{'<'}</option>
        <option value="<=">{'<='}</option>
    </select>

	<input type="number" bind:value={root.threshold_value} />

	<span class="flex flex-1" />
	<div class="flex flex-row">
			<button on:click={() => onAdd()} color="success">Add</button>
	</div>
</div>

<div class="flex flex-col">
	{#each root.children as singleRule, i}
		<span class="ml-5">
			<svelte:self bind:root={singleRule} {latestData}>
				<button slot="post" on:click={() => onDelete(i)} color="success">Delete</button>
			</svelte:self>
		</span>
	{/each}
</div>
