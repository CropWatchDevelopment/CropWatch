<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import cw_logo from '$lib/images/UI/cropwatch_logo_blue_text.png';
	import { _ } from 'svelte-i18n';
	import { TextField, Button, Switch, Icon } from 'svelte-ux';
	import { mdiLockQuestion, mdiKeyArrowRight, mdiGoogle, mdiCheckCircle, mdiCloseCircle } from '@mdi/js';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { notificationStore } from '$lib/stores/notificationStore.js';


	export let data;

	let { supabase } = data;
	$: ({ supabase } = data);

	let loggingIn: boolean = false;
	let rememberMe: boolean = false;

	let email: string = '';
	let password: string = '';

	let redirectURL: string = browser ? `${window.location.origin}/auth/callback` : '';

	const oAuthLogin = async () => {
		const { data: response, error } = await data.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: redirectURL
			}
		});
		if (error) {
			console.error('Error logging in with Google:', error.message);
		}
	};

	onMount(() => {
		const hasRememberMe = localStorage.getItem('rememberMe');
		if (hasRememberMe) {
			rememberMe = true;
			email = localStorage.getItem('email') || '';
			password = localStorage.getItem('pw') || '';
		}
	});
</script>

<div id="login-background">
	<div class="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
		<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
			<div class="mx-2 rounded-lg bg-primary-50 px-6 py-12 shadow sm:px-12 md:mx-0">
				<div class="sm:mx-auto sm:w-full sm:max-w-md">
					<img class="mx-auto h-10 w-auto" src={cw_logo} alt="CropWatch" />
					<h2 class="mt-4 text-center text-2xl font-bold leading-9 tracking-tight">
						{$_('auth.unauthorized.title')}
					</h2>
				</div>
				

					<div class="mb-2">
                        {$_('auth.unauthorized.description')}
					</div>
					

					<Button
						icon={mdiKeyArrowRight}
						href="/auth/login"
                        variant="fill"
                        color="primary"
						class="mb-2 flex w-full"
						>{$_('auth.login.login')}</Button
					>


			</div>
		</div>
	</div>
</div>

<style>
	#login-background {
		min-height: 100vh;
		margin: 0;
		background-attachment: fixed;
		background-image: url($lib/images/saito.jpg);
		background-repeat: no-repeat;
		background-size: cover;
		background-position: center center;
	}
</style>
