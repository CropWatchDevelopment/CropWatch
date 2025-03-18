<script lang="ts">
	import '../app.css';
	import { goto, invalidate } from '$app/navigation';
	import { appConfigDefaults } from '$lib/app.config';
	import { settings } from 'svelte-ux';
	import { setUserState } from '$lib/state/user-state.svelte';
	import type { PageProps } from './$types';

	let { children, data }: PageProps = $props();
	let { session, supabase } = $derived(data);

	let userState = setUserState({
		session: data.session,
		supabase: data.supabase,
		user: data.user,
		profile: null
	});

	$effect(() => {
		const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
			userState.updateState({
				session: newSession,
				supabase,
				user: newSession?.user || null,
				profile: null
			});

			if (event == 'PASSWORD_RECOVERY') {
				goto('/auth/update-password');
				return;
			}

			if (!newSession && !window.location.pathname.includes('/auth')) {
				// If the new session is null, the user is effectively logged out.
				goto('/auth/login');
			}

			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => data.subscription.unsubscribe();
	});

	settings(appConfigDefaults);
</script>

{@render children()}
