<script lang="ts">
	import { onMount } from 'svelte';
	import { settings } from 'svelte-ux';
	import { authState } from '$lib/stores/auth.store.js';
	import { goto, invalidate } from '$app/navigation';
	import '../app.postcss';

	export let data;

	let { supabase, session } = data;
	$: ({ supabase, session } = data);

	settings({
		themes: {
			light: ['light', 'winter'],
			dark: ['dark', 'black', 'dracula']
		},
		components: {
			AppBar: {
				classes: 'bg-primary text-white shadow-md'
			},
			AppLayout: {
				classes: {
					nav: 'bg-neutral-800'
				}
			},
			NavItem: {
				classes: {
					root: 'text-sm text-gray-400 pl-6 py-2 hover:text-white hover:bg-gray-300/10 [&:where(.is-active)]:text-sky-400 [&:where(.is-active)]:bg-gray-500/10'
				}
			},
			Card: {
				classes: {
					root: 'bg-gradient-to-r from-cyan-100 to-blue-200'
				}
			}
		}
	});

	onMount(() => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, _session) => {
			console.log('auth state change', event);
			if (event == 'SIGNED_OUT') {
				authState.set(null);
				goto('/auth/login');
			}
			if (event == 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
				authState.set(data.supabase.auth);
			}
			if (_session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => subscription.unsubscribe();
	});
</script>

<main>
	<slot />
</main>
