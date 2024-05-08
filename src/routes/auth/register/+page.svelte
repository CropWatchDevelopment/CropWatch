<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, TextField } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import cw_logo from '$lib/images/UI/cropwatch_logo_blue_text.png';
	export let form;

	let email: string = '';
	let password: string = '';
	let confirmPassword: string = '';
</script>

<div id="login-background">
	<div class="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
		<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
			<div class="bg-white px-6 py-12 shadow rounded-lg sm:px-12 mx-2 md:mx-0">
				<div class="sm:mx-auto sm:w-full sm:max-w-md">
					<img class="mx-auto h-10 w-auto" src={cw_logo} alt="CropWatch" />
					<h2 class="mt-4 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
						{$_('login.register_title')}
					</h2>
				</div>
				<form action="?/register" method="POST" use:enhance>
					<div class="mb-3">
						<label for="email" class="block text-sm font-medium leading-6 text-gray-900"
							>{$_('login.Email')}</label
						>
						<div class="mt-2">
							<TextField
								label={$_('login.email')}
								id="email"
								placeholder="my@address.com"
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
								label={$_('login.password')}
								placeholder="****************"
								name="password"
								type="password"
								bind:value={password}
								autocomplete="current-password"
								required
							/>
						</div>
					</div>

					<div class="mb-2">
						<label for="password-confirm" class="block text-sm font-medium leading-6 text-gray-900"
							>{$_('login.ConfirmPassword')}</label
						>
						<div class="mt-2">
							<TextField
								id="password-confirm"
								label={$_('login.ConfirmPassword')}
								placeholder="****************"
								type="password"
								bind:value={confirmPassword}
								autocomplete="current-password"
								required
							/>
						</div>
					</div>

					<Button
						type="submit"
						disabled={password != confirmPassword}
						variant="fill-outline"
						color="primary"
						classes={{ root: 'w-full' }}>{$_('login.signup')}</Button
					>
				</form>
				{#if form?.invalid}<mark>{form?.message}!</mark>{/if}
				<div>
					<div class="relative mt-6 flex flex-row">
						<div class="mx-auto flex flex-row">
							<p>{$_('login.already_have_an_account')}</p>
							<a class="blue-100" href="login"
								>&nbsp; <u class="text-blue-400 hover:text-indigo-500">{$_('login.login')}</u></a
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
		transition: opacity 0.3s;
		opacity: 1;
		min-height: 100vh;
		margin: 0;
		background-attachment: fixed;
		background-image: url($lib/images/empty-greenhouse.jpg);
		background-repeat: no-repeat;
		background-size: cover;
		background-position: center center;
	}
</style>
