<script lang="ts">
	import BaseButton from '$lib/components/ui/base/Button.svelte';
	let { text, href, iconPath, onClick } = $props<{
		text: string;
		href?: string;
		iconPath?: string;
		onClick?: () => void;
	}>();
	function click() {
		onClick ? onClick() : href && (window.location.href = href);
	}
</script>

<BaseButton variant="secondary" size="sm" className="w-full justify-center">
	<span
		class="flex items-center gap-2"
		onclick={() => click()}
		role="button"
		tabindex="0"
		onkeydown={(e: KeyboardEvent) =>
			(e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), click())}
	>
		{text}
		{#if iconPath}
			<svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true"
				><path d={iconPath} /></svg
			>
		{/if}
	</span>
</BaseButton>
