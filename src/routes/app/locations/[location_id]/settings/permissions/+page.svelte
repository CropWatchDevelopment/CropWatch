<script lang="ts">
	import { page } from "$app/stores";


	import Back from "$lib/components/ui/Back.svelte";
	import LocationPermission from "$lib/components/ui/LocationPermission.svelte";
    import { _ } from 'svelte-i18n';

	const location_id: number = $page.params.location_id;

	export let data;
	const { locationPermissions } = data;

</script>
<div class="bg-gradient-to-b from-[#132017] to-[#7F8D7F] relative px-4 pb-12">
	<div class="mt-8 flex justify-between">
		<Back />
	</div>
	<!-- Display each sensor brief at current location -->
	<div class="my-6">
		<p class="text-xl text-surface-100">{$_('app.location.settings.permissions')}</p>
	</div>

    <LocationPermission {location_id} {locationPermissions} />
</div>