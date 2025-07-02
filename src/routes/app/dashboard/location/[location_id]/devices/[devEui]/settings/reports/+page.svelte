<script>
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import { _ } from 'svelte-i18n';
</script>

<section class="flex flex-col gap-6">
	<header class="flex flex-row items-center justify-between gap-4">
		<div>
			<h1 class="mb-1 text-2xl font-semibold">{$_('Reports')} (Coming soon!)</h1>
			<p class="text-sm text-neutral-100">
				Customizable reports to analyze your device data over time. Create and manage reports to
				track trends, monitor performance, and gain insights into your device's behavior.
			</p>
		</div>

		<div class="mt-4 md:mt-0">
			<Button disabled>
				<svg
					class="mr-2 h-4 w-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"
					></path>
				</svg>
				{$_('Add Report')}
			</Button>
		</div>
	</header>
</section>
