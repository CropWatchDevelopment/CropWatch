<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { CwSensorCard } from '@cropwatchdevelopment/cwui';
	import { getAppContext } from '$lib/appContext.svelte';
	import { buildDashboardLocationSensorCards } from './device-cards';
	import { queryDashboardDevices, type DashboardDeviceFilters } from './device-table';

	interface Props {
		filters: DashboardDeviceFilters;
	}

	let { filters }: Props = $props();

	const app = getAppContext();

	let search = $derived(page.url.searchParams.get('search') ?? '');
	let filteredDevices = $derived.by(
		() =>
			queryDashboardDevices(app.devices ?? [], app.locations ?? [], filters, {
				page: 1,
				pageSize: Math.max(app.devices?.length ?? 0, 1),
				search,
				sort: null,
				filters: {},
				signal: new AbortController().signal
			}).rows
	);
	let locationCards = $derived(
		buildDashboardLocationSensorCards(filteredDevices, app.locations ?? [])
	);

	function handleNavigate(
		locationCard: (typeof locationCards)[number],
		target: string
	): Promise<void> | void {
		if (target === 'location') {
			if (locationCard.locationId <= 0) {
				return;
			}

			return goto(
				resolve('/locations/[location_id]', {
					location_id: String(locationCard.locationId)
				})
			);
		}

		if (!target.startsWith('device-detail:')) {
			return;
		}

		const label = target.slice('device-detail:'.length);
		const routeParams = locationCard.deviceRouteParamsByLabel[label];

		if (!routeParams || routeParams.locationId <= 0) {
			return;
		}

		return goto(
			resolve('/locations/[location_id]/devices/[dev_eui]', {
				location_id: String(routeParams.locationId),
				dev_eui: routeParams.devEui
			})
		);
	}

	function handleTimerExpired(
		locationCard: (typeof locationCards)[number],
		deviceLabel: string
	) {
		const routeParams = locationCard.deviceRouteParamsByLabel[deviceLabel];
		if (!routeParams) return;
		console.log('timer Expired for device', { deviceLabel, routeParams });

		const devEui = routeParams.devEui;
		if (!app.staleDeviceIds.includes(devEui)) {
			app.staleDeviceIds.push(devEui);
		}
	}
</script>

<div class="dashboard-device-cards">
	{#if locationCards.length > 0}
		<div class="dashboard-device-cards__grid">
			{#each locationCards as locationCard (locationCard.id)}
				<CwSensorCard
					title={locationCard.title}
					devices={locationCard.devices}
					defaultExpanded={false}
					storageKey={`dashboard-sensor-card:${locationCard.locationId}`}
					onNavigate={(target) => handleNavigate(locationCard, target)}
					onTimerExpired={(deviceLabel) => handleTimerExpired(locationCard, deviceLabel)}
				/>
			{/each}
		</div>
	{:else}
		<div class="dashboard-device-cards__empty">
			<p>No sensor cards match the current dashboard filters.</p>
		</div>
	{/if}
</div>

<style>
	.dashboard-device-cards {
		flex: 1 1 0%;
		min-height: 0;
		overflow: auto;
		padding: 0 0.5rem 0.5rem;
	}

	.dashboard-device-cards__grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(24rem, 100%), 1fr));
		gap: 1rem;
		align-content: start;
		justify-items: center;
	}

	.dashboard-device-cards__empty {
		display: flex;
		min-height: 100%;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		border: 1px dashed var(--cw-border-default);
		border-radius: 1.5rem;
		background: color-mix(in srgb, var(--cw-bg-elevated) 75%, transparent);
		color: var(--cw-text-muted);
		text-align: center;
	}

	.dashboard-device-cards__empty p {
		margin: 0;
		max-width: 28rem;
	}
</style>
