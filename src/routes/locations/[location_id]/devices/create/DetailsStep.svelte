<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import {
		CwButton,
		CwChip,
		CwDateTimeRangePicker,
		CwDropdown,
		CwInput,
		type CwDateValue
	} from '@cropwatchdevelopment/cwui';
	import { AppNotice } from '$lib/components/layout';
	import {
		cwDateTimeRangePickerLabels,
		cwDropdownLabels,
		cwInputLabels
	} from '$lib/i18n/cwuiLabels';
	import { getIntlLocale } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import type { DeviceSetupFlow, LicenseOption } from './device-setup-flow.svelte';

	interface Props {
		flow: DeviceSetupFlow;
		licenses: LicenseOption[];
		groupSuggestions: string[];
		locationLat: number | null;
		locationLong: number | null;
	}

	let { flow, licenses, groupSuggestions, locationLat, locationLong }: Props = $props();

	let licenseOptions = $derived(
		licenses.map((license) => ({
			label: m.device_setup_license_seat({ seat: license.seatIndex + 1 }),
			value: String(license.id)
		}))
	);
	let changingLicense = $state(false);

	// The date picker works with { date }; the flow keeps an ISO day (local time).
	// Seeded once from the flow (the step remounts each time it is shown).
	const initialDay = untrack(() => flow.installedAt);
	let installedAt = $state<CwDateValue | undefined>(
		initialDay ? { date: new Date(`${initialDay}T00:00:00`) } : undefined
	);
	$effect(() => {
		const day = installedAt && 'date' in installedAt ? installedAt.date : null;
		flow.installedAt = day
			? `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
			: '';
	});

	// Shown once the user tried to continue, or as soon as a value is out of range.
	let latError = $derived(
		flow.usePreciseLocation && flow.latitude === null && (flow.attempted || flow.lat.trim() !== '')
			? m.device_setup_lat_invalid()
			: undefined
	);
	let longError = $derived(
		flow.usePreciseLocation &&
			flow.longitude === null &&
			(flow.attempted || flow.long.trim() !== '')
			? m.device_setup_long_invalid()
			: undefined
	);
</script>

<div class="flex flex-col gap-6">
	<header class="flex flex-col gap-1">
		<h2 class="m-0 text-xl font-semibold" tabindex="-1" data-step-heading>
			{m.device_setup_details_title()}
		</h2>
		<p class="m-0 text-(--cw-text-muted)">{m.device_setup_details_body()}</p>
	</header>

	<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
		<div class="sm:col-span-2">
			<CwInput
				labels={cwInputLabels()}
				id="device-setup-name-input"
				label={m.device_setup_name_label()}
				required
				maxlength={120}
				placeholder={m.device_setup_name_placeholder()}
				error={flow.attempted && !flow.name.trim() ? m.device_setup_name_required() : undefined}
				bind:value={flow.name}
			/>
		</div>

		<div class="flex flex-col gap-2">
			<CwInput
				labels={cwInputLabels()}
				id="device-setup-group-input"
				label={m.device_setup_group_label()}
				maxlength={120}
				bind:value={flow.group}
			/>
			{#if groupSuggestions.length > 0}
				<div class="flex flex-wrap gap-2">
					{#each groupSuggestions as suggestion (suggestion)}
						<button
							type="button"
							class="chip-button"
							aria-pressed={flow.group === suggestion}
							onclick={() => (flow.group = suggestion)}
						>
							<CwChip
								label={suggestion}
								tone={flow.group === suggestion ? 'primary' : 'secondary'}
							/>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex flex-col gap-1">
			<CwDateTimeRangePicker
				id="device-setup-installed-at"
				label={m.device_setup_installed_label()}
				locale={getIntlLocale()}
				mode="single"
				granularity="day"
				maxDate={new Date()}
				bind:value={installedAt}
				labels={cwDateTimeRangePickerLabels()}
			/>
		</div>
	</div>

	<div class="position flex flex-wrap items-center justify-between gap-3">
		{#if flow.usePreciseLocation}
			<div class="grid min-w-0 flex-[999_1_20rem] grid-cols-1 gap-4 sm:grid-cols-2">
				<CwInput
					labels={cwInputLabels()}
					id="device-setup-lat-input"
					type="text"
					label={m.device_setup_lat_label()}
					placeholder="35.6812"
					autocomplete="off"
					error={latError}
					bind:value={flow.lat}
				/>
				<CwInput
					labels={cwInputLabels()}
					id="device-setup-long-input"
					type="text"
					label={m.device_setup_long_label()}
					placeholder="139.7671"
					autocomplete="off"
					error={longError}
					bind:value={flow.long}
				/>
			</div>
			<CwButton
				id="device-setup-position-reset"
				variant="ghost"
				size="sm"
				onclick={() => (flow.usePreciseLocation = false)}
			>
				{m.device_setup_position_use_location()}
			</CwButton>
		{:else}
			<div class="flex min-w-0 flex-col gap-0.5">
				<span class="text-sm font-semibold">{m.device_setup_position_title()}</span>
				<span class="text-sm text-(--cw-text-muted)">
					{locationLat !== null && locationLong !== null
						? `${locationLat.toFixed(4)}, ${locationLong.toFixed(4)} · ${m.device_setup_position_hint()}`
						: m.device_setup_position_none()}
				</span>
			</div>
			<CwButton
				id="device-setup-position-set"
				variant="secondary"
				size="sm"
				onclick={() => {
					flow.lat ||= locationLat !== null ? String(locationLat) : '';
					flow.long ||= locationLong !== null ? String(locationLong) : '';
					flow.usePreciseLocation = true;
				}}
			>
				{m.device_setup_position_set()}
			</CwButton>
		{/if}
	</div>

	{#if licenses.length === 0}
		<AppNotice tone="warning" title={m.device_setup_no_license_title()}>
			<p>{m.device_setup_no_license_body()}</p>
			<div>
				<CwButton
					id="device-setup-add-licenses"
					size="sm"
					variant="primary"
					onclick={() => goto(resolve('/account/billing'))}
				>
					{m.device_setup_add_licenses()}
				</CwButton>
			</div>
		</AppNotice>
	{:else if changingLicense}
		<CwDropdown
			labels={cwDropdownLabels()}
			id="device-setup-license-select"
			label={m.device_setup_license_label()}
			options={licenseOptions}
			bind:value={flow.licenseId}
			onchange={() => (changingLicense = false)}
		/>
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-2 text-sm">
			<span>{m.device_setup_license_summary({ count: licenses.length })}</span>
			{#if licenses.length > 1}
				<CwButton
					id="device-setup-license-change"
					variant="ghost"
					size="sm"
					onclick={() => (changingLicense = true)}
				>
					{m.device_setup_change()}
				</CwButton>
			{/if}
		</div>
	{/if}

	<div class="flex justify-between gap-3 border-t border-(--cw-border-muted) pt-4">
		<CwButton id="device-setup-details-back" variant="ghost" onclick={() => flow.go('identify')}>
			&larr; {m.device_setup_back()}
		</CwButton>
		<CwButton
			id="device-setup-details-continue"
			variant="primary"
			disabled={licenses.length === 0}
			onclick={() => flow.next()}
		>
			{m.device_setup_continue()}
		</CwButton>
	</div>
</div>

<style>
	.position {
		padding: var(--cw-space-4);
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-bg-muted);
	}

	.chip-button {
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		border-radius: 999px;
	}

	.chip-button:focus-visible {
		outline: 2px solid var(--cw-accent);
		outline-offset: 2px;
	}
</style>
