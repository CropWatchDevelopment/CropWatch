<script lang="ts">
	import UserPermissionsSelector from '$lib/components/UI/form/UserPermissionsSelector.svelte';
	import type { DeviceOwnerWithProfile } from '$lib/models/DeviceOwner';
	import { _ } from 'svelte-i18n';

	let { data } = $props();

	let device = $derived(data.device);
	let ownersList: DeviceOwnerWithProfile[] = $derived([]);
	let currentUserId = $derived(data.ownerId);

	$effect(() => {
		(async () => {
			ownersList = await data.deviceOwners;
		})();
	});
</script>

<svelte:head>
	<title>{$_('Permissions')} - CropWatch</title>
</svelte:head>

<section class="flex flex-col gap-6">
	<header class="flex flex-row items-center justify-between gap-4">
		<div>
			<h1 class="mb-1 text-2xl font-semibold">{$_('Permissions')}</h1>
			<p class="text-sm text-neutral-100">
				Manage who has access to {device?.name || 'this device'} and their permission levels.
			</p>
		</div>
	</header>
	<UserPermissionsSelector {data} {ownersList} />
</section>
