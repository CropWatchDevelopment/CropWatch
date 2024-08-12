<script lang="ts">
	import { enhance } from '$app/forms';
	import { _ } from 'svelte-i18n';
	// import cw_logo from '$lib/images/UI/cropwatch_logo_blue_text.png';
	import { Button, TextField } from 'svelte-ux';
	import { goto } from '$app/navigation';
	export let form;

	let isLoading: boolean = false;
</script>

<div id="login-background">
	<div class="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
		<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
			<div class="bg-white px-6 py-12 shadow rounded-lg sm:px-12 mx-2 md:mx-0">
				<div class="sm:mx-auto sm:w-full sm:max-w-md">
					<!-- <img class="mx-auto h-10 w-auto" src={cw_logo} alt="CropWatch" /> -->
					<h2 class="mt-4 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
						{$_('login.title')}
					</h2>
				</div>
				<h2>{$_('auth.were_to_send_email')}</h2>
				<form
					action="?/reset_password"
					method="POST"
					use:enhance={({ formElement, formData, action, cancel, submitter }) => {
						isLoading = true;
						return async ({ result, update }) => {
							isLoading = false;
							if (result.status && result.status < 400) {
								update();
								isLoading = false;
								goto('login'); // redirect to '/app'
							} else {
								isLoading = false;
								console.log(result);
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
								placeholder="my@address.com"
								name="email"
								type="email"
								autocomplete="email"
								required
								on:change={(e) => console.log(e.detail)}
							/>
						</div>
					</div>
					<Button
						type="submit"
						variant="fill"
						color="primary"
						loading={isLoading}
						classes={{ root: 'w-full' }}>{$_('auth.send_recovery_email')}</Button
					>
				</form>
				{#if form?.invalid}<mark>{form?.message}!</mark>{/if}
				<div>
					<div class="relative mt-6 flex flex-row">
						<div class="mx-auto flex flex-row">
							<p>{$_('auth.return_to_login')}</p>
							<a class="blue-100" href="/auth/login"
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
		min-height: 100vh;
		margin: 0;
		background-attachment: fixed;
		background-image: url($lib/images/saito.jpg);
		background-repeat: no-repeat;
		background-size: cover;
		background-position: center center;
	}
</style>
