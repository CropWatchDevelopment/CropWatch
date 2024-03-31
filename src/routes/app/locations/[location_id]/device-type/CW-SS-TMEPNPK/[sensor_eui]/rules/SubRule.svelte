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
	import { Button, Icon, MenuItem, NumberStepper, SelectField, Tooltip, cls } from 'svelte-ux';

	export let latestData;

	let sendMethod = '';
	let dataKeys = Object.keys(latestData);

	let rule = [];

	function uuidv4() {
		return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
			(+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
		);
	}

	function addRule(parentId) {
		const newRule = {
			id: uuidv4(),
			children: []
		};

		if (rule.find((par) => par.id == parentId)) {
			let parentRule = findRuleById(rule, parentId);
			parentRule.children.push(newRule);
			parentRule = parentRule;
			rule = rule;
			return;
		} else {
			rule.push(newRule);
			rule = rule;
			return;
		}
	}

	function removeRule(ruleId) {
		const parentRule = findParentRule(rule, ruleId);
		const index = parentRule.children.findIndex((child) => child.id === ruleId);
		parentRule.children.splice(index, 1);
	}

	function findRuleById(rule, id) {
		if (rule.id === id) {
			return rule;
		}

		const parent = rule.find((child) => child.id == id);
		return parent;
	}

	function findParentRule(rule, childId) {
		for (const childRule of rule.children) {
			if (childRule.id === childId) {
				return rule;
			}

			const parentRule = findParentRule(childRule, childId);
			if (parentRule) {
				return parentRule;
			}
		}

		return null;
	}
</script>

<div class="flex flex-col p-4 border">
	{#each rule as r (r.id)}
    <h1>{r.id}</h1>
		<div class="grid grid-col grid-cols-1 lg:grid-cols-7 gap-4 mb-2">
			<div class="flex flex-row">
				<Icon data={mdiArrowBottomRight} />
				<SelectField
					value={r.subject}
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

			<NumberStepper value={r.value} class="w-full" />

			<SelectField
				options={[
					{ value: 1, label: 'E-Mail', icon: mdiEmail },
					{ value: 2, label: 'WellWatch Alert', icon: mdiWatchVibrate },
					{ value: 3, label: 'SMS', icon: mdiMessageProcessing },
					{ value: 4, label: 'Line', icon: mdiPhone },
					{ value: 5, label: 'Webhook', icon: mdiWeb }
				]}
				activeOptionIcon={true}
				value={sendMethod}
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
					<Button on:click={() => addRule(r.id)} color="success" icon={mdiAmpersand} />
				</Tooltip>
				<Button on:click={() => {}} color="success" icon={mdiFloppy} />
				<Button on:click={() => removeRule(r.id)} color="danger" icon={mdiTrashCan} />
			</div>
		</div>

		<div class="ml-5">
			{#each r.children as childRule}
				<svelte:self {latestData} rule={childRule} />
			{/each}
		</div>
    {/each}
    <Button
      variant="fill-outline"
      on:click={() => addRule(uuidv4())}
      color="success"
      icon={mdiPlus}>New Rule</Button
    >
</div>
