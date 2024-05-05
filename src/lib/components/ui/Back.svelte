<script lang="ts">
	import { goto } from '$app/navigation';
	import cw_LogoImage from '$lib/images/UI/cw_back.png';
	export let previousPage: string | null = null;
</script>

<div class="flex flex-row align-middle text-center mx-2" on:click={() => previousPage ? goto(previousPage) : history.go(-1)}>
	<img src={cw_LogoImage} alt="" class="w-12 bg-surface-100 rounded-full p-2" />
	<span class="text-2xl text-surface-100 ml-2 mt-2 align-middle">
		Back
	</span>
</div>
