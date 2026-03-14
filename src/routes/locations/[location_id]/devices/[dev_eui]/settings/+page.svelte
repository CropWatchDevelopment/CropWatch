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
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import './settings-style.css';
	import { goto } from '$app/navigation';
	import { getAppContext } from '$lib/appContext.svelte';

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
	let location_id = $derived(String(data.location_id ?? ''));
	let sensorCertificates = $derived(data.sensorCertificates ?? []);
	let permissionRows = $derived(createOwnerRows(data.deviceOwners ?? []));

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

	let actionForm = $derived((form ?? null) as FormPayload);
	let deviceForm = $derived(actionForm?.action === 'updateDevice' ? actionForm : null);
	let deviceNameValue = $derived(deviceName.trim());
	let deviceGroupValue = $derived(deviceGroup.trim());
	let deviceNameError = $derived(
		deviceNameValue.length === 0
			? 'Device name is required.'
			: deviceNameValue.length > DEVICE_NAME_MAX_LENGTH
				? `Device name must be ${DEVICE_NAME_MAX_LENGTH} characters or fewer.`
				: (deviceForm?.fieldErrors?.name ?? '')
	);
	let deviceGroupError = $derived(
		deviceGroupValue.length > DEVICE_GROUP_MAX_LENGTH
			? `Device group must be ${DEVICE_GROUP_MAX_LENGTH} characters or fewer.`
			: (deviceForm?.fieldErrors?.group ?? '')
	);
	let deviceDirty = $derived(
		deviceNameValue !== (data.deviceName ?? '').trim() ||
			deviceGroupValue !== (data.deviceGroup ?? '').trim()
	);
	let canSubmitDevice = $derived(
		!deviceSubmitting && deviceDirty && !deviceNameError && !deviceGroupError
	);

	const permissionOptions = [
		{ label: 'Admin', value: '1' },
		{ label: 'Manager', value: '2' },
		{ label: 'User', value: '3' },
		{ label: 'Disabled', value: '4' }
	];

	function ownerFormFor(key: string): FormPayload {
		return actionForm?.action === 'updateDeviceOwnerPermission' && actionForm.ownerKey === key
			? actionForm
			: null;
	}
</script>

<svelte:head>
	<title>Device Settings | {data.devEui?.toUpperCase() ?? 'UNKNOWN'} | CropWatch</title>
</svelte:head>

<div class="device-settings-page">
	<CwButton
		onclick={() =>
			goto(
				resolve('/locations/[location_id]/devices/[dev_eui]', {
					location_id,
					dev_eui: data.devEui
				})
			)}
		class="back-button">&larr; Back To Device Detail</CwButton
	>
	<CwCard title="Device Settings" subtitle="Update the cw_device name and group fields." elevated>
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
					label={`DevEUI ${data.devEui?.toUpperCase() ?? 'UNKNOWN'}`}
					tone="info"
					variant="soft"
				/>
				{#if data.deviceGroup}
					<CwChip label={`Current group: ${data.deviceGroup}`} tone="secondary" variant="soft" />
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
						label="Device Name"
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
						label="Device Group"
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
					<CwDropdown
						label="Location"
						name="location_id"
						options={[
							{ label: 'Unassigned', value: '' },
							...(data.locations ?? []).map((loc) => ({
								label: loc.name,
								value: String(loc.location_id)
							}))
						]}
						bind:value={location_id}
						error={deviceGroupError || undefined}
					/>
					<input type="hidden" name="location_id" bind:value={location_id} />
					{#if deviceGroupError}
						<p class="field-error">{deviceGroupError}</p>
					{/if}
				</div>
			</div>

			<div class="panel-actions">
				<p class="panel-note">Validation runs in the browser and again on the server.</p>
				<CwButton
					type="submit"
					variant="primary"
					loading={deviceSubmitting}
					disabled={!canSubmitDevice}
				>
					Update Device
				</CwButton>
			</div>
		</form>
	</CwCard>

	<CwCard
		title="Device Sensor Certificates"
		subtitle="Download the Libellus PDF certificate for each configured sensor serial."
		elevated
	>
		{#if sensorCertificates.length === 0}
			<p class="empty-state">No sensor serial value is available for this device.</p>
		{:else}
			<div class="certificate-list">
				{#each sensorCertificates as target, index (target.key)}
					<div class="certificate-item">
						<div class="certificate-item__meta">
							<div class="device-form__header">
								<CwChip label={target.label} tone="info" variant="soft" />
								<CwChip label={`Serial ${target.serial}`} tone="secondary" variant="soft" />
								{#if target.product}
									<CwChip label={target.product} tone="secondary" variant="soft" />
								{/if}
							</div>

							<p class="panel-note">
								Downloads the individual ISO17025 PDF returned by Sensirion Libellus for this serial
								number.
							</p>

							{#if target.downloadDisabledReason}
								<p class="field-error">{target.downloadDisabledReason}</p>
							{/if}
						</div>

						<form
							method="GET"
							action={resolve(
								'/locations/[location_id]/devices/[dev_eui]/settings/libellus-certificates/[sensor_key]',
								{
									location_id,
									dev_eui: data.devEui,
									sensor_key: target.key
								}
							)}
							target="_blank"
							class="certificate-download-form"
						>
							<CwButton
								type="submit"
								variant="primary"
								size="sm"
								disabled={Boolean(target.downloadDisabledReason)}
							>
								Download PDF
							</CwButton>
						</form>
					</div>

					{#if index < sensorCertificates.length - 1}
						<CwSeparator spacing="0" />
					{/if}
				{/each}
			</div>
		{/if}
	</CwCard>

	<CwCard
		title="Device Owner Permissions"
		subtitle="Update only. Add and delete actions are intentionally omitted here."
		elevated
	>
		{#if permissionRows.length === 0}
			<p class="empty-state">No device owners were returned for this device.</p>
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

									<div class="permission-user">
										<input type="hidden" value={row.name} disabled />
										<CwInput
											label="Email"
											value={row.email || row.userId || 'Unavailable'}
											disabled
										/>
									</div>

									<div class="permission-edit">
										<div class="field-stack">
											<CwDropdown
												label="Permission Level"
												options={permissionOptions}
												bind:value={row.permissionLevel}
												error={ownerForm?.fieldErrors?.permissionLevel ||
													(!isOwnerRowValid(row) ? 'Choose a valid permission level.' : undefined)}
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
											Update Permission
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
