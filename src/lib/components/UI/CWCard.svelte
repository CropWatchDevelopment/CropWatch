<script>
	import { Card, Icon } from 'svelte-ux';
	let { text, value, notation, icon } = $props();
</script>

<Card
	class="flex w-full flex-row items-center text-nowrap rounded-md bg-primary-content/50 px-2 py-10 hover:bg-primary-content/60"
>
	<div>
		{#if icon}
			<span class="text-4xl font-medium">
				{icon}
			</span>
		{/if}
		{#if text}
			<span class="text-2xl font-medium">
				{text}
			</span>
		{/if}
	</div>
	{#if value}
		<span class="text-4xl font-medium">
			{value}
			{#if notation}
				<sup><small>{notation}</small></sup>
			{/if}
		</span>
	{/if}
</Card>
