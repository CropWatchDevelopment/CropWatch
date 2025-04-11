<script lang="ts">
	import { Button, Card, Tabs, TextField } from 'svelte-ux';
	import DeleteLocationDialog from '$lib/components/dialogs/DeleteLocationDialog.svelte';
	import TransferLocationOwnership from '$lib/components/dialogs/TransferLocationOwnership.svelte';
	import { getUserState } from '$lib/state/user-state.svelte';

	let { data = $bindable() } = $props();
	let userContext = getUserState();
	let location_owner = $derived(data?.owner_id ?? null);
</script>

<Card class="mt-4 flex flex-col gap-4 p-4">
	<h3 class="text-lg font-semibold">Danger Zone</h3>
	<p class="text-sm text-gray-500">
		Deleting a location will also delete all devices and data associated with it.
	</p>

	{#if location_owner === userContext.profile?.id}
		<DeleteLocationDialog />
		<TransferLocationOwnership />
	{:else}
		<p class="text-sm text-gray-500">Only the owner of this location can delete it.</p>
	{/if}
</Card>
