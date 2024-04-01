<script>
	import {
		mdiAmpersand,
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
	import { Button, MenuItem, NumberStepper, SelectField, Tooltip, cls } from 'svelte-ux';

	export let name = '';
	export let children = [];
	export let indent = 0;
	export let latestData;

	let dataKeys = Object.keys(latestData);

	let open = true;

	function toggleOpen() {
		open = !open;
	}

	function onAdd() {
		children.push({
			name: 'Grandchild',
			children: []
		});
		children = children;
	}
</script>

<div class="flex flex-col p-4 border" style="margin-left: {indent}px">
	<!-- <h1>{r.id}</h1> -->
	<div class="grid grid-col grid-cols-1 lg:grid-cols-7 gap-4 mb-2">
		<div class="flex flex-row">
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
			<Button on:click={() => {}} color="success" icon={mdiFloppy} />
			<Button on:click={() => {}} color="danger" icon={mdiTrashCan} />
		</div>
	</div>

	<div class="ml-5"></div>
</div>

{#if open}
	{#each children as child}
		<svelte:self {...child} {latestData} indent={indent + 24} />
	{/each}
{/if}

<!-- <Button on:click={() => {onAdd()}}>Add</Button> -->

<style>
	h3 {
		cursor: pointer;
		user-select: none;
	}
</style>
