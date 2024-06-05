<script lang="ts">
    import { enhance } from '$app/forms';
	import { Button, TextField } from 'svelte-ux';
    import { _ } from 'svelte-i18n';
    import cw_logo from '$lib/images/UI/cropwatch_logo_blue_text.png';
	import { toast } from '@zerodevx/svelte-toast';
	import { goto } from '$app/navigation';
    export let form;

    let password: string = '';
    let confirmPassword: string = '';
	let isLoading: boolean = false;
</script>


<div id="login-background">
	<div class="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
		<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
			<div class="bg-white px-6 py-12 shadow rounded-lg sm:px-12 mx-2 md:mx-0">
				<div class="sm:mx-auto sm:w-full sm:max-w-md">
					<img class="mx-auto h-10 w-auto" src={cw_logo} alt="CropWatch" />
					<h2 class="mt-4 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
						{$_('login.update_title')}
					</h2>
				</div>
				<form method="POST" use:enhance={({ formElement, formData, action, cancel, submitter }) => {
					// `formElement` is this `<form>` element
					// `formData` is its `FormData` object that's about to be submitted
					// `action` is the URL to which the form is posted
					// calling `cancel()` will prevent the submission
					// `submitter` is the `HTMLElement` that caused the form to be submitted
					isLoading=true;
					debugger;
					return async ({ result, update }) => {
						// `result` is an `ActionResult` object
						// `update` is a function which triggers the default logic that would be triggered if this callback wasn't set
						debugger;
						isLoading = false;
						if (result.data.success) {
							toast.push('Password updated successfully', {
								theme: {
									'--toastBackground': 'green',
								}
							});
							goto('/auth/login');
						} else {
							toast.push('Password update failed', {
								theme: {
									'--toastBackground': 'red',
								}
							})
						}
					};
				}}>

						<div class="mt-2">
							<TextField
								id="password"
								label={$_('login.password')}
								placeholder="****************"
								name="new_password"
								type="password"
                                bind:value={password}
								autocomplete="new-password"
								required
							/>
						</div>


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

					<Button
						type="submit"
						disabled={password != confirmPassword}
						variant="fill-outline"
						color="primary"
						classes={{ root: 'w-full' }}>{$_('login.update_password')}</Button
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
