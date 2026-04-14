<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DashboardTable from '$lib/components/dashboard/DashboardTable.svelte';
	import { AppNotice, AppPage } from '$lib/components/layout';
	import {
		CwCard,
		CwDropdown,
		CwExpandPanel,
		CwSpinner
	} from '@cropwatchdevelopment/cwui';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let activeGroup = $derived(page.url.searchParams.get('group') ?? '');
	let activeLocationGroup = $derived(page.url.searchParams.get('locationGroup') ?? '');
	let activeLocation = $derived(page.url.searchParams.get('location') ?? '');
	let dashboardFilters = $derived({
		group: activeGroup,
		locationGroup: activeLocationGroup,
		location: activeLocation
	});
	let dashboardFilterKey = $derived(JSON.stringify(dashboardFilters));

	function buildStringOptions(values: string[], allLabel: string) {
		return [{ label: allLabel, value: '' }, ...values.map((value) => ({ label: value, value }))];
	}

	function buildLocationOptions(locations: Array<{ location_id: number; name: string }>) {
		return [
			{ label: 'All locations', value: '' },
			...locations.map((location) => ({
				label: location.name,
				value: String(location.location_id)
			}))
		];
	}

	function applyFilter(key: 'group' | 'locationGroup' | 'location', value: string) {
		const nextUrl = new URL(page.url);

		if (value) {
			nextUrl.searchParams.set(key, value);
		} else {
			nextUrl.searchParams.delete(key);
		}

		const href = `${resolve('/')}${nextUrl.search}`;

		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(href, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	async function refreshDashboardData() {
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Dashboard - CropWatch</title>
</svelte:head>

<AppPage width="full" class="dashboard-page">
	<section class="dashboard-page__section">
		<CwExpandPanel title="Filters">
			{#await data.filterOptions}
				<div class="dashboard-page__loading">
					<CwSpinner size="md" showLabel label="Loading dashboard filters..." />
				</div>
			{:then filterOptions}
				<CwCard elevated>
					<div class="flex flex-row flex-wrap gap-4">
						<CwDropdown
							label="Device group"
							options={buildStringOptions(filterOptions.deviceGroups, 'All device groups')}
							value={activeGroup}
							onchange={(value) => applyFilter('group', value)}
						/>

						<CwDropdown
							label="Location group"
							options={buildStringOptions(filterOptions.locationGroups, 'All location groups')}
							value={activeLocationGroup}
							onchange={(value) => applyFilter('locationGroup', value)}
						/>

						<CwDropdown
							label="Location"
							options={buildLocationOptions(filterOptions.locations)}
							value={activeLocation}
							onchange={(value) => applyFilter('location', value)}
						/>
					</div>
				</CwCard>
			{/await}
		</CwExpandPanel>
	</section>

	<section class="dashboard-page__section dashboard-page__section--table">
		{#key dashboardFilterKey}
			<DashboardTable
				authToken={data.authToken}
				filters={dashboardFilters}
				initialTable={data.initialTable}
				onRefreshAll={refreshDashboardData}
			/>
		{/key}
	</section>
</AppPage>

<style>
	:global(.dashboard-page) {
		min-height: 100%;
	}

	.dashboard-page__header {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
	}

	.dashboard-page__copy {
		display: grid;
		gap: var(--cw-space-1);
	}

	.dashboard-page__copy h1 {
		margin: 0;
		font-size: clamp(1.75rem, 2vw + 1rem, 2.5rem);
		line-height: 1.1;
		color: var(--cw-text-primary);
	}

	.dashboard-page__copy p {
		margin: 0;
		color: var(--cw-text-secondary);
	}

	.dashboard-page__section {
		display: grid;
		gap: var(--cw-space-3);
		min-width: 0;
	}

	.dashboard-page__section--table {
		flex: 1 1 auto;
		min-height: 24rem;
	}

	.dashboard-page__loading {
		display: flex;
		justify-content: center;
		padding: var(--cw-space-6);
	}

	.dashboard-summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: var(--cw-space-3);
	}

	.dashboard-summary__value {
		margin: 0;
		font-size: clamp(2rem, 3vw, 2.75rem);
		font-weight: var(--cw-font-bold);
		line-height: 1;
		color: var(--cw-text-primary);
	}

	.dashboard-filters {
		display: grid;
		gap: var(--cw-space-4);
	}

	.dashboard-filters__inputs {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: var(--cw-space-3);
	}

	.dashboard-filters__actions {
		display: flex;
		justify-content: flex-end;
	}

	.dashboard-filters__notice {
		padding-top: var(--cw-space-2);
	}

	@media (min-width: 768px) {
		.dashboard-page__header {
			align-items: start;
			flex-direction: row;
			justify-content: space-between;
		}
	}
</style>
