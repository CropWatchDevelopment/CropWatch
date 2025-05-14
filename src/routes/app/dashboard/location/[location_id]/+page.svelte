<script>
	import { goto } from "$app/navigation";
	import { page } from "$app/state";

</script>
<button onclick={() => goto(`${page.params.location_id}/settings`)}>Location Settings</button>