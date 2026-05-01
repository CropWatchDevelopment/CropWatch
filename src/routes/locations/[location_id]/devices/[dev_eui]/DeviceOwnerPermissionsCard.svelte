<script lang="ts">
	import { enhance } from '$app/forms';
	import { getAppContext } from '$lib/appContext.svelte';
	import { getPermissionLevelOptions } from '$lib/i18n/options';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwCard, CwDropdown, CwSeparator } from '@cropwatchdevelopment/cwui';

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

	type DeviceOwner = {
		id: number;
		key: string;
		name: string;
		email: string;
		userId: string;
		permissionLevel: number;
	};

	type FormPayload = {
		action?: string;
		success?: boolean;
		message?: string;
		ownerKey?: string;
		fieldErrors?: Record<string, string>;
		values?: Record<string, string>;
	} | null;

	interface Props {
		form: FormPayload;
		owners: DeviceOwner[];
	}

	let { form, owners }: Props = $props();

	const app = getAppContext();
	const permissionOptions = getPermissionLevelOptions();

	let ownerSubmittingByKey = $state<Record<string, boolean>>({});
	let permissionRows = $derived(createOwnerRows(owners ?? []));
	let actionForm = $derived((form ?? null) as FormPayload);

	function createOwnerRows(sourceOwners: DeviceOwner[]): DeviceOwnerRow[] {
		return sourceOwners.map((owner) => ({
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

	function ownerFormFor(key: string): FormPayload {
		return actionForm?.action === 'updateDeviceOwnerPermission' && actionForm.ownerKey === key
			? actionForm
			: null;
	}
</script>

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
