<script lang="ts">
	import { page } from '$app/stores';
	import { Svelvet, Node, Anchor, Edge, Controls } from 'svelvet';

	let divWidth: number = 300;
	$: console.log(divWidth);
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
		<Node id={'if'} label={'IF'} inputs={1} outputs={2} TD />
		<Controls slot="controls" horizontal />
	</Svelvet>
</div>
