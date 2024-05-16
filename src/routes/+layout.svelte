<script lang="ts">
	import { SvelteToast } from '@zerodevx/svelte-toast';
	import '../app.css';
	import { dev } from '$app/environment';
</script>
<SvelteToast />
{#if dev}
<div class="w-full h-fit bg-orange-300 text-center">
	🔨 DEVELOP ENVIRONMENT
</div>
{/if}
<slot />