<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import {
		CwButton,
		CwCard,
		CwDropdown,
		CwInput,
		CwSwitch
	} from '@cropwatchdevelopment/cwui';
	import { type PageData, type ActionData } from '../$types';

	interface PermissionRow {
		id: number;
		ownerId: number;
		userId: string;
		adminUserId: string;
	}

	interface IPermissions {
		permission_level: number;
		permission_name: string;
	}

	const permissions: IPermissions[] = [
		{ permission_level: 1, permission_name: 'Admin' },
		{ permission_level: 2, permission_name: 'Manager' },
		{ permission_level: 3, permission_name: 'User' },
		{ permission_level: 4, permission_name: 'Disabled' }
	];

	let { data, form }: { data: PageData; form: ActionData | null } = $props();

	let submitting = $state(false);
	let newUserEmail = $state('');
	let permission_level: string = $state<string>(String(permissions[0].permission_level));
	let applyToAllDevices = $state(false);
</script>

<div class="settings-page">
	<CwCard
		title={`Add new user to ${data.locationName} with permissions`}
		subtitle="Create a permission for a user on this location"
		elevated
	>
		<form
			method="POST"
			action="?/addPermission"
			use:enhance={({ cancel }) => {
				submitting = true;
				return async ({ result }) => {
					try {
						await applyAction(result);
						if (result.type === 'success') {
							newUserEmail = '';
						}
					} finally {
						submitting = false;
					}
				};
			}}
			class="permissions-form"
		>
			<CwInput
				name="newUserEmail"
				type="email"
				label="User Email"
				placeholder="user@example.com"
				required
				bind:value={newUserEmail}
			/>
			<CwDropdown
				name="permission_level"
				label="Permission Level"
				options={permissions.map((p) => ({
					value: String(p.permission_level),
					label: p.permission_name
				}))}
				bind:value={permission_level}
			/>

			<CwSwitch
				checked={applyToAllDevices}
				label="Apply to all devices in this location"
				onchange={(checked) => (applyToAllDevices = checked)}
			/>
			<input type="hidden" name="applyToAllDevices" value={applyToAllDevices ? 'true' : 'false'} />

			<div class="permissions-form__actions">
				<CwButton
					type="submit"
					variant="primary"
					loading={submitting}
					disabled={submitting || !newUserEmail.trim()}
				>
					Add Permission
				</CwButton>
			</div>
		</form>
	</CwCard>
</div>

<style>
	.settings-page {
		padding: 1rem;
	}

	.settings-page__chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.permissions-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.permissions-form__actions {
		display: flex;
		justify-content: flex-start;
	}
</style>
