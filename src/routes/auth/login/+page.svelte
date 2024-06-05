<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { toast } from '@zerodevx/svelte-toast';
	import { _ } from 'svelte-i18n';
	import { TextField, Button, Switch, Icon } from 'svelte-ux';
	import { mdiAccountPlus, mdiLockQuestion, mdiKeyArrowRight } from '@mdi/js';
	import cw_logo from '$lib/images/UI/cropwatch_logo_blue_text.png';
	import { onMount } from 'svelte';
	export let form;

	let loggingIn: boolean = false;
	let rememberMe: boolean = false;

	let email: string = '';
	let password: string = '';

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
			<div class="bg-white px-6 py-12 shadow rounded-lg sm:px-12 mx-2 md:mx-0">
				<div class="sm:mx-auto sm:w-full sm:max-w-md">
					<img class="mx-auto h-10 w-auto" src={cw_logo} alt="CropWatch" />
					<h2 class="mt-4 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
						{$_('login.title')}
					</h2>
				</div>
				<form
					action="?/login"
					method="POST"
					use:enhance={({ formElement, formData, action, cancel, submitter }) => {
						loggingIn = true;
						if (rememberMe) {
							localStorage.setItem('email', email);
							localStorage.setItem('pw', password);
						}

						return async ({ result, update }) => {
							if (result.status && result.status < 400) {
								update();
								toast.push('Login successful!', {
									theme: {
										'--toastBackground': 'cyan',
										'--toastColor': 'black'
									}
								});
								goto('/app'); // redirect to '/app'
							} else {
								loggingIn = false;
								toast.push(form?.message ?? 'Login Error', {
									theme: {
										'--toastBackground': 'red',
										'--toastColor': 'black'
									}
								});
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

					<!-- <div class="grid grid-flow-col grid-cols-2 my-2"> -->
					<div class="flex flex-row w-full mb-2">
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

						<span class="text-sm font-medium text-gray-900 ml-1">{$_('login.remember_me')}</span>
						<span class="flex-1" />
						<!-- <div class="text-right"> -->
						<a href="reset-password" class="text-xs font-medium text-gray-900 align-middle hover:text-indigo-500"
							><Icon data={mdiLockQuestion} /> {$_('login.forgot_password')}</a
						>
						<!-- </div> -->
					</div>
					<!-- </div> -->

					<Button
						disabled={loggingIn}
						loading={loggingIn}
						icon={mdiKeyArrowRight}
						type="submit"
						class="flex w-full mb-2 justify-center rounded-md bg-indigo-600 px-3 py-3 text-sm font-semibold leading-6 text-surface-100 shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
						>{$_('login.login')}</Button
					>
				</form>
				{#if form?.invalid}<mark>{form?.message}!</mark>{/if}

				<div>
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
