<script lang="ts">
	import { mdiFloppy, mdiFunction, mdiGateOr, mdiTrashCan } from '@mdi/js';
	import { Button, Icon } from 'svelte-ux';
	import SubRule from './SubRule.svelte';

	export let sensor;
	let latestData = sensor.data.at(-1);

	function uuidv4() {
		return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
			(c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
		);
	}

	let root = [];

	const onAdd = () => {
		root.push({
			name: uuidv4(),
			id: uuidv4(),
			subject: '',
			operator: '=',
			threshold_value: 0,
			action: 'email',
			children: []
		});
		root = root;
	};

	const onDelete = (i) => {
		root.splice(i, 1);
		root = root;
	};
</script>

<h1 class="text-4xl font-semibold text-slate-700 mb-4"><Icon data={mdiFunction} /> Sensor Rules</h1>

{#each root as singleRule, i}
	<div class="flex flex-row">
		<Icon data={mdiGateOr} class="mr-2" />
		<SubRule bind:root={singleRule} {latestData} />
		<Button on:click={() => onDelete(i)} color="success" icon={mdiTrashCan} />
	</div>
{/each}

<Button
	on:click={() => {
		onAdd();
	}}>Add Top Level Rule</Button
>

<Button on:click={() => {}} color="success" icon={mdiFloppy} />

<pre>{JSON.stringify(root, null, 2)}</pre>
