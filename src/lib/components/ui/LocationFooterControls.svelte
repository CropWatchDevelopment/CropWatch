<script lang="ts">
	import { goto } from '$app/navigation';
	import { mdiCog, mdiHistory, mdiLock } from '@mdi/js';
	import { Button } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';

	export let permissions: number = 0;
</script>

<div class="flex flex-col w-full my-8 gap-4">
	{#if permissions <= 2}
	<Button
		classes={{ root: 'w-full' }}
		size="lg"
		icon={mdiHistory}
		variant="fill"
		on:click={() => goto('history')}>{$_('sensorFooterControls.history')}</Button
	>
	{/if}
	{#if permissions <= 1}
		<Button
			classes={{ root: 'w-full' }}
			size="lg"
			icon={mdiCog}
			variant="fill"
			on:click={() => goto(`${$page.params.location_id}/settings`)}>{$_('sensorFooterControls.settings')}</Button
		>
		<Button
			classes={{ root: 'w-full' }}
			size="lg"
			icon={mdiLock}
			variant="fill"
			on:click={() => goto('permissions')}>{$_('sensorFooterControls.permissions')}</Button
		>
	{/if}
</div>
