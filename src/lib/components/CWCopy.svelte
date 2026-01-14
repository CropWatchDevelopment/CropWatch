<script lang="ts">
	interface Props {
		value: string;
		label?: string;
		showValue?: boolean;
		size?: 'sm' | 'md' | 'lg';
	}

	let { value, label, showValue = true, size = 'md' }: Props = $props();

	let copied = $state(false);

	const sizeClasses = {
		sm: 'text-xs gap-1.5',
		md: 'text-sm gap-2',
		lg: 'text-base gap-2.5'
	};

	const iconSizes = {
		sm: 'h-3.5 w-3.5',
		md: 'h-4 w-4',
		lg: 'h-5 w-5'
	};

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
</script>

<button
	type="button"
	onclick={handleCopy}
	class="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-1.5 font-mono text-slate-300 transition-all hover:border-sky-500/50 hover:bg-slate-800 hover:text-white active:scale-95 {sizeClasses[size]}"
	title="Copy to clipboard"
>
	{#if label}
		<span class="text-slate-400">{label}</span>
	{/if}
	
	{#if showValue}
		<span class="select-all">{value}</span>
	{/if}

	{#if copied}
		<svg
			class="{iconSizes[size]} text-emerald-400"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
		</svg>
	{:else}
		<svg
			class="{iconSizes[size]} text-slate-400"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
			/>
		</svg>
	{/if}
</button>
