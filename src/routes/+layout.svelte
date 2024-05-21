<script lang="ts">
	import { SvelteToast } from '@zerodevx/svelte-toast';
	import '../app.css';
	import { dev } from '$app/environment';

	import { settings } from 'svelte-ux';

	settings({
		components: {
			Button: {
				// same as <Button class="flex-2">
				classes: 'flex-2',
				// All component that wrap Button will also use this variant by default,
				variant: 'outline'
			},
			Field: {
				// All components based on Field will use this as well.
				labelPlacement: 'top'
			},
			MultiSelect: {
				classes: {
					root: 'text-white'
				} 
			}
		}
	});
</script>

<SvelteToast />
{#if dev}
<div class="w-full h-fit bg-orange-300 text-center">
	🔨 DEVELOP ENVIRONMENT
</div>
{/if}
<slot />
