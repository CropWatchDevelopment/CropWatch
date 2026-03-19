<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { ActionResult } from '@sveltejs/kit';
	import { CwButton, CwDialog, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import type { PermissionRow } from './location-permission-rows';

	type DeletePermissionDialogProps = {
		location_id: string | number | null | undefined;
		openDeletePermissionDialog?: boolean;
		selectedRow?: PermissionRow | null;
	};

	let {
		location_id,
		openDeletePermissionDialog = $bindable(false),
		selectedRow = $bindable<PermissionRow | null>(null)
	}: DeletePermissionDialogProps = $props();
	const toast = useCwToast();
	let deleting = $state(false);

	function getResultMessage(result: ActionResult): string | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const data = result.data;
		if (!data || typeof data !== 'object') return null;
		const message = (data as Record<string, unknown>).message;
		return typeof message === 'string' && message.trim().length > 0 ? message.trim() : null;
	}

	const handlePermissionDelete = async (row: PermissionRow | null) => {
		if (deleting) return;

		const formData = new FormData();
		formData.append('location_id', String(location_id ?? ''));
		formData.append('permission_id', String(row?.id ?? ''));

		deleting = true;

		try {
			const response = await fetch('?/removePermission', {
				method: 'POST',
				body: formData
			});
			const result = deserialize(await response.text());
			await applyAction(result);

			const message = getResultMessage(result);
			if (message) {
				toast.add({
					message,
					tone: result.type === 'success' ? 'success' : 'danger'
				});
			}

			if (result.type === 'success') {
				await invalidateAll();
				selectedRow = null;
				openDeletePermissionDialog = false;
			}
		} catch (error) {
			console.error('Error deleting permission:', error);
			toast.add({
				message: error instanceof Error ? error.message : m.locations_delete_permission_failed(),
				tone: 'danger'
			});
		} finally {
			deleting = false;
		}
	};
</script>

<CwDialog
	bind:open={openDeletePermissionDialog}
	title={m.locations_confirm_delete_permission_title()}
>
	<p>{m.locations_confirm_delete_permission_body({ email: selectedRow?.email ?? '' })}</p>
	{#snippet actions()}
		<CwButton
			variant="primary"
			disabled={deleting}
			onclick={() => (openDeletePermissionDialog = false)}>{m.action_cancel()}</CwButton
		>
		<CwButton
			variant="danger"
			loading={deleting}
			disabled={deleting}
			onclick={() => handlePermissionDelete(selectedRow)}>{m.action_delete()}</CwButton
		>
	{/snippet}
</CwDialog>
