<script module lang="ts">
	export type OverviewIconName =
		| 'device'
		| 'signal'
		| 'bell'
		| 'gateway'
		| 'report'
		| 'file'
		| 'pulse'
		| 'check'
		| 'send'
		| 'arrow'
		| 'chevron';
</script>

<script lang="ts">
	// Stroke icons drawn by the approved Overview design, kept as-is so the
	// page matches it.
	interface Props {
		name: OverviewIconName;
		size?: number;
		class?: string;
	}

	let { name, size = 18, class: className = '' }: Props = $props();
</script>

<svg
	class={className}
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if name === 'device'}
		<rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" />
	{:else if name === 'signal'}
		<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01" />
	{:else if name === 'bell'}
		<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
	{:else if name === 'gateway'}
		<path d="M12 13v8M8 21h8" /><circle cx="12" cy="11" r="2" /><path
			d="M7.8 6.8a6 6 0 0 0 0 8.4M16.2 6.8a6 6 0 0 1 0 8.4"
		/>
	{:else if name === 'report'}
		<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path
			d="M14 3v5h5M9 13h6M9 17h4"
		/>
	{:else if name === 'file'}
		<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" />
	{:else if name === 'pulse'}
		<path d="M3 12h4l3-8 4 16 3-8h4" />
	{:else if name === 'check'}
		<path d="M20 6 9 17l-5-5" />
	{:else if name === 'send'}
		<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
	{:else if name === 'arrow'}
		<path d="M5 12h14M13 6l6 6-6 6" />
	{:else if name === 'chevron'}
		<path d="m9 6 6 6-6 6" />
	{/if}
</svg>
