<script>
	import { AppBar, Button } from 'svelte-ux';
</script>

<main class="p-2 grid place-items-center content-center">
	<h1 class="text-2xl font-semibold mb-2">Welcome to ✨Svelte UX✨</h1>
	<div>
		<Button
			href="https://svelte-ux.techniq.dev"
			target="_blank"
			variant="fill-light"
			color="primary"
		>
			Documentation
		</Button>
		<Button
			href="https://svelte-ux.techniq.dev/customization"
			target="_blank"
			variant="fill-light"
			color="primary"
		>
			Customization
		</Button>

			<div class="grid gap-2">
			  <AppBar title="Example" class="[--bg-primary:theme(colors.primary)] text-primary-content" />
			  <AppBar title="Example" class="bg-primary [--text-color:theme(colors.warning)]" />
			</div>
	</div>
</main>
