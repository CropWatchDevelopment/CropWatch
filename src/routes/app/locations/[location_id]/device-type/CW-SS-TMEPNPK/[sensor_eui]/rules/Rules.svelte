<script lang="ts">
	import { page } from '$app/stores';
	import { mdiFloppy, mdiFunction, mdiPlus, mdiTrashCan } from '@mdi/js';
	import { Button, NumberStepper, SelectField } from 'svelte-ux';
	import { Svelvet, Node, Anchor, Edge, Controls } from 'svelvet';

	export let sensor;

	let latestData = sensor.data.at(-1);
	let dataKeys = Object.keys(latestData);

	let rules = [];
	let sendMethod = 1;

	function addRule() {
		rules = [...rules, { id: uuidv4(), label: 'new Rule' }];
	}

	function removeRule(id) {
		rules = rules.filter((rule) => rule.id !== id);
	}

	function updateRuleLabel(id, label) {
		rules = rules.map((rule) => {
			if (rule.id === id) {
				return { ...rule, label };
			}
			return rule;
		});
	}

	function uuidv4() {
		return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
			(c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
		);
	}
</script>

<h1 class="text-4xl font-semibold text-slate-700 mb-4">Sensor Rules</h1>

<h2>Rules</h2>

{#each rules as rule (rule.id)}
	<div class="flex flex-row gap-4 mb-2">
		<SelectField
			options={dataKeys.map((v) => {
				return { label: v, value: v };
			})}
			icon={mdiFunction}
			rounded
		>
			<div slot="append" on:click|stopPropagation class="flex items-center">
				<select
					class="appearance-none bg-surface-content/5 border rounded-full mr-2 px-4"
					style="text-align-last: center;"
				>
					<!-- <option /> -->
					<option>{'='}</option>
					<option>{'!='}</option>
					<option>{'>'}</option>
					<option>{'>='}</option>
					<option>{'<'}</option>
					<option>{'<='}</option>
				</select>
			</div>
		</SelectField>

		<NumberStepper />

		<SelectField options={[{value: 1, label: 'E-Mail'}]} value={sendMethod} clearable={false} />

		<Button on:click={() => removeRule(rule.id)} color="success" icon={mdiFloppy} />
		<Button on:click={() => removeRule(rule.id)} color="danger" icon={mdiTrashCan} />
	</div>
{/each}

<Button variant="fill-outline" on:click={addRule} icon={mdiPlus}>Add Rule</Button>

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
