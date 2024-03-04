<script lang="ts">
	import { page } from '$app/stores';
	import { mdiPlus } from '@mdi/js';
	import { Button } from 'svelte-ux';
	import { Svelvet, Node, Anchor, Edge, Controls } from 'svelvet';

	let divWidth: number = 300;
	let ifs: any[] = [{
		id: uuidv4(),
		label: 'new IF',
		inputs: 1,
		outputs: 2,
	}];
	$: console.log(divWidth);

	const onNewIf = () => {
		
		ifs.push({});
		ifs = ifs;
	}

	function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}
</script>

<h1 class="text-4xl font-semibold text-slate-700 mb-4">Sensor Rules</h1>
<div class="mr-4" bind:offsetWidth={divWidth}>
	<Svelvet height={500} theme="dark" zoom={0.5} minimap>
		<Node
			label="This Sensor"
			position={{ x: divWidth / 2, y: -200 }}
			locked={true}
			inputs={0}
			outputs={1}
			TD
		/>
		{#each ifs as i}
		<Node id={i.id} label={i.label} inputs={i.inputs} outputs={i.outputs} TD />
		{/each}
		<Controls slot="controls" horizontal />
	</Svelvet>
	<Button on:click={() => onNewIf()} icon={mdiPlus}>New IF</Button>
</div>





<style>
	:root[svelvet-theme='custom-theme'] {
		--node-color: hsl(225, 30%, 50%);
		--node-border-color: hsl(225, 20%, 40%);
		--node-selection-color: hsl(45, 90%, 60%);
		--text-color: hsl(0, 0%, 100%);

		--background-color: hsl(225, 20%, 27%);
		--dot-color: hsl(225, 10%, 50%);

		--accent-color: hsl(45, 90%, 60%);
		--primary-color: hsl(225, 30%, 66%);

		--edge-color: hsl(0, 0%, 100%);
		--target-edge-color: hsl(225, 20%, 40%);

		--anchor-color: hsl(45, 90%, 67%);
		--anchor-border-color: hsl(45, 90%, 87%);
		--anchor-connected: hsl(45, 90%, 100%);
		--anchor-connected-border: hsl(225, 20%, 20%);

		--anchor-connecting: hsl(225, 30%, 40%);
		--anchor-connecting-border: hsl(0, 0%, 100%);

		--anchor-hovering: hsl(225, 20%, 46%);
		--anchor-hovering-border: hsl(0, 0%, 0%);

		--minimap-background-color: hsl(225, 20%, 27%);

		--minimap-node-color: hsl(225, 30%, 20%);

		--controls-background-color: hsl(225, 20%, 27%);
		--controls-text-color: hsl(0, 0%, 100%);

		--theme-toggle-text-color: hsl(0, 0%, 100%);
		--theme-toggle-color: hsl(225, 20%, 27%);
	}
</style>