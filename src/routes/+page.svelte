<script lang="ts">
	// Import all messages at once
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale, setLocale } from '$lib/paraglide/runtime';

	setLocale('ja', { reload: false });
	console.log(getLocale());
	goto('/app');
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<p>Please wait...</p>
