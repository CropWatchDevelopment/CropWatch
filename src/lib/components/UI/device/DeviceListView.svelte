<script lang="ts">
	import type { IDevice } from '$lib/interfaces/IDevice.interface';
	import { mdiCog, mdiEye } from '@mdi/js';
	import { Button, ListItem } from 'svelte-ux';

	let { devices }: { devices: IDevice[] } = $props();
</script>

<ol>
	{#each devices as device}
		<ListItem title={device.name} subheading={device.dev_eui}>
            <div slot="actions">
                <Button icon={mdiEye} variant="fill-light" rounded="full" />
                <Button icon={mdiCog} variant="fill-light" rounded="full" />
              </div>
        </ListItem>
	{/each}
</ol>
