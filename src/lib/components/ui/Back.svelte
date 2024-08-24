<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { mdiArrowLeftCircle } from '@mdi/js';
	import { _ } from 'svelte-i18n';
	import { Button } from 'svelte-ux';
	export let previousPage: string | null = null;
</script>

{#if !$page.url.pathname == '/app/dashboard'}
	<Button
		variant="default"
		size="lg"
		class="flex cursor-pointer flex-row text-center align-middle"
		on:click={() => (previousPage ? goto(previousPage) : history.go(-1))}
		aria-roledescription="back button"
		aria-controls="back button"
		icon={mdiArrowLeftCircle}
	>
		<slot />
	</Button>
{/if}
