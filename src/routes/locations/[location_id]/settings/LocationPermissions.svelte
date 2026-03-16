<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		CwButton,
		CwCard,
		CwDropdown,
		CwInput,
		CwSwitch,
		useCwToast
	} from '@cropwatchdevelopment/cwui';

	interface SettingsPageData {
		locationName: string;
		[key: string]: unknown;
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

	let { data }: { data: SettingsPageData } = $props();
	const toast = useCwToast();

	let submitting = $state(false);
	let newUserEmail = $state('');
	let permission_level: string = $state<string>(String(permissions[0].permission_level));
	let applyToAllDevices = $state(false);

	function getResultMessage(result: { data?: Record<string, unknown> | null }): string | null {
		const message = result.data?.message;
		return typeof message === 'string' && message.trim().length > 0 ? message.trim() : null;
	}
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
			use:enhance={() => {
				submitting = true;
				return async ({ result }) => {
					try {
						await applyAction(result);
						const message = getResultMessage(result);
						if (message) {
							toast.add({
								message,
								tone: result.type === 'success' ? 'success' : 'danger'
							});
						}
						if (result.type === 'success') {
							newUserEmail = '';
							await invalidateAll();
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
