<script>
	import { mdiArrowRight } from '@mdi/js';

	import { Button, Dialog, TextField, Toggle } from 'svelte-ux';
</script>

<Toggle let:on={open} let:toggle let:toggleOff>
	<Button icon={mdiArrowRight} variant="fill-outline" color="danger" on:click={toggle}
		>Transfer Ownership to another user</Button
	>
	<Dialog {open} on:close={toggleOff}>
		<div slot="title">Transfer Location Ownership</div>
		<div class="p-2">
			<TextField type="email" label="new owner email address" autofocus />
		</div>
		<div slot="actions">
			<Button variant="fill" color="primary">OK</Button>
			<Button>Cancel</Button>
		</div>
	</Dialog>
</Toggle>
