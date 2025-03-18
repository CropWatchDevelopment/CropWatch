<script lang="ts">
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import { mdiArrowLeft } from '@mdi/js';
	import { Button } from 'svelte-ux';
	let { url = '' }: { url?: string } = $props();
</script>

{#if url === ''}
	<Button variant="fill-light" rounded="full" icon={mdiArrowLeft} on:click={() => history.back()}>
		<span class="hidden md:flex">{nameToJapaneseName('Back')}</span>
	</Button>
{:else}
	<Button
		variant="fill-light"
		rounded="full"
		icon={mdiArrowLeft}
		href={url && url.length > 0 ? url : '#'}
	>
		<span class="hidden md:flex">
			{nameToJapaneseName('Back')}
		</span>
	</Button>
{/if}
