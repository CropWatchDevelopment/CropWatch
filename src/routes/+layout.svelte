<script lang="ts">
	import '../app.css';
	import { goto, invalidate } from '$app/navigation';
	import { appConfigDefaults } from '$lib/app.config';
	import { Button, settings } from 'svelte-ux';
	import { setUserState } from '$lib/state/user-state.svelte';
	import type { PageProps } from './$types';
	import moment from 'moment';
	import { page } from '$app/state';

	let pathname = $derived(page.url.pathname);

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
			console.log(event, session);

			if (event === 'INITIAL_SESSION') {
				// handle initial session
				
			} else if (event === 'SIGNED_IN') {
				// handle sign in event
			} else if (event === 'SIGNED_OUT') {
				// handle sign out event
				return;
			} else if (event === 'PASSWORD_RECOVERY') {
				// handle password recovery event
				goto('/auth/update-password');
				return;
			} else if (event === 'TOKEN_REFRESHED') {
				// handle token refreshed event
			} else if (event === 'USER_UPDATED') {
				// handle user updated event
			}

			userState.updateState({
				session: newSession,
				supabase,
				user: newSession?.user || null,
				profile: null
			});

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

<svelte:boundary>
	{@render children()}
	{#snippet failed(error)}
		<p>Oops! an error occured: {error.message}</p>
		<a href="/auth/login">Return to login</a>
	{/snippet}
</svelte:boundary>
