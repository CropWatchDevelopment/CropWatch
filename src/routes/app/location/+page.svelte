<script lang="ts">
	import LocationListView from '$lib/components/UI/location/LocationListView.svelte';
	import { mdiPlus } from '@mdi/js';
	import { Button } from 'svelte-ux';
</script>

<div class="flex flex-row justify-end gap-4 p-4">
	<Button
	variant="fill"
	rounded="full"
	color="primary"
	icon={mdiPlus}
	class="group justify-end"
	href="location/create"
  >
	<div
	  class="inline-block overflow-hidden whitespace-nowrap max-w-0 group-hover:max-w-[120px] transition-all duration-300 opacity-0 group-hover:opacity-100"
	>
	  Add Location
	</div>
  </Button>
</div>
<LocationListView />
