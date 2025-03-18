<script lang="ts">
	import { mdiCloseCircle, mdiDotsVertical, mdiFloppy } from '@mdi/js';
	import { Button, Dialog, Radio, Toggle } from 'svelte-ux';

	let group: number = $state(1);
</script>

<Toggle let:on={open} let:toggle let:toggleOff>
	<Button icon={mdiDotsVertical} on:click={toggle} />
	<Dialog {open} on:close={toggleOff}>
		<div slot="title">EC Display Notation Settings</div>
		<div class="px-6 py-3">
			<Radio name="label" bind:group value={1} fullWidth>µS/cm (Default from sensor)</Radio>
			<Radio name="label" bind:group value={2} fullWidth>dS/m</Radio>
			<Radio name="label" bind:group value={3} fullWidth>mS/cm</Radio>
		</div>
		<div slot="actions" class="flex flex-row gap-5">
			<Button icon={mdiFloppy} variant="fill" color="info">Save</Button>
			<Button icon={mdiCloseCircle} variant="outline">Cancel</Button>
		</div>
	</Dialog>
</Toggle>
