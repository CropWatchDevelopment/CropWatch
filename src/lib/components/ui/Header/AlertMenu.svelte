<script lang="ts">
	import { goto } from '$app/navigation';
	import { notificationStore } from '$lib/stores/notificationStore';
	import {
		mdiAlertCircle,
		mdiArrowRight,
		mdiBell,
		mdiBellAlert,
		mdiCheckCircle,
		mdiExclamation,

		mdiHistory

	} from '@mdi/js';
	import moment from 'moment';
	import { onMount } from 'svelte';
	import { Button, Duration, Icon, ListItem, Menu, MenuItem, ProgressCircle, Toggle } from 'svelte-ux';

	let loading: boolean = true;
	let alerts: any[] = [];
	const loadLatestAlerts = async () => {
		const alertsPromise = await fetch(`/api/v1/notifications`).then((res) => res.json());
		console.log(alertsPromise);
		alerts = alertsPromise;
		loading = false;
	};

	onMount(() => {
		loadLatestAlerts();
	});
</script>

<Toggle let:on={open} let:toggle let:toggleOff>
	<Button on:click={toggle} icon={alerts.length === 0 ? mdiBell : mdiBellAlert} on:click={() => loadLatestAlerts()} classes={{icon: alerts.length > 0 ? 'text-red-500' : 'text-success'}} size="lg">
		<Menu {open} on:close={toggleOff}>
			{#if !loading}
				{#if alerts.length > 0}
					{#each alerts as alert}
						<ListItem
							title={alert.name}
							icon={mdiBellAlert}
							avatar={{ class: 'bg-surface-content/50 text-surface-100/90 text-red-500' }}
						>
							<div slot="subheading">
								@{moment(alert.last_triggered).format('YYYY/MM/DD HH:mm')}
								<Duration start={alert.last_triggered} totalUnits={1} /> ago
							</div>
							<div slot="actions">
								<Button
									color="primary"
									icon={mdiArrowRight}
									on:click={() => goto(`/app/devices/${alert.dev_eui}/data`)}/>
							</div>
						</ListItem>
					{/each}
				{:else}
					<ListItem title="No alerts" icon={mdiCheckCircle} class="text-center" classes={{icon: 'text-green-400'}} />
				{/if}
			{:else}
				<MenuItem>
					<ProgressCircle size={12} /> Loading...
				</MenuItem>
			{/if}
			<MenuItem>
				<Button href="/app/notifications" class="flex w-full text-center text-info">
					<Icon data={mdiHistory} />
					View alert history
				</Button>
			</MenuItem>
			<!-- <ListItem
				title="View alert history"
				avatar={{ class: 'bg-surface-content/50 text-surface-100/90' }}>
				<div slot="actions">
					<Button
						color="primary"
						icon={mdiArrowRight}
						on:click={() => goto(`/app/alerts`)}>View</Button
					>
				</div>
			</ListItem> -->
		</Menu>
	</Button>
</Toggle>
