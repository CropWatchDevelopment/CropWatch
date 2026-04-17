<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		CwButton,
		CwCard,
		CwChip,
		CwDropdown,
		CwInput,
		CwSeparator
	} from '@cropwatchdevelopment/cwui';
	import { asset, resolve } from '$app/paths';
	import { TTI_DEVICE_ID_MAX_LENGTH } from '$lib/devices/tti-device-id';
	import type { PageProps } from './$types';
	import './settings-style.css';
	import { goto } from '$app/navigation';
	import { getAppContext } from '$lib/appContext.svelte';
	import { getPermissionLevelOptions } from '$lib/i18n/options';
	import { m } from '$lib/paraglide/messages.js';
	import Icon from '$lib/components/Icon.svelte';
	import DOWNLOAD_ICON from '$lib/images/icons/download.svg';

	const DEVICE_NAME_MAX_LENGTH = 120;
	const DEVICE_GROUP_MAX_LENGTH = 120;
	const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const VALID_PERMISSION_LEVELS = new Set([1, 2, 3, 4]);

	type DeviceOwnerRow = {
		id: number;
		key: string;
		name: string;
		email: string;
		userId: string;
		permissionLevel: string;
	};

	type FormPayload = {
		action?: string;
		success?: boolean;
		message?: string;
		ownerKey?: string;
		fieldErrors?: Record<string, string>;
		values?: Record<string, string>;
	} | null;

	let { data, form }: PageProps = $props();
	const app = getAppContext();

	let deviceSubmitting = $state(false);
	let ownerSubmittingByKey = $state<Record<string, boolean>>({});
	let deviceName = $derived(data.deviceName ?? '');
	let deviceGroup = $derived(data.deviceGroup ?? '');
	let ttiName = $derived(data.ttiName ?? '');
	let location_id = $derived(String(data.location_id ?? ''));
	let sensorCertificates = $derived(data.sensorCertificates ?? []);
	let sensorOneCertificate = $derived(
		sensorCertificates.find((target) => target.key === 'sensor') ?? null
	);
	let sensorTwoCertificate = $derived(
		sensorCertificates.find((target) => target.key === 'sensor2') ?? null
	);
	let hasSensorCertificates = $derived(Boolean(sensorOneCertificate || sensorTwoCertificate));
	let permissionRows = $derived(createOwnerRows(data.deviceOwners ?? []));
	const sensorTwoCertificateDownloadPath = asset(
		'/files/Sensirion_Humidity_Sensors_SHTxx_Calibration_Certification.pdf'
	);

	function createOwnerRows(
		owners: Array<{
			id: number;
			key: string;
			name: string;
			email: string;
			userId: string;
			permissionLevel: number;
		}>
	): DeviceOwnerRow[] {
		return owners.map((owner) => ({
			id: owner.id,
			key: owner.key,
			name: owner.name,
			email: owner.email,
			userId: owner.userId,
			permissionLevel: String(owner.permissionLevel)
		}));
	}

	function setOwnerSubmitting(key: string, loading: boolean) {
		ownerSubmittingByKey = {
			...ownerSubmittingByKey,
			[key]: loading
		};
	}

	function isOwnerRowValid(row: DeviceOwnerRow): boolean {
		const permissionLevel = Number.parseInt(row.permissionLevel, 10);
		return EMAIL_PATTERN.test(row.email) && VALID_PERMISSION_LEVELS.has(permissionLevel);
	}

	function updateOwnerPermissionLevel(key: string, permissionLevel: string) {
		permissionRows = permissionRows.map((row) =>
			row.key === key
				? {
						...row,
						permissionLevel
					}
				: row
		);
	}

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

	const permissionOptions = getPermissionLevelOptions();

	function ownerFormFor(key: string): FormPayload {
		return actionForm?.action === 'updateDeviceOwnerPermission' && actionForm.ownerKey === key
			? actionForm
			: null;
	}
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

	<CwCard title={m.devices_sensor_certificates_title()} elevated>
		{#if !hasSensorCertificates}
			<p class="text-muted text-xs">{m.devices_no_sensor_serial()}</p>
		{:else}
			<div class="certificate-list">
				{#if sensorOneCertificate}
					<div class="certificate-item">
						<div class="certificate-item__meta">
							<div class="device-form__header">
								<CwChip label={sensorOneCertificate.label} tone="info" variant="soft" />
								<CwChip
									label={m.devices_sensor_serial_chip({ serial: sensorOneCertificate.serial })}
									tone="secondary"
									variant="soft"
								/>
								{#if sensorOneCertificate.product}
									<CwChip label={sensorOneCertificate.product} tone="secondary" variant="soft" />
								{/if}
							</div>

							<p class="panel-note">{m.devices_sensor_certificate_note()}</p>

							{#if sensorOneCertificate.downloadDisabledReason}
								<p class="field-error">{sensorOneCertificate.downloadDisabledReason}</p>
							{/if}
						</div>

						<form
							method="GET"
							action={resolve(
								'/locations/[location_id]/devices/[dev_eui]/settings/libellus-certificates/[sensor_key]',
								{
									location_id,
									dev_eui: data.devEui,
									sensor_key: sensorOneCertificate.key
								}
							)}
							target="_blank"
							class="certificate-download-form"
						>
							<CwButton
								type="submit"
								variant="primary"
								size="sm"
								disabled={Boolean(sensorOneCertificate.downloadDisabledReason)}
							>
								<Icon src={DOWNLOAD_ICON} />
							</CwButton>
						</form>
					</div>
				{/if}

				{#if sensorOneCertificate && sensorTwoCertificate}
					<CwSeparator spacing="0" />
				{/if}

				{#if sensorTwoCertificate}
					<div class="certificate-item">
						<div class="certificate-item__meta">
							<div class="device-form__header">
								<CwChip label={sensorTwoCertificate.label} tone="info" variant="soft" />
								<CwChip
									label={m.devices_sensor_serial_chip({ serial: sensorTwoCertificate.serial })}
									tone="secondary"
									variant="soft"
								/>
								{#if sensorTwoCertificate.product}
									<CwChip label={sensorTwoCertificate.product} tone="secondary" variant="soft" />
								{/if}
							</div>

							<p class="panel-note">{m.devices_sensor_certificate_note()}</p>
						</div>

						<form
							method="GET"
							action={sensorTwoCertificateDownloadPath}
							target="_blank"
							class="certificate-download-form"
						>
							<CwButton type="submit" variant="primary" size="sm">
								<Icon src={DOWNLOAD_ICON} />
							</CwButton>
						</form>
					</div>
				{/if}
			</div>
		{/if}
	</CwCard>

	<CwCard title={m.devices_owner_permissions_title()} elevated>
		{#if permissionRows.length === 0}
			<p class="text-muted text-xs">{m.devices_no_device_owners()}</p>
		{:else}
			<div class="permission-list">
				{#each permissionRows as row, index (row.key)}
					{@const ownerForm = ownerFormFor(row.key)}
					{#if row.email && row.email !== ''}
						{#if !row.email.includes('@cropwatch.io') || app.session?.email.includes('@cropwatch.io')}
							<div class="permission-row">
								<form
									method="POST"
									action="?/updateDeviceOwnerPermission"
									class="permission-row__form"
									use:enhance={({ formData, cancel }) => {
										if (!isOwnerRowValid(row)) {
											cancel();
											return;
										}

										const key = String(formData.get('ownerKey') ?? row.key);
										setOwnerSubmitting(key, true);

										return async ({ update }) => {
											try {
												await update({ reset: false });
											} finally {
												setOwnerSubmitting(key, false);
											}
										};
									}}
								>
									<input type="hidden" name="ownerKey" value={row.key} />
									<input type="hidden" name="targetUserEmail" value={row.email} />
									<input type="hidden" name="permissionLevel" value={row.permissionLevel} />

									<div class="permission-user flex items-center justify-center">
										<input type="hidden" value={row.name} disabled />
										<!-- <CwInput
											label={m.auth_email_label()}
											value={row.email || row.userId || m.common_not_available()}
											disabled
										/> -->
										<p class="text-xl">{row.name} ({row.email})</p>
									</div>

									<div class="permission-edit">
										<div class="field-stack">
											<CwDropdown
												label={m.locations_permission_level()}
												options={permissionOptions}
												bind:value={
													() => row.permissionLevel,
													(value) => updateOwnerPermissionLevel(row.key, String(value ?? ''))
												}
												error={ownerForm?.fieldErrors?.permissionLevel ||
													(!isOwnerRowValid(row)
														? m.devices_choose_valid_permission_level()
														: undefined)}
											/>
											{#if ownerForm?.fieldErrors?.permissionLevel}
												<p class="field-error">{ownerForm.fieldErrors.permissionLevel}</p>
											{/if}
										</div>

										<CwButton
											type="submit"
											variant="primary"
											loading={ownerSubmittingByKey[row.key] ?? false}
											disabled={(ownerSubmittingByKey[row.key] ?? false) || !isOwnerRowValid(row)}
										>
											{m.devices_update_permission()}
										</CwButton>
									</div>

									{#if ownerForm?.fieldErrors?.targetUserEmail}
										<p class="field-error permission-feedback">
											{ownerForm.fieldErrors.targetUserEmail}
										</p>
									{/if}

									{#if ownerForm?.message}
										<p
											class:feedback-success={ownerForm.success}
											class="form-feedback permission-feedback"
										>
											{ownerForm.message}
										</p>
									{/if}
								</form>
							</div>
							{#if index < permissionRows.length - 1}
								<CwSeparator spacing="0" />
							{/if}
						{/if}
					{/if}
				{/each}
			</div>
		{/if}
	</CwCard>
</div>
