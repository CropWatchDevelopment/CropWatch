<script lang="ts">
	import { getUserState } from '$lib/state/user-state.svelte';
	import { mdiCog, mdiEye } from '@mdi/js';
	import { Button, ListItem } from 'svelte-ux';

	let userContext = getUserState();
    let locations = $derived(userContext.allLocations);
    
</script>

<ol>
	{#each locations as location}
		<ListItem title={location.name}>
            <div slot="actions">
                <Button icon={mdiEye} variant="fill-light" rounded="full" />
                <Button icon={mdiCog} variant="fill-light" rounded="full" />
              </div>
        </ListItem>
	{/each}
</ol>
