<script lang="ts">
	import { enhance } from '$app/forms';
	import { CwButton, CwCard, CwChip, CwDropdown, CwInput } from '@cropwatchdevelopment/cwui';
	import { resolve } from '$app/paths';
	import { AppActionRow, AppFormStack, AppNotice, AppPage } from '$lib/components/layout';
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

	// Capture once — form fields are seeded from the loaded record and then
	// owned by the user; they must not re-seed reactively (see CLAUDE.md).
	const initial = (() => data)();

	let deviceSubmitting = $state(false);
	let deviceName = $state(initial.deviceName ?? '');
	let deviceGroup = $state(initial.deviceGroup ?? '');
	let ttiName = $state(initial.ttiName ?? '');
	let location_id = $state(String(initial.location_id ?? ''));
	let sensorCertificates = $derived(data.sensorCertificates ?? []);
	let supportsSensorCertificates = $derived(data.supportsSensorCertificates ?? false);

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

<AppPage width="lg">
	<CwButton
		id="device-settings-back-button"
		variant="secondary"
		size="sm"
		onclick={() =>
			goto(
				resolve('/locations/[location_id]/devices/[dev_eui]', {
					location_id,
					dev_eui: data.devEui
				})
			)}>&larr; {m.devices_back_to_detail()}</CwButton
	>
	<CwCard title={m.devices_settings_title()} elevated>
		<form
			id="device-settings-form"
			method="POST"
			action="?/updateDevice"
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
			<AppFormStack padded>
				<div class="flex flex-wrap gap-2">
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
					<AppNotice tone={deviceForm.success ? 'success' : 'danger'}>
						<p>{deviceForm.message}</p>
					</AppNotice>
				{/if}

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<CwInput
						id="device-settings-name-input"
						label={m.devices_device_name_label()}
						name="name"
						required
						maxlength={DEVICE_NAME_MAX_LENGTH}
						bind:value={deviceName}
						error={deviceNameError || undefined}
					/>

					<div>
						<CwInput
							id="device-settings-group-input"
							label={m.common_group()}
							name="group"
							required={false}
							maxlength={DEVICE_GROUP_MAX_LENGTH}
							bind:value={deviceGroup}
							error={deviceGroupError || undefined}
						/>
						<input
							id="device-settings-group-hidden-input"
							type="hidden"
							name="group"
							value={deviceGroupValue}
						/>
					</div>

					<div>
						<CwInput
							id="device-settings-tti-name-input"
							label={m.devices_tti_device_id_label()}
							name="tti_name"
							required={false}
							maxlength={TTI_DEVICE_ID_MAX_LENGTH}
							placeholder={m.devices_tti_device_id_placeholder()}
							bind:value={ttiName}
							error={ttiNameError || undefined}
						/>
						<input
							id="device-settings-tti-name-hidden-input"
							type="hidden"
							name="tti_name"
							value={ttiNameValue}
						/>
					</div>

					<div>
						<CwDropdown
							id="device-settings-location-select"
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
						<input
							id="device-settings-location-hidden-input"
							type="hidden"
							name="location_id"
							bind:value={location_id}
						/>
					</div>
				</div>

				<AppActionRow>
					<CwButton
						id="device-settings-submit-button"
						type="submit"
						variant="primary"
						loading={deviceSubmitting}
						disabled={!canSubmitDevice}
					>
						{m.devices_update_submit()}
					</CwButton>
				</AppActionRow>
			</AppFormStack>
		</form>
	</CwCard>

	{#if supportsSensorCertificates}
		<SensorCertificatesCard
			devEui={data.devEui ?? ''}
			locationId={location_id}
			{sensorCertificates}
		/>
	{/if}

	<DeviceOwnerPermissionsCard owners={data.deviceOwners ?? []} form={actionForm} />
</AppPage>
