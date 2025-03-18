<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { mdiTrashCan } from '@mdi/js';
	import { Button, Dialog, Toggle, Tooltip } from 'svelte-ux';
	let { id, user_id, onPermissionDelete } = $props();
</script>

<Toggle let:on={open} let:toggle let:toggleOff>
	<Tooltip title="Delete item" position="bottom">
		<Button icon={mdiTrashCan} on:click={toggle} color="danger" variant="outline" class="ml-5">
			<b class="hidden md:inline">Delete</b>
		</Button>
	</Tooltip>
	<Dialog {open} on:close={toggleOff}>
			<div slot="title">Are you sure?</div>
			<form
				class="flex flex-col gap-3"
				method="POST"
				action={`?/deleteLocationPermission`}
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.status == 200) {
							onPermissionDelete(result);
							update();
							toggle();
						}
					};
				}}
			>
				<input type="hidden" name="id" value={id} />
				<input type="hidden" name="location_id" value={$page.params.location_id} />
				<input type="hidden" name="permission_user_id" value={user_id} />
				<div class="px-6 py-3">This will permanently delete the item and can not be undone.</div>
				<div>
					<Button type="submit" variant="fill" color="danger">Yes, delete item</Button>
					<Button>Cancel</Button>
				</div>
			</form>
	</Dialog>
</Toggle>
