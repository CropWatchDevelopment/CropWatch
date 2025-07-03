<script lang="ts">
	let { text, href, iconPath, onClick } = $props<{
		text: string;
		href?: string;
		iconPath?: string;
		onClick?: () => void;
	}>();

	const handleClick = () => {
		if (onClick) {
			onClick();
		} else {
			window.location.href = href;
		}
	};
</script>

<button
	type="button"
	onclick={handleClick}
	class="
	flex w-full items-center justify-center gap-2 rounded-md border border-transparent
	bg-blue-300 px-3 py-1.5 text-sm
	font-medium text-blue-600 transition-colors duration-200 hover:bg-blue-400 hover:text-zinc-300
	focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:ring-offset-1
	dark:bg-white/8 dark:text-zinc-300 dark:hover:bg-slate-700 dark:focus-visible:ring-blue-500"
	aria-label="View details"
>
	{text}
	<svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
		<path d={iconPath} />
	</svg>
</button>
