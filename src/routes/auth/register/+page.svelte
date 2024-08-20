<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Checkbox, TextField } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import cw_logo from '$lib/images/UI/cropwatch_logo_blue_text.png';
	import { mdiClock, mdiLoading } from '@mdi/js';
	import { goto } from '$app/navigation';
	import { PUBLIC_RECAPTCHA_KEY } from '$env/static/public';
	import { notificationStore } from '$lib/stores/notificationStore';

	let full_name: string = '';
	let email: string = '';
	let password: string = '';
	let confirmPassword: string = '';
	let privacyChecked: boolean = false;
	let termsChecked: boolean = false;
	let cookieChecked: boolean = false;
	let loading: boolean = false;

	function onClick(e) {
		e.preventDefault();
		grecaptcha.ready(function () {
			grecaptcha.execute(PUBLIC_RECAPTCHA_KEY, { action: 'submit' }).then(function (token) {
				const formData = new URLSearchParams({
					full_name: full_name,
					email: email,
					password: password,
					confirmPassword: confirmPassword,
					privacyChecked: privacyChecked.toString(),
					termsChecked: termsChecked.toString(),
					cookieChecked: cookieChecked.toString(),
					token: token
				});

				fetch('?register', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					body: formData.toString()
				})
					.then((response) => {
						if (response.ok) {
							return response.json();
						}
						throw new Error('Network response was not ok.');
					})
					.then((data) => {
						console.log(data);
						if (data.type == 'success') {
							notificationStore.NotificationTimedOpen({
								title: 'Account Created!',
								description: '',
								timeout: 2000,
								icon: '❌',
								buttonText: 'OK'
							});
							goto('/auth/check-email');
						} else {
							notificationStore.NotificationTimedOpen({
								title: 'Failed to Register',
								description: 'An error occurred.',
								timeout: 2000,
								icon: '❌',
								buttonText: 'OK'
							});
						}
					})
					.catch((error) => {
						console.error('There has been a problem with your fetch operation:', error);
					});
			});
		});
	}
</script>

<svelte:head>
	<script src="https://www.google.com/recaptcha/api.js?render={PUBLIC_RECAPTCHA_KEY}"></script>
</svelte:head>

<div id="login-background">
	<div class="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
		<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
			<div class="mx-2 rounded-lg bg-primary-100 px-6 py-12 shadow sm:px-12 md:mx-0">
				<div class="sm:mx-auto sm:w-full sm:max-w-md">
					<img class="mx-auto h-10 w-auto" src={cw_logo} alt="CropWatch" />
					<h2 class="mt-4 text-center text-2xl font-bold leading-9 tracking-tight">
						{$_('auth.register.title')}
					</h2>
				</div>

				<div class="mb-3">
					<label for="email" class="block text-sm font-medium leading-6">{$_('auth.login.Email')}</label>
					<div class="mt-2">
						<TextField
							label=""
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
					<label for="password" class="block text-sm font-medium leading-6"
						>{$_('auth.login.Password')}</label
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

				<div class="mb-2">
					<label for="password-confirm" class="block text-sm font-medium leading-6"
						>{$_('auth.register.ConfirmPassword')}</label
					>
					<div class="mt-2">
						<TextField
							id="password-confirm"
							label=""
							placeholder="****************"
							type="password"
							bind:value={confirmPassword}
							autocomplete="current-password"
							required
						/>
					</div>
				</div>

				<div class="mt-2">
					<Checkbox bind:checked={privacyChecked}
						>{$_('auth.register.ReadPrivacyPolicy')} <a href="/legal/privacy-policy" target="_blank" class="text-blue-800"
							>{$_('auth.register.PrivacyPolicy')}</a
						></Checkbox
					>
					<Checkbox bind:checked={termsChecked}
						>{$_('auth.register.ReadTermsOfUse')} <a href="/legal/eula" target="_blank" class="text-blue-800"
							>{$_('auth.register.TermsOfUse')}</a
						></Checkbox
					>
					<Checkbox bind:checked={cookieChecked}
						>{$_('auth.register.ReadCookiePolicy')} <a href="/legal/cookie-policy" target="_blank" class="text-blue-800"
							>{$_('auth.register.CookiePolicy')}</a
						></Checkbox
					>
				</div>

				<Button
					type="submit"
					disabled={password != confirmPassword ||
						loading ||
						password.length < 3 ||
						!privacyChecked ||
						!termsChecked ||
						!cookieChecked}
					variant="fill"
					color="primary"
					icon={loading ? mdiClock : ''}
					on:click={onClick}
					classes={{ root: 'w-full' }}>{$_('auth.register.signup')}</Button
				>
				<div>
					<div class="relative mt-6 flex flex-row">
						<div class="mx-auto flex flex-row">
							<p>{$_('auth.register.already_have_an_account')}</p>
							<a class="blue-100" href="login"
								>&nbsp; <u class="text-blue-700 hover:text-indigo-900">{$_('auth.register.login')}</u></a
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
