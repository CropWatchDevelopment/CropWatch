<script lang="ts">
	import './app.css';
	import { goto, invalidate } from '$app/navigation';
	import { Button, settings } from 'svelte-ux';
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
	settings({
		components: {
			AppLayout: {
				classes: {
					/* 
          'aside' might just have a border or background.
          We can set a border color that adjusts in dark mode by default.
        */
					aside: 'border-r border-surface-300',
					nav: 'bg-surface-300'
				}
			},
			AppBar: {
				/* 
        The top bar uses our primary color. 
        We also apply text-primary-content for contrast.
      */
				classes:
					'bg-primary text-primary-content shadow-md ' +
					'[text-shadow:1px_1px_2px_var(--color-primary)]'
			},
			NavItem: {
				classes: {
					root: [
						'text-sm',
						'text-surface-content/70', // partial transparency
						'pl-6 py-2 relative',
						'hover:bg-surface-200/70', // a slightly lighter hover
						'transition-colors' // smooth color transitions
					].join(' '),

					/* 
          Active nav item: highlight the text in brand color,
          with a subtle background. 
        */
					active: [
						'text-primary',
						'bg-surface-100',
						'font-medium',
						'before:absolute before:bg-primary before:rounded-full before:w-1 before:h-2/3 before:left-[6px]',
						'shadow-sm z-10'
					].join(' ')
				}
			}
		}
	});
</script>

{@render children()}
