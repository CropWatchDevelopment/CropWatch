<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	// Import all messages at once
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale, setLocale } from '$lib/paraglide/runtime';

	setLocale('ja', { reload: false });
	console.log(getLocale());
	if (browser) {
		console.log('Browser detected');
		goto('/app');
	}
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<p>Please wait...</p>
