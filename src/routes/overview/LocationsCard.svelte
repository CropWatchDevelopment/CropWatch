<script lang="ts">
	import { resolve } from '$app/paths';
	import type { OverviewDto } from '$lib/api/api.dtos';
	import { m } from '$lib/paraglide/messages.js';
	import OverviewSection from './OverviewSection.svelte';
	import { sortLocations } from './overview';

	interface Props {
		locations: OverviewDto['locations'];
		class?: string;
	}

	let { locations, class: className = '' }: Props = $props();

	const MAX_SHOWN = 8;

	const sorted = $derived(sortLocations(locations));
	const shown = $derived(sorted.slice(0, MAX_SHOWN));
</script>

<OverviewSection
	title={m.overview_locations_title()}
	subtitle={m.overview_locations_subtitle()}
	class={className}
>
	<ul class="locs">
		{#each shown as location (location.locationId ?? 'none')}
			{@const healthy = location.online === location.total}
			<li class="loc">
				<div class="loc__row">
					<span class="loc__name">
						<span class="loc__dot" class:loc__dot--down={!healthy}></span>
						{#if location.locationId !== null}
							<a
								class="loc__link"
								href={resolve('/locations/[location_id]', {
									location_id: String(location.locationId)
								})}>{location.name ?? m.dashboard_no_location()}</a
							>
						{:else}
							{m.dashboard_no_location()}
						{/if}
					</span>
					<span class="loc__count" class:loc__count--down={!healthy}>
						<span aria-hidden="true">{location.online} / {location.total}</span>
						<span class="sr-only">
							{m.overview_locations_count_aria({ online: location.online, total: location.total })}
						</span>
					</span>
				</div>
				<div class="loc__track">
					<div
						class="loc__bar"
						class:loc__bar--down={!healthy}
						style:width={`${location.total === 0 ? 0 : Math.round((location.online / location.total) * 100)}%`}
					></div>
				</div>
			</li>
		{/each}
	</ul>
	{#if sorted.length > MAX_SHOWN}
		<a class="locs__all" href={resolve('/locations')}>{m.overview_locations_all()}</a>
	{/if}
</OverviewSection>

<style>
	.locs {
		list-style: none;
		margin: 0;
		padding: var(--cw-space-3) var(--cw-space-6) var(--cw-space-5);
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
	}

	.loc {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.loc__row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-2);
		font-size: var(--cw-text-sm);
	}

	.loc__name {
		display: inline-flex;
		align-items: center;
		gap: var(--cw-space-2);
		font-weight: var(--cw-font-medium);
		color: var(--cw-text-primary);
		min-width: 0;
	}

	.loc__link {
		color: inherit;
		text-decoration: none;
		overflow-wrap: anywhere;
	}

	.loc__link:hover {
		text-decoration: underline;
	}

	.loc__dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: var(--cw-radius-full);
		background: var(--cw-status-online);
		flex: none;
	}

	.loc__dot--down {
		background: var(--cw-status-offline);
	}

	.loc__count {
		font-size: 0.8125rem;
		color: var(--cw-text-muted);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.loc__count--down {
		color: var(--cw-tone-danger-text);
		font-weight: var(--cw-font-semibold);
	}

	.loc__track {
		height: 0.375rem;
		border-radius: var(--cw-radius-pill);
		overflow: hidden;
		background: var(--cw-bg-muted);
	}

	.loc__bar {
		height: 100%;
		border-radius: var(--cw-radius-pill);
		background: var(--cw-status-online);
	}

	.loc__bar--down {
		background: var(--cw-status-warning);
	}

	.locs__all {
		display: inline-block;
		margin: calc(-1 * var(--cw-space-2)) var(--cw-space-6) var(--cw-space-5);
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-medium);
		color: var(--cw-accent-text);
		text-decoration: none;
	}

	.locs__all:hover {
		text-decoration: underline;
	}

	@container overview (width < 640px) {
		.locs {
			padding: var(--cw-space-3) var(--cw-space-4) var(--cw-space-4);
		}

		.locs__all {
			margin: calc(-1 * var(--cw-space-1)) var(--cw-space-4) var(--cw-space-4);
		}
	}
</style>
