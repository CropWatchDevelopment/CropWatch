<script>
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import DeleteLocation from '$lib/components/ui/DeleteLocation.svelte';
	import EditLocationNameDialog from '$lib/components/ui/EditLocationNameDialog.svelte';
	import LocationPermission from '$lib/components/ui/LocationPermission.svelte';

	export let locationId = $page.params.location_id;
</script>

<div class="mt-8 flex justify-between">
	<Back>
		<p class="text-white">Settings</p>
	</Back>
</div>

<!-- Settings forms -->
<div class="divide-y divide-white/5">
	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-white">Location Information</h2>
			<p class="mt-1 text-sm leading-6 text-gray-400">
				General Location Information
			</p>
		</div>

		<form class="md:col-span-2">
			<div class="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
				<div class="col-span-full flex items-center gap-x-8">
					<EditLocationNameDialog />
				</div>
			</div>
		</form>
	</div>

	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-white">Change Permissions</h2>
			<p class="mt-1 text-sm leading-6 text-gray-400">
				Update your password associated with your account.
			</p>
		</div>

		<form class="md:col-span-2">
			<LocationPermission />
		</form>
	</div>


	<!-- <div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-white">Delete Location</h2>
			<p class="mt-1 text-sm leading-6 text-gray-400">
				**WARNING** This will delete the location and all associated data.
				This operation is <u>irreversible</u>. It is strongly recommended to ONLY delete a
				location if you have already removed all devices from the location FIRST.
			</p>
		</div>

		<form class="flex items-start md:col-span-2">
			<DeleteLocation />
		</form>
	</div> -->
</div>
