<script lang="ts">
	import { page } from "$app/stores";
	import { uuidv4 } from "$lib/utilities/uuidv4";
	import SubRule from "./SubRule.svelte";

	let ruleGroupId = uuidv4();

	let ruleGroup = {
		root: [],
		groupId: ruleGroupId,
		dev_eui: $page.params.sensor_eui,
		ruleName: '',
		babylon_notifier_type: 1,
		action_recipient: []
	};

	const onDelete = (i: number) => {
		ruleGroup.root.splice(i, 1);
		ruleGroup.root = ruleGroup.root;
	};

</script>

<h1>Rules</h1>

<form>
	<div>
		<label for="name">Name</label>
		<input type="text" id="name" name="name" required />

		<label for="type">Notification Type</label>
		<select>
			<option value="email">Email</option>
			<option value="sms">SMS</option>
		</select>
	</div>
	<div>
		{#each ruleGroup.root as singleRule, i}
			<SubRule bind:root={singleRule} {latestData}>
				>
				<button on:click={() => onDelete(i)} color="danger">Delete</button>
			</SubRule>
		{/each}
	</div>
</form>
