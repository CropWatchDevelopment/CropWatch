<script lang="ts">
	import {
		mdiAmpersand,
		mdiEmail,
		mdiFunction,
		mdiGateAnd,
		mdiMessageProcessing,
		mdiPhone,
		mdiPlus,
		mdiTrashCan,
		mdiWatchVibrate,
		mdiWeb
	} from '@mdi/js';
	import {
		Button,
		Card,
		Dialog,
		Icon,
		MenuItem,
		MultiSelectMenu,
		NumberStepper,
		SelectField,
		TextField,
		ToggleButton,
		Tooltip,
		cls
	} from 'svelte-ux';

	export let indent = 0;
	export let latestData;
	export let root;

	let dataKeys = Object.keys(latestData);

	function uuidv4() {
		return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
			(c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
		);
	}

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

	const onDelete = (i) => {
		root.children.splice(i, 1);
		root = root;
	};
</script>

<!-- <div class="flex flex-row mt-2 gap-1"> -->
<div class="grid grid-flow-col mt-2 gap-1 grid-cols-7">
	<div class="flex flex-row">
		<slot name="pre" class="col-span-1" />
		<SelectField
			bind:value={root.subject}
			options={dataKeys.map((v) => {
				return { label: v, value: v };
			})}
			icon={mdiFunction}
		></SelectField>
	</div>

	<SelectField
		bind:value={root.operator}
		options={[
			{ label: '=', value: '=' },
			{ label: '!=', value: '!=' },
			{ label: '>', value: '>' },
			{ label: '>=', value: '>=' },
			{ label: '<', value: '<' },
			{ label: '<=', value: '<=' }
		]}
	></SelectField>

	<NumberStepper bind:value={root.threshold_value} class="w-full" />

	<span class="flex flex-1" />
	<div class="flex flex-row">
		<Tooltip title="Add an AND rule">
			<Button on:click={() => onAdd()} color="success" icon={mdiAmpersand} />
		</Tooltip>
		<slot name="post" />
	</div>
</div>

<div class="flex flex-col">
	{#each root.children as singleRule, i}
		<span class="ml-5">
			<svelte:self bind:root={singleRule} {latestData}>
				<Icon slot="pre" data={mdiGateAnd} class="ml-{i} mr-2 my-auto" />
				<Button slot="post" on:click={() => onDelete(i)} color="success" icon={mdiTrashCan} />
			</svelte:self>
		</span>
	{/each}
</div>

