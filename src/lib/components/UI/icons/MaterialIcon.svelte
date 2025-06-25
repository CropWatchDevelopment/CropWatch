<script lang="ts">
	type Props = {
		class?: string;
		name: string;
		size?: 'small' | 'medium' | 'large' | 'xlarge';
		[key: string]: any;
	};

	let { class: className, name, size = 'medium', ...restProps }: Props = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
	/>
</svelte:head>

<span
	{...restProps}
	class="sui icon material-symbols-outlined {size} {className}"
	aria-hidden={!('aria-label' in restProps)}
>
	{name}
</span>

<style>
	.material-symbols-outlined {
		font-variation-settings:
			'FILL' 0,
			'wght' 300,
			'GRAD' 0,
			'opsz' 24;

		&.small {
			font-size: 16px;
		}

		&.medium {
			font-size: 24px;
		}

		&.large {
			font-size: 32px;
		}

		&.xlarge {
			font-size: 48px;
		}
	}
</style>
