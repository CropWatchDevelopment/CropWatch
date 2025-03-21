<script>
	import { getUserState } from '$lib/state/user-state.svelte';
	import { mdiAccountOff, mdiTimerSand } from '@mdi/js';
	import { Icon, ProgressCircle } from 'svelte-ux';

	let userContext = getUserState();

	function redirectToLogin() {
		window.location.href = '/login';
	}
</script>

{#if !userContext.profile}
	<div class="flex h-screen items-center justify-center bg-gray-100">
		<div class="rounded-lg bg-white p-8 text-center shadow-lg">
			<Icon data={mdiTimerSand} class="text-6xl text-green-400" />
			<h2 class="text-xl font-semibold text-red-500">Processing your request...</h2>
			<p class="text-gray-600">Please log in to continue.</p>
			<ProgressCircle />
		</div>
	</div>
{:else}
	<ProgressCircle />
{/if}
