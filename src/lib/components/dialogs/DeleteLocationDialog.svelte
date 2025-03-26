<script>
	import { enhance } from '$app/forms';
	import { mdiTrashCan } from '@mdi/js';

	import { Button, Dialog, Toggle } from 'svelte-ux';
</script>

<Toggle let:on={open} let:toggle let:toggleOff>
	<Button icon={mdiTrashCan} on:click={toggle} variant="fill-outline" color="danger">Delete</Button>
	<Dialog {open} on:close={toggleOff}>
		<div slot="title">Are you sure?</div>
		<div class="px-6 py-3">This will permanently delete the Location and can not be undone!</div>
		<div slot="actions">
			<form action="?/deleteLocation" method="POST" use:enhance>
				<Button type="submit" variant="fill" color="danger">Yes, delete Location</Button>
				<Button type="button" on:click={toggle}>Cancel</Button>
			</form>
		</div>
	</Dialog>
</Toggle>
