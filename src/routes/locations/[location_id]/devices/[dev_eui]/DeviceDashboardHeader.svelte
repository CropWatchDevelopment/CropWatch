<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { backHref } from '$lib/navigation/backTo';
	import Icon from '$lib/components/Icon.svelte';
	import SETTINGS_ICON from '$lib/images/icons/settings.svg';
	import { m } from '$lib/paraglide/messages.js';
	import { canManage, isAdmin } from '$lib/constants/permissions';
	import { CwButton, CwCard, CwCopy, CwDuration, CwSpinner } from '@cropwatchdevelopment/cwui';
	import CsvExportDialog from './dialogs/csvExportDialog.svelte';
	import CsvTrafficExportDialog from './dialogs/csvTrafficExportDialog.svelte';
	import type { RangeSelection, TimeRangeOptions } from './device-detail';
	import NotesReviewDialog from './dialogs/NotesReviewDialog.svelte';

	interface Props {
		activeRange: RangeSelection | null;
		authToken: string | null;
		controlsDisabled: boolean;
		devEui: string;
		exportTimeZone: string;
		fetching: boolean;
		isTrafficDevice: boolean;
		lastUpdatedAt: string | null;
		locationId: string;
		locationName: string;
		onSelectRange: (selection: RangeSelection) => unknown;
		permissionLevel: number;
		rangeOptions: TimeRangeOptions[];
		titleName: string;
	}

	let {
		activeRange,
		authToken,
		controlsDisabled,
		devEui,
		exportTimeZone,
		fetching,
		isTrafficDevice,
		lastUpdatedAt,
		locationId,
		locationName,
		onSelectRange,
		permissionLevel,
		rangeOptions,
		titleName
	}: Props = $props();

	// Return to wherever we came from (e.g. the filtered dashboard) when a
	// `backTo` was supplied; otherwise fall back to this device's location.
	// Computed at click time so it never participates in reactive updates.
	function goBack() {
		goto(backHref(page.url, resolve('/locations/[location_id]', { location_id: locationId })));
	}
</script>

<CwButton id="device-header-back-button" variant="secondary" size="sm" disabled={!locationId} onclick={goBack}>
	&larr; {m.action_back()}
</CwButton>

<CwCard
	title={m.devices_dashboard_card_title({ devEui: titleName })}
	subtitle={m.devices_dashboard_card_subtitle({ locationName })}
	elevated
>
	{#snippet actions()}
		<div>
		<p class="text-md text-right" style="color: var(--cw-text-muted)">
			{m.display_last_updated()}:
			{#if lastUpdatedAt}
				<CwDuration from={lastUpdatedAt} />
			{:else}
				<span>{m.common_not_available()}</span>
			{/if}
		</p>
		<p class="text-md text-right" style="color: var(--cw-text-muted)">Dev-Eui: {devEui} <CwCopy value={devEui} /></p>
		</div>
	{/snippet}

	<div class="device-header">
		<div class="device-header__ranges">
			{#if !isTrafficDevice}
				{#each rangeOptions as range (range.value)}
					<CwButton
						id={`device-header-range-${range.value}-button`}
						variant={activeRange === range.value ? 'primary' : 'secondary'}
						size="sm"
						disabled={controlsDisabled}
						onclick={() => onSelectRange(range.value)}
					>
						{range.label}
					</CwButton>
				{/each}
			{/if}
		</div>

		<div class="device-header__actions">
			{#if canManage(permissionLevel)}
				<NotesReviewDialog {authToken} {devEui} disabled={controlsDisabled} />

				<CsvExportDialog
					{authToken}
					{devEui}
					{locationName}
					timeZone={exportTimeZone}
					disabled={controlsDisabled}
				/>

				{#if isTrafficDevice}
					<CsvTrafficExportDialog
						{authToken}
						{devEui}
						{locationName}
						timeZone={exportTimeZone}
						disabled={controlsDisabled}
					/>
				{/if}
			{/if}

			{#if isAdmin(permissionLevel)}
				<CwButton
					id="device-header-settings-button"
					variant="secondary"
					size="md"
					disabled={!locationId || !devEui}
					onclick={() =>
						goto(
							resolve('/locations/[location_id]/devices/[dev_eui]/settings', {
								location_id: locationId,
								dev_eui: devEui
							})
						)}
				>
					<Icon src={SETTINGS_ICON} alt="" class="h-4 w-4" />
					{m.nav_settings()}
				</CwButton>
			{/if}
		</div>
	</div>

	{#if fetching}
		<div class="device-header__status">
			<div class="device-header__status-row">
				<CwSpinner />
				<span>{m.devices_loading_telemetry()}</span>
			</div>
		</div>
	{/if}
</CwCard>

<style>
	.device-header {
		display: flex;
		width: 100%;
		gap: var(--cw-space-3);
		align-items: flex-start;
		justify-content: space-between;
		flex-wrap: wrap;
	}

	.device-header__ranges,
	.device-header__actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--cw-space-2);
	}

	.device-header__actions {
		justify-content: flex-end;
	}

	.device-header__status {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--cw-border, #e5e7eb);
	}

	.device-header__status-row {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--cw-text-muted);
	}
</style>
