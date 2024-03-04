<script>
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import { mdiChevronLeft } from "@mdi/js";


	import { Button } from "svelte-ux";

</script>
<h1 class="flex flex-row text-4xl font-semibold text-slate-700 mb-4 gap-3">
	<Button variant="outline" icon={mdiChevronLeft} size="lg" on:click={() => goto(`/app/locations/${$page.params.location_id}`)} />
	<p class="my-auto">CO² Sensor</p>
</h1>
