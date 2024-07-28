<script lang="ts">
	import { SvelteToast } from '@zerodevx/svelte-toast';
	import '../app.css';

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
					root: 'text-black'
				} 
			},

			TextField: {
				classes: {
					root: 'text-black'
				}
			},
			Input: {
				classes: {
					root: 'text-black'
				}
			},
		}
	});
</script>

<SvelteToast />
<slot />
