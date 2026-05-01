<script lang="ts">
	import { enhance } from '$app/forms';
	import { CwButton, CwCard, CwChip, CwDropdown, CwInput } from '@cropwatchdevelopment/cwui';
	import { resolve } from '$app/paths';
	import { TTI_DEVICE_ID_MAX_LENGTH } from '$lib/devices/tti-device-id';
	import type { PageProps } from './$types';
	import './settings-style.css';
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';
	import SensorCertificatesCard from '../SensorCertificatesCard.svelte';
	import DeviceOwnerPermissionsCard from '../DeviceOwnerPermissionsCard.svelte';

	const DEVICE_NAME_MAX_LENGTH = 120;
	const DEVICE_GROUP_MAX_LENGTH = 120;

	type FormPayload = {
		action?: string;
		success?: boolean;
		message?: string;
		ownerKey?: string;
		fieldErrors?: Record<string, string>;
		values?: Record<string, string>;
	} | null;

	let { data, form }: PageProps = $props();

	let deviceSubmitting = $state(false);
	let deviceName = $derived(data.deviceName ?? '');
	let deviceGroup = $derived(data.deviceGroup ?? '');
	let ttiName = $derived(data.ttiName ?? '');
	let location_id = $derived(String(data.location_id ?? ''));
	let sensorCertificates = $derived(data.sensorCertificates ?? []);

	let actionForm = $derived((form ?? null) as FormPayload);
	let deviceForm = $derived(actionForm?.action === 'updateDevice' ? actionForm : null);
	let deviceNameValue = $derived(deviceName.trim());
	let deviceGroupValue = $derived(deviceGroup.trim());
	let deviceNameError = $derived(
		deviceNameValue.length === 0
			? m.devices_device_name_required()
			: deviceNameValue.length > DEVICE_NAME_MAX_LENGTH
				? m.devices_device_name_length({ max: String(DEVICE_NAME_MAX_LENGTH) })
				: (deviceForm?.fieldErrors?.name ?? '')
	);
	let deviceGroupError = $derived(
		deviceGroupValue.length > DEVICE_GROUP_MAX_LENGTH
			? m.devices_device_group_length({ max: String(DEVICE_GROUP_MAX_LENGTH) })
			: (deviceForm?.fieldErrors?.group ?? '')
	);
	let ttiNameValue = $derived(ttiName.trim().toLowerCase());
	let ttiNameError = $derived(deviceForm?.fieldErrors?.tti_name ?? '');
	let locationError = $derived(deviceForm?.fieldErrors?.location_id ?? '');
	let deviceDirty = $derived(
		deviceNameValue !== (data.deviceName ?? '').trim() ||
			deviceGroupValue !== (data.deviceGroup ?? '').trim() ||
			ttiNameValue !== (data.ttiName ?? '').trim().toLowerCase() ||
			location_id !== String(data.location_id ?? '')
	);
	let canSubmitDevice = $derived(
		!deviceSubmitting &&
			deviceDirty &&
			!deviceNameError &&
			!deviceGroupError &&
			!ttiNameError &&
			!locationError
	);
</script>

<svelte:head>
	<title>{m.devices_settings_page_title({ devEui: data.devEui?.toUpperCase() ?? 'UNKNOWN' })}</title
	>
</svelte:head>

<div class="device-settings-page">
	<CwButton
		variant="secondary"
		size="sm"
		onclick={() =>
			goto(
				resolve('/locations/[location_id]/devices/[dev_eui]', {
					location_id,
					dev_eui: data.devEui
				})
			)}
		class="back-button">&larr; {m.devices_back_to_detail()}</CwButton
	>
	<CwCard title={m.devices_settings_title()} elevated>
		<form
			method="POST"
			action="?/updateDevice"
			class="device-form"
			use:enhance={({ cancel }) => {
				if (!canSubmitDevice) {
					cancel();
					return;
				}

				deviceSubmitting = true;
				return async ({ update }) => {
					try {
						await update({ reset: false });
					} finally {
						deviceSubmitting = false;
					}
				};
			}}
		>
			<div class="device-form__header">
				<CwChip
					label={m.devices_deveui_chip({ devEui: data.devEui?.toUpperCase() ?? 'UNKNOWN' })}
					tone="info"
					variant="soft"
				/>
				{#if data.deviceGroup}
					<CwChip
						label={m.devices_current_group_chip({ group: data.deviceGroup })}
						tone="secondary"
						variant="soft"
					/>
				{/if}
			</div>

			{#if deviceForm?.message}
				<p class:feedback-success={deviceForm.success} class="form-feedback">
					{deviceForm.message}
				</p>
			{/if}

			<div class="panel-grid">
				<div class="field-stack">
					<CwInput
						label={m.devices_device_name_label()}
						name="name"
						required
						maxlength={DEVICE_NAME_MAX_LENGTH}
						bind:value={deviceName}
						error={deviceNameError || undefined}
					/>
					{#if deviceNameError}
						<p class="field-error">{deviceNameError}</p>
					{/if}
				</div>

				<div class="field-stack">
					<CwInput
						label={m.common_group()}
						name="group"
						required={false}
						maxlength={DEVICE_GROUP_MAX_LENGTH}
						bind:value={deviceGroup}
						error={deviceGroupError || undefined}
					/>
					<input type="hidden" name="group" value={deviceGroupValue} />
					{#if deviceGroupError}
						<p class="field-error">{deviceGroupError}</p>
					{/if}
				</div>

				<div class="field-stack">
					<CwInput
						label={m.devices_tti_device_id_label()}
						name="tti_name"
						required={false}
						maxlength={TTI_DEVICE_ID_MAX_LENGTH}
						placeholder={m.devices_tti_device_id_placeholder()}
						bind:value={ttiName}
						error={ttiNameError || undefined}
					/>
					<input type="hidden" name="tti_name" value={ttiNameValue} />
					{#if ttiNameError}
						<p class="field-error">{ttiNameError}</p>
					{/if}
				</div>

				<div class="field-stack">
					<CwDropdown
						label={m.common_location()}
						name="location_id"
						options={[
							{ label: m.devices_unassigned_location(), value: '' },
							...(data.locations ?? []).map((loc) => ({
								label: loc.name,
								value: String(loc.location_id)
							}))
						]}
						bind:value={location_id}
						error={locationError || undefined}
					/>
					<input type="hidden" name="location_id" bind:value={location_id} />
					{#if locationError}
						<p class="field-error">{locationError}</p>
					{/if}
				</div>
			</div>

			<div class="panel-actions">
				<CwButton
					type="submit"
					variant="primary"
					loading={deviceSubmitting}
					disabled={!canSubmitDevice}
				>
					{m.devices_update_submit()}
				</CwButton>
			</div>
		</form>
	</CwCard>

	<SensorCertificatesCard
		devEui={data.devEui ?? ''}
		locationId={location_id}
		{sensorCertificates}
	/>

	<DeviceOwnerPermissionsCard owners={data.deviceOwners ?? []} form={actionForm} />
</div>
