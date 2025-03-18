<script>
	import { enhance } from "$app/forms";
	import { mdiPencil } from "@mdi/js";
	import { Button, Dialog, Toggle, Tooltip } from "svelte-ux";

    let { rule } = $props();

</script>

<Toggle let:on={open} let:toggle let:toggleOff>
	<Tooltip title="Edit Rule" position="bottom">
		<Button icon={mdiPencil} on:click={toggle} color="warning" variant="outline" class="ml-5">
			<b class="hidden md:inline">Edit Rule</b>
		</Button>
	</Tooltip>
	<Dialog {open} on:close={toggleOff}>
		<div slot="title">{rule.name}</div>
		
	</Dialog>
</Toggle>
