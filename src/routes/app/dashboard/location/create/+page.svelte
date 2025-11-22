<script lang="ts">
	import CreateLocationForm from '$lib/components/dashboard/CreateLocationForm.svelte';
	import { _ } from 'svelte-i18n';
</script>

<section class="mx-auto flex max-w-6xl flex-col gap-8 p-4">
	<header class="space-y-2">
		<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
			{$_('Create Location')}
		</h1>
		<p class="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
			{$_('Add a new location to your account.')}
		</p>
	</header>

	<CreateLocationForm />
</section>
