<script lang="ts">
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import { mdiEye, mdiFunction, mdiRouterWireless } from '@mdi/js';
	import moment from 'moment';
	import { Avatar, Button, Card, ExpansionPanel, Header, Icon, ListItem, Switch } from 'svelte-ux';

	const { data } = $props();
	let devices = $state(data.devices);

	// post data to the server using FormData instead of JSON
	const updateReporting = async (
		dev_eui: string,
		id: number | undefined,
		time: 'week' | 'month',
		state: boolean
	) => {
		const formData = new FormData();
		formData.append('dev_eui', dev_eui);
		if (id !== undefined) formData.append('id', id.toString());
		formData.append('time', time);
		formData.append('state', state.toString());

		try {
			const response = await fetch('?/updateReporting', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				// Handle errors
				console.error('Error updating reporting status');
				return null;
			}

			const result = await response.json();

			// Update local state with server response
			if (result.success && result.data) {
				// Find the device and update its report_user_schedule
				const deviceIndex = devices.findIndex(d => d.dev_eui === dev_eui);
				if (deviceIndex !== -1) {
					// If this schedule already exists in the device, update it
					const scheduleIndex = devices[deviceIndex].report_user_schedule.findIndex(
						s => s?.report_user_schedule_id === result.data[0].report_user_schedule_id
					);

					if (scheduleIndex !== -1) {
						devices[deviceIndex].report_user_schedule[scheduleIndex] = result.data[0];
					} else {
						// If it's a new schedule, add it to the array
						devices[deviceIndex].report_user_schedule.push(result.data[0]);
					}
					
					// Force reactivity update
					devices = [...devices];
				}
			}

			return result;
		} catch (error) {
			console.error('Failed to update reporting:', error);
			return null;
		}
	};
	
	// Helper functions to check report status
	function hasWeeklyReport(device) {
		return device.report_user_schedule.some(schedule => schedule?.end_of_week === true);
	}
	
	function hasMonthlyReport(device) {
		return device.report_user_schedule.some(schedule => schedule?.end_of_month === true);
	}
</script>

<h1>All Reports</h1>

<Card class="m-4 p-2">
	<Header
		title="Report Schedules"
		subheading="Configure automatic report generation for your devices"
		slot="header"
	>
		<div slot="avatar">
			<Avatar class="bg-primary text-primary-content p-1 font-bold" size="lg">
				<Icon data={mdiFunction} size="2x" />
			</Avatar>
		</div>
	</Header>

	<ol>
		{#each devices as device}
			<ListItem title={device.name} class="flex-1" noShadow>
				<div slot="actions">
					<div class="grid gap-2">
						<div class="flex flex-row gap-2">
							<label for={`${device.dev_eui}-week`}>Weekly Report</label>
							<span class="flex flex-grow gap-2"></span>
							<Switch
								id={`${device.dev_eui}-week`}
								checked={hasWeeklyReport(device)}
								on:change={(e) => {
									updateReporting(
										device.dev_eui,
										device.report_user_schedule[0]?.report_user_schedule_id,
										'week',
										e.target.checked
									);
								}}
							/>
						</div>
						<div class="flex flex-row gap-2">
							<label for={`${device.dev_eui}-month`}>Monthly Report</label>
							<span class="flex flex-grow gap-2"></span>
							<Switch
								id={`${device.dev_eui}-month`}
								checked={hasMonthlyReport(device)}
								on:change={(e) => {
									updateReporting(
										device.dev_eui,
										device.report_user_schedule[0]?.report_user_schedule_id,
										'month',
										e.target.checked
									);
								}}
							/>
						</div>
					</div>
				</div>
			</ListItem>
		{/each}
	</ol>
</Card>
