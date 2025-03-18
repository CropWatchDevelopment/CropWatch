<script lang="ts">
	import { enhance } from '$app/forms';
	import { mdiTrashCan } from '@mdi/js';
	import { Button, Dialog, Toggle, Tooltip } from 'svelte-ux';

	let { id } = $props();
	let open: boolean = $state(false);
</script>

<Tooltip title="Delete Rule" position="bottom">
	<Button
		icon={mdiTrashCan}
		on:click={() => (open = true)}
		color="danger"
		variant="outline"
		class="ml-5"
	>
		<b class="hidden md:inline">Delete</b>
	</Button>
</Tooltip>
<Dialog {open}>
	<div slot="title">Are you sure?</div>
	<form
		method="POST"
		action={`?/deleteRule&id=${id}`}
		use:enhance={() => {
			return async ({ result, update }) => {
				debugger;
				if (result.status == 200) {
					update();
				}
				open = false;
			};
		}}
	>
		<input type="hidden" name="id" value={id} />
		<div class="px-6 py-3">This will permanently delete the item and can not be undone.</div>
		<div>
			<Button type="submit" variant="fill" color="danger">Yes, delete item</Button>
			<Button
				type="button"
				on:click={() => {
					open = false;
				}}>Cancel</Button
			>
		</div>
	</form>
</Dialog>
