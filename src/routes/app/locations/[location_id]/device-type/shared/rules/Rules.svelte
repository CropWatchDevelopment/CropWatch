<script lang="ts">
	import {
		mdiEmail,
		mdiEye,
		mdiFloppy,
		mdiFunction,
		mdiGateOr,
		mdiMessageProcessing,
		mdiPencil,
		mdiPhone,
		mdiPlus,
		mdiTrashCan,
		mdiWatchVibrate,
		mdiWeb
	} from '@mdi/js';
	import {
		Avatar,
		Button,
		Card,
		Dialog,
		Header,
		Icon,
		ListItem,
		MenuItem,
		MultiSelectMenu,
		SelectField,
		TextField,
		Toggle,
		ToggleButton,
		cls
	} from 'svelte-ux';
	import SubRule from './SubRule.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { toast } from '@zerodevx/svelte-toast';

	export let sensor;
	let latestData = sensor.data.at(-1);
	let ruleData;

	function uuidv4() {
		return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
			(c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
		);
	}

	let ruleGroupId = uuidv4();

	let ruleGroup = {
		root: [],
		groupId: ruleGroupId,
		dev_eui: $page.params.sensor_eui,
		ruleName: '',
		action: 1,
		action_recipient: []
	};
	let emailDialogOpen: boolean = false;
	let emailAddressBook: string[] = localStorage.getItem('emailAddressBook')
		? JSON.parse(localStorage.getItem('emailAddressBook') || '[]')
		: [];
	let emailTemp: string = '';

	const onAdd = () => {
		ruleGroup.root.push({
			rule_id: uuidv4(),
			ruleGroupId: ruleGroupId,
			parent_id: null,
			subject: '',
			operator: '=',
			threshold_value: 0,
			children: []
		});
		ruleGroup.root = ruleGroup.root;
	};

	const onDelete = (i) => {
		ruleGroup.root.splice(i, 1);
		ruleGroup.root = ruleGroup.root;
	};

	const SaveRule = async () => {
		console.log('about to post:', ruleGroup);
		let result = await fetch('/api/rules', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ ruleGroup })
		});
		console.log('Insertion Result', result);
	};

	const deleteRule = async (id: number) => {
		const result = await fetch(`/api/rules?rule_id=${id}`, { method: 'DELETE' });
		if (result.status === 200) {
			console.log('Rule deleted successfully');
			toast.push('Rule deleted successfully');
		} else {
			console.error('Failed to delete rule');
			toast.push('Rule deleted Failed!');
		}
	};

	onMount(() => {
		fetch(`/api/rules?dev_eui=${$page.params.sensor_eui}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		})
			.then((res) => res.json())
			.then((data) => {
				ruleData = data;
			});
	});
</script>

<form>
	<Card>
		<Header title="Add Sensor Rule" subheading="List of rules for this sensor" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiPlus} />
				</Avatar>
			</div>
		</Header>
		<div slot="contents">
			<div class="flex flex-row gap-1">
				<TextField bind:value={ruleGroup.ruleName} label="Rule Name" />
				<SelectField
					bind:value={ruleGroup.action}
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

				{#if ruleGroup.action === 5}
					<TextField bind:value={ruleGroup.action_recipient} />
				{:else if ruleGroup.action === 4}
					<TextField bind:value={ruleGroup.action_recipient} />
				{:else if ruleGroup.action === 3}
					<TextField mask="+1 (___) ___-____" replace="_" bind:value={ruleGroup.action_recipient} />
				{:else if ruleGroup.action === 2}
					<TextField bind:value={ruleGroup.action_recipient} />
				{:else if ruleGroup.action === 1}
					<ToggleButton let:on={open} let:toggleOff transition={false}>
						{ruleGroup.action_recipient.length} selected
						<MultiSelectMenu
							bind:value={ruleGroup.action_recipient}
							on:change={(e) => {
								ruleGroup.action_recipient = e.detail.value;
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
			</div>
			{#each ruleGroup.root as singleRule, i}
				<SubRule bind:root={singleRule} {latestData}>
					<Icon slot="pre" data={mdiGateOr} classes={{ root: 'my-auto' }} />
					<Button slot="post" on:click={() => onDelete(i)} color="danger" icon={mdiTrashCan} />
				</SubRule>
			{/each}
		</div>

		<div slot="actions">
			<Button
				variant="fill-outline"
				icon={mdiPlus}
				on:click={() => {
					onAdd();
				}}>Add Top Level Rule</Button
			>

			<Button variant="fill-outline" on:click={() => SaveRule()} color="success" icon={mdiFloppy}>
				Save</Button
			>
		</div>
	</Card>
</form>

<Card class="mt-2">
	<Header title="Sensor Rules" subheading="List of rules for this sensor" slot="header">
		<div slot="avatar">
			<Avatar class="bg-primary text-primary-content font-bold">
				<Icon data={mdiFunction} />
			</Avatar>
		</div>
	</Header>
</Card>

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

			if (isEmailValid) {
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
