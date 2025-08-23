<script lang="ts">
	import { browser } from '$app/environment';
	import Button from './UI/buttons/Button.svelte';
	import MaterialIcon from './UI/icons/MaterialIcon.svelte';

	let displaySafariRefresh = false;

	if (browser && iOS()) {
		displaySafariRefresh = true;
	}

	function iOS() {
		return (
			['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
				navigator.platform
			) ||
			// iPad on iOS 13 detection
			(navigator.userAgent.includes('Mac') && 'ontouchend' in document)
		);
	}
</script>

{#if displaySafariRefresh}
	<Button
		variant="secondary"
		type="button"
		class="hidden items-center gap-2 md:inline-flex"
		onclick={() => {
			window.location.reload();
		}}
	>
		<MaterialIcon name="refresh" />
	</Button>
{/if}
