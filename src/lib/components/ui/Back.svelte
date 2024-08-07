<script lang="ts">
	import { goto } from '$app/navigation';
	import { mdiArrowLeftCircle } from '@mdi/js';
	import { _ } from 'svelte-i18n';
	import { Button } from 'svelte-ux';
	export let previousPage: string | null = null;
</script>

<Button
	variant="default"
	size="lg"
	class="flex flex-row align-middle text-center cursor-pointer text-slate-200"
	on:click={() => (previousPage ? goto(previousPage) : history.go(-1))}
	aria-roledescription="back button"
	aria-controls="back button"
	icon={mdiArrowLeftCircle}
>
<slot />
</Button>