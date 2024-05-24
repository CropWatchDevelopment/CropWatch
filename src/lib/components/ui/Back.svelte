<script lang="ts">
	import { goto } from '$app/navigation';
	import cw_LogoImage from '$lib/images/UI/cw_back.png';
	import { _ } from 'svelte-i18n';
	import { Button } from 'svelte-ux';
	export let previousPage: string | null = null;
</script>

<Button
	variant="default"
	class="flex flex-row align-middle text-center mx-2 cursor-pointer"
	on:click={() => (previousPage ? goto(previousPage) : history.go(-1))}
	aria-roledescription="back button"
	aria-controls="back button"
>
	<img src={cw_LogoImage} alt="" class="w-12 bg-surface-100 rounded-full p-2" />
	<span class="text-2xl text-surface-100 ml-2 mt-2 align-middle">
		{$_('app.back')}
	</span>
</Button>
