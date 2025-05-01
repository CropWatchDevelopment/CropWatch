<script lang="ts">
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import { mdiEye, mdiFunction, mdiRouterWireless } from '@mdi/js';
	import moment from 'moment';
	import { Avatar, Button, Card, ExpansionPanel, Header, Icon, ListItem, Switch } from 'svelte-ux';

	const { data } = $props();
	let deviceAndRules = $state(data.devicesAndRules);
	
	// Function to toggle rule status
	const updateRuleStatus = async (ruleId: number, isTriggered: boolean) => {
		try {
			const formData = new FormData();
			formData.append('rule_id', ruleId.toString());
			formData.append('is_triggered', isTriggered.toString());
			
			const response = await fetch('/api/rules/update-status', {
				method: 'POST',
				body: formData
			});
			
			if (!response.ok) {
				const errorData = await response.json();
				console.error('Error updating rule status', errorData);
				return false;
			}
			
			const result = await response.json();
			
			// Update the local state to reflect the change
			deviceAndRules = deviceAndRules.map(device => {
				if (device.cw_rules) {
					device.cw_rules = device.cw_rules.map(rule => {
						if (rule.id === ruleId) {
							return { ...rule, is_triggered: isTriggered };
						}
						return rule;
					});
				}
				return device;
			});
			
			return true;
		} catch (error) {
			console.error('Failed to update rule status:', error);
			return false;
		}
	};
</script>

<h1>All Reports</h1>

<Card class="m-4 p-2">
	<Header
		title="All Device configured rules"
		subheading="All configured device rules will be displayed here"
		slot="header"
	>
		<div slot="avatar">
			<Avatar class="bg-primary text-primary-content p-1 font-bold" size="lg">
				<Icon data={mdiFunction} size="2x" />
			</Avatar>
		</div>
	</Header>
	<ol>
		{#each deviceAndRules as deviceAndRule}
			<ExpansionPanel>
				<ListItem
					slot="trigger"
					title={`${deviceAndRule.cw_locations.name} - ${deviceAndRule.name}`}
					subheading={deviceAndRule.cw_rules.length > 0
						? `${deviceAndRule.cw_rules.length} Rules Configured`
						: 'No Rules Configured'}
					class="flex-1"
					noShadow
				>
					<Avatar slot="avatar" class="bg-primary text-primary-content p-1 font-bold" size="lg">
						{deviceAndRule.cw_rules.length}
					</Avatar>
				</ListItem>
				<div>
					{#each deviceAndRule.cw_rules as rule}
						<ol>
							<ol>
								{#each rule.cw_rule_criteria as criteria}
									<li class="bg-accent/10 flex w-full flex-row p-2">
										<div class="flex flex-col">
											<p>{criteria.subject} {criteria.operator} {criteria.trigger_value}</p>
											<p>Reset @: {criteria.reset_value}</p>
											<p>
												Last Triggered: {moment(criteria.last_triggered).format('YYYY/MM/DD HH:MM')}
											</p>
											<p>Trigger Count: {rule.trigger_count}</p>
											<div class="flex items-center mt-1">
												<span class="mr-2">Status:</span>
												<Switch
													checked={rule.is_triggered}
													on:change={(e) => updateRuleStatus(rule.id, e.target.checked)}
												/>
												<span class="ml-2 font-medium" class:text-amber-600={rule.is_triggered} class:text-green-600={!rule.is_triggered}>
													{rule.is_triggered ? 'Triggered' : 'Not Triggered'}
												</span>
											</div>
										</div>
										<span class="flex flex-auto"></span>
										<Button
											variant="outline"
											color="info"
											class="mt-2"
											size="lg"
											rounded="full"
											icon={mdiEye}
											href={`/app/location/${deviceAndRule.location_id}/devices/${deviceAndRule.dev_eui}/settings/rules/${rule.id}`}
										/>
									</li>
								{/each}
							</ol>
						</ol>
					{/each}
				</div>
			</ExpansionPanel>
		{/each}
	</ol>
</Card>
