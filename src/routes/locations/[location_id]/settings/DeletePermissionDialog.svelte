<script lang="ts">
	import { CwButton, CwDialog, CwToastContainer, useCwToast } from '@cropwatchdevelopment/cwui';

	let {
		location_id,
		openDeletePermissionDialog = $bindable<boolean>(),
		selectedRow = $bindable<any>()
	} = $props();

	const handlePermissionDelete = (row: any) => {
		const formData = new FormData();
		formData.append('location_id', String(location_id ?? ''));
		formData.append('permission_id', String(row?.id ?? ''));


		fetch('?/removePermission', {
			method: 'POST',
			body: formData
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error('Failed to delete permission');
				}
				// Optionally, you can add a success toast here
			})
			.catch((error) => {
				console.error('Error deleting permission:', error);
				// Optionally, you can add an error toast here
			})
			.finally(() => {
				openDeletePermissionDialog = false; // Close the dialog after handling the delete action
			});
	};
</script>

<CwDialog bind:open={openDeletePermissionDialog} title="Confirm Action">
	<p>Are you sure you want to proceed?</p>
	<pre>{JSON.stringify(selectedRow, null, 2)}</pre>
	{#snippet actions()}
		<CwButton variant="primary" onclick={() => (openDeletePermissionDialog = false)}
			>Cancel</CwButton
		>
		<CwButton variant="danger" onclick={() => handlePermissionDelete(selectedRow)}>Delete</CwButton>
	{/snippet}
</CwDialog>
