<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { CwButton, CwDropdown, CwInput, CwSpinner } from '@cropwatchdevelopment/cwui';
	import { AppNotice } from '$lib/components/layout';
	import { cwDropdownLabels, cwInputLabels } from '$lib/i18n/cwuiLabels';
	import { formatHexPairs } from '$lib/devices/eui';
	import { m } from '$lib/paraglide/messages.js';
	import DeviceQrScanner from './DeviceQrScanner.svelte';
	import type { DeviceSetupFlow, DeviceTypeOption } from './device-setup-flow.svelte';
	import { hexFieldError, supportHref } from './setup-messages';

	interface Props {
		flow: DeviceSetupFlow;
		deviceTypeOptions: DeviceTypeOption[];
		oncancel: () => void;
	}

	let { flow, deviceTypeOptions, oncancel }: Props = $props();

	let scannerOpen = $state(false);

	// Look the DevEUI up as soon as it is complete (debounced while typing);
	// an incomplete DevEUI cancels a lookup still in flight.
	$effect(() => {
		const { value, issue } = flow.devEui;
		if (issue) {
			untrack(() => flow.cancelLookup());
			return;
		}
		const timer = setTimeout(() => {
			if (untrack(() => flow.currentLookup?.dev_eui) !== value) void flow.runLookup();
		}, 350);
		return () => clearTimeout(timer);
	});

	let lookup = $derived(flow.currentLookup);
	let label = $derived(flow.currentLabel);
	let ownership = $derived(lookup?.ownership ?? null);
	let lookupError = $derived(flow.devEui.issue ? null : flow.lookupError);

	// Why the network needs (other) keys, when it rejected or asked for them.
	let keyProblem = $derived.by(() => {
		switch (flow.failure?.code) {
			case 'KEYS_DO_NOT_MATCH':
				return m.device_setup_keys_mismatch();
			case 'KEYS_REQUIRED':
				return flow.failure.details.reason === 'verify'
					? m.device_setup_keys_verify()
					: m.device_setup_keys_rejected();
			case 'INVALID_KEYS':
				return m.device_setup_keys_rejected();
			default:
				return null;
		}
	});

	// Where the selected model came from: the device's label, or its DevEUI.
	let modelHint = $derived.by(() => {
		if (label?.deviceTypeId && String(label.deviceTypeId) === flow.deviceTypeId) {
			return m.device_setup_model_from_label();
		}
		if (lookup?.model.device_type_id && String(lookup.model.device_type_id) === flow.deviceTypeId) {
			return m.device_setup_model_recognized();
		}
		if (label?.typeCode && !label.deviceTypeId) {
			return m.device_setup_model_label_unknown({ code: label.typeCode });
		}
		return undefined;
	});

	// Suggested models first; models the region can't register are disabled.
	let modelOptions = $derived.by(() => {
		const suggested = lookup?.model.suggested_device_type_ids ?? [];
		const supported = lookup?.supported_device_type_ids;
		const rank = (value: string) => {
			const index = suggested.indexOf(Number(value));
			return index === -1 ? suggested.length : index;
		};
		return [...deviceTypeOptions]
			.sort((a, b) => rank(a.value) - rank(b.value))
			.map((option) => ({
				...option,
				disabled: supported ? !supported.includes(Number(option.value)) : false
			}));
	});
</script>

<div class="flex flex-col gap-6">
	<header class="flex flex-col gap-1">
		<h2 class="m-0 text-xl font-semibold" tabindex="-1" data-step-heading>
			{m.device_setup_identify_title()}
		</h2>
		<p class="m-0 text-(--cw-text-muted)">{m.device_setup_identify_body()}</p>
	</header>

	<div class="flex flex-wrap items-start gap-4">
		<CwButton
			id="device-setup-scan-button"
			variant="secondary"
			class="scan-button"
			onclick={() => (scannerOpen = true)}
		>
			<svg
				width="22"
				height="22"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
				><path
					d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"
				></path><rect x="7" y="7" width="4" height="4"></rect><rect
					x="13"
					y="13"
					width="4"
					height="4"
				></rect></svg
			>
			{m.device_setup_scan_qr()}
		</CwButton>

		<div class="min-w-0 flex-[3_1_18rem]">
			<CwInput
				labels={cwInputLabels()}
				id="device-setup-dev-eui-input"
				type="text"
				class="hex-input"
				label={m.device_setup_dev_eui_label()}
				required
				autocomplete="off"
				placeholder="00 13 7A 10 00 04 41 DF"
				hint={m.device_setup_dev_eui_hint()}
				error={hexFieldError(flow.devEui, flow.attempted)}
				bind:value={flow.devEuiInput}
			/>
		</div>
	</div>

	<!-- Always mounted so screen readers announce status changes. -->
	<div aria-live="polite">
		{#if flow.lookingUp}
			<div class="flex items-center gap-3 text-(--cw-text-muted)">
				<CwSpinner size="sm" />
				<span>{m.device_setup_checking()}</span>
			</div>
		{/if}
	</div>

	{#if flow.lookingUp}
		<!-- The status line above covers this state. -->
	{:else if lookupError?.code === 'FORBIDDEN'}
		<AppNotice tone="danger" title={m.device_setup_forbidden_title()}>
			<p>{m.device_setup_forbidden_body()}</p>
		</AppNotice>
	{:else if lookupError?.code === 'RATE_LIMITED'}
		<AppNotice tone="warning"><p>{m.device_setup_rate_limited()}</p></AppNotice>
	{:else if lookupError}
		<AppNotice tone="warning">
			<p>
				{lookupError.reference
					? m.device_setup_lookup_failed_server({ reference: lookupError.reference })
					: m.device_setup_lookup_failed()}
			</p>
			<div>
				<CwButton
					id="device-setup-lookup-retry"
					size="sm"
					variant="secondary"
					onclick={() => void flow.runLookup()}
				>
					{m.device_setup_retry()}
				</CwButton>
			</div>
		</AppNotice>
	{:else if ownership?.status === 'other_account'}
		<AppNotice tone="danger" title={m.device_setup_owned_other_title()}>
			<p>{m.device_setup_owned_other_body({ dev_eui: formatHexPairs(flow.devEui.value) })}</p>
			<div>
				<CwButton
					id="device-setup-owned-other-support"
					size="sm"
					variant="secondary"
					onclick={() => (window.location.href = supportHref(null, flow.devEui.value))}
				>
					{m.device_setup_contact_support()}
				</CwButton>
			</div>
		</AppNotice>
	{:else if ownership?.status === 'yours'}
		{@const existing = ownership.device}
		<AppNotice tone="warning" title={m.device_setup_already_yours_title()}>
			<p>
				{m.device_setup_already_yours_body({
					name: existing.name,
					location: existing.location_name ?? '—'
				})}
			</p>
			{#if existing.location_id}
				<div>
					<a
						class="font-semibold underline-offset-2 hover:underline"
						href={resolve('/locations/[location_id]/devices/[dev_eui]', {
							location_id: String(existing.location_id),
							dev_eui: existing.dev_eui
						})}
					>
						{m.device_setup_open_device({ name: existing.name })} &rarr;
					</a>
				</div>
			{/if}
		</AppNotice>
	{:else if lookup}
		<section class="identified flex flex-col gap-5" aria-label={m.device_setup_model_label()}>
			<CwDropdown
				labels={cwDropdownLabels()}
				id="device-setup-model-select"
				label={m.device_setup_model_label()}
				required
				placeholder={m.device_setup_model_placeholder()}
				options={modelOptions}
				hint={modelHint}
				error={!flow.modelSupported
					? m.device_setup_model_unsupported()
					: flow.attempted && !flow.deviceTypeId
						? m.device_setup_model_required()
						: undefined}
				value={flow.deviceTypeId}
				onchange={(value) => flow.chooseModel(value)}
			/>

			{#if !flow.keysNeeded && lookup.keys === 'inventory'}
				<p class="key-status">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="var(--cw-success-500, #00d4aa)"
						stroke-width="2.2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg
					>
					<span
						><strong>{m.device_setup_keys_inventory_title()}</strong>
						{m.device_setup_keys_inventory_body()}</span
					>
				</p>
			{:else if !flow.keysNeeded && lookup.keys === 'network'}
				<p class="key-status">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="var(--cw-info-400, #38bdf8)"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
						><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 8h.01"></path></svg
					>
					<span
						><strong>{m.device_setup_keys_network_title()}</strong>
						{m.device_setup_keys_network_body()}</span
					>
				</p>
			{:else}
				<div class="flex flex-col gap-4">
					{#if keyProblem}
						<AppNotice tone="danger" ariaLive="polite"><p>{keyProblem}</p></AppNotice>
					{/if}
					{#if label?.appKeyMasked}
						<!-- The label hides its AppKey and the key inventory doesn't have it. -->
						<AppNotice tone="warning" title={m.device_setup_keys_masked_title()}>
							<p>{m.device_setup_keys_masked_body()}</p>
							<div>
								<CwButton
									id="device-setup-keys-masked-support"
									size="sm"
									variant="secondary"
									onclick={() => (window.location.href = supportHref(null, flow.devEui.value))}
								>
									{m.device_setup_contact_support()}
								</CwButton>
							</div>
						</AppNotice>
					{:else}
						<p class="m-0 text-sm text-(--cw-text-muted)">{m.device_setup_keys_required_body()}</p>
					{/if}
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<CwInput
							labels={cwInputLabels()}
							id="device-setup-join-eui-input"
							type="text"
							class="hex-input"
							label={m.device_setup_join_eui_label()}
							required
							autocomplete="off"
							placeholder="00 00 00 00 00 00 00 00"
							error={hexFieldError(flow.joinEui, flow.attempted)}
							bind:value={flow.joinEuiInput}
						/>
						<CwInput
							labels={cwInputLabels()}
							id="device-setup-app-key-input"
							type="text"
							class="hex-input"
							label={m.device_setup_app_key_label()}
							required
							autocomplete="off"
							hint={m.device_setup_app_key_hint()}
							error={hexFieldError(flow.appKey, flow.attempted)}
							bind:value={flow.appKeyInput}
						/>
					</div>
				</div>
			{/if}
		</section>
	{/if}

	<div class="flex justify-end gap-3 border-t border-(--cw-border-muted) pt-4">
		<CwButton id="device-setup-cancel" variant="ghost" onclick={oncancel}>
			{m.action_cancel()}
		</CwButton>
		<CwButton
			id="device-setup-identify-continue"
			variant="primary"
			disabled={!lookup || flow.blockedByOwnership}
			onclick={() => flow.next()}
		>
			{m.device_setup_continue()}
		</CwButton>
	</div>
</div>

<DeviceQrScanner bind:open={scannerOpen} onresult={(payload) => flow.applyQr(payload)} />

<style>
	/* Identifiers read better in a monospace face (label stays in the UI font). */
	:global(.hex-input input) {
		font-family: var(--cw-font-mono);
		letter-spacing: 0.02em;
	}

	:global(.scan-button) {
		flex: 1 1 11rem;
		min-height: 5.5rem;
		flex-direction: column;
		justify-content: center;
		gap: var(--cw-space-2);
		border-style: dashed;
	}

	.identified {
		padding: var(--cw-space-5);
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-bg-muted);
	}

	.key-status {
		display: flex;
		gap: var(--cw-space-3);
		align-items: flex-start;
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.6;
	}

	.key-status svg {
		flex: none;
		margin-top: 2px;
	}

	.key-status strong {
		font-weight: 600;
	}
</style>
