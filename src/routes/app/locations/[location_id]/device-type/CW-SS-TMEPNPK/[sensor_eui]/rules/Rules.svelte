<script lang="ts">
	import { mdiFunction } from '@mdi/js';
	import { Button, Icon, MenuItem, NumberStepper, SelectField, Tooltip, cls } from 'svelte-ux';
	import SubRule from './SubRule.svelte';

	export let sensor;

	let latestData = sensor.data.at(-1);

	function uuidv4() {
		return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
			(c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
		);
	}

	$: rule = [
		{
			id: uuidv4(),
			children: []
		}
	];

	let root = [
		{
			name: 'Root',
			children: []
		}
	];

	const onAdd = () => {
		root.push({
			id: uuidv4(),
			children: []
		});
		root = root;
	};
</script>

<h1 class="text-4xl font-semibold text-slate-700 mb-4"><Icon data={mdiFunction} /> Sensor Rules</h1>

{#each root as topRule}
	<SubRule {...topRule} {latestData} />
{/each}

<Button
	on:click={() => {
		onAdd();
	}}>Add Top Level Rule</Button
>

<pre>{JSON.stringify(root, null, 2)}</pre>
