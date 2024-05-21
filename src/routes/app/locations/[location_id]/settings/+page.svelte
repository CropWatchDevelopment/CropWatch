<script>

	import Back from "$lib/components/ui/Back.svelte";
	import DeleteLocation from '$lib/components/ui/DeleteLocation.svelte';

</script>

<div class="bg-gradient-to-b from-[#132017] to-[#7F8D7F] relative px-4 pb-12">
	<div class="mt-8 flex justify-between">
		<Back />
	</div>
	<!-- Display each sensor brief at current location -->
	<div class="my-6">
		<p class="text-xl text-surface-100">Settings</p>
	</div>

    <div>
        <DeleteLocation />
    </div>
</div>
