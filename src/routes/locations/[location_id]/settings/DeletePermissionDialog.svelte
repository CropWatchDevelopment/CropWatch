<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { CwButton, CwDialog, useCwToast } from '@cropwatchdevelopment/cwui';
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

	function getResultMessage(data: unknown): string | null {
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

			const message = getResultMessage(result.data);
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
				message: error instanceof Error ? error.message : 'Failed to delete permission.',
				tone: 'danger'
			});
		} finally {
			deleting = false;
		}
	};
</script>

<CwDialog bind:open={openDeletePermissionDialog} title="Confirm Action">
	<p>Are you sure you want to proceed?</p>
	<pre>{JSON.stringify(selectedRow, null, 2)}</pre>
	{#snippet actions()}
		<CwButton
			variant="primary"
			disabled={deleting}
			onclick={() => (openDeletePermissionDialog = false)}>Cancel</CwButton
		>
		<CwButton
			variant="danger"
			loading={deleting}
			disabled={deleting}
			onclick={() => handlePermissionDelete(selectedRow)}>Delete</CwButton
		>
	{/snippet}
</CwDialog>
