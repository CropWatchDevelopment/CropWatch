<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	type Props = {
		open?: boolean;
		size?: 'sm' | 'md' | 'lg';
		content?: Snippet;
		header?: Snippet;
		title?: Snippet;
		body?: Snippet;
		footer?: Snippet;
	};

	let {
		open = $bindable(false),
		size = 'lg',
		content,
		header,
		title,
		body,
		footer
	}: Props = $props();

	let dialog: HTMLDialogElement;

	$effect(() => {
		if (open) {
			dialog?.showModal();
		} else {
			dialog?.close();
		}
	});

	onMount(() => {
		// onUnmount
		return () => {
			if (dialog?.open) {
				dialog.close();
				open = false;
			}
		};
	});
</script>

<dialog
	bind:this={dialog}
	class="text-text m-auto rounded-lg shadow-lg backdrop:bg-black/50"
	style:background-color="var(--color-card)"
	style:max-width={size === 'sm' ? '600px' : size === 'md' ? '800px' : 'auto'}
	oncancel={(event) => {
		event.preventDefault();
		open = false;
	}}
>
	{#if content}
		{@render content()}
	{:else}
		{#if header}
			<div class="m-6">
				{@render header()}
			</div>
		{:else if title}
			<h3 class="text-text m-6 text-xl font-medium">
				{@render title()}
			</h3>
		{/if}
		{#if body}
			<div class="m-6">
				{@render body()}
			</div>
		{/if}
		{#if footer}
			<div class="m-6 flex justify-end gap-2">
				{@render footer()}
			</div>
		{/if}
	{/if}
</dialog>
