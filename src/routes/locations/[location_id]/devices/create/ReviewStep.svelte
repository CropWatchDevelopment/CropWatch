<script lang="ts">
	import { CwButton } from '@cropwatchdevelopment/cwui';
	import { formatHexPairs } from '$lib/devices/eui';
	import { formatDate } from '$lib/i18n/format';
	import { m } from '$lib/paraglide/messages.js';
	import SetupOutcome from './SetupOutcome.svelte';
	import type {
		DeviceSetupFlow,
		DeviceTypeOption,
		LicenseOption
	} from './device-setup-flow.svelte';

	interface Props {
		flow: DeviceSetupFlow;
		deviceTypeOptions: DeviceTypeOption[];
		licenses: LicenseOption[];
		locationName: string;
		/** Reloads the free licenses, then returns to the details step. */
		onchangelicense: () => void;
		onopenlocation: () => void;
	}

	let { flow, deviceTypeOptions, licenses, locationName, onchangelicense, onopenlocation }: Props =
		$props();

	let selectedLicense = $derived(
		licenses.find((license) => String(license.id) === flow.licenseId) ?? null
	);

	let keysSummary = $derived.by(() => {
		if (flow.keysNeeded) return m.device_setup_keys_summary_entered();
		switch (flow.currentLookup?.keys) {
			case 'inventory':
				return m.device_setup_keys_summary_inventory();
			case 'network':
				return m.device_setup_keys_summary_network();
			default:
				return m.device_setup_keys_summary_entered();
		}
	});
</script>

<div class="flex flex-col gap-5">
	<header class="flex flex-col gap-1">
		<h2 class="m-0 text-xl font-semibold" tabindex="-1" data-step-heading>
			{m.device_setup_review_title()}
		</h2>
		<p class="m-0 text-(--cw-text-muted)">{m.device_setup_review_body()}</p>
	</header>

	{#if flow.failure}
		<SetupOutcome
			failure={flow.failure}
			devEui={flow.devEui.value}
			onretry={() => void flow.register()}
			onchangeidentity={() => flow.go('identify')}
			{onchangelicense}
			{onopenlocation}
		/>
	{/if}

	<dl class="summary">
		<div>
			<dt>{m.device_setup_review_device()}</dt>
			<dd>{flow.name.trim()}</dd>
			<button
				type="button"
				class="edit"
				aria-label={m.device_setup_edit_field({ field: m.device_setup_review_device() })}
				onclick={() => flow.go('details')}>{m.device_setup_edit()}</button
			>
		</div>
		<div>
			<dt>{m.device_setup_review_model()}</dt>
			<dd>
				{deviceTypeOptions.find((option) => option.value === flow.deviceTypeId)?.label ?? '—'}
			</dd>
			<button
				type="button"
				class="edit"
				aria-label={m.device_setup_edit_field({ field: m.device_setup_review_model() })}
				onclick={() => flow.go('identify')}>{m.device_setup_edit()}</button
			>
		</div>
		<div>
			<dt>{m.device_setup_dev_eui_label()}</dt>
			<dd class="font-mono">{formatHexPairs(flow.devEui.value)}</dd>
			<span></span>
		</div>
		<div>
			<dt>{m.device_setup_review_keys()}</dt>
			<dd>{keysSummary}</dd>
			<span></span>
		</div>
		<div>
			<dt>{m.device_setup_review_location()}</dt>
			<dd>
				{locationName}{flow.group.trim() ? ` · ${flow.group.trim()}` : ''}{flow.usePreciseLocation
					? ` · ${flow.latitude}, ${flow.longitude}`
					: ''}
			</dd>
			<button
				type="button"
				class="edit"
				aria-label={m.device_setup_edit_field({ field: m.device_setup_review_location() })}
				onclick={() => flow.go('details')}>{m.device_setup_edit()}</button
			>
		</div>
		{#if flow.installedAt}
			<div>
				<dt>{m.device_setup_installed_label()}</dt>
				<dd>{formatDate(`${flow.installedAt}T00:00:00`)}</dd>
				<span></span>
			</div>
		{/if}
		<div>
			<dt>{m.device_setup_license_label()}</dt>
			<dd>
				{#if selectedLicense}
					{m.device_setup_license_seat({ seat: selectedLicense.seatIndex + 1 })} ·
				{/if}
				{m.device_setup_license_summary({ count: licenses.length })}
			</dd>
			<span></span>
		</div>
	</dl>

	<div class="flex justify-between gap-3 border-t border-(--cw-border-muted) pt-4">
		<CwButton id="device-setup-review-back" variant="ghost" onclick={() => flow.go('details')}>
			&larr; {m.device_setup_back()}
		</CwButton>
		<CwButton id="device-setup-register" variant="primary" onclick={() => void flow.register()}>
			{m.device_setup_register()}
		</CwButton>
	</div>
</div>

<style>
	.summary {
		margin: 0;
	}

	.summary > div {
		display: grid;
		grid-template-columns: minmax(7rem, 1fr) minmax(0, 2.5fr) auto;
		gap: var(--cw-space-3);
		align-items: baseline;
		padding: var(--cw-space-3) 0;
		border-bottom: 1px solid var(--cw-border-muted);
		font-size: 0.9375rem;
	}

	.summary > div:last-child {
		border-bottom: 0;
	}

	.summary dt {
		color: var(--cw-text-muted);
	}

	.summary dd {
		margin: 0;
		overflow-wrap: anywhere;
	}

	.edit {
		border: 0;
		background: none;
		padding: 0;
		color: var(--cw-accent-text);
		font: inherit;
		font-size: 0.875rem;
		cursor: pointer;
	}

	.edit:hover,
	.edit:focus-visible {
		text-decoration: underline;
	}
</style>
