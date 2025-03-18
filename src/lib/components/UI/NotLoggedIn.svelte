<script>
	import { getUserState } from '$lib/state/user-state.svelte';
	import { mdiAccountOff } from '@mdi/js';
	import { Icon, ProgressCircle } from 'svelte-ux';

	let userContext = getUserState();

	function redirectToLogin() {
		window.location.href = '/login';
	}
</script>

{#if !userContext.profile}
	<div class="flex h-screen items-center justify-center bg-gray-100">
		<div class="rounded-lg bg-white p-8 text-center shadow-lg">
			<Icon data={mdiAccountOff} class="text-6xl text-red-500" />
			<h2 class="text-xl font-semibold text-red-500">You are not logged in</h2>
			<p class="text-gray-600">Please log in to continue.</p>
			<button
				class="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-700"
				on:click={redirectToLogin}>Go to Login</button
			>
		</div>
	</div>
{:else}
	<ProgressCircle />
{/if}
