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
	let emailDialogOpen: boolean = false;
	let emailAddressBook: string[] = localStorage.getItem('emailAddressBook')
		? JSON.parse(localStorage.getItem('emailAddressBook') || '[]')
		: [];
	let emailTemp: string = '';

	function uuidv4() {
		return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
			(c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
		);
	}

	const onAdd = () => {
		root.children.push({
			id: uuidv4(),
			parent_id: root.id,
			subject: '',
			operator: '=',
			threshold_value: 0,
			action: 'email',
			action_recipient: [],
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

	{#if root.action === 5}
		<TextField bind:value={root.webhook} />
	{:else if root.action === 4}
		<TextField bind:value={root.line} />
	{:else if root.action === 3}
		<TextField mask="+1 (___) ___-____" replace="_" bind:value={root.sms} />
	{:else if root.action === 2}
		<TextField bind:value={root.wellwatch} />
	{:else if root.action === 1}
		<ToggleButton let:on={open} let:toggleOff transition={false}>
			{root.action_recipient.length} selected
			<MultiSelectMenu
				bind:value={root.action_recipient}
				on:change={(e) => {
					root.action_recipient = e.detail.value;
				}}
				options={emailAddressBook}
				{open}
				on:close={toggleOff}
				classes={{ menu: 'w-[360px]' }}
				inlineSearch
			>
				<div slot="actions">
					<Button
						color="primary"
						on:click={() => {
							emailDialogOpen = !emailDialogOpen;
						}}
						icon={mdiPlus}>Add item</Button
					>
				</div>
			</MultiSelectMenu>
		</ToggleButton>
	{/if}

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

<Dialog open={emailDialogOpen}>
	<div slot="title">Are you sure you want to do that?</div>
	<TextField
		on:change={(e) => {
			emailTemp = e.detail.value.toString();
		}}
		type="email"
		label="Add Email"
	/>
	<Button
		variant="fill"
		on:click={(e) => {
			const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			let isEmailValid = emailPattern.test(emailTemp);

			if(isEmailValid) {
				emailAddressBook.push({ name: emailTemp, value: emailTemp });
				emailAddressBook = emailAddressBook;

				localStorage.setItem('emailAddressBook', JSON.stringify(emailAddressBook));
			} else {
				alert('Invalid email address');
			}
			emailDialogOpen = false;
		}}
		color="primary">Add</Button
	>
	<div slot="actions">
		<Button
			variant="fill"
			on:click={() => {
				emailDialogOpen = false;
			}}
			color="primary">Close</Button
		>
	</div>
</Dialog>
