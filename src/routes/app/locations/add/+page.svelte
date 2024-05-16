<script>
	import AddLocation from '$lib/components/ui/AddLocation.svelte';
	import Back from '$lib/components/ui/Back.svelte';
</script>

<div class="bg-gradient-to-b from-[#132017] to-[#7F8D7F] relative px-4 pb-12">
	<div class="mt-8 flex justify-between">
		<Back previousPage={'/app'} />
	</div>
	<!-- Display each sensor brief at current location -->
	<div class="my-6">
		<p class="text-xl text-surface-100">Add Location</p>
	</div>

	<AddLocation />
</div>
