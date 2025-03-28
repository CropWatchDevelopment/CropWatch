<script lang="ts">
	import { page } from '$app/stores';
	import { mdiTrashCan } from '@mdi/js';
	import { Button, Dialog, TextField, Toggle } from 'svelte-ux';

	let deleteConfirmation: string = $state('');
    let loading: boolean = $state(false);

	async function handleDelete() {
        loading = true;
        
        // Create FormData object
        const formData = new FormData();
        formData.append('dev_eui', $page.params.dev_eui);
        formData.append('location_id', $page.params.location_id);
        
        const response = await fetch('?/deleteDevice', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            document.location.href = `/app/location/${$page.params.location_id}/devices`;
        } else {
            console.error('Failed to delete device');
            loading = false;
        }
	}
</script>

<Toggle let:on={open} let:toggle let:toggleOff>
	<Button icon={mdiTrashCan} on:click={toggle} color="danger">Delete</Button>
	<Dialog {open} on:close={toggleOff}>
		<div slot="title">!!!DELETE DEVICE WARNING!!!</div>
		<div class="px-6 py-3">
			ALERT! You are about to <b>DELETE</b> this device!
			<br />
			This is a <b>PERMINANT</b> action and <u>cannot</u> be undone.
			<br />
			By clicking "Yes, delete item" you are confirming that <b>YOU</b> want to <b><u>delete</u></b>
			this device.
			<br />
			<b>Are you sure you want to delete this device?</b>
			<br />
			<p>IF YOU WANT TO DELETE THIS DEVICE, TYPE DELETE below:</p>
			<TextField
				label="Type DELETE to confirm"
				name="delete-confirmation"
				id="delete-confirmation"
				bind:value={deleteConfirmation}
				aria-invalid={open ? 'true' : undefined}
				error={open}
			/>
		</div>
		<div slot="actions">
			<Button
				type="button"
				on:click={() => {
					handleDelete();
				}}
				variant="fill"
				color="danger"
				disabled={deleteConfirmation !== 'DELETE'}
			>
				Yes, delete item
			</Button>
			<Button type="button" on:click={toggle} color="success">Cancel</Button>
		</div>
	</Dialog>
</Toggle>
