<script lang="ts">
	import { setLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages.js';
</script>

<h1>{m.hello_world({ name: 'SvelteKit User' })}</h1>

<div>
	<button onclick={() => setLocale('en')}>en</button>
	<button onclick={() => setLocale('ja')}>ja</button>
</div>

<p>
	{m.demo_paraglide_vscode_prefix()}

	<a
		href="https://marketplace.visualstudio.com/items?itemName=inlang.vs-code-extension"
		target="_blank">{m.demo_paraglide_sherlock_link()}</a
	>

	{m.demo_paraglide_vscode_suffix()}
</p>
