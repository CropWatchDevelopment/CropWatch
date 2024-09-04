<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import TRACTOR from '$lib/images/UI/tractor.svg';
	import { onMount } from 'svelte';
	import { Overlay, ProgressCircle } from 'svelte-ux';

	onMount(() => {
		if (browser) {
			goto('/app/dashboard');
		}
	});
</script>

<Overlay center class="bg-surface-content/10">
	<ProgressCircle />
</Overlay>

<slot />
