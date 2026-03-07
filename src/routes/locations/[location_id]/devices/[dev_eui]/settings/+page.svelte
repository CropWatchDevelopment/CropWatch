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
	import type { PageProps } from './$types';

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

	let deviceSubmitting = $state(false);
	let ownerSubmittingByKey = $state<Record<string, boolean>>({});
	let deviceName = $derived(data.deviceName ?? '');
	let deviceGroup = $derived(data.deviceGroup ?? '');
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
	let groupOptions = $derived([
		{ label: 'Unassigned', value: '' },
		...(data.deviceGroups ?? []).map((group) => ({ label: group, value: group }))
	]);

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
					<CwDropdown
						label="Device Group"
						options={groupOptions}
						bind:value={deviceGroup}
						error={deviceGroupError || undefined}
					/>
					<input type="hidden" name="group" value={deviceGroupValue} />
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
		title="Device Owner Permissions"
		subtitle="Update only. Add and delete actions are intentionally omitted here."
		elevated
	>
		<div class="permissions-tag">
			<CwChip label="Update Only" tone="warning" variant="soft" />
		</div>

		{#if permissionRows.length === 0}
			<p class="empty-state">No device owners were returned for this device.</p>
		{:else}
			<div class="permission-list">
				{#each permissionRows as row, index (row.key)}
					{@const ownerForm = ownerFormFor(row.key)}
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
								<CwInput label="User" value={row.name} disabled />
								<CwInput label="Email" value={row.email || row.userId || 'Unavailable'} disabled />
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

								<div class="permission-meta">
									{#if row.email}
										<CwChip label="Email linked" tone="success" variant="soft" />
									{:else}
										<CwChip label="Email unavailable" tone="danger" variant="soft" />
									{/if}
									{#if row.userId}
										<p class="permission-user-id">User ID: {row.userId}</p>
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

							{#if ownerForm?.message}
								<p
									class:feedback-success={ownerForm.success}
									class="form-feedback permission-feedback"
								>
									{ownerForm.message}
								</p>
							{/if}

							{#if ownerForm?.fieldErrors?.targetUserEmail}
								<p class="field-error permission-feedback">
									{ownerForm.fieldErrors.targetUserEmail}
								</p>
							{/if}
						</form>
					</div>

					{#if index < permissionRows.length - 1}
						<CwSeparator spacing="0" />
					{/if}
				{/each}
			</div>
		{/if}
	</CwCard>
</div>

<style>
	.device-settings-page {
		display: grid;
		gap: 1rem;
		padding: 0.75rem;
	}

	.device-form {
		display: grid;
		gap: 0.875rem;
	}

	.device-form__header {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.panel-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.panel-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.panel-note {
		margin: 0;
		color: rgba(15, 23, 42, 0.72);
		font-size: 0.92rem;
	}

	.field-stack {
		display: grid;
		gap: 0.35rem;
	}

	.field-error {
		margin: 0;
		color: #b42318;
		font-size: 0.85rem;
	}

	.form-feedback {
		margin: 0;
		padding: 0.75rem 0.875rem;
		border-radius: 0.75rem;
		background: #fee4e2;
		color: #912018;
		font-size: 0.92rem;
	}

	.feedback-success {
		background: #d1fadf;
		color: #166534;
	}

	.permissions-tag {
		margin-bottom: 0.75rem;
	}

	.permission-list {
		display: grid;
		gap: 0.75rem;
	}

	.permission-row {
		display: grid;
		gap: 0.75rem;
	}

	.permission-row__form {
		display: grid;
		grid-template-columns: 2fr 1.6fr;
		gap: 0.75rem;
	}

	.permission-user {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.permission-edit {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: end;
		gap: 0.5rem;
	}

	.permission-meta {
		display: grid;
		gap: 0.35rem;
		align-self: end;
	}

	.permission-user-id {
		margin: 0;
		font-size: 0.78rem;
		color: rgba(15, 23, 42, 0.62);
	}

	.permission-feedback {
		grid-column: 1 / -1;
	}

	.empty-state {
		margin: 0;
		color: rgba(15, 23, 42, 0.72);
	}

	@media (max-width: 900px) {
		.panel-grid {
			grid-template-columns: 1fr;
		}

		.permission-row__form {
			grid-template-columns: 1fr;
		}

		.permission-edit {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.permission-user {
			grid-template-columns: 1fr;
		}

		.panel-actions {
			align-items: stretch;
		}

		.panel-actions :global(button) {
			width: 100%;
		}
	}
</style>
