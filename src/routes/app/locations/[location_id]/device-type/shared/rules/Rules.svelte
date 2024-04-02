<script lang="ts">
	import { mdiFloppy, mdiFunction } from '@mdi/js';
	import { Button, Icon } from 'svelte-ux';
	import SubRule from './SubRule.svelte';

	export let sensor;
	let latestData = sensor.data.at(-1);

	function uuidv4() {
		return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
			(c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
		);
	}

	let root = [
		{
			name: 'Base Rule',
			id: uuidv4(),
			subject: 'soil_N',
			action: 1,
			children: []
		}
	];

	const onAdd = () => {
		root.push({
			name: uuidv4(),
			id: uuidv4(),
			subject: '',
			action: 2,
			children: []
		});
		root = root;
	};
</script>

<h1 class="text-4xl font-semibold text-slate-700 mb-4"><Icon data={mdiFunction} /> Sensor Rules</h1>



<SubRule bind:root {latestData} />

<Button
	on:click={() => {
		onAdd();
	}}>Add Top Level Rule</Button
>

<Button on:click={() => {}} color="success" icon={mdiFloppy} />

