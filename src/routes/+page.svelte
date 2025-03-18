<script lang="ts">
	// Import all messages at once
import { m } from "$lib/paraglide/messages.js";
	import { getLocale, setLocale } from "$lib/paraglide/runtime";

	setLocale("ja", { reload: false });
// Use a message
console.log(m.example_message({ username: "kevin" }));
console.log(getLocale());
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<h1>Landing Page</h1>
{m.example_message({ username: "kevin" })}
<section>

	<h2>
		try editing <strong>src/routes/+page.svelte</strong>
	</h2>

</section>
