<!--
  Shared layout for the device detail page and its child routes (settings, etc.).

  Provides the common shell:
  - Back-to-location navigation
  - Device card header with title + last-seen duration
  - Settings / CSV export toolbar
  - {@render children()} slot for the active child route / display component
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { CwButton, CwCard, CwDuration } from '@cropwatchdevelopment/cwui';
	import { getAppContext } from '$lib/appContext.svelte';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: any; children: Snippet } = $props();

	const app = getAppContext();

	let locationId = $derived(page.params.location_id ?? '');
	let devEui = $derived(page.params.dev_eui ?? '');
	let locationName = $derived(
		app.devices.find((d) => d.dev_eui === devEui)?.location_name ?? 'Unknown'
	);

	/** Latest created_at from the page data (if available). */
	let lastSeen = $derived(data.latestData?.created_at ?? null);
</script>

<div class="device-layout">
	<!-- Navigation -->
	<div>
		<CwButton
			variant="primary"
			onclick={() => goto(`/locations/${encodeURIComponent(locationId)}`)}
		>
			← Back to Location
		</CwButton>
	</div>

	<!-- Device header card -->
	<CwCard
		title={`Device ${devEui.toUpperCase()}`}
		subtitle={`Location ${locationName}`}
		elevated
	>
		{#snippet subtitleSlot()}
			{#if lastSeen}
				<span>
					• Last updated:
					<CwDuration from={lastSeen} alarmAfterMinutes={10.5} class="subtitle-duration" />
				</span>
			{/if}
		{/snippet}

		<div class="device-toolbar">
			<div class="device-toolbar__primary">
				<CwButton
					variant="secondary"
					onclick={() =>
						goto(
							`/locations/${encodeURIComponent(locationId)}/devices/${encodeURIComponent(devEui)}/settings`
						)}
				>
					Settings
				</CwButton>
			</div>
		</div>
	</CwCard>

	<!-- Child route / display component renders here -->
	{@render children()}
</div>

<style>
	.device-layout {
		display: flex;
		flex-direction: column;
		overflow-y: scroll;
		gap: 1rem;
		padding: 1rem;
		background:
			radial-gradient(circle at top right, rgba(14, 165, 233, 0.1), transparent 38%),
			radial-gradient(circle at bottom left, rgba(34, 197, 94, 0.1), transparent 40%);
	}

	.device-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.device-toolbar__primary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
