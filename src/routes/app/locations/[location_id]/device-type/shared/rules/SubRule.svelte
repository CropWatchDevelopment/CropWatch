<script lang="ts">
	import {
		mdiAmpersand,
		mdiArrowBottomRight,
		mdiArrowRight,
		mdiEmail,
		mdiFloppy,
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
		Icon,
		MenuItem,
		NumberStepper,
		SelectField,
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
		root.children.splice(i, 1);
		root = root;
	};
</script>

<SelectField
	bind:value={root.subject}
	options={dataKeys.map((v) => {
		return { label: v, value: v };
	})}
	icon={mdiFunction}
	rounded
></SelectField>

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
	rounded
></SelectField>

<NumberStepper bind:value={root.threshold_value} class="w-full" />

<SelectField
	bind:value={root.action}
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

<Tooltip title="Add an AND rule">
	<Button on:click={() => onAdd()} color="success" icon={mdiAmpersand} />
</Tooltip>

<div class="flex flex-row">
	{#each root.children as singleRule, i}
		<Icon data={mdiArrowRight} class="mr-2" />
		<Icon data={mdiGateAnd} class="mr-2" />
		<svelte:self bind:root={singleRule} {latestData} />
		<Button on:click={() => onDelete(i)} color="success" icon={mdiTrashCan} />
	{/each}
</div>
