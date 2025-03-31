<script lang="ts">
	import './app.css';
	import { goto, invalidate } from '$app/navigation';
	// import { appConfigDefaults } from '$lib/.app.config';
	import { Button, settings } from 'svelte-ux';
	import { setUserState } from '$lib/state/user-state.svelte';
	import type { PageProps } from './$types';
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

	// settings(appConfigDefaults);
	// settings({
	// 	components: {
	// 		AppLayout: {
	// 			classes: {
	// 				aside: 'border-r',
	// 				nav: 'bg-surface-300'
	// 			}
	// 		},
	// 		AppBar: {
	// 			classes:
	// 				'bg-primary text-primary-content shadow-md [text-shadow:1px_1px_2px_var(--color-primary-700)]'
	// 		},
	// 		NavItem: {
	// 			classes: {
	// 				root: 'text-sm text-surface-content/70 pl-6 py-2 hover:bg-surface-100/70 relative',
	// 				active:
	// 					'text-primary bg-surface-100 font-medium before:absolute before:bg-primary before:rounded-full before:w-1 before:h-2/3 before:left-[6px] shadow-sm z-10'
	// 			}
	// 		}
	// 	}
	// });
</script>

<svelte:boundary>
	{@render children()}
	{#snippet failed(error)}
		<p>Oops! an error occured: {error.message}</p>
		<a href="/auth/login">Return to login</a>
	{/snippet}
</svelte:boundary>
