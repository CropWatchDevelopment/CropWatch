<script lang="ts">
	import {
		mdiAmpersand,
		mdiArrowBottomRight,
		mdiEmail,
		mdiFloppy,
		mdiFunction,
		mdiMessageProcessing,
		mdiPhone,
		mdiPlus,
		mdiTrashCan,
		mdiWatchVibrate,
		mdiWeb
	} from '@mdi/js';
	import { Button, Card, Icon, MenuItem, NumberStepper, SelectField, Tooltip, cls } from 'svelte-ux';

	export let indent = 0;
	export let latestData;
	export let root: any[] = [];

	let number: number = 0;

	let dataKeys = Object.keys(latestData);

	function uuidv4() {
		return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
			(c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
		);
	}

	const onAdd = () => {
		root.push({
			name: uuidv4(),
			id: uuidv4(),
			subject: '',
			children: []
		});
		root = root;
	};
</script>

<pre>subRule {JSON.stringify(root, null, 2)}</pre>

<div class="grid grid-col grid-cols-1 lg:grid-cols-5 gap-4 mb-2">
	<div class="flex flex-row border-l-2">
		<Icon data={mdiArrowBottomRight} class="mr-2" />
		<input type="text" value={root.id} class="w-full" />
		<SelectField
			options={dataKeys.map((v) => {
				return { label: v, value: v };
			})}
			icon={mdiFunction}
			rounded
		></SelectField>
	</div>

	<SelectField
		options={[
			{ label: '=', value: '=' },
			{ label: '!=', value: '!=' },
			{ label: '>', value: '>' },
			{ label: '>=', value: '>=' },
			{ label: '<', value: '<' },
			{ label: '<=', value: '<=' }
		]}
		rounded
	></SelectField>

	<NumberStepper class="w-full" />

	<SelectField
		bind:value={number}

		options={[
			{ value: 1, label: 'E-Mail', icon: mdiEmail },
			{ value: 2, label: 'WellWatch Alert', icon: mdiWatchVibrate },
			{ value: 3, label: 'SMS', icon: mdiMessageProcessing },
			{ value: 4, label: 'Line', icon: mdiPhone },
			{ value: 5, label: 'Webhook', icon: mdiWeb }
		]}
		activeOptionIcon={true}
	>
		<div slot="option" let:option let:index let:selected let:highlightIndex>
			<MenuItem
				class={cls(
					index === highlightIndex && 'bg-surface-content/5',
					option === selected && 'font-semibold',
					option.group ? 'px-4' : 'px-2'
				)}
				scrollIntoView={index === highlightIndex}
				icon={{ data: option.icon, style: 'color: #0000FF;' }}
			>
				{option.label}
			</MenuItem>
		</div>
	</SelectField>

	<div class="flex flex-row">
		<Tooltip title="Add an AND rule">
			<Button on:click={() => onAdd()} color="success" icon={mdiAmpersand} />
		</Tooltip>
		<Button on:click={() => {}} color="danger" icon={mdiTrashCan} />
	</div>
</div>

{#each root as child}
	<div class="ml-{indent}">
		<svelte:self bind:root={child.children} {latestData} indent={indent + 5} />
	</div>
{/each}
