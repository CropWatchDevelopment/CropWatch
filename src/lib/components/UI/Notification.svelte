<script lang="ts">
	import { ToastState } from '$lib/state/toast-state.svelte';
	import { mdiInformation } from '@mdi/js';
	import { Notification, type ThemeColors } from 'svelte-ux';
	
	const state = $state(ToastState.getInstance());

	$effect(() => {
		if (state.open) {
			setTimeout(() => {
				state.open = false;
			}, state.timeout);
		}
	});
</script>

<Notification class="absolute top-5 right-10 z-50 p-5" open={state.open} title={state.title} icon={state.icon} closeIcon />
