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
	export let form;

	let { supabase } = data;
	$: ({ supabase } = data);

	let loggingIn: boolean = false;
	let rememberMe: boolean = false;

	let email: string = '';
	let password: string = '';

	let avatarUrl: string | null = null;

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
						{$_('login.title')}
					</h2>
				</div>
				<form
					class="mt-6 border-b-2 border-gray-300 pb-1"
					action="?/login"
					method="POST"
					use:enhance={({ formElement, formData, action, cancel, submitter}) => {
						loggingIn = true;
						if (rememberMe) {
							localStorage.setItem('email', email);
							localStorage.setItem('pw', password);
						}

						return async ({ result, update }) => {
							if (result.status && result.status < 400) {
								await update({ reset: false });
								if (result.data.avatarUrl) {
									localStorage.setItem('avatarUrl', result.data.avatarUrl);
								}
								if (result.data.profile != null) {
									localStorage.setItem('name', result.data.profile.full_name);
								}
								if (!result.data.profile.accepted_agreements) {
									document.location.href = '/auth/accept-agreements';
								}
								notificationStore.NotificationTimedOpen({
									title: 'Login Successful',
									description: 'You have successfully logged in',
									icon: mdiCheckCircle,
									timeout: 3000,
									buttonText: 'Close'
								});
								await goto(result.data.redirect);
							} else {
								notificationStore.NotificationTimedOpen({
									title: 'Login Failed',
									description: 'Please check your email and password and try again',
									icon: mdiCloseCircle,
									timeout: 3000,
									buttonText: 'Close'
								});
								loggingIn = false;
							}
						};
					}}
				>
					<div class="mb-3">
						<label for="email" class="block text-sm font-medium leading-6 text-gray-900"
							>{$_('login.Email')}</label
						>
						<div class="mt-2">
							<TextField
								label=""
								id="email"
								name="email"
								type="email"
								bind:value={email}
								autocomplete="email"
								required
							/>
						</div>
					</div>

					<div class="mb-2">
						<label for="password" class="block text-sm font-medium leading-6 text-gray-900"
							>{$_('login.Password')}</label
						>
						<div class="mt-2">
							<TextField
								id="password"
								label=""
								placeholder="****************"
								name="password"
								type="password"
								bind:value={password}
								autocomplete="current-password"
								required
							/>
						</div>
					</div>

					<div class="mb-2 flex w-full flex-row">
						<Switch
							name="rememberMe"
							id="remember"
							bind:checked={rememberMe}
							classes={{
								switch: 'bg-white border-gray-400 data-[checked=true]:bg-blue-600',
								toggle: 'data-[checked=false]:bg-blue-600 data-[checked=true]:bg-white'
							}}
							on:change={(e) => {
								localStorage.setItem('rememberMe', e.detail);
							}}
						/>

						<span class="ml-1 text-sm font-medium text-gray-900">{$_('login.remember_me')}</span>
						<span class="flex-1" />
						<a
							href="reset-password"
							class="align-middle text-xs font-medium text-gray-900 hover:text-indigo-500"
							><Icon data={mdiLockQuestion} /> {$_('login.forgot_password')}</a
						>
					</div>

					<Button
						disabled={loggingIn}
						loading={loggingIn}
						icon={mdiKeyArrowRight}
						type="submit"
						class="mb-2 flex w-full justify-center rounded-md bg-indigo-600 px-3 py-3 text-sm font-semibold leading-6 text-surface-100 shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
						>{$_('login.login')}</Button
					>
				</form>

				<div class="mt-2">
					<Button
						disabled={loggingIn}
						loading={loggingIn}
						icon={mdiGoogle}
						type="button"
						on:click={async () => oAuthLogin({ provider: 'google' })}
						class="mb-2 flex w-full justify-center rounded-md bg-red-500 px-3 py-3 text-sm font-semibold leading-6 text-surface-100 shadow-sm hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
						>Google {$_('login.login')}</Button
					>
				</div>

				<div class="relative mt-6 flex flex-row">
					<div class="mx-auto flex flex-row">
						<p>{$_('login.dont_have_an_account')}</p>
						<a class="blue-100" href="/auth/register"
							>&nbsp; <u class="text-blue-400 hover:text-indigo-500">{$_('login.register_now')}</u
							></a
						>
					</div>
				</div>
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
