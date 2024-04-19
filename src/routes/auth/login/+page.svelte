<script lang="ts">
	import { goto } from '$app/navigation';
	import cropwatchWithText from '$lib/images/cropwatchText.png';
	import { Button, Switch, TextField, Tooltip } from 'svelte-ux';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';

	export let data: PageData;
	let { supabase } = data;
	$: ({ supabase } = data);
	let email: string = '';
	let password: string = '';
	let loggingIn: boolean = false;
	let rememberMe: boolean = false;

	const handleSignIn = async () => {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password
		});
		if (!error) {
			if (rememberMe) {
				localStorage.setItem('email', email);
				localStorage.setItem('pw', password);
			}
			goto('/app/dashboard');
		} else {
			alert(error);
			loggingIn = false;
		}
	};

	const onLogin = async () => {
		loggingIn = true;
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
			<div class="bg-white px-6 py-12 shadow sm:rounded-lg sm:px-12 mx-2 md:mx-0">
				<div class="sm:mx-auto sm:w-full sm:max-w-md">
					<img class="mx-auto h-10 w-auto" src={cropwatchWithText} alt="CropWatch" />
					<h2 class="mt-4 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
						{$_('login.title')}
					</h2>
				</div>
				<p class="text-center text-sm text-gray-400">
					The login page prioritizes user security, offering a seamless experiance that ensures
					quick and convienient access to the system's array of benifits.
				</p>
				<form class="" action="?login" method="POST">
					<div class="mb-3">
						<label for="email" class="block text-sm font-medium leading-6 text-gray-900"
							>{$_('login.Email')}</label
						>
						<div class="mt-2">
							<TextField
								label={$_('login.email')}
								id="email"
								name="email"
								type="email"
								bind:value={email}
								autocomplete="email"
								required
								on:change={(e) => console.log(e.detail)}
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
								label={$_('login.enter_password')}
								placeholder="****************"
								name="password"
								type="password"
								bind:value={password}
								autocomplete="current-password"
								required
							/>
						</div>
					</div>

					<div class="flex items-center justify-between">
						<div class="flex items-center">
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
							<label for="remember" class="text-sm text-gray-900 mt-5"> &nbsp; {$_('login.remember_me')} </label>
						</div>

						<div class="text-sm leading-6">
							<a
								href="forgot-password"
								class="font-semibold text-sm text-blue-400 hover:text-indigo-500"
								>{$_('login.forgot_password')}</a
							>
						</div>
					</div>

					<div class="mt-5">
						<Button
							on:click={() => {
								onLogin();
							}}
							disabled={loggingIn}
							loading={loggingIn}
							type="button"
							on:click={() => handleSignIn()}
							class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
							>{$_('login.login')}</Button
						>
					</div>
				</form>

				<div>
					<div class="relative mt-6 flex flex-row">
						<div class="mx-auto flex flex-row">
							<p>{$_('login.dont_have_an_account')}</p>
							<a class="blue-100" href="register"
								>&nbsp; <u class="text-blue-400 hover:text-indigo-500">{$_('login.register_now')}</u></a
							>
						</div>
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
