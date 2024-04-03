<script lang="ts">
	import { mdiFloppy, mdiFunction, mdiGateOr, mdiPlus, mdiTrashCan } from '@mdi/js';
	import { Avatar, Button, Card, Header, Icon, TextField } from 'svelte-ux';
	import SubRule from './SubRule.svelte';

	export let sensor;
	let latestData = sensor.data.at(-1);

	function uuidv4() {
		return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
			(c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
		);
	}

	let root = [];

	const onAdd = () => {
		root.push({
			id: uuidv4(),
			parent_id: null,
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
		root.splice(i, 1);
		root = root;
	};

	const SaveRule = () => {
		console.log(root);
	};
</script>

<form>
	<Card>
		<Header title="Add Sensor Rule" subheading="List of rules for this sensor" slot="header">
			<div slot="avatar">
				<Avatar class="bg-primary text-primary-content font-bold">
					<Icon data={mdiFunction} />
				</Avatar>
			</div>
		</Header>
		<TextField label="Rule Name" />
		{#each root as singleRule, i}
			<SubRule bind:root={singleRule} {latestData}>
				<Icon slot="pre" data={mdiGateOr} classes={{ root: 'my-auto' }} />
				<Button slot="post" on:click={() => onDelete(i)} color="success" icon={mdiTrashCan} />
			</SubRule>
		{/each}

		<div slot="actions">
			<Button
			variant="fill-outline"
			icon={mdiPlus}
				on:click={() => {
					onAdd();
				}}>Add Top Level Rule</Button
			>

			<Button variant="fill-outline" on:click={() => {}} color="success" icon={mdiFloppy}> Save</Button>
		</div>
	</Card>
</form>
<pre>{JSON.stringify(root, null, 2)}</pre>
