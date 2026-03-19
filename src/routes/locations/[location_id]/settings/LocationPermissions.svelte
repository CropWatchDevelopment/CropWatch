<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { ActionResult } from '@sveltejs/kit';
	import {
		CwButton,
		CwCard,
		CwDropdown,
		CwInput,
		CwSwitch,
		useCwToast
	} from '@cropwatchdevelopment/cwui';
	import { getPermissionLevelOptions } from '$lib/i18n/options';
	import { m } from '$lib/paraglide/messages.js';

	interface SettingsPageData {
		locationName: string;
		[key: string]: unknown;
	}

	interface IPermissions {
		permission_level: number;
		permission_name: string;
	}

	const permissions: IPermissions[] = getPermissionLevelOptions().map((option) => ({
		permission_level: Number(option.value),
		permission_name: option.label
	}));

	let { data }: { data: SettingsPageData } = $props();
	const toast = useCwToast();

	let submitting = $state(false);
	let newUserEmail = $state('');
	let permission_level: string = $state<string>(String(permissions[0].permission_level));
	let applyToAllDevices = $state(true);

	function getResultMessage(result: ActionResult): string | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const message = result.data?.message;
		return typeof message === 'string' && message.trim().length > 0 ? message.trim() : null;
	}
</script>

<div class="settings-page">
	<CwCard
		title={m.locations_add_user_permissions_title({ name: data.locationName })}
		subtitle={m.locations_add_user_permissions_subtitle()}
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
				label={m.auth_email_label()}
				placeholder="user@example.com"
				required
				bind:value={newUserEmail}
			/>
			<CwDropdown
				name="permission_level"
				label={m.locations_permission_level()}
				options={permissions.map((p) => ({
					value: String(p.permission_level),
					label: p.permission_name
				}))}
				bind:value={permission_level}
			/>

			<CwSwitch
				checked={applyToAllDevices}
				label={m.locations_apply_to_all_devices()}
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
					{m.locations_add_permission()}
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
